import net from "node:net";
import { randomUUID } from "node:crypto";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";
import path from "node:path";

const FILE = path.join(DATA_DIR, "discord.json");
const SCOPES = ["rpc", "rpc.voice.read", "rpc.voice.write"];
const REDIRECT = "http://127.0.0.1";
const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2 };

/** One Discord IPC frame: opcode and length as little-endian 32-bit ints, then JSON. */
export function encodeFrame(op, payload) {
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(json.length, 4);
  return Buffer.concat([head, json]);
}

/** Takes bytes off the front of `buf`. Returns the frames found and what is left over. */
export function decodeFrames(buf) {
  const frames = [];
  let rest = buf;
  while (rest.length >= 8) {
    const op = rest.readInt32LE(0);
    const len = rest.readInt32LE(4);
    if (len < 0 || len > 1_000_000) return { frames, rest: Buffer.alloc(0), broken: true };
    if (rest.length < 8 + len) break;
    try {
      frames.push({ op, data: JSON.parse(rest.subarray(8, 8 + len).toString("utf8")) });
    } catch {
      // skip a frame that is not JSON
    }
    rest = rest.subarray(8 + len);
  }
  return { frames, rest, broken: false };
}

const fail = (msg, status = 400) => Object.assign(new Error(msg), { status });

/**
 * Discord voice control over Discord's local IPC pipe. It needs a Discord application of your own
 * (client id and secret from discord.com/developers) because the voice scopes are tied to one.
 * The first time, Discord shows an approval prompt inside the Discord window.
 */
export function createDiscord(log) {
  let saved = readJson(FILE, {});
  let conn = null; // { sock, pending: Map, ready, authed }
  let connecting = null;
  let cache = { at: 0, value: null };
  let guildCache = null;

  const hasApp = () => typeof saved.clientId === "string" && saved.clientId && typeof saved.clientSecret === "string" && saved.clientSecret;
  const save = () => writeJson(FILE, saved);

  function openPipe() {
    return new Promise((resolve, reject) => {
      let n = 0;
      const next = () => {
        if (n > 9) return reject(new Error("Discord is not running"));
        const sock = net.connect(`\\\\?\\pipe\\discord-ipc-${n++}`);
        const onError = () => next();
        sock.once("error", onError);
        sock.once("connect", () => {
          // This listener only means "try the next pipe name". Left attached, a later socket error
          // would call next() again and open another connection nobody owns.
          sock.removeListener("error", onError);
          resolve(sock);
        });
      };
      next();
    });
  }

  async function connect() {
    if (conn?.ready && !conn.sock.destroyed) return conn;
    if (connecting) return connecting;
    connecting = (async () => {
      const sock = await openPipe();
      const c = { sock, pending: new Map(), ready: false, authed: false, buf: Buffer.alloc(0) };
      sock.on("data", (chunk) => {
        const { frames, rest, broken } = decodeFrames(Buffer.concat([c.buf, chunk]));
        c.buf = rest;
        if (broken) sock.destroy();
        for (const { op, data } of frames) {
          if (op === OP.CLOSE) sock.destroy();
          else if (data?.nonce && c.pending.has(data.nonce)) {
            const p = c.pending.get(data.nonce);
            c.pending.delete(data.nonce);
            if (data.evt === "ERROR") p.reject(new Error(data.data?.message || "Discord refused that"));
            else p.resolve(data.data);
          } else if (data?.evt === "READY") c.onReady?.();
        }
      });
      const drop = () => {
        for (const p of c.pending.values()) p.reject(new Error("Discord closed the connection"));
        c.pending.clear();
        if (conn === c) conn = null;
      };
      sock.on("close", drop);
      sock.on("error", drop);
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => {
          sock.destroy(); // no handshake answer: do not leave the pipe open
          reject(new Error("Discord did not answer"));
        }, 4000);
        c.onReady = () => {
          clearTimeout(t);
          c.ready = true;
          resolve();
        };
        sock.write(encodeFrame(OP.HANDSHAKE, { v: 1, client_id: saved.clientId }));
      });
      conn = c;
      return c;
    })().finally(() => (connecting = null));
    return connecting;
  }

  function send(c, cmd, args = {}, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const nonce = randomUUID();
      const t = setTimeout(() => {
        c.pending.delete(nonce);
        reject(new Error("Discord did not answer"));
      }, timeoutMs);
      c.pending.set(nonce, {
        resolve: (v) => (clearTimeout(t), resolve(v)),
        reject: (e) => (clearTimeout(t), reject(e)),
      });
      c.sock.write(encodeFrame(OP.FRAME, { cmd, args, nonce }));
    });
  }

  async function token(body) {
    const res = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: saved.clientId, client_secret: saved.clientSecret, redirect_uri: REDIRECT, ...body }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) throw new Error(data.error_description || "Discord would not give a sign-in token");
    saved.accessToken = data.access_token;
    saved.refreshToken = data.refresh_token ?? saved.refreshToken;
    save();
  }

  /** Signs in with a saved token, refreshing it or asking in Discord when needed. */
  async function authenticate(c, { interactive }) {
    if (c.authed) return;
    const tryAuth = async () => {
      await send(c, "AUTHENTICATE", { access_token: saved.accessToken });
      c.authed = true;
    };
    if (saved.accessToken) {
      try {
        await tryAuth();
        return;
      } catch {
        if (saved.refreshToken) {
          try {
            await token({ grant_type: "refresh_token", refresh_token: saved.refreshToken });
            await tryAuth();
            return;
          } catch {
            // fall through to a fresh sign-in
          }
        }
      }
    }
    if (!interactive) throw fail("Sign in to Discord first", 401);
    const { code } = await send(c, "AUTHORIZE", { client_id: saved.clientId, scopes: SCOPES }, 120000);
    await token({ grant_type: "authorization_code", code });
    await tryAuth();
  }

  async function read() {
    if (!hasApp()) return { state: "setup" };
    let c;
    try {
      c = await connect();
    } catch {
      return { state: "closed" };
    }
    try {
      await authenticate(c, { interactive: false });
    } catch {
      return { state: "login" };
    }
    try {
      const [voice, chan] = await Promise.all([send(c, "GET_VOICE_SETTINGS"), send(c, "GET_SELECTED_VOICE_CHANNEL")]);
      return {
        state: "ready",
        mute: Boolean(voice?.mute),
        deaf: Boolean(voice?.deaf),
        channel: chan
          ? {
              name: String(chan.name ?? "Voice channel"),
              members: (chan.voice_states ?? []).slice(0, 25).map((v) => ({
                name: String(v.nick || v.user?.global_name || v.user?.username || "Someone"),
                mute: Boolean(v.voice_state?.mute || v.voice_state?.self_mute),
                deaf: Boolean(v.voice_state?.deaf || v.voice_state?.self_deaf),
              })),
            }
          : null,
      };
    } catch (e) {
      log(`discord: ${e.message}`);
      return { state: "closed" };
    }
  }

  return {
    async status() {
      if (Date.now() - cache.at < 1500 && cache.value) return cache.value;
      const value = await read();
      cache = { at: Date.now(), value };
      return value;
    },
    setup(body) {
      const id = String(body?.clientId ?? "").trim();
      const secret = String(body?.clientSecret ?? "").trim();
      if (!/^\d{15,25}$/.test(id)) throw fail("The client id is the long number on your Discord application's page");
      if (secret.length < 16 || secret.length > 200 || /\s/.test(secret)) throw fail("That does not look like a client secret");
      saved = { clientId: id, clientSecret: secret };
      save();
      conn?.sock.destroy();
      cache = { at: 0, value: null };
      guildCache = null; // a different application means a different token and possibly different servers
      return { ok: true };
    },
    async login() {
      if (!hasApp()) throw fail("Add your Discord application first");
      let c;
      try {
        c = await connect();
      } catch {
        throw fail("Discord is not running", 409);
      }
      await authenticate(c, { interactive: true });
      cache = { at: 0, value: null };
      return { ok: true };
    },
    /** The servers you are in, with their icons, so notifications can show the server picture. Cached for ten minutes. */
    async guilds() {
      if (guildCache && Date.now() - guildCache.at < 10 * 60_000) return guildCache.value;
      let c;
      try {
        c = await connect();
        await authenticate(c, { interactive: false });
      } catch {
        return { guilds: [] };
      }
      try {
        const list = (await send(c, "GET_GUILDS"))?.guilds ?? [];
        const out = [];
        for (const g of list.slice(0, 100)) {
          let icon = typeof g.icon_url === "string" ? g.icon_url : null;
          if (!icon) {
            try {
              icon = (await send(c, "GET_GUILD", { guild_id: g.id }))?.icon_url ?? null;
            } catch {
              icon = null;
            }
          }
          if (icon && !/^https:\/\/cdn\.discordapp\.com\//.test(icon)) icon = null;
          out.push({ id: String(g.id), name: String(g.name ?? ""), icon });
        }
        const value = { guilds: out };
        guildCache = { at: Date.now(), value };
        return value;
      } catch (e) {
        log(`discord: could not list servers: ${e.message}`);
        return { guilds: [] };
      }
    },
    async set(body) {
      const c = await connect().catch(() => {
        throw fail("Discord is not running", 409);
      });
      await authenticate(c, { interactive: false });
      const args = {};
      if (typeof body?.mute === "boolean") args.mute = body.mute;
      if (typeof body?.deaf === "boolean") args.deaf = body.deaf;
      if (!Object.keys(args).length) throw fail("Nothing to change");
      await send(c, "SET_VOICE_SETTINGS", args);
      cache = { at: 0, value: null };
      return this.status();
    },
    forget() {
      saved = {};
      guildCache = null;
      save();
      conn?.sock.destroy();
      cache = { at: 0, value: null };
      return { ok: true };
    },
    stop() {
      conn?.sock.destroy();
    },
  };
}

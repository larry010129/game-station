import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

// Elgato Wave Link 3 listens on a local WebSocket (127.0.0.1 only) that its Stream Deck plugin uses.
// Elgato does not document it, so this follows what community projects found by reverse engineering
// (see @darrellvs/node-wave-link-sdk). It speaks JSON-RPC 2.0 and wants the Stream Deck origin.
// A Wave Link update can change it, so every failure here becomes "offline" and nothing else is affected.

const ORIGIN = "streamdeck://";
const SCAN = Array.from({ length: 10 }, (_, i) => 1884 + i);
const CALL_TIMEOUT_MS = 4000;

const bad = (message, status = 400) => Object.assign(new Error(message), { status });

/** Wave Link writes the port it picked into this file. */
export function wsInfoPath(env = process.env) {
  const local = env.LOCALAPPDATA ?? (env.APPDATA ? path.join(env.APPDATA, "..", "Local") : null);
  return local ? path.join(local, "Packages", "Elgato.WaveLink_g54w8ztgkx496", "LocalState", "ws-info.json") : null;
}

export function readPort(read = (p) => fs.readFileSync(p, "utf8"), file = wsInfoPath()) {
  try {
    const port = JSON.parse(read(file)).port;
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : null;
  } catch {
    return null;
  }
}

// ---- A very small WebSocket client (text frames only) ----

/** One masked text frame, as a client must send it. */
export function encodeFrame(text, mask = crypto.randomBytes(4)) {
  const payload = Buffer.from(text, "utf8");
  const len = payload.length;
  const head = len < 126 ? Buffer.from([0x81, 0x80 | len]) : len < 65536 ? Buffer.from([0x81, 0x80 | 126, len >> 8, len & 255]) : null;
  if (!head) throw new Error("Message too large");
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([head, mask, masked]);
}

/** Splits received bytes into whole text messages and the bytes still waiting for more. Handles fragments, ignores pings. */
export function decodeFrames(buf, partial = "") {
  const messages = [];
  let pending = partial;
  let off = 0;
  let closed = false;
  while (buf.length - off >= 2) {
    const fin = (buf[off] & 0x80) !== 0;
    const op = buf[off] & 0x0f;
    let len = buf[off + 1] & 0x7f;
    let at = off + 2;
    if (len === 126) {
      if (buf.length - off < 4) break;
      len = buf.readUInt16BE(off + 2);
      at = off + 4;
    } else if (len === 127) {
      if (buf.length - off < 10) break;
      len = Number(buf.readBigUInt64BE(off + 2));
      at = off + 10;
    }
    if (buf.length - at < len) break;
    const body = buf.subarray(at, at + len);
    off = at + len;
    if (op === 0x8) closed = true;
    else if (op === 0x1 || op === 0x0) {
      pending += body.toString("utf8");
      if (fin) {
        messages.push(pending);
        pending = "";
      }
    }
  }
  return { messages, rest: buf.subarray(off), partial: pending, closed };
}

/**
 * Opens a connection to one port, sends every request, and resolves with the results in order
 * (a failed request resolves to `{ error }`). Always closes the connection.
 */
export function rpcSession(port, requests, { timeout = CALL_TIMEOUT_MS, host = "127.0.0.1" } = {}) {
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    let done = false;
    let socket = null;
    const finish = (fn, v) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket?.destroy();
      } catch {
        // already closed
      }
      fn(v);
    };
    const timer = setTimeout(() => finish(reject, new Error("Wave Link did not answer")), timeout);
    const req = http.request({
      host,
      port,
      headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": key, Origin: ORIGIN },
    });
    req.on("response", () => finish(reject, new Error("Wave Link refused the connection")));
    req.on("error", (e) => finish(reject, e));
    req.on("upgrade", (_res, sock, head) => {
      socket = sock;
      const results = new Array(requests.length);
      let got = 0;
      let buf = Buffer.alloc(0);
      let partial = "";
      const take = (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        const r = decodeFrames(buf, partial);
        buf = Buffer.from(r.rest);
        partial = r.partial;
        for (const text of r.messages) {
          let msg;
          try {
            msg = JSON.parse(text);
          } catch {
            continue;
          }
          const i = typeof msg.id === "number" ? msg.id - 1 : -1;
          if (i >= 0 && i < requests.length && results[i] === undefined) {
            results[i] = msg.error ? { error: msg.error } : (msg.result ?? {});
            got++;
          }
        }
        if (got === requests.length) finish(resolve, results);
        else if (r.closed) finish(reject, new Error("Wave Link closed the connection"));
      };
      sock.on("data", take);
      sock.on("error", (e) => finish(reject, e));
      sock.on("close", () => finish(reject, new Error("Wave Link closed the connection")));
      if (head?.length) take(head);
      requests.forEach((r, i) => sock.write(encodeFrame(JSON.stringify({ jsonrpc: "2.0", method: r.method, params: r.params ?? {}, id: i + 1 }))));
      if (!requests.length) finish(resolve, []);
    });
    req.end();
  });
}

/** Finds Wave Link (the port file first, then the usual range), checks it is Wave Link, and runs the requests. */
export function createClient({ session = rpcSession, port = readPort, scan = SCAN } = {}) {
  let known = null;
  return async function call(requests) {
    const candidates = [...new Set([known, port(), ...scan].filter((p) => p != null))];
    for (const p of candidates) {
      try {
        const [info, ...results] = await session(p, [{ method: "getApplicationInfo" }, ...requests]);
        if (info?.error || info?.appID !== "EWL") continue;
        known = p;
        return { info, results };
      } catch {
        if (known === p) known = null;
      }
    }
    throw bad("Wave Link is not running.", 503);
  };
}

// ---- What the dashboard sees ----

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Only what the card shows: no images, no effects. */
export function shape(info, [channels, mixes, inputs]) {
  return {
    state: "ready",
    version: typeof info?.version === "string" ? info.version : "",
    mixes: (mixes?.mixes ?? []).map((m) => ({ id: String(m.id), name: String(m.name ?? ""), level: num(m.level), isMuted: m.isMuted === true })),
    channels: (channels?.channels ?? []).map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      type: String(c.type ?? ""),
      level: num(c.level),
      isMuted: c.isMuted === true,
      mixes: (c.mixes ?? []).map((m) => ({ id: String(m.id), level: num(m.level), isMuted: m.isMuted === true })),
    })),
    inputs: (inputs?.inputDevices ?? []).map((d) => ({
      id: String(d.id),
      name: String(d.name ?? ""),
      isWaveDevice: d.isWaveDevice === true,
      inputs: (d.inputs ?? []).map((i) => ({ id: String(i.id), name: String(i.name ?? d.name ?? ""), isMuted: i.isMuted === true })),
    })),
  };
}

/** Checks a request from the dashboard and turns it into the Wave Link call. Throws a 400 for anything odd. */
export function buildCall(body) {
  const kind = body?.kind;
  const id = body?.id;
  if (!["channel", "mix", "input"].includes(kind)) throw bad("Unknown Wave Link control");
  if (typeof id !== "string" || !id || id.length > 200) throw bad("Missing Wave Link id");
  const hasLevel = body.level !== undefined;
  const hasMute = body.isMuted !== undefined;
  if (!hasLevel && !hasMute) throw bad("Nothing to change");
  if (hasLevel && !(typeof body.level === "number" && Number.isFinite(body.level) && body.level >= 0 && body.level <= 1)) throw bad("Level must be a number from 0 to 1");
  if (hasMute && typeof body.isMuted !== "boolean") throw bad("isMuted must be true or false");
  const change = { ...(hasLevel ? { level: body.level } : {}), ...(hasMute ? { isMuted: body.isMuted } : {}) };

  if (kind === "mix") return { method: "setMix", params: { id, ...change } };
  if (kind === "channel") {
    const mixId = body.mixId;
    if (mixId === undefined) return { method: "setChannel", params: { id, ...change } };
    if (typeof mixId !== "string" || !mixId || mixId.length > 200) throw bad("Bad mix id");
    return { method: "setChannel", params: { id, mixes: [{ id: mixId, ...change }] } };
  }
  // A microphone: only mute is offered here, so a slip never changes its gain.
  const inputId = body.inputId;
  if (typeof inputId !== "string" || !inputId || inputId.length > 200) throw bad("Missing input id");
  if (hasLevel) throw bad("Microphone gain cannot be changed from here");
  return { method: "setInputDevice", params: { id, inputs: [{ id: inputId, isMuted: body.isMuted }] } };
}

export function createWaveLink({ log, call = createClient() } = {}) {
  let cache = { at: 0, value: null };
  let inflight = null;

  async function read() {
    const { info, results } = await call([{ method: "getChannels" }, { method: "getMixes" }, { method: "getInputDevices" }]);
    if (typeof info.interfaceRevision === "number" && info.interfaceRevision < 1) return { state: "unsupported", version: String(info.version ?? "") };
    return shape(info, results);
  }

  return {
    /** The current mixer. Never throws: Wave Link not running is just state "offline". */
    async snapshot() {
      if (cache.value && Date.now() - cache.at < 1200) return cache.value;
      inflight ??= read()
        .catch((e) => {
          if (e?.status !== 503) log?.(`wave link: ${e?.message ?? e}`);
          return { state: "offline" };
        })
        .then((v) => {
          cache = { at: Date.now(), value: v };
          return v;
        })
        .finally(() => (inflight = null));
      return inflight;
    },
    async set(body) {
      const { method, params } = buildCall(body);
      const { results } = await call([{ method, params }]);
      if (results[0]?.error) throw bad("Wave Link did not accept that change.", 502);
      cache = { at: 0, value: null };
      return this.snapshot();
    },
  };
}

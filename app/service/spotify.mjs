import crypto from "node:crypto";
import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";
import { spawnDetached } from "./spawn.mjs";

// Controls Spotify through the official Web API, so it works for any account that logs in
// (and for playback on any device: phone, speaker, web player), not just this PC.
// Login is OAuth with PKCE: there is no client secret to keep, only a public Client ID.
// Playback control needs Spotify Premium; reading what is playing does not.
const FILE = path.join(DATA_DIR, "spotify.json");
const AUTH = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const SCOPES = "user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative";
const ID_RE = /^[0-9a-f]{32}$/i;
const b64url = (buf) => buf.toString("base64url");
const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function createSpotify(log, getPort) {
  // { clientId, access, expires, refresh }. The refresh token is what keeps you signed in.
  let saved = readJson(FILE, {});
  let pending = null; // { verifier, state, at }
  let cache = null; // { at, value }

  const redirectUri = () => `http://127.0.0.1:${getPort()}/api/spotify/callback`;
  const persist = () => {
    try {
      writeJson(FILE, saved);
    } catch (e) {
      log(`spotify: could not save login: ${e.message}`);
    }
  };

  async function tokenRequest(params) {
    const res = await fetch(`${AUTH}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: saved.clientId, ...params }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.error_description || json.error || `token request failed (${res.status})`), { auth: true });
    saved = {
      ...saved,
      access: json.access_token,
      expires: Date.now() + (json.expires_in ?? 3600) * 1000,
      refresh: json.refresh_token ?? saved.refresh,
      scope: json.scope ?? saved.scope,
    };
    persist();
  }

  async function accessToken() {
    if (!saved.refresh) throw Object.assign(new Error("Not connected"), { auth: true });
    if (!saved.access || Date.now() > (saved.expires ?? 0) - 60_000) {
      try {
        await tokenRequest({ grant_type: "refresh_token", refresh_token: saved.refresh });
      } catch (e) {
        // Spotify said the login is no longer valid (revoked, or the app changed): sign in again.
        if (e.auth) {
          saved = { clientId: saved.clientId };
          persist();
        }
        throw e;
      }
    }
    return saved.access;
  }

  async function call(method, route, { query, body } = {}, retried = false) {
    const token = await accessToken();
    const url = new URL(`${API}${route}`);
    for (const [k, v] of Object.entries(query ?? {})) if (v != null) url.searchParams.set(k, String(v));
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 && !retried) {
      saved.access = null;
      return call(method, route, { query, body }, true);
    }
    if (res.status === 429) throw bad("Spotify asked us to slow down. Try again in a moment.", 429);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // not JSON
    }
    return { status: res.status, json };
  }

  const base = () => ({ redirectUri: redirectUri() });

  async function readStatus() {
    if (!saved.clientId) return { state: "setup", ...base() };
    if (!saved.refresh) return { state: "login", ...base() };
    if (!(saved.scope ?? "").includes("playlist-read-private")) return { state: "login", ...base(), message: "Playlists need one more permission. Connect again to allow it." };
    let r;
    try {
      r = await call("GET", "/me/player", { query: { additional_types: "episode" } });
    } catch (e) {
      if (e.auth) return { state: "login", ...base(), message: `Spotify sign-in expired (${e.message}). Connect again.` };
      return { state: "error", ...base(), message: e.status === 429 ? e.message : "Could not reach Spotify." };
    }
    if (r.status === 204 || (r.status === 200 && !r.json?.device)) {
      const d = await call("GET", "/me/player/devices").catch(() => null);
      return { state: "idle", ...base(), devices: mapDevices(d?.json) };
    }
    if (r.status !== 200) return { state: "error", ...base(), message: r.json?.error?.message ?? `Spotify answered ${r.status}.` };
    const p = r.json;
    const it = p.item;
    const images = it?.album?.images ?? it?.images ?? [];
    const art = (images.find((i) => i.width && i.width <= 320) ?? images[images.length - 1] ?? images[0])?.url ?? null;
    const d = await call("GET", "/me/player/devices").catch(() => null);
    return {
      state: "ready",
      ...base(),
      title: it?.name ?? "Unknown track",
      artist: (it?.artists ?? []).map((a) => a.name).join(", ") || it?.show?.name || "",
      album: it?.album?.name ?? it?.show?.name ?? "",
      art,
      playing: Boolean(p.is_playing),
      positionMs: p.progress_ms ?? 0,
      durationMs: it?.duration_ms ?? 0,
      shuffle: Boolean(p.shuffle_state),
      repeat: p.repeat_state ?? "off",
      device: p.device ? { id: p.device.id, name: p.device.name, type: p.device.type, volume: p.device.volume_percent ?? null, canVolume: !p.device.is_restricted && p.device.volume_percent != null } : null,
      devices: mapDevices(d?.json),
    };
  }

  const mapDevices = (j) => (j?.devices ?? []).filter((d) => d.id).map((d) => ({ id: d.id, name: d.name, type: d.type, active: Boolean(d.is_active) }));

  async function status() {
    if (cache && Date.now() - cache.at < 1500) return cache.value;
    const value = await readStatus();
    cache = { at: Date.now(), value };
    return value;
  }

  let plCache = null;
  async function playlists() {
    if (!saved.refresh || !(saved.scope ?? "").includes("playlist-read-private")) return { playlists: [] };
    if (plCache && Date.now() - plCache.at < 60_000) return plCache.value;
    const out = [];
    for (let offset = 0; offset < 200; offset += 50) {
      const r = await call("GET", "/me/playlists", { query: { limit: 50, offset } });
      if (r.status !== 200) throw bad(r.json?.error?.message ?? `Spotify answered ${r.status}.`, 502);
      for (const p of r.json.items ?? []) {
        if (p) out.push({ id: p.id, name: p.name, uri: p.uri, tracks: p.tracks?.total ?? 0, art: p.images?.[p.images.length - 1]?.url ?? null });
      }
      if (!r.json.next) break;
    }
    const value = { playlists: out };
    plCache = { at: Date.now(), value };
    return value;
  }

  function openBrowser(url) {
    // rundll32 takes the URL as one argument, so no shell ever sees the "&" characters.
    spawnDetached("rundll32.exe", ["url.dll,FileProtocolHandler", url], { windowsHide: true }, log, "spotify: open browser");
  }

  const page = (title, body) => ({
    __html: `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:16px system-ui;background:#0e0e10;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-weight:500">${esc(title)}</h1><p style="color:#aaa">${esc(body)}</p></div>`,
  });

  return {
    status,
    playlists,

    setup(clientId) {
      const id = String(clientId ?? "").trim();
      if (!ID_RE.test(id)) throw bad("That does not look like a Client ID (32 letters and numbers).");
      saved = { clientId: id };
      cache = null;
      persist();
      return status();
    },

    login() {
      if (!saved.clientId) throw bad("Save your Client ID first.");
      const verifier = b64url(crypto.randomBytes(64));
      pending = { verifier, state: b64url(crypto.randomBytes(16)), at: Date.now() };
      const url = new URL(`${AUTH}/authorize`);
      url.search = new URLSearchParams({
        client_id: saved.clientId,
        response_type: "code",
        redirect_uri: redirectUri(),
        scope: SCOPES,
        state: pending.state,
        code_challenge_method: "S256",
        code_challenge: b64url(crypto.createHash("sha256").update(verifier).digest()),
      }).toString();
      openBrowser(url.toString());
      return { url: url.toString() };
    },

    async callback(url) {
      const p = pending;
      // A callback that does not carry our state is not ours (stale tab, or a forged request):
      // answer it, but leave the real sign-in that is waiting untouched.
      if (!p || url.searchParams.get("state") !== p.state) return page("Sign-in expired", "Close this tab and press Connect again in Command Station.");
      pending = null;
      const err = url.searchParams.get("error");
      if (err) return page("Spotify not connected", err === "access_denied" ? "You cancelled the sign-in. Close this tab and try again." : err);
      if (Date.now() - p.at > 10 * 60_000) return page("Sign-in expired", "Close this tab and press Connect again in Command Station.");
      try {
        await tokenRequest({ grant_type: "authorization_code", code: url.searchParams.get("code") ?? "", redirect_uri: redirectUri(), code_verifier: p.verifier });
        cache = null;
        return page("Spotify connected", "You can close this tab and go back to Command Station.");
      } catch (e) {
        log(`spotify: sign-in failed: ${e.message}`);
        return page("Spotify sign-in failed", e.message);
      }
    },

    logout() {
      saved = { clientId: saved.clientId };
      persist();
      cache = null;
      plCache = null;
      return status();
    },

    async control(action, args = {}) {
      let r;
      switch (action) {
        case "play":
          r = await call("PUT", "/me/player/play", { query: { device_id: args.deviceId } });
          break;
        case "pause":
          r = await call("PUT", "/me/player/pause");
          break;
        case "next":
          r = await call("POST", "/me/player/next");
          break;
        case "previous":
          r = await call("POST", "/me/player/previous");
          break;
        case "seek": {
          const ms = Number(args.ms);
          if (!Number.isFinite(ms) || ms < 0 || ms > 24 * 3600_000) throw bad("Bad seek position");
          r = await call("PUT", "/me/player/seek", { query: { position_ms: Math.round(ms) } });
          break;
        }
        case "volume": {
          const v = Number(args.percent);
          if (!Number.isFinite(v)) throw bad("Bad volume");
          r = await call("PUT", "/me/player/volume", { query: { volume_percent: Math.max(0, Math.min(100, Math.round(v))) } });
          break;
        }
        case "shuffle":
          if (typeof args.on !== "boolean") throw bad("Bad shuffle value");
          r = await call("PUT", "/me/player/shuffle", { query: { state: args.on } });
          break;
        case "repeat":
          if (!["off", "context", "track"].includes(args.mode)) throw bad("Bad repeat mode");
          r = await call("PUT", "/me/player/repeat", { query: { state: args.mode } });
          break;
        case "playlist":
          if (!/^spotify:playlist:[A-Za-z0-9]+$/.test(args.uri ?? "")) throw bad("Bad playlist");
          r = await call("PUT", "/me/player/play", { query: { device_id: args.deviceId }, body: { context_uri: args.uri } });
          break;
        case "transfer":
          if (typeof args.deviceId !== "string" || !args.deviceId) throw bad("Pick a device");
          r = await call("PUT", "/me/player", { body: { device_ids: [args.deviceId], play: true } });
          break;
        default:
          throw bad("Unknown Spotify action");
      }
      if (r.status === 403) throw bad(r.json?.error?.reason === "PREMIUM_REQUIRED" ? "Spotify Premium is needed to control playback." : (r.json?.error?.message ?? "Spotify refused that."), 403);
      if (r.status === 404) throw bad("No active Spotify device. Open Spotify on a device and press play once.", 404);
      if (r.status >= 400) throw bad(r.json?.error?.message ?? `Spotify answered ${r.status}.`, 502);
      cache = null;
      await new Promise((resolve) => setTimeout(resolve, 350)); // Spotify needs a moment to reflect the change.
      return status();
    },
  };
}

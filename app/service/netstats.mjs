import net from "node:net";
import { run } from "./system.mjs";

// Region hosts: Blizzard's regional game endpoints (port 1119). A TCP connect is
// timed as the round trip, which needs no ping permission. Unreachable shows as a dash.
export const REGIONS = [
  { id: "americas", name: "Americas", host: "us.actual.battle.net", port: 1119 },
  { id: "europe", name: "Europe", host: "eu.actual.battle.net", port: 1119 },
  { id: "asia", name: "Asia", host: "kr.actual.battle.net", port: 1119 },
];

/** Time for a TCP connect in ms (at least 1), or null when it fails or times out. The one ping helper. */
export function tcpMs(host, port = 443, timeout = 1500) {
  return new Promise((resolve) => {
    // Start the clock before the lookup: for an IP address no "lookup" event ever fires.
    const t0 = performance.now();
    const sock = net.connect({ host, port });
    const done = (v) => {
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(timeout, () => done(null));
    sock.once("connect", () => done(Math.max(1, Math.round(performance.now() - t0))));
    sock.once("error", () => done(null));
  });
}

const FIELD = /^\s*(.+?)\s+:\s+(.*?)\s*$/;
const NUMBER = /^\d+(?:\.\d+)?$/;

/**
 * Pulls the Wi-Fi fields out of `netsh wlan show interfaces`. Windows translates every label
 * (and the state word), so fields are recognised by the shape of their value, not by their name:
 * `82%` is the signal, `802.11ax` the radio, `5 GHz` the band, and the plain numbers that follow
 * the band are channel, receive rate and transmit rate, in that order. "SSID" is never translated.
 */
export function parseWifi(text) {
  const rows = String(text ?? "")
    .split(/\r?\n/)
    .map((l) => FIELD.exec(l))
    .filter(Boolean)
    .map((m) => ({ key: m[1], value: m[2] }));
  if (!rows.length) return null;
  const ssidAt = rows.findIndex((r) => /^ssid$/i.test(r.key));
  // The state row sits right above SSID; with no SSID row (disconnected) it is the last row.
  const stateRow = ssidAt > 0 ? rows[ssidAt - 1] : rows[rows.length - 1];
  const state = stateRow.value;
  const ssid = ssidAt >= 0 && rows[ssidAt].value ? rows[ssidAt].value : null;
  // English "connected" is exact ("disconnected" must not match); a translated state counts as connected when an SSID is shown.
  const connected = /^[\x20-\x7e]+$/.test(state) ? /^connected$/i.test(state) : Boolean(ssid);
  const bandAt = rows.findIndex((r) => /^\d+(?:\.\d+)?\s*GHz$/i.test(r.value));
  const nums = rows.slice(bandAt >= 0 ? bandAt + 1 : ssidAt + 1).filter((r) => NUMBER.test(r.value));
  const signal = rows.find((r) => /^\d{1,3}\s*%$/.test(r.value));
  return {
    state,
    connected,
    ssid,
    signal: signal ? Number(signal.value.replace(/\s*%/, "")) : null,
    radio: rows.find((r) => /^802\.11/i.test(r.value))?.value ?? null,
    band: bandAt >= 0 ? rows[bandAt].value : null,
    channel: nums[0] ? Number(nums[0].value) : null,
    rateMbps: nums[1] ? Number(nums[1].value) : null,
  };
}

/** Jitter is the average change between neighbouring ping times; loss is the share of probes with no reply. */
export function summarize(samples) {
  const got = samples.filter((v) => v != null);
  const lossPct = samples.length ? Math.round(((samples.length - got.length) / samples.length) * 1000) / 10 : null;
  if (!got.length) return { avg: null, jitter: null, lossPct, samples };
  const avg = Math.round(got.reduce((a, b) => a + b, 0) / got.length);
  let diffs = 0;
  let n = 0;
  for (let i = 1; i < got.length; i++) {
    diffs += Math.abs(got[i] - got[i - 1]);
    n++;
  }
  return { avg, jitter: n ? Math.round((diffs / n) * 10) / 10 : 0, lossPct, samples };
}

/**
 * Connection quality for the Connection cards. Probing only runs while a card is
 * asking (a request in the last 30 seconds), so it costs nothing when no one looks.
 */
export function createNetStats(config, log) {
  const ring = [];
  let regions = REGIONS.map((r) => ({ id: r.id, name: r.name, ms: null }));
  let wifi = null;
  let lastAsk = 0;
  let lastRegions = 0;
  let lastWifi = 0;
  let timer = null;
  let busy = false;

  async function tick() {
    if (busy || Date.now() - lastAsk > 30_000) return;
    busy = true;
    try {
      ring.push(await tcpMs(config.regionHost, 443));
      if (ring.length > 60) ring.shift();
      const now = Date.now();
      if (now - lastRegions > 10_000) {
        lastRegions = now;
        regions = await Promise.all(REGIONS.map(async (r) => ({ id: r.id, name: r.name, ms: await tcpMs(r.host, r.port) })));
      }
      if (now - lastWifi > 5_000) {
        lastWifi = now;
        try {
          wifi = parseWifi(await run("netsh", ["wlan", "show", "interfaces"], { timeout: 4000 }));
        } catch {
          wifi = null;
        }
      }
    } catch (e) {
      log(`network stats: ${e.message}`);
    } finally {
      busy = false;
    }
  }

  return {
    start() {
      timer = setInterval(tick, 1000);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
    },
    async snapshot() {
      lastAsk = Date.now();
      // The first ask has to measure. Later asks return the last reading while the timer keeps going.
      if (ring.length === 0 && regions.every((r) => r.ms == null)) await tick();
      return { host: config.regionHost, regions, jitter: summarize(ring), wifi };
    },
  };
}

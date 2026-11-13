import net from "node:net";
import { run } from "./system.mjs";

// Region hosts: Blizzard's regional game endpoints (port 1119). A TCP connect is
// timed as the round trip, which needs no ping permission. Unreachable shows as a dash.
export const REGIONS = [
  { id: "americas", name: "Americas", host: "us.actual.battle.net", port: 1119 },
  { id: "europe", name: "Europe", host: "eu.actual.battle.net", port: 1119 },
  { id: "asia", name: "Asia", host: "kr.actual.battle.net", port: 1119 },
];

export function tcpMs(host, port = 443, timeout = 1500) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const sock = net.connect({ host, port });
    const done = (v) => {
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(timeout, () => done(null));
    sock.once("connect", () => done(Math.round(performance.now() - t0)));
    sock.once("error", () => done(null));
  });
}

/** Pulls the Wi-Fi fields out of `netsh wlan show interfaces` (English Windows). */
export function parseWifi(text) {
  const get = (label) => new RegExp(`^\\s*${label}\\s*:\\s*(.+?)\\s*$`, "mi").exec(text)?.[1] ?? null;
  const state = get("State");
  if (!state) return null;
  const signal = get("Signal");
  return {
    state,
    connected: /^connected$/i.test(state),
    ssid: get("SSID"),
    signal: signal ? Number(signal.replace("%", "")) : null,
    radio: get("Radio type"),
    band: get("Band"),
    channel: get("Channel") ? Number(get("Channel")) : null,
    rateMbps: get("Receive rate \\(Mbps\\)") ? Number(get("Receive rate \\(Mbps\\)")) : null,
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
    snapshot() {
      lastAsk = Date.now();
      return { host: config.regionHost, regions, jitter: summarize(ring), wifi };
    },
  };
}

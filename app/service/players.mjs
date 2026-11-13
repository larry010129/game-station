import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";

const FILE = path.join(DATA_DIR, "players.json");
const HOUR = 3600_000;
const KEEP_HOURS = 24 * 7;
const POLL_MS = 10 * 60_000;

// Overwatch publishes no player counts by country. These are fixed typical
// shares of the global player base, used only to split the real total into
// regions on the map. The dashboard labels them "estimated".
export const REGION_SHARES = [
  { id: "na", name: "North America", share: 0.34 },
  { id: "sa", name: "South America", share: 0.07 },
  { id: "eu", name: "Europe", share: 0.33 },
  { id: "asia", name: "Asia", share: 0.19 },
  { id: "oce", name: "Oceania", share: 0.03 },
  { id: "other", name: "Middle East and Africa", share: 0.04 },
];

/**
 * Hourly count of players online, from Steam's public player-count endpoint
 * (Overwatch 2 on Steam, so Battle.net-only players are not included).
 * Polls every 10 minutes, keeps the hourly average, stores it on disk.
 */
export function createPlayers(config, log) {
  const appId = config.steamAppId ?? 2357570;
  let hours = readJson(FILE, { hours: [] }).hours ?? [];
  let latest = null;
  let error = null;
  let timer = null;

  async function poll() {
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`Steam answered ${res.status}`);
      const count = (await res.json())?.response?.player_count;
      if (!Number.isFinite(count)) throw new Error("Steam sent no player count");
      const now = Date.now();
      const t = Math.floor(now / HOUR) * HOUR;
      let h = hours.find((x) => x.t === t);
      if (!h) {
        h = { t, sum: 0, n: 0 };
        hours.push(h);
      }
      h.sum += count;
      h.n += 1;
      hours = hours.filter((x) => x.t > now - KEEP_HOURS * HOUR);
      latest = { t: now, count };
      error = null;
      writeJson(FILE, { hours });
    } catch (e) {
      if (!error) log(`player count unavailable: ${e.message}`);
      error = e.message;
    }
  }

  return {
    start() {
      poll();
      timer = setInterval(poll, POLL_MS);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
    },
    snapshot() {
      return {
        source: "Steam (Overwatch 2 players on Steam)",
        latest,
        error,
        hours: hours.map((h) => ({ t: h.t, count: Math.round(h.sum / h.n) })),
        regions: REGION_SHARES,
        regionsEstimated: true,
      };
    },
  };
}

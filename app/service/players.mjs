import { OVERWATCH_APP_ID } from "./constants.mjs";
import { normalizeGame, playersFileFor, playersSourceFor, steamAppIdFor } from "./games.mjs";
import { readJson, writeJson } from "./paths.mjs";

const HOUR = 3600_000;
const KEEP_HOURS = 24 * 7;
const POLL_MS = 10 * 60_000;

// Overwatch / Apex publish no player counts by country. These are fixed typical
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
 * Hourly count of players online, from Steam's public player-count endpoint.
 * One tracker per game (separate cache files). Polls every 10 minutes.
 */
export function createPlayers(config, log) {
  const trackers = new Map();

  function ensure(game) {
    const g = normalizeGame(game);
    let t = trackers.get(g);
    if (t) return t;
    const file = playersFileFor(g);
    const appId = steamAppIdFor(config, g) || OVERWATCH_APP_ID;
    t = {
      game: g,
      appId,
      file,
      hours: readJson(file, { hours: [] }).hours ?? [],
      latest: null,
      error: null,
      timer: null,
      pending: null,
    };
    trackers.set(g, t);
    return t;
  }

  function poll(game) {
    const t = ensure(game);
    if (t.pending) return t.pending;
    t.pending = read(t).finally(() => {
      t.pending = null;
    });
    return t.pending;
  }

  async function read(t) {
    try {
      const res = await fetch(
        `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${t.appId}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`Steam answered ${res.status}`);
      const count = (await res.json())?.response?.player_count;
      if (!Number.isFinite(count)) throw new Error("Steam sent no player count");
      const now = Date.now();
      const hour = Math.floor(now / HOUR) * HOUR;
      let h = t.hours.find((x) => x.t === hour);
      if (!h) {
        h = { t: hour, sum: 0, n: 0 };
        t.hours.push(h);
      }
      h.sum += count;
      h.n += 1;
      t.hours = t.hours.filter((x) => x.t > now - KEEP_HOURS * HOUR);
      t.latest = { t: now, count };
      t.error = null;
      writeJson(t.file, { hours: t.hours });
    } catch (e) {
      if (!t.error) log(`player count (${t.game}) unavailable: ${e.message}`);
      t.error = e.message;
    }
  }

  return {
    start() {
      for (const g of ["overwatch", "apex"]) {
        poll(g);
        const t = ensure(g);
        t.timer = setInterval(() => poll(g), POLL_MS);
        t.timer.unref?.();
      }
    },
    stop() {
      for (const t of trackers.values()) {
        if (t.timer) clearInterval(t.timer);
      }
    },
    // Disk/memory only — never wait on the Steam poll (start() already runs it).
    snapshot(game = "overwatch") {
      const t = ensure(game);
      return {
        source: playersSourceFor(game),
        latest: t.latest,
        error: t.error,
        hours: t.hours.map((h) => ({ t: h.t, count: Math.round(h.sum / h.n) })),
        regions: REGION_SHARES,
        regionsEstimated: true,
      };
    },
  };
}

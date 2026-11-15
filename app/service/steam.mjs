// Steam news for a game app id (Overwatch 2 or Apex Legends), from Steam's public news endpoint (no key).
import { OVERWATCH_APP_ID } from "./constants.mjs";
import { normalizeGame, steamAppIdFor, steamLabelFor } from "./games.mjs";

const TTL = 10 * 60_000;

/** Official Steam posts only — skips external aggregators (e.g. PlayGround.ru). */
function newsUrlFor(appId) {
  return `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=8&maxlength=0&format=json&feeds=steam_community_announcements`;
}

/** Drop .ru sources/hosts (PlayGround.ru and similar). */
function isRuSource(n) {
  const blob = `${n.feedname ?? ""} ${n.feedlabel ?? ""} ${n.url ?? ""}`;
  if (/\.ru\b/i.test(blob)) return true;
  try {
    const host = new URL(String(n.url)).hostname.toLowerCase();
    return host === "ru" || host.endsWith(".ru");
  } catch {
    return Boolean(n.url);
  }
}

function storeNewsUrl(appId, gid) {
  return `https://store.steampowered.com/news/app/${appId}/view/${gid}`;
}

export function parseNews(json, appId = OVERWATCH_APP_ID) {
  return (json?.appnews?.newsitems ?? [])
    .filter((n) => n?.gid != null && !isRuSource(n))
    .slice(0, 8)
    .map((n) => ({
      id: String(n.gid),
      title: n.title,
      url: storeNewsUrl(appId, n.gid),
      date: (n.date ?? 0) * 1000,
      source: n.feedlabel ?? "Steam",
    }));
}

/** One Steam news cache per game. `createSteam(log)` returns a multi-game facade. */
export function createSteam(log, config = {}) {
  const caches = new Map();

  function ensure(game) {
    const g = normalizeGame(game);
    let entry = caches.get(g);
    if (entry) return entry;
    const appId = steamAppIdFor(config, g);
    entry = { game: g, appId, cache: { news: [], at: 0, error: null }, refreshing: null };
    caches.set(g, entry);
    return entry;
  }

  function refresh(game) {
    const entry = ensure(game);
    if (entry.refreshing) return entry.refreshing;
    entry.refreshing = (async () => {
      try {
        const res = await fetch(newsUrlFor(entry.appId), {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`Steam answered ${res.status}`);
        entry.cache = { news: parseNews(await res.json(), entry.appId), at: Date.now(), error: null };
      } catch (e) {
        log(`steam(${entry.game}): ${e.message}`);
        entry.cache = { ...entry.cache, at: Date.now(), error: e.message };
      } finally {
        entry.refreshing = null;
      }
    })();
    return entry.refreshing;
  }

  return {
    async snapshot(game = "overwatch") {
      const entry = ensure(game);
      if (Date.now() - entry.cache.at > TTL) {
        const p = refresh(game);
        if (!entry.cache.at) await p;
      }
      return { ...entry.cache, label: steamLabelFor(game) };
    },
  };
}

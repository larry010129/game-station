// Overwatch 2 on Steam: recent Steam news, from Steam's public news endpoint (no key).
// (Steam's review-score endpoint does not answer for this app, so reviews are not shown.)
const APP = 2357570;
const TTL = 10 * 60_000;

export function parseNews(json) {
  return (json?.appnews?.newsitems ?? []).slice(0, 8).map((n) => ({
    id: String(n.gid),
    title: n.title,
    url: n.url,
    date: (n.date ?? 0) * 1000,
    source: n.feedlabel ?? "Steam",
  }));
}

export function createSteam(log) {
  let cache = { news: [], at: 0, error: null };
  let refreshing = null;

  function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const res = await fetch(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP}&count=8&maxlength=0&format=json`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`Steam answered ${res.status}`);
        cache = { news: parseNews(await res.json()), at: Date.now(), error: null };
      } catch (e) {
        log(`steam: ${e.message}`);
        cache = { ...cache, at: Date.now(), error: e.message };
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  return {
    async snapshot() {
      if (Date.now() - cache.at > TTL) {
        const p = refresh();
        if (!cache.at) await p;
      }
      return cache;
    },
  };
}

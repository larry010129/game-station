import { parseNews, parsePatchNotes, parseRedditAtom, parseYouTubeAtom } from "./parsers.mjs";
import { FEED_CACHE_FILE, readJson, writeJson } from "./paths.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stable key so a failed source can keep its last good items. */
function sourceKey(item) {
  if (!item) return "";
  if (item.platform === "youtube" || String(item.id ?? "").startsWith("yt-")) return `youtube:${item.source}`;
  if (item.kind === "patch") return "blizzard:patch";
  if (item.source === "Blizzard") return "blizzard:news";
  if (String(item.source ?? "").startsWith("r/")) return `reddit:${item.source.slice(2)}`;
  return `${item.platform ?? "x"}:${item.source ?? item.kind}`;
}

/**
 * Pulls Blizzard news/patch notes and Reddit feeds. Reddit is paced so we
 * do not trip their rate limit; the last good list is kept on disk.
 */
export function createFeed(config, log) {
  const cfg = config.feed;
  let cache = readJson(FEED_CACHE_FILE, { items: [], fetchedAt: 0, seen: {} });
  let timer = null;
  let running = false;

  function items() {
    return cache.items ?? [];
  }

  async function fetchText(url) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": cfg.userAgent,
        Accept: "text/html, application/atom+xml, application/xml, */*",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const err = new Error(`${url} → ${res.status}`);
      err.status = res.status;
      err.retryAfterSec = Number(res.headers.get("retry-after")) || 0;
      throw err;
    }
    return res.text();
  }

  async function refresh() {
    if (running) return items();
    running = true;
    const collected = [];
    const errors = [];
    const succeeded = new Set();

    try {
      try {
        collected.push(...parsePatchNotes(await fetchText(cfg.patchUrl), cfg.patchUrl));
        succeeded.add("blizzard:patch");
      } catch (e) {
        errors.push(`patch: ${e.message}`);
      }
      try {
        collected.push(...parseNews(await fetchText(cfg.newsUrl)));
        succeeded.add("blizzard:news");
      } catch (e) {
        errors.push(`news: ${e.message}`);
      }

      for (const y of cfg.youtube ?? []) {
        try {
          const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(y.channelId)}`);
          collected.push(...parseYouTubeAtom(xml, y.name));
          succeeded.add(`youtube:${y.name}`);
        } catch (e) {
          errors.push(`youtube ${y.name}: ${e.message}`);
        }
      }

      for (const r of cfg.reddit) {
        await sleep(cfg.redditGapMs);
        const key = `reddit:${r.sub}`;
        const url = `https://www.reddit.com/r/${r.sub}/.rss`;
        try {
          const xml = await fetchText(url);
          collected.push(...parseRedditAtom(xml, r.sub, r.kind));
          succeeded.add(key);
        } catch (e) {
          if (e.status === 429) {
            const waitMs = Math.min(120_000, Math.max(15_000, (e.retryAfterSec || 60) * 1000));
            log(`r/${r.sub} rate-limited; retrying once after ${Math.round(waitMs / 1000)}s`);
            await sleep(waitMs);
            try {
              const xml = await fetchText(url);
              collected.push(...parseRedditAtom(xml, r.sub, r.kind));
              succeeded.add(key);
            } catch (e2) {
              errors.push(`r/${r.sub}: ${e2.message}`);
            }
          } else {
            errors.push(`r/${r.sub}: ${e.message}`);
          }
        }
      }

      if (collected.length || (cache.items?.length && succeeded.size)) {
        const now = Date.now();
        const seen = cache.seen ?? {};
        const day = 48 * 3600_000;
        const byId = new Map();

        // Keep last-good items for any source that failed this cycle.
        for (const item of cache.items ?? []) {
          const key = sourceKey(item);
          if (key && !succeeded.has(key)) byId.set(item.id, item);
        }

        for (const item of collected) {
          if (!item?.id) continue;
          byId.set(item.id, {
            ...item,
            isNew: !seen[item.id] || now - item.publishedAt < day,
          });
        }

        const nextSeen = { ...seen };
        for (const id of byId.keys()) nextSeen[id] = now;
        for (const [id, at] of Object.entries(nextSeen)) {
          if (now - at > 30 * 24 * 3600_000) delete nextSeen[id];
        }
        cache = {
          lastError: errors.length ? errors.join("; ") : null,
          items: [...byId.values()].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 40),
          fetchedAt: now,
          seen: nextSeen,
        };
        writeJson(FEED_CACHE_FILE, cache);
      }

      if (errors.length) log(`feed partial: ${errors.join("; ")}`);
    } finally {
      running = false;
    }
    return items();
  }

  function start() {
    refresh().catch((e) => log(`feed start failed: ${e.message}`));
    timer = setInterval(() => {
      refresh().catch((e) => log(`feed refresh failed: ${e.message}`));
    }, cfg.refreshMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
  }

  return { start, stop, items, refresh, fetchedAt: () => cache.fetchedAt ?? 0 };
}

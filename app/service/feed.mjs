import { APEXY, LEAKY, OVERWATCHY, isApexPost, isOverwatchPost, parseGoogleNewsRss, parseNews, parsePatchNotes, parseRedditAtom, parseXRss, parseYouTubeAtom, parseYouTubeChannelId } from "./parsers.mjs";
import { trustedMatch, trustNote } from "./trusted.mjs";
import { FEED_CACHE_FILE, readJson, writeJson } from "./paths.mjs";
import { normalizeGame } from "./games.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Stable key so a failed source can keep its last good items. */
function sourceKey(item) {
  if (!item) return "";
  if (item.platform === "youtube" || String(item.id ?? "").startsWith("yt-")) return `youtube:${item.source}`;
  if (item.platform === "news") return "news:search";
  if (item.kind === "patch") return "blizzard:patch";
  if (item.source === "Blizzard") return "blizzard:news";
  if (String(item.source ?? "").startsWith("r/")) return `reddit:${item.source.slice(2)}`;
  return `${item.platform ?? "x"}:${item.source ?? item.kind}`;
}

/**
 * Pulls official news/patch notes and Reddit feeds for one game. Reddit is paced so we
 * do not trip their rate limit; the last good list is kept on disk.
 * `opts.game` selects Overwatch vs Apex filters; `opts.cacheFile` / `opts.feedCfg` override defaults.
 */
export function createFeed(config, log, opts = {}) {
  const game = normalizeGame(opts.game ?? "overwatch");
  const aboutGame = game === "apex" ? isApexPost : isOverwatchPost;
  const gameTitle = game === "apex" ? APEXY : OVERWATCHY;
  const cfg = opts.feedCfg ?? config.feed;
  const cacheFile = opts.cacheFile ?? FEED_CACHE_FILE;
  let cache = readJson(cacheFile, { items: [], fetchedAt: 0, seen: {} });
  let timer = null;
  /** Shared in-flight pull so refresh/start share one network job (GET never awaits this). */
  let job = null;

  /** Items with a `trusted` note when their source is on the user's trusted list (read live, so a config edit shows at once). */
  function items() {
    const list = cfg.trusted ?? [];
    return (cache.items ?? []).map((i) => {
      const t = trustedMatch(i, list);
      return t ? { ...i, trusted: trustNote(t) } : i;
    });
  }

  /** A YouTube channel's id from its id, link or @handle. Handles are looked up once and remembered until restart. */
  const youtubeIds = new Map();
  async function resolveYouTube(y) {
    if (y.channelId) return y.channelId;
    const fromUrl = y.url ? parseYouTubeChannelId(y.url) : null;
    if (fromUrl) return fromUrl;
    const handle = y.handle ?? /youtube\.com\/(@[\w.-]+)/.exec(y.url ?? "")?.[1];
    if (!handle) throw new Error("no channel id, @handle or channel link");
    const at = handle.startsWith("@") ? handle : `@${handle}`;
    if (youtubeIds.has(at)) return youtubeIds.get(at);
    const id = parseYouTubeChannelId(await fetchText(`https://www.youtube.com/${at}`));
    if (!id) throw new Error(`channel ${at} not found`);
    youtubeIds.set(at, id);
    return id;
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

  function inflight() {
    return job;
  }

  async function refresh() {
    if (job) return job;
    job = pull().finally(() => {
      job = null;
    });
    return job;
  }

  async function pull() {
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
          const channelId = await resolveYouTube(y);
          const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
          // Multi-game channels: keep this game's titles; drop pure other-game uploads.
          collected.push(...parseYouTubeAtom(xml, y.name, y.kind).filter((i) => aboutGame(i.title)));
          succeeded.add(`youtube:${y.name}`);
        } catch (e) {
          errors.push(`youtube ${y.name}: ${e.message}`);
        }
      }

      let newsOk = false;
      for (const q of cfg.newsSearch ?? []) {
        try {
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:30d`)}&hl=en-US&gl=US&ceid=US:en`;
          // Google matches loosely: keep only recent headlines that name the game AND talk about a leak/datamine/rumour
          // (or an Apex collection / special event for the Apex feed).
          const recent = Date.now() - 30 * 24 * 3600_000;
          const eventy = game === "apex" && /\b(collection\s*event|special\s*event|limited\s*time|ltm|heirlooms?)\b/i.test(String(q));
          const about = parseGoogleNewsRss(await fetchText(url), "leak").filter(
            (i) => gameTitle.test(i.title) && (LEAKY.test(i.title) || eventy) && i.publishedAt > recent,
          );
          collected.push(...about);
          newsOk = true;
        } catch (e) {
          errors.push(`news "${q}": ${e.message}`);
        }
      }
      if (newsOk) succeeded.add("news:search");

      if (cfg.xRssUrl) {
        for (const x of cfg.x ?? []) {
          try {
            const xml = await fetchText(cfg.xRssUrl.replaceAll("{handle}", encodeURIComponent(x.handle)));
            collected.push(...parseXRss(xml, x.handle, x.kind).filter((i) => aboutGame(i.title)));
            succeeded.add(`x:@${x.handle}`);
          } catch (e) {
            errors.push(`x @${x.handle}: ${e.message}`);
          }
        }
      }

      for (const r of cfg.reddit ?? []) {
        await sleep(cfg.redditGapMs);
        const key = `reddit:${r.sub}`;
        const url = `https://www.reddit.com/r/${encodeURIComponent(r.sub)}/.rss`;
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
        // Every kind of source gets its own room, newest first. Without this, a busy subreddit fills the whole
        // list and pushes out the leaks, Blizzard's posts and the videos.
        const room = { leak: 20, reddit: 15, youtube: 10, blizzard: 10 };
        const used = {};
        const kept = [...byId.values()]
          .sort((a, b) => b.publishedAt - a.publishedAt)
          .filter((i) => {
            const group = i.kind === "leak" ? "leak" : (i.platform ?? "blizzard");
            used[group] = (used[group] ?? 0) + 1;
            return used[group] <= (room[group] ?? 10);
          });
        cache = {
          lastError: errors.length ? errors.join("; ") : null,
          items: kept,
          fetchedAt: now,
          seen: nextSeen,
        };
        writeJson(cacheFile, cache);
      }

      if (errors.length) log(`feed(${game}) partial: ${errors.join("; ")}`);
    } finally {
      // The shared job is cleared by refresh(); this keeps the try legal.
    }
    return items();
  }

  function start() {
    refresh().catch((e) => log(`feed(${game}) start failed: ${e.message}`));
    timer = setInterval(() => {
      refresh().catch((e) => log(`feed(${game}) refresh failed: ${e.message}`));
    }, cfg.refreshMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
  }

  return { start, stop, items, refresh, inflight, fetchedAt: () => cache.fetchedAt ?? 0 };
}

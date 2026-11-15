import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// The feed writes its cache to the data folder: point it at a throwaway one, never the real one.
process.env.COMMAND_STATION_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "cs-feed-"));
const { createFeed } = await import("../feed.mjs");
const { validateFeed } = await import("../config.mjs");

const ago = (ms) => new Date(Date.now() - ms);
const HOUR = 3600_000;

const rss = (items) => `<rss><channel>${items.join("")}</channel></rss>`;
const rssItem = (title, link, date, source = "") => `<item><title>${title}</title><link>${link}</link><pubDate>${date.toUTCString()}</pubDate>${source}</item>`;
const atomEntry = (id, title, date) => `<entry><id>${id}</id><title>${title}</title><link href="https://reddit.com/${id}"/><published>${date.toISOString()}</published></entry>`;

function fakeFetch(url) {
  const u = String(url);
  const ok = (body) => ({ ok: true, status: 200, headers: new Headers(), text: async () => body });
  if (u.includes("youtube.com/@LeakChan")) return ok('<html>"channelId":"UCabcdefghijklmnopqrstuv"</html>');
  if (u.includes("videos.xml?channel_id=UCabcdefghijklmnopqrstuv")) {
    return ok(`<feed><entry><yt:videoId>v1</yt:videoId><title>Hero 47 explained</title><link rel="alternate" href="https://www.youtube.com/watch?v=v1"/><published>${ago(2 * HOUR).toISOString()}</published></entry></feed>`);
  }
  if (u.includes("reddit.com/r/Overwatch/.rss")) {
    // A busy subreddit: 40 ordinary posts, all newer than everything else, plus one about a leak.
    const crowd = Array.from({ length: 40 }, (_, n) => atomEntry(`t3_c${n}`, `Fanart number ${n}`, ago(10 * 60_000 + n * 1000))).join("");
    return ok(`<feed>${atomEntry("t3_a", "Datamined voice lines for Hero 47", ago(HOUR))}${atomEntry("t3_b", "Best Mercy settings?", ago(HOUR))}${crowd}</feed>`);
  }
  if (u.includes("news.google.com")) {
    return ok(
      rss([
        rssItem("Overwatch hero 47 leaked in datamine - PC Gamer", "https://news.google.com/rss/articles/1", ago(3 * HOUR), '<source url="https://www.pcgamer.com">PC Gamer</source>'),
        rssItem("Overwatch shop rotation and reset countdown - Junk", "https://news.google.com/rss/articles/2", ago(3 * HOUR), '<source url="https://junk.example">Junk</source>'),
        rssItem("Overwatch 2 leak from long ago - OldSite", "https://news.google.com/rss/articles/3", new Date("2022-10-04T00:00:00Z"), '<source url="https://old.example">OldSite</source>'),
        rssItem("Dune secret lair leaked - Polygon", "https://news.google.com/rss/articles/4", ago(3 * HOUR), '<source url="https://polygon.com">Polygon</source>'),
      ]),
    );
  }
  if (u.startsWith("https://bridge.example/Ska/rss")) {
    return ok(rss([rssItem("Zarya mythic weapon datamined", "https://nitter.example/Ska/status/555#m", ago(HOUR)), rssItem("RT by @Ska: something", "https://nitter.example/Other/status/556#m", ago(HOUR))]));
  }
  if (u.startsWith("https://bridge.example/")) return ok(rss([]));
  return ok("<html></html>"); // Blizzard news and patch pages: nothing to parse
}

test("feed end to end: every kind of source is read, labelled, filtered and trusted correctly", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => fakeFetch(u);
  try {
    const problems = [];
    const feedCfg = validateFeed(
      {
        redditGapMs: 0,
        reddit: [{ sub: "Overwatch", kind: "community" }],
        youtube: [],
        newsSearch: ["Overwatch leak"],
        xRssUrl: "https://bridge.example/{handle}/rss",
        tracked: [
          { platform: "youtube", value: "@LeakChan", note: "explains datamines" },
          { platform: "x", value: "Ska" },
          { platform: "website", value: "pcgamer.com" },
        ],
      },
      problems,
    );
    assert.deepEqual(problems, []);
    const feed = createFeed({ feed: feedCfg }, () => {});
    await feed.refresh();
    const items = feed.items();
    const by = (pred) => items.filter(pred);

    // YouTube: the @handle was resolved to a channel id, and a tracked leak channel marks its videos as leaks.
    const yt = by((i) => i.platform === "youtube");
    assert.equal(yt.length, 1);
    assert.equal(yt[0].kind, "leak");
    assert.equal(yt[0].source, "@LeakChan");
    assert.equal(yt[0].trusted, "explains datamines");

    // Reddit: only the post about a leak becomes a leak, and a flood of ordinary posts cannot crowd out the other sources.
    const rd = by((i) => i.platform === "reddit");
    assert.deepEqual(rd.filter((i) => i.kind === "leak").map((i) => i.title), ["Datamined voice lines for Hero 47"]);
    assert.ok(rd.filter((i) => i.kind === "community").length <= 15, "community posts are capped");

    // News search: only the recent, on-topic, leak-worded headline survives, and the tracked website makes it trusted.
    const news = by((i) => i.platform === "news");
    assert.deepEqual(news.map((i) => i.title), ["Overwatch hero 47 leaked in datamine"]);
    assert.equal(news[0].source, "PC Gamer");
    assert.ok(news[0].trusted, "a tracked website must mark its Google News stories as trusted");

    // X: through the bridge, the post links to x.com; the retweet is skipped; the account is trusted.
    const x = by((i) => i.platform === "x");
    assert.equal(x.length, 1);
    assert.equal(x[0].url, "https://x.com/Ska/status/555");
    assert.equal(x[0].source, "@Ska");
    assert.ok(x[0].trusted);

    // Newest first, and every leak is kept even though community posts are the majority.
    for (let k = 1; k < items.length; k++) assert.ok(items[k - 1].publishedAt >= items[k].publishedAt);
    assert.equal(by((i) => i.kind === "leak").length, 4); // the video, the Reddit post, the news story and the X post
    assert.ok(by((i) => i.platform === "youtube" && i.kind === "leak").length === 1, "the video survived the flood of Reddit posts");
  } finally {
    globalThis.fetch = realFetch;
  }
});

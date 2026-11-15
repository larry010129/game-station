import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeEntities,
  parseGateway,
  parseNews,
  parseNvidiaLine,
  parsePatchNotes,
  parsePingMs,
  parseRedditAtom,
  parseYouTubeAtom,
  parseSteamManifest,
  parseTypeperfLine,
  parseVdfLibraries,
} from "../parsers.mjs";

test("decodes entities", () => {
  assert.equal(decodeEntities("Director&#x27;s &amp; Co &#39;x&#39;"), "Director's & Co 'x'");
});

test("nvidia-smi line, including N/A", () => {
  assert.deepEqual(parseNvidiaLine("51, 20, 1080, 12.57"), { temp: 51, load: 20, clockMhz: 1080, powerW: 12.57 });
  assert.deepEqual(parseNvidiaLine("51, 20, 1080, [N/A]"), { temp: 51, load: 20, clockMhz: 1080, powerW: null });
  assert.equal(parseNvidiaLine("garbage"), null);
});

test("typeperf rows, skipping the header", () => {
  assert.equal(parseTypeperfLine('"(PDH-CSV 4.0)","\\\\PC\\a","\\\\PC\\b"'), null);
  assert.deepEqual(parseTypeperfLine('"11/11/2026 23:47:24.135","11.859075","81.557854"'), { utility: 11.859075, performance: 81.557854 });
  assert.equal(parseTypeperfLine("Exiting, please wait..."), null);
});

test("news listing", () => {
  const html =
    '<a slot="gallery-items" href="/news/24316733/directors-take-5v5-and-6v6-better-together" target="_blank"><blz-card><blz-content-block><h3 slot="heading">Director’s Take: 5v5 and 6v6, Better Together</h3></blz-content-block><blz-timestamp slot="footer" timestamp="2026-11-10T17:00:00.000Z" lang="en-US"></blz-timestamp></blz-card></a>';
  const [item] = parseNews(html);
  assert.equal(item.title, "Director’s Take: 5v5 and 6v6, Better Together");
  assert.equal(item.publishedAt, Date.parse("2026-11-10T17:00:00.000Z"));
  assert.equal(item.url, "https://overwatch.blizzard.com/en-us/news/24316733/directors-take-5v5-and-6v6-better-together");
  assert.equal(item.kind, "official");
});

test("patch notes", () => {
  const html =
    '<div class="PatchNotes-body"><div class="PatchNotes-patch PatchNotes-live"><div class="anchor" id="patch-2026-11-05"></div><h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – November 5, 2026</h3><div class="PatchNotes-sectionDescription"><p>This is a hotfix update.</p></div><h5 class="PatchNotesHeroUpdate-name">Wrecking Ball</h5><h5 class="PatchNotesHeroUpdate-name">Mercy</h5></div><div class="PatchNotes-patch"><div class="anchor" id="patch-2026-11-03"></div><h3 class="PatchNotes-patchTitle">Overwatch Retail Patch Notes – November 3, 2026</h3><div class="PatchNotes-sectionDescription"><p>Season update.</p></div></div></div>';
  const [a, b] = parsePatchNotes(html);
  assert.equal(a.id, "patch-2026-11-05");
  assert.equal(a.summary, "Hero changes: Wrecking Ball, Mercy");
  assert.equal(b.summary, "Season update.");
  assert.ok(a.publishedAt > b.publishedAt);
  assert.ok(a.url.endsWith("#patch-2026-11-05"));
});

test("reddit atom", () => {
  const xml =
    '<feed><entry><author><name>/u/someone</name></author><id>t3_abc</id><link href="https://www.reddit.com/r/Overwatch/comments/abc/x/" /><updated>2026-11-11T16:18:14+00:00</updated><title>Don&#39;t miss &amp; this</title></entry></feed>';
  const [e] = parseRedditAtom(xml, "Overwatch", "community");
  assert.equal(e.title, "Don't miss & this");
  assert.equal(e.source, "r/Overwatch");
  assert.equal(e.summary, "u/someone");
  assert.equal(e.publishedAt, Date.parse("2026-11-11T16:18:14+00:00"));
});

test("gateway, ping, steam", () => {
  const route = "          0.0.0.0          0.0.0.0        10.24.0.1      10.24.0.20     35\n          0.0.0.0          0.0.0.0        192.168.0.1      192.168.0.9     50";
  assert.equal(parseGateway(route), "10.24.0.1");
  assert.equal(parsePingMs("Reply from 10.24.0.1: bytes=32 time=4ms TTL=64"), 4);
  assert.equal(parsePingMs("Reply from 10.24.0.1: bytes=32 time<1ms TTL=64"), 1);
  assert.equal(parsePingMs("Request timed out."), null);
  // Traditional Chinese Windows: the word for "time" is translated, the "=4ms" / "<1ms" shape is not.
  assert.equal(parsePingMs("來自 10.24.0.1 的回覆: 位元組=32 時間=4ms TTL=64"), 4);
  assert.equal(parsePingMs("來自 10.24.0.1 的回覆: 位元組=32 時間<1ms TTL=64"), 1);
  assert.equal(parsePingMs("要求等候逾時。"), null);
  assert.equal(parsePingMs("Reply from 10.0.0.1: bytes=32 time=12ms TTL=117"), 12);
  assert.deepEqual(parseSteamManifest('"AppState"\n{\n\t"appid"\t\t"2357570"\n\t"name"\t\t"Overwatch"\n\t"installdir"\t\t"Overwatch"\n}'), { appId: "2357570", installDir: "Overwatch" });
  assert.equal(parseSteamManifest('"appid" "1" "name" "Other" "installdir" "x"'), null);
  assert.deepEqual(parseVdfLibraries('"path"\t\t"D:\\\\Program Files (x86)\\\\Steam"'), ["D:\\Program Files (x86)\\Steam"]);
});

test("YouTube atom feed: links to the exact video and tags the platform", () => {
  const xml = `<feed><entry><id>yt:video:abc123</id><yt:videoId>abc123</yt:videoId><title>New hero &amp; trailer</title><link rel="alternate" href="https://www.youtube.com/shorts/abc123"/><published>2026-11-10T19:16:02+00:00</published></entry></feed>`;
  const [v] = parseYouTubeAtom(xml, "PlayOverwatch");
  assert.equal(v.id, "yt-abc123");
  assert.equal(v.platform, "youtube");
  assert.equal(v.kind, "video");
  assert.equal(v.source, "PlayOverwatch");
  assert.equal(v.url, "https://www.youtube.com/shorts/abc123");
  assert.equal(v.title, "New hero & trailer");
});

test("X RSS: links to x.com, skips retweets and replies", async () => {
  const { parseXRss } = await import("../parsers.mjs");
  const xml = `<rss><channel><item><title>New hero datamined &amp; named</title><link>https://nitter.example/Leaker/status/123#m</link><pubDate>Tue, 10 Nov 2026 19:16:02 GMT</pubDate></item><item><title>RT by @Leaker: x</title><link>https://nitter.example/Other/status/124#m</link><pubDate>Tue, 10 Nov 2026 19:17:02 GMT</pubDate></item><item><title><![CDATA[R to @a: ok]]></title><link>https://nitter.example/Leaker/status/125#m</link><pubDate>Tue, 10 Nov 2026 19:18:02 GMT</pubDate></item></channel></rss>`;
  const items = parseXRss(xml, "Leaker", "leak");
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://x.com/Leaker/status/123");
  assert.equal(items[0].title, "New hero datamined & named");
  assert.equal(items[0].source, "@Leaker");
  assert.equal(items[0].platform, "x");
  assert.equal(items[0].kind, "leak");
  assert.equal(parseXRss(xml, "OWCavalry", "news")[0].kind, "news");
  assert.equal(parseXRss(xml, "PlayOverwatch", "official")[0].kind, "official");
});

test("isOverwatchPost: keeps OW / #OW2, drops pure other-game posts", async () => {
  const { isOverwatchPost, parseXRss } = await import("../parsers.mjs");
  // Mixed multi-game timeline once an xRssUrl bridge is configured.
  assert.equal(isOverwatchPost("Illari kit in the next Overwatch season"), true);
  assert.equal(isOverwatchPost("👀 #OW2"), true);
  assert.equal(isOverwatchPost("New skin #Overwatch"), true);
  assert.equal(isOverwatchPost("OW leak: support hero voice lines"), true);
  assert.equal(isOverwatchPost("New Fortnite collab skin tomorrow"), false);
  assert.equal(isOverwatchPost("Valorant agent datamine"), false);
  // No game named (short image post with no hashtag): keep so dedicated OW accounts stay full.
  assert.equal(isOverwatchPost("🔥"), true);
  assert.equal(isOverwatchPost("New hero datamined & named"), true);
  // Mentions both: keep.
  assert.equal(isOverwatchPost("Fortnite x Overwatch crossover skin"), true);

  const xml = `<rss><channel>
<item><title>OW2 hero leak tonight</title><link>https://nitter.example/MultiGameLeaks/status/1#m</link><pubDate>Tue, 10 Nov 2026 19:16:02 GMT</pubDate></item>
<item><title>New Fortnite skin dump</title><link>https://nitter.example/MultiGameLeaks/status/2#m</link><pubDate>Tue, 10 Nov 2026 19:17:02 GMT</pubDate></item>
<item><title>👀 #OW2</title><link>https://nitter.example/MultiGameLeaks/status/3#m</link><pubDate>Tue, 10 Nov 2026 19:18:02 GMT</pubDate></item>
</channel></rss>`;
  const kept = parseXRss(xml, "MultiGameLeaks", "leak").filter((i) => isOverwatchPost(i.title));
  assert.deepEqual(
    kept.map((i) => i.title),
    ["OW2 hero leak tonight", "👀 #OW2"],
  );
});

test("Google News RSS: publisher becomes the source and is cut from the title", async () => {
  const { parseGoogleNewsRss } = await import("../parsers.mjs");
  const xml = `<rss><channel><item><title>Hero 47 leaked in datamine - PC Gamer</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate><source url="https://pcgamer.com">PC Gamer</source></item></channel></rss>`;
  const [i] = parseGoogleNewsRss(xml);
  assert.equal(i.title, "Hero 47 leaked in datamine");
  assert.equal(i.source, "PC Gamer");
  assert.equal(i.platform, "news");
  assert.equal(i.kind, "leak");
});

test("Reddit atom: a community post about a leak is tagged as a leak", async () => {
  const { parseRedditAtom } = await import("../parsers.mjs");
  const e = (t, id) => `<entry><id>${id}</id><title>${t}</title><link href="https://reddit.com/${id}"/><published>2026-11-10T10:00:00+00:00</published></entry>`;
  const out = parseRedditAtom(`<feed>${e("Datamined voice lines for Hero 47", "a")}${e("Best Mercy settings?", "b")}</feed>`, "Overwatch", "community");
  assert.deepEqual(out.map((i) => i.kind), ["leak", "community"]);
});

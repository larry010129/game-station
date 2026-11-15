// Pure parsing helpers for every external source. No I/O here so they can be
// tested against saved samples.

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " })[n]);
}

/** A headline that talks about a leak, datamine or rumour. */
export const LEAKY = /\b(leak(?:s|ed|er|ers)?|datamin\w*|rumou?r\w*)\b/i;

/** Names Overwatch (including #OW / #OW2 hashtags common on short image posts). */
export const OVERWATCHY = /overwatch|\bOW2?\b|#OW\b/i;

/**
 * Another live-service game a multi-game leaker might post about. Used only to drop
 * posts that name that game and never mention Overwatch.
 */
const OTHER_GAME_FOR_OW =
  /\b(fortnite|valorant|apex\s*legends?|league\s*of\s*legends|genshin|marvel\s*rivals|call\s*of\s*duty|\bcod\b|warzone|destiny(?:\s*2)?|diablo|hearthstone|\bwow\b|world\s*of\s*warcraft|counter[\s-]*strike|\bcs2\b|rocket\s*league|pubg|teamfight\s*tactics|\btft\b)\b/i;

/** Names Apex Legends (including short #Apex tags). */
export const APEXY = /apex\s*legends?|\bapex\b|#apex\b/i;

const OTHER_GAME_FOR_APEX =
  /\b(fortnite|valorant|overwatch|\bOW2?\b|league\s*of\s*legends|genshin|marvel\s*rivals|call\s*of\s*duty|\bcod\b|warzone|destiny(?:\s*2)?|diablo|hearthstone|\bwow\b|world\s*of\s*warcraft|counter[\s-]*strike|\bcs2\b|rocket\s*league|pubg|teamfight\s*tactics|\btft\b)\b/i;

/**
 * Keep Overwatch posts (and short image posts that only say #OW2). Drop posts that
 * clearly name another game and never mention Overwatch. Ambiguous text (no game named)
 * is kept so a dedicated OW account is not emptied.
 */
export function isOverwatchPost(text) {
  const t = String(text ?? "");
  if (OVERWATCHY.test(t)) return true;
  if (OTHER_GAME_FOR_OW.test(t)) return false;
  return true;
}

/** Same idea as isOverwatchPost, for Apex-dedicated and multi-game channels. */
export function isApexPost(text) {
  const t = String(text ?? "");
  if (APEXY.test(t)) return true;
  if (OTHER_GAME_FOR_APEX.test(t)) return false;
  return true;
}

/** The channel id (UC...) from a YouTube channel page, or from a youtube.com/channel/UC... link. */
export function parseYouTubeChannelId(text) {
  const m = /"channelId":"(UC[\w-]{20,})"/.exec(text) ?? /youtube\.com\/channel\/(UC[\w-]{20,})/.exec(text) ?? /<meta itemprop="identifier" content="(UC[\w-]{20,})"/.exec(text);
  return m ? m[1] : null;
}

export function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** "[N/A]" and blanks become null; everything else a number. */
function num(v) {
  const t = String(v ?? "").trim();
  if (!t || /n\/a|not supported/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** `nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,clocks.gr,power.draw --format=csv,noheader,nounits` */
export function parseNvidiaLine(line) {
  const f = line.split(",");
  if (f.length < 4) return null;
  return { temp: num(f[0]), load: num(f[1]), clockMhz: num(f[2]), powerW: num(f[3]) };
}

/** One data row from `typeperf` with the Processor Utility and Processor Performance counters. */
export function parseTypeperfLine(line) {
  const m = /^"[^"]*","([^"]*)","([^"]*)"/.exec(line.trim());
  if (!m) return null;
  const utility = num(m[1]);
  const performance = num(m[2]);
  if (utility == null && performance == null) return null;
  return { utility, performance };
}

/**
 * LibreHardwareMonitor's web server (`/data.json`) is a tree of nodes with
 * Text, Value and Children. Returns the best CPU temperature it can find.
 */
export function parseLhm(root) {
  const found = [];
  const walk = (node, underCpu) => {
    if (!node || typeof node !== "object") return;
    const isCpu = underCpu || /cpu/i.test(node.ImageURL ?? "") || /ryzen|intel.*core|core i\d|xeon/i.test(node.Text ?? "");
    const m = /^(-?\d+(?:[.,]\d+)?)\s*°?\s*C$/i.exec(String(node.Value ?? "").trim());
    if (isCpu && m && !(node.Children?.length)) {
      found.push({ name: String(node.Text ?? ""), value: Number(m[1].replace(",", ".")) });
    }
    for (const c of node.Children ?? []) walk(c, isCpu);
  };
  walk(root, false);
  if (!found.length) return null;
  const pick = (re) => found.find((f) => re.test(f.name));
  const best = pick(/tctl|tdie/i) ?? pick(/package/i) ?? pick(/core.*max|average/i);
  return Math.round(best ? best.value : Math.max(...found.map((f) => f.value)));
}

/** Blizzard's news listing: cards inside `<a slot="gallery-items" href="/news/ID/slug">`. */
export function parseNews(html, origin = "https://overwatch.blizzard.com") {
  const out = [];
  for (const m of html.matchAll(/<a slot="gallery-items" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const title = /<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2]);
    const ts = /timestamp="([^"]+)"/.exec(m[2]);
    if (!title || !ts) continue;
    const idMatch = /\/news\/(\d+)/.exec(m[1]);
    const path = m[1].startsWith("/en-us/") ? m[1] : `/en-us${m[1]}`;
    out.push({
      id: `news-${idMatch ? idMatch[1] : m[1]}`,
      platform: "blizzard",
      kind: "official",
      title: stripTags(title[1]),
      source: "Blizzard",
      publishedAt: Date.parse(ts[1]),
      summary: "",
      url: origin + path,
    });
  }
  return out;
}

/** Blizzard's patch notes page. Each patch is a `PatchNotes-patch` block with an anchor id like patch-2026-11-05. */
export function parsePatchNotes(html, pageUrl = "https://overwatch.blizzard.com/en-us/news/patch-notes/") {
  const out = [];
  for (const block of html.split(/<div class="PatchNotes-patch\b/).slice(1)) {
    const id = /id="patch-(\d{4})-(\d{2})-(\d{2})"/.exec(block);
    const title = /PatchNotes-patchTitle">([^<]+)</.exec(block);
    if (!id || !title) continue;
    const heroes = [...new Set([...block.matchAll(/PatchNotesHeroUpdate-name">([^<]+)</g)].map((h) => decodeEntities(h[1]).trim()))];
    const desc = /PatchNotes-sectionDescription">\s*<p>([\s\S]*?)<\/p>/.exec(block);
    let summary = desc ? stripTags(desc[1]) : "";
    if (heroes.length) {
      const shown = heroes.slice(0, 4).join(", ");
      summary = `Hero changes: ${shown}${heroes.length > 4 ? ` and ${heroes.length - 4} more` : ""}`;
    }
    // Buff or nerf is judged by the wording of each hero's changes, so it is a guess.
    const heroChanges = block
      .split(/PatchNotesHeroUpdate-name">/)
      .slice(1)
      .map((seg) => {
        const name = decodeEntities(seg.slice(0, seg.indexOf("<"))).trim();
        const text = stripTags(seg.slice(seg.indexOf(">") + 1).split(/PatchNotesHeroUpdate-name">/)[0]);
        const up = (text.match(/\b(increased|added|improved|faster|extended|more)\b/gi) ?? []).length;
        const down = (text.match(/\b(reduced|decreased|removed|slower|lowered|less)\b/gi) ?? []).length;
        return { name, up, down };
      })
      .filter((h) => h.name);
    out.push({
      id: `patch-${id[1]}-${id[2]}-${id[3]}`,
      heroChanges,
      platform: "blizzard",
      kind: "patch",
      title: decodeEntities(title[1]).trim(),
      source: "Blizzard",
      publishedAt: Date.UTC(Number(id[1]), Number(id[2]) - 1, Number(id[3]), 17, 0, 0),
      summary,
      url: `${pageUrl}#patch-${id[1]}-${id[2]}-${id[3]}`,
    });
  }
  return out;
}

/** A subreddit's Atom feed. */
export function parseRedditAtom(xml, subreddit, kind) {
  const out = [];
  for (const e of xml.split("<entry>").slice(1)) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(e);
    const link = /<link href="([^"]+)"/.exec(e);
    const when = /<published>([^<]+)<\/published>/.exec(e) ?? /<updated>([^<]+)<\/updated>/.exec(e);
    const idm = /<id>([^<]+)<\/id>/.exec(e);
    const author = /<author><name>([^<]+)<\/name>/.exec(e);
    if (!title || !link || !when) continue;
    out.push({
      id: `reddit-${idm ? idm[1] : link[1]}`,
      platform: "reddit",
      // A community sub has no leak section any more: a post that talks about a leak or datamine counts as one.
      kind: kind === "community" && LEAKY.test(title[1]) ? "leak" : kind,
      title: stripTags(title[1]),
      source: `r/${subreddit}`,
      publishedAt: Date.parse(when[1]),
      summary: author ? decodeEntities(author[1]).replace(/^\/u\//, "u/") : "",
      url: decodeEntities(link[1]),
    });
  }
  return out;
}

/**
 * An X/Twitter account's RSS (from a Nitter or RSSHub bridge: x.com has no public feed). Posts link
 * back to x.com, not the bridge. Retweets and replies are skipped: they are not the account's own news.
 */
export function parseXRss(xml, handle, kind = "leak") {
  const out = [];
  for (const e of xml.split(/<item[ >]/).slice(1)) {
    const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(e);
    const link = /<link>(?:<!\[CDATA\[)?\s*([^<\]\s]+)/.exec(e);
    const when = /<pubDate>([^<]+)<\/pubDate>/.exec(e);
    if (!title || !link || !when) continue;
    const text = stripTags(title[1]);
    if (/^(RT\b|R to\b)/.test(text)) continue;
    const id = /status\/(\d+)/.exec(link[1]);
    const publishedAt = Date.parse(when[1]);
    if (!id || !Number.isFinite(publishedAt)) continue;
    out.push({
      id: `x-${id[1]}`,
      platform: "x",
      kind,
      title: text.length > 200 ? `${text.slice(0, 197)}…` : text,
      source: `@${handle}`,
      publishedAt,
      summary: "",
      url: `https://x.com/${handle}/status/${id[1]}`,
    });
  }
  return out;
}

/**
 * Google News search RSS: one keyword search over many sites, no key or login. Titles come as
 * "Headline - Publisher"; the publisher becomes the source. Links go through news.google.com.
 */
export function parseGoogleNewsRss(xml, kind = "leak") {
  const out = [];
  for (const e of xml.split(/<item[ >]/).slice(1)) {
    const title = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(e);
    const link = /<link>(?:<!\[CDATA\[)?\s*([^<\]\s]+)/.exec(e);
    const when = /<pubDate>([^<]+)<\/pubDate>/.exec(e);
    const pub = /<source[^>]*>([\s\S]*?)<\/source>/.exec(e);
    // The story link goes through news.google.com; the publisher's own address is what a "trusted website" must match.
    const pubUrl = /<source[^>]*\burl="([^"]+)"/.exec(e);
    if (!title || !link || !when) continue;
    const publishedAt = Date.parse(when[1]);
    if (!Number.isFinite(publishedAt)) continue;
    const source = pub ? stripTags(pub[1]) : "News";
    let text = stripTags(title[1]);
    const suffix = ` - ${source}`;
    if (text.endsWith(suffix)) text = text.slice(0, -suffix.length);
    out.push({
      id: `gn-${decodeEntities(link[1])}`,
      platform: "news",
      kind,
      title: text.length > 200 ? `${text.slice(0, 197)}…` : text,
      source,
      publishedAt,
      summary: "",
      url: decodeEntities(link[1]),
      ...(pubUrl ? { sourceUrl: decodeEntities(pubUrl[1]) } : {}),
    });
  }
  return out;
}

/** A YouTube channel's public Atom feed (videos and Shorts). Each link goes to that exact video. */
export function parseYouTubeAtom(xml, channelName = "YouTube", channelKind = "video") {
  const out = [];
  for (const e of xml.split("<entry>").slice(1)) {
    const vid = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(e);
    const title = /<title>([\s\S]*?)<\/title>/.exec(e);
    const link = /<link rel="alternate" href="([^"]+)"/.exec(e);
    const when = /<published>([^<]+)<\/published>/.exec(e);
    if (!vid || !title || !when) continue;
    out.push({
      id: `yt-${vid[1]}`,
      platform: "youtube",
      kind: channelKind === "leak" || LEAKY.test(title[1]) ? "leak" : "video",
      title: stripTags(title[1]),
      source: channelName,
      publishedAt: Date.parse(when[1]),
      summary: "",
      url: link ? decodeEntities(link[1]) : `https://www.youtube.com/watch?v=${vid[1]}`,
    });
  }
  return out;
}

/** `route print -4 0.0.0.0`: the default gateway with the lowest metric. */
export function parseGateway(text) {
  let best = null;
  for (const m of text.matchAll(/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)\s+\S+\s+(\d+)/gm)) {
    const metric = Number(m[2]);
    if (!best || metric < best.metric) best = { ip: m[1], metric };
  }
  return best ? best.ip : null;
}

/**
 * `ping -n 1`: the reply time. Windows localises the word ("time", "時間", ...) but always
 * prints it as `=4ms` or `<1ms`, so the number is found by its sign and unit only. `TTL=64` and
 * `bytes=32` have no "ms" after them, so they never match.
 */
export function parsePingMs(text) {
  const m = /([=<])\s*(\d+)\s*ms\b/i.exec(text);
  return m ? (m[1] === "<" ? 1 : Number(m[2])) : null;
}

/** Steam: the Overwatch entry in appmanifest_N.acf. */
export function parseSteamManifest(text) {
  const name = /"name"\s+"([^"]*)"/.exec(text);
  const dir = /"installdir"\s+"([^"]*)"/.exec(text);
  const id = /"appid"\s+"(\d+)"/.exec(text);
  if (!name || !dir || !id || !/overwatch/i.test(name[1])) return null;
  return { appId: id[1], installDir: dir[1] };
}

export function parseVdfLibraries(text) {
  return [...text.matchAll(/"path"\s+"([^"]+)"/g)].map((m) => m[1].replace(/\\\\/g, "\\"));
}

/** Any installed Steam game from an appmanifest file. Tools and runtimes are skipped. */
export function parseSteamApp(text) {
  const name = /"name"\s+"([^"]*)"/.exec(text);
  const id = /"appid"\s+"(\d+)"/.exec(text);
  if (!name || !id) return null;
  if (/^(steamworks common|steam linux runtime|proton|steamvr)/i.test(name[1])) return null;
  const last = Number(/"LastPlayed"\s+"(\d+)"/.exec(text)?.[1] ?? 0);
  const size = Number(/"SizeOnDisk"\s+"(\d+)"/.exec(text)?.[1] ?? 0);
  return { appId: id[1], name: name[1], lastPlayed: last ? last * 1000 : 0, sizeBytes: size };
}

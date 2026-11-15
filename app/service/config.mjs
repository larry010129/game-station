import fs from "node:fs";
import { CONFIG_FILE, writeJson } from "./paths.mjs";
import { PORT } from "./constants.mjs";
import { applyTracked, normalizeTrackedList } from "./tracked.mjs";

/** Defaults for this laptop. A local config.json can override any field except the port, which is fixed. */
export const DEFAULTS = {
  host: "127.0.0.1",
  lhmUrl: "http://127.0.0.1:8085/data.json",
  regionHost: "battle.net",
  allowedOrigins: [],
  games: ["Overwatch.exe", "r5apex.exe", "r5apex_dx12.exe"],
  disabledSteps: [],
  closeApps: ["OneDrive.exe", "ArmouryCrate.exe", "ASUSSoftwareManager.exe"],
  feed: {
    newsUrl: "https://overwatch.blizzard.com/en-us/news/",
    patchUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    reddit: [
      // r/OverwatchLeaks (no underscore) is abandoned. r/Overwatch_Leaks is the active leak board.
      // Community subs: a post that mentions a leak or datamine shows under Leaks.
      { sub: "Overwatch", kind: "community" },
      { sub: "CompetitiveOverwatch", kind: "community" },
      { sub: "Overwatch_Leaks", kind: "leak" },
    ],
    youtube: [
      { channelId: "UClOf1XXinvZsy4wKPAkro2A", name: "PlayOverwatch" },
      // Public channel feeds via handle; leak-worded titles still land in the leak bucket.
      { handle: "@YourOverwatch", name: "YourOverwatch" },
      { handle: "@stylosa", name: "Stylosa" },
    ],
    // X/Twitter has no public feed. Set xRssUrl to a Nitter or RSSHub bridge you trust, with {handle} where the
    // account goes (e.g. "https://nitter.example.com/{handle}/rss"), and add leakers to x. Empty = off.
    // official = Blizzard; leak = datamine / confirm; news = community news (not primary leakers).
    x: [
      { handle: "PlayOverwatch", kind: "official" },
      { handle: "wiki_ow", kind: "leak" },
      { handle: "SkaVorah", kind: "leak" },
      { handle: "OWCavalry", kind: "news" },
      { handle: "OmnicPost", kind: "news" },
    ],
    xRssUrl: "",
    // Keyword searches run on Google News (free, no key, no account names needed). Cap: 6 queries, each ≤80 chars.
    // Headlines still must name Overwatch and a leak/datamine/rumour word (LEAKY filter in feed.mjs).
    newsSearch: [
      "Overwatch leak",
      "Overwatch season leak",
      "Overwatch rumor",
      "Overwatch datamine",
      "Overwatch hero leak",
      "Overwatch 2 leak",
    ],
    // Sources you trust for leaks (an X account, YouTube channel, subreddit or website). Their items get a "Trusted" badge.
    // Add one only after you have seen its leaks come true. Names are matched exactly; a name with a dot is a website.
    // Added from the Vault page (Sources): { platform: "x"|"youtube"|"reddit"|"website", value, note }.
    tracked: [],
    trusted: [
      { name: "Blizzard", note: "Official Blizzard news and patch notes" },
      { name: "PlayOverwatch", note: "Official Overwatch account (YouTube and X)" },
      { name: "wiki_ow", note: "Datamine-focused X account; often cited on r/Overwatch_Leaks" },
      { name: "SkaVorah", note: "X account that confirms or denies leaks" },
    ],
    refreshMs: 30 * 60 * 1000,
    redditGapMs: 12000,
    userAgent: "CommandStation/0.2 (personal dashboard; Windows)",
  },
};

const isStr = (v) => typeof v === "string" && v.length > 0;
const strList = (v) => Array.isArray(v) && v.every(isStr);

const isHttpUrl = (v) => {
  if (!isStr(v)) return false;
  try {
    return /^https?:$/.test(new URL(v).protocol);
  } catch {
    return false;
  }
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const listKey = (v) => String(v).replace(/^@/, "").toLowerCase();

/** Former default handles dropped for OW-primary (Fortnite / unused). Soft-merge prunes these so new built-ins can land. */
const RETIRED_X = new Set(["_firemonkey", "naeri"]);
const RETIRED_TRUSTED = new Set(["_firemonkey", "naeri"]);

function pruneRetired(userList, retired, keyOf) {
  return userList.filter((e) => !retired.has(listKey(keyOf(e))));
}

/**
 * When config.json still has an older built-in-only list (common after first-run seeding),
 * append any new default entries that are missing. If the user replaced the list with any
 * non-default entry, leave their list alone. Never removes custom entries; retired built-ins
 * are stripped first so an old Fortnite handle does not block soft-merge.
 */
function mergeBuiltInList(userList, defaultList, keyOf, maxLen = Infinity) {
  const defKeys = new Set(defaultList.map((e) => listKey(keyOf(e))));
  const onlyBuiltIns = userList.every((e) => defKeys.has(listKey(keyOf(e))));
  if (!onlyBuiltIns) return userList;
  const out = [...userList];
  const seen = new Set(out.map((e) => listKey(keyOf(e))));
  for (const d of defaultList) {
    if (out.length >= maxLen) break;
    const k = listKey(keyOf(d));
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(d);
  }
  return out;
}

/** Keep designed kinds on built-in handles (e.g. PlayOverwatch → official) without touching custom entries. */
function syncBuiltInKinds(userList, defaultList, keyOf) {
  const byKey = new Map(defaultList.map((e) => [listKey(keyOf(e)), e]));
  return userList.map((e) => {
    const d = byKey.get(listKey(keyOf(e)));
    return d && isStr(d.kind) ? { ...e, kind: d.kind } : e;
  });
}

const X_KINDS = new Set(["official", "leak", "news"]);

/**
 * Merges the user's feed block over the defaults, one field at a time. Anything unusable (a
 * refresh of 0 or "30m", a non-array source list, a subreddit with a slash in it) is reported in
 * `problems` and replaced by the default, so a typo cannot cause a request storm or crash the feed.
 */
export function validateFeed(saved, problems) {
  const out = { ...DEFAULTS.feed };
  if (saved === undefined) return out;
  if (!isObj(saved)) {
    problems.push('ignoring invalid "feed" in config.json');
    return out;
  }
  const bad = (key) => problems.push(`ignoring invalid "feed.${key}" in config.json`);
  const field = (key, ok) => {
    if (saved[key] === undefined) return;
    if (ok(saved[key])) out[key] = saved[key];
    else bad(key);
  };
  field("newsUrl", isHttpUrl);
  field("patchUrl", isHttpUrl);
  field("userAgent", isStr);
  field("xRssUrl", (v) => v === "" || (isHttpUrl(v) && v.includes("{handle}")));
  // At least a minute: anything faster hammers Blizzard and Reddit.
  field("refreshMs", (v) => typeof v === "number" && Number.isFinite(v) && v >= 60_000);
  field("redditGapMs", (v) => typeof v === "number" && Number.isFinite(v) && v >= 0);
  field("newsSearch", (v) => strList(v) && v.length <= 6 && v.every((q) => q.length <= 80));
  // The user's own list from the Vault page. Entries are checked one by one; bad ones are reported and dropped.
  const trackedErrors = [];
  if (saved.tracked !== undefined) {
    if (!Array.isArray(saved.tracked)) bad("tracked");
    else out.tracked = normalizeTrackedList(saved.tracked, trackedErrors);
    for (const msg of trackedErrors) problems.push(`ignoring an invalid entry in "feed.tracked" in config.json (${msg})`);
  }
  const list = (key, ok, shape) => {
    if (saved[key] === undefined) return;
    if (!Array.isArray(saved[key])) return bad(key);
    const keep = [];
    for (const entry of saved[key]) {
      if (isObj(entry) && ok(entry)) keep.push(shape(entry));
      else problems.push(`ignoring an invalid entry in "feed.${key}" in config.json`);
    }
    out[key] = keep;
  };
  list(
    "reddit",
    (e) => typeof e.sub === "string" && /^\w+$/.test(e.sub),
    (e) => ({ sub: e.sub, kind: isStr(e.kind) ? e.kind : "community" }),
  );
  list(
    "x",
    (e) => typeof e.handle === "string" && /^\w{1,15}$/.test(e.handle),
    (e) => ({ handle: e.handle, kind: X_KINDS.has(e.kind) ? e.kind : "leak" }),
  );
  list(
    "trusted",
    (e) => typeof e.name === "string" && e.name.trim().length > 0 && e.name.length <= 60,
    (e) => ({ name: e.name.trim(), ...(isStr(e.note) ? { note: e.note.slice(0, 120) } : {}) }),
  );
  // A YouTube channel can be given as channelId, as a @handle, or as any channel link; the app finds the id itself.
  const ytId = (v) => typeof v === "string" && /^[\w-]+$/.test(v);
  const ytHandle = (v) => typeof v === "string" && /^@?[\w.-]{2,60}$/.test(v);
  const ytUrl = (v) => isHttpUrl(v) && /(^|\.)youtube\.com$/i.test(new URL(v).hostname);
  list(
    "youtube",
    (e) => ytId(e.channelId) || ytHandle(e.handle) || ytUrl(e.url),
    (e) => {
      const ref = {};
      if (ytId(e.channelId)) ref.channelId = e.channelId;
      if (ytHandle(e.handle)) ref.handle = e.handle;
      if (ytUrl(e.url)) ref.url = e.url;
      // kind "leak": every video from this channel is a leak; otherwise only titles that talk about a leak are.
      return { ...ref, name: isStr(e.name) ? e.name : (ref.handle ?? ref.channelId ?? ref.url), kind: e.kind === "leak" ? "leak" : "video" };
    },
  );
  // Older config.json files often seed the previous default lists. Append any new built-ins still missing;
  // custom (non-default) lists are left alone. newsSearch stays within the schema cap of 6.
  // Drop retired OW-unrelated built-ins first so soft-merge can treat the rest as built-in-only.
  out.x = pruneRetired(out.x, RETIRED_X, (e) => e.handle);
  out.trusted = pruneRetired(out.trusted, RETIRED_TRUSTED, (e) => e.name);
  out.newsSearch = mergeBuiltInList(out.newsSearch, DEFAULTS.feed.newsSearch, (q) => q, 6);
  out.reddit = mergeBuiltInList(out.reddit, DEFAULTS.feed.reddit, (e) => e.sub);
  out.youtube = mergeBuiltInList(out.youtube, DEFAULTS.feed.youtube, (e) => e.channelId ?? e.handle ?? e.url ?? e.name);
  out.x = mergeBuiltInList(out.x, DEFAULTS.feed.x, (e) => e.handle);
  out.trusted = mergeBuiltInList(out.trusted, DEFAULTS.feed.trusted, (e) => e.name);
  out.x = syncBuiltInKinds(out.x, DEFAULTS.feed.x, (e) => e.handle);
  out.reddit = syncBuiltInKinds(out.reddit, DEFAULTS.feed.reddit, (e) => e.sub);
  // Tracked sources are added on top of the lists above (the built-in ones stay put).
  return out.tracked.length ? applyTracked(out) : out;
}

/** Reads the user config. A missing file is fine; a corrupt one is reported and never overwritten. */
export function readUserConfig(readFile = (f) => fs.readFileSync(f, "utf8"), file = CONFIG_FILE) {
  let text;
  try {
    text = readFile(file);
  } catch (e) {
    // Only a genuinely absent file counts as "missing". A locked or unreadable one (EBUSY, EPERM, ...)
    // exists: treat it as corrupt so the defaults are never seeded over the user's file.
    if (e?.code === "ENOENT") return { saved: {}, exists: false, problems: [] };
    return { saved: {}, exists: true, corrupt: true, problems: [`config.json could not be read (${e?.code ?? e?.message ?? "unknown error"})`] };
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { saved: parsed, exists: true, problems: [] };
    return { saved: {}, exists: true, corrupt: true, problems: ["config.json is not a JSON object"] };
  } catch (e) {
    return { saved: {}, exists: true, corrupt: true, problems: [`config.json is not valid JSON (${e.message})`] };
  }
}

/** `deps` (tests only): readFile, writeJson and file replace the real config.json access. */
export function loadConfig(deps = {}) {
  const { saved, exists, corrupt, problems } = readUserConfig(deps.readFile, deps.file);
  const pick = (key, ok) => {
    if (saved[key] === undefined) return DEFAULTS[key];
    if (ok(saved[key])) return saved[key];
    problems.push(`ignoring invalid "${key}" in config.json`);
    return DEFAULTS[key];
  };
  const config = {
    ...DEFAULTS,
    host: pick("host", isStr),
    lhmUrl: pick("lhmUrl", isStr),
    regionHost: pick("regionHost", isStr),
    games: pick("games", strList),
    closeApps: pick("closeApps", strList),
    disabledSteps: pick("disabledSteps", strList),
    allowedOrigins: pick("allowedOrigins", strList),
    feed: validateFeed(saved.feed, problems),
  };
  // The port is fixed (constants.mjs PORT): the dashboard and the app's CSP only know 8787. A "port" left in an
  // older config.json is ignored; say so unless it is the default the old seeding wrote.
  if (saved.port !== undefined && saved.port !== PORT) problems.push(`ignoring "port" in config.json: the service always listens on ${PORT}`);
  config.problems = problems;
  config.corrupt = !!corrupt;
  // Seed a local config file on first run only. Never overwrite one that exists
  // (corrupt or not): the user may be mid-edit.
  if (!exists) {
    try {
      const { problems: _p, corrupt: _c, ...toSave } = config;
      (deps.writeJson ?? writeJson)(deps.file ?? CONFIG_FILE, toSave);
    } catch {
      // Read-only profile: run on defaults.
    }
  }
  return config;
}

import fs from "node:fs";
import { CONFIG_FILE, writeJson } from "./paths.mjs";
import { PORT } from "./constants.mjs";

/** Defaults for this laptop. A local config.json can override any field except the port, which is fixed. */
export const DEFAULTS = {
  host: "127.0.0.1",
  lhmUrl: "http://127.0.0.1:8085/data.json",
  regionHost: "battle.net",
  allowedOrigins: [],
  games: ["Overwatch.exe"],
  disabledSteps: [],
  closeApps: ["OneDrive.exe", "ArmouryCrate.exe", "ASUSSoftwareManager.exe"],
  feed: {
    newsUrl: "https://overwatch.blizzard.com/en-us/news/",
    patchUrl: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
    reddit: [
      { sub: "Overwatch", kind: "community" },
      { sub: "OverwatchLeaks", kind: "leak" },
    ],
    youtube: [{ channelId: "UClOf1XXinvZsy4wKPAkro2A", name: "PlayOverwatch" }],
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
  // At least a minute: anything faster hammers Blizzard and Reddit.
  field("refreshMs", (v) => typeof v === "number" && Number.isFinite(v) && v >= 60_000);
  field("redditGapMs", (v) => typeof v === "number" && Number.isFinite(v) && v >= 0);
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
    "youtube",
    (e) => typeof e.channelId === "string" && /^[\w-]+$/.test(e.channelId),
    (e) => ({ channelId: e.channelId, name: isStr(e.name) ? e.name : e.channelId }),
  );
  return out;
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

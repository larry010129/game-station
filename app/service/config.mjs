import fs from "node:fs";
import { CONFIG_FILE, writeJson } from "./paths.mjs";

/** Defaults for this laptop. A local config.json can override any field. */
export const DEFAULTS = {
  host: "127.0.0.1",
  port: 8787,
  lhmUrl: "http://127.0.0.1:8085/data.json",
  regionHost: "battle.net",
  presentMonPath: null,
  presentMonArgs: ["--process_name", "{process}", "--output_stdout", "--terminate_existing"],
  allowedOrigins: [],
  games: ["Overwatch.exe"],
  closeApps: ["Spotify.exe", "OneDrive.exe", "ArmouryCrate.exe", "ASUSSoftwareManager.exe"],
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

/** Reads the user config. A missing file is fine; a corrupt one is reported and never overwritten. */
function readUserConfig() {
  let text;
  try {
    text = fs.readFileSync(CONFIG_FILE, "utf8");
  } catch (e) {
    return { saved: {}, exists: false, problems: [] };
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { saved: parsed, exists: true, problems: [] };
    return { saved: {}, exists: true, corrupt: true, problems: ["config.json is not a JSON object"] };
  } catch (e) {
    return { saved: {}, exists: true, corrupt: true, problems: [`config.json is not valid JSON (${e.message})`] };
  }
}

export function loadConfig() {
  const { saved, exists, corrupt, problems } = readUserConfig();
  const pick = (key, ok) => {
    if (saved[key] === undefined) return DEFAULTS[key];
    if (ok(saved[key])) return saved[key];
    problems.push(`ignoring invalid "${key}" in config.json`);
    return DEFAULTS[key];
  };
  const savedFeed = saved.feed && typeof saved.feed === "object" && !Array.isArray(saved.feed) ? saved.feed : {};
  if (saved.feed !== undefined && savedFeed !== saved.feed) problems.push('ignoring invalid "feed" in config.json');
  const config = {
    ...DEFAULTS,
    host: pick("host", isStr),
    port: pick("port", (v) => Number.isInteger(v) && v > 0 && v < 65536),
    lhmUrl: pick("lhmUrl", isStr),
    regionHost: pick("regionHost", isStr),
    presentMonPath: pick("presentMonPath", (v) => v === null || isStr(v)),
    presentMonArgs: pick("presentMonArgs", strList),
    games: pick("games", strList),
    closeApps: pick("closeApps", strList),
    allowedOrigins: pick("allowedOrigins", strList),
    feed: { ...DEFAULTS.feed, ...savedFeed },
  };
  // Environment override for the port (also read by index.mjs).
  const envPort = Number(process.env.PORT);
  if (process.env.PORT && Number.isInteger(envPort) && envPort > 0 && envPort < 65536) config.port = envPort;
  config.problems = problems;
  config.corrupt = !!corrupt;
  // Seed a local config file on first run only. Never overwrite one that exists
  // (corrupt or not): the user may be mid-edit.
  if (!exists) {
    try {
      const { problems: _p, corrupt: _c, ...toSave } = config;
      writeJson(CONFIG_FILE, { ...toSave, port: DEFAULTS.port });
    } catch {
      // Read-only profile: run on defaults.
    }
  }
  return config;
}

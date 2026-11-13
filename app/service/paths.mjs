import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DATA_DIR = path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "CommandStation");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const JOURNAL_FILE = path.join(DATA_DIR, "journal.json");
export const FEED_CACHE_FILE = path.join(DATA_DIR, "feed-cache.json");
export const CONFIG_FILE = path.join(DATA_DIR, "config.json");

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Written to a temp file first, so a crash mid-write cannot leave a half-written journal. */
export function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

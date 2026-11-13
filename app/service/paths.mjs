import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Where everything is stored. COMMAND_STATION_DATA overrides the folder (used by tests and for a portable
 * copy). Under `node --test` (NODE_TEST_CONTEXT is set in every test process) it defaults to a throwaway temp
 * folder, so a test can never read or write the real %APPDATA%\CommandStation.
 */
function chooseDataDir() {
  if (process.env.COMMAND_STATION_DATA) return path.resolve(process.env.COMMAND_STATION_DATA);
  if (process.env.NODE_TEST_CONTEXT) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "command-station-test-"));
    process.on("exit", () => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // A temp folder left behind is harmless.
      }
    });
    return dir;
  }
  return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "CommandStation");
}

export const DATA_DIR = chooseDataDir();
fs.mkdirSync(DATA_DIR, { recursive: true });

export const JOURNAL_FILE = path.join(DATA_DIR, "journal.json");
export const FEED_CACHE_FILE = path.join(DATA_DIR, "feed-cache.json");
export const CONFIG_FILE = path.join(DATA_DIR, "config.json");

/** Forgiving read for caches and history: any problem gives `fallback`. Never use it for data that must not be lost. */
export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * Strict read: `fallback` only when the file is genuinely absent (ENOENT). A corrupt file or one that cannot be
 * read right now (locked, permission) throws, so the caller can refuse to carry on and overwrite it.
 */
export function readJsonStrict(file, fallback) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return fallback;
    throw e;
  }
  return JSON.parse(text);
}

/** Written to a temp file first, so a crash mid-write cannot leave a half-written journal. */
export function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

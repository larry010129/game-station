import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The one port the service listens on. The dashboard (live.ts) and the Tauri CSP are fixed to it, so it is not configurable. */
export const PORT = 8787;

/** Overwatch 2 on Steam. The one place this id lives. */
export const OVERWATCH_APP_ID = 2357570;

/** Apex Legends on Steam. */
export const APEX_APP_ID = 1172470;

/** The app version, from package.json. A bundled service has no package.json beside it, so it falls back. */
export const VERSION = (() => {
  try {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const v = JSON.parse(fs.readFileSync(file, "utf8")).version;
    if (typeof v === "string" && v) return v;
  } catch {
    // not shipped beside the service
  }
  return "0.2.0";
})();

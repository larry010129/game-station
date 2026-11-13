import fs from "node:fs";
import { CONFIG_FILE, readJson, writeJson } from "./paths.mjs";
import { isProtected, validProcessName } from "./system.mjs";

export const STEP_IDS = ["power", "close", "gpu", "poll", "launch", "obs"];

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

function exeList(v, what, { refuseProtected }) {
  if (!Array.isArray(v) || v.length > 40) throw bad(`${what} must be a list of at most 40 programs`);
  const out = [];
  for (const raw of v) {
    const name = String(raw ?? "").trim();
    if (!validProcessName(name)) throw bad(`"${name.slice(0, 40)}" is not a valid program name`);
    const exe = /\.exe$/i.test(name) ? name : `${name}.exe`;
    if (refuseProtected && isProtected(exe)) throw bad(`${exe} is protected and can never be closed by game mode`);
    if (!out.some((o) => o.toLowerCase() === exe.toLowerCase())) out.push(exe);
  }
  return out;
}

/**
 * The game-mode settings the dashboard can edit. Changes apply at once and are saved to config.json.
 * Optional `deps` (default to the real files): file, readJson, writeJson, readText (raw file text, null if absent).
 */
export function createSettings(config, log, deps = {}) {
  const file = deps.file ?? CONFIG_FILE;
  const read = deps.readJson ?? readJson;
  const write = deps.writeJson ?? writeJson;
  const readText =
    deps.readText ??
    ((f) => {
      try {
        return fs.readFileSync(f, "utf8");
      } catch (e) {
        if (e?.code === "ENOENT") return null;
        throw e;
      }
    });
  const view = () => ({
    corrupt: Boolean(config.corrupt),
    closeApps: [...config.closeApps],
    games: [...config.games],
    disabledSteps: [...(config.disabledSteps ?? [])],
    steps: STEP_IDS,
  });

  return {
    view,
    update(body) {
      if (!body || typeof body !== "object") throw bad("Missing settings");
      // A config.json that did not parse was left alone at startup so hand edits are not lost.
      // Saving now would replace it with defaults plus this change, so refuse until it is fixed.
      if (config.corrupt) throw bad("config.json is damaged, so settings cannot be saved. Fix or delete the file, then restart Command Station.", 409);
      const next = {};
      if (body.closeApps !== undefined) next.closeApps = exeList(body.closeApps, "Close list", { refuseProtected: true });
      if (body.games !== undefined) {
        next.games = exeList(body.games, "Game list", { refuseProtected: false });
        if (!next.games.length) throw bad("Keep at least one game program");
      }
      if (body.disabledSteps !== undefined) {
        if (!Array.isArray(body.disabledSteps) || !body.disabledSteps.every((s) => STEP_IDS.includes(s))) throw bad("Unknown game-mode step");
        next.disabledSteps = [...new Set(body.disabledSteps)];
      }
      // The file may have been damaged after startup (a hand edit, a sync conflict). Look at the raw
      // text: readJson turns a parse failure into {}, and writing that back would erase the file.
      const raw = readText(file);
      if (raw !== null) {
        try {
          JSON.parse(raw);
        } catch {
          config.corrupt = true;
          throw bad("config.json is damaged, so settings cannot be saved. Fix or delete the file, then restart Command Station.", 409);
        }
      }
      // Merge into the file as it is on disk, so keys the dashboard does not know about are kept.
      const onDisk = read(file, {});
      write(file, { ...(onDisk && typeof onDisk === "object" && !Array.isArray(onDisk) ? onDisk : {}), ...next });
      Object.assign(config, next);
      log(`settings saved: ${Object.keys(next).join(", ") || "nothing"}`);
      return view();
    },
  };
}

import fs from "node:fs";
import path from "node:path";
import { parseSteamApp } from "./parsers.mjs";
import { launchSteamGame, spawnDetached } from "./spawn.mjs";
import { steamLibraries } from "./system.mjs";

const BNET = [
  path.join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Battle.net", "Battle.net Launcher.exe"),
  path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Battle.net", "Battle.net Launcher.exe"),
];

/** Installed games from Steam, plus the Battle.net launcher when it is installed. */
export function createLibrary(log) {
  let cache = { at: 0, games: [], steam: false, battlenet: null };

  async function scan() {
    const games = [];
    let steam = false;
    const lib = await steamLibraries();
    if (lib) {
      steam = true;
      for (const apps of lib.dirs) {
        let files = [];
        try {
          files = fs.readdirSync(apps);
        } catch {
          continue; // unreadable library folder
        }
        for (const f of files) {
          if (!/^appmanifest_\d+\.acf$/.test(f)) continue;
          try {
            const g = parseSteamApp(fs.readFileSync(path.join(apps, f), "utf8"));
            if (g) games.push({ id: `steam:${g.appId}`, source: "steam", ...g });
          } catch {
            // unreadable manifest: skip it
          }
        }
      }
    }
    // Steam can list one library folder under two spellings, so the same game shows up twice.
    const seen = new Set();
    for (let i = games.length - 1; i >= 0; i--) {
      if (seen.has(games[i].appId)) games.splice(i, 1);
      else seen.add(games[i].appId);
    }
    games.sort((a, b) => b.lastPlayed - a.lastPlayed || a.name.localeCompare(b.name));
    const battlenet = BNET.find((p) => fs.existsSync(p)) ?? null;
    cache = { at: Date.now(), games, steam, battlenet };
  }

  async function get() {
    if (Date.now() - cache.at > 60_000) await scan();
    return cache;
  }

  return {
    async snapshot() {
      const c = await get();
      return { steam: c.steam, battlenet: Boolean(c.battlenet), games: c.games.slice(0, 60), total: c.games.length };
    },
    /** `id` is `steam:<appid>` or `battlenet`. Only installed games found by the scan can be started. */
    async launch(id) {
      const c = await get();
      if (id === "battlenet") {
        if (!c.battlenet) throw Object.assign(new Error("Battle.net is not installed"), { status: 404 });
        if (!spawnDetached(c.battlenet, [], {}, log, "battle.net")) throw Object.assign(new Error("Could not start Battle.net"), { status: 500 });
        return { ok: true };
      }
      const g = c.games.find((x) => x.id === id);
      if (!g) throw Object.assign(new Error("That game is not in the library"), { status: 404 });
      if (!launchSteamGame(g.appId, log)) throw Object.assign(new Error("Could not start Steam"), { status: 500 });
      log(`library: launching ${g.name}`);
      return { ok: true, name: g.name };
    },
  };
}

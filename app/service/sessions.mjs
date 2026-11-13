import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";

const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const GM_FILE = path.join(DATA_DIR, "gamemode-history.json");
const KEEP_SESSIONS = 200;
const KEEP_GM = 100;

const avg = (sum, n) => (n ? Math.round((sum / n) * 10) / 10 : null);

/**
 * Remembers each play session (from the game starting to it closing) with its
 * average ping, load and temperature, and keeps a log of game-mode runs.
 * Everything stays on this PC in the data folder.
 */
export function createSessions(sensors, log) {
  let history = readJson(SESSIONS_FILE, { sessions: [] }).sessions ?? [];
  let gm = readJson(GM_FILE, { runs: [] }).runs ?? [];
  let cur = null;
  let timer = null;

  function newSession(game) {
    return { game, start: Date.now(), n: 0, ping: [0, 0], gpuTemp: [0, 0], gpuLoad: [0, 0], cpuLoad: [0, 0], maxGpuTemp: null, maxPing: null };
  }
  const add = (pair, v) => {
    if (v == null) return;
    pair[0] += v;
    pair[1] += 1;
  };

  function finish() {
    if (!cur) return;
    const s = cur;
    cur = null;
    if (Date.now() - s.start < 60_000) return; // ignore launcher flickers under a minute
    history.push({
      game: s.game,
      start: s.start,
      end: Date.now(),
      avgPing: avg(...s.ping),
      avgGpuTemp: avg(...s.gpuTemp),
      avgGpuLoad: avg(...s.gpuLoad),
      avgCpuLoad: avg(...s.cpuLoad),
      maxGpuTemp: s.maxGpuTemp,
      maxPing: s.maxPing,
    });
    history = history.slice(-KEEP_SESSIONS);
    writeJson(SESSIONS_FILE, { sessions: history });
  }

  function tick() {
    const game = sensors.state.game;
    if (game && !cur) cur = newSession(game);
    if (!game && cur) return finish();
    if (!cur) return;
    try {
      const x = sensors.sample();
      cur.n += 1;
      add(cur.ping, x.pingRegionMs);
      add(cur.gpuTemp, x.gpuTemp);
      add(cur.gpuLoad, x.gpuLoad);
      add(cur.cpuLoad, x.cpuLoad);
      if (x.gpuTemp != null) cur.maxGpuTemp = Math.max(cur.maxGpuTemp ?? 0, x.gpuTemp);
      if (x.pingRegionMs != null) cur.maxPing = Math.max(cur.maxPing ?? 0, x.pingRegionMs);
    } catch (e) {
      log(`session sample: ${e.message}`);
    }
  }

  return {
    start() {
      timer = setInterval(tick, 5000);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
      finish();
    },
    snapshot() {
      return {
        current: cur ? { game: cur.game, start: cur.start } : null,
        history: history.slice(-60),
      };
    },
    /** One entry per game-mode step that ran or was undone. */
    recordStep(action, step, ok, error) {
      gm.push({ t: Date.now(), action, id: step?.id ?? "?", label: step?.label ?? step?.id ?? "?", before: step?.before ?? null, after: step?.after ?? null, ok, error: error ?? null });
      gm = gm.slice(-KEEP_GM);
      try {
        writeJson(GM_FILE, { runs: gm });
      } catch (e) {
        log(`could not save game mode history: ${e.message}`);
      }
    },
    gameModeHistory: () => gm.slice(-60),
  };
}

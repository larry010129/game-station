import { loadConfig } from "./config.mjs";
import { createAi } from "./ai.mjs";
import { createCounterwatch } from "./counterwatch.mjs";
import { createFeed } from "./feed.mjs";
import { createGameMode } from "./gamemode.mjs";
import { createMedia } from "./media.mjs";
import { createNetStats } from "./netstats.mjs";
import { createPlayers } from "./players.mjs";
import { createSessions } from "./sessions.mjs";
import { createSteam } from "./steam.mjs";
import { createSysStats } from "./sysstats.mjs";
import { createSensors } from "./sensors.mjs";
import { createServer } from "./server.mjs";

const config = loadConfig();
const log = (msg) => console.log(`[station] ${msg}`);
for (const problem of config.problems ?? []) log(`config: ${problem}`);
if (config.corrupt) log("config: using built-in defaults; your config.json was left untouched, fix or delete it");

const sensors = createSensors(config, log);
const gameMode = createGameMode(config, sensors, log);
const feed = createFeed(config, log);
const players = createPlayers(config, log);
const meta = createCounterwatch(config, log);
const ai = createAi(log, { busy: () => Boolean(sensors.state.game) });
const media = createMedia(log);
const netStats = createNetStats(config, log);
const sysStats = createSysStats(log);
const steam = createSteam(log);
const sessions = createSessions(sensors, log);

let machine = { name: "This PC", cpu: "CPU", gpu: "GPU" };

const server = createServer({
  host: config.host,
  port: config.port,
  log,
  allowedOrigins: config.allowedOrigins,
  handlers: {
    "GET /api/health": async () => ({
      ok: true,
      service: "command-station",
      version: "0.2.0",
      presentMon: sensors.state.presentMon.state,
      journal: gameMode.journal().entries.length,
      journalFailed: gameMode.journalFailed(),
    }),
    "GET /api/diag": async () => {
      const src = sensors.state.sources;
      return {
        service: "command-station",
        version: "0.2.0",
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
        port: server.port(),
        configProblems: config.problems ?? [],
        sources: {
          gpu: src.nvidia,
          cpu: src.typeperf,
          presentMon: { state: sensors.state.presentMon.state, detail: sensors.state.presentMon.detail, path: sensors.state.presentMon.path },
          game: sensors.state.game,
        },
      };
    },
    "GET /api/machine": async () => machine,
    "GET /api/sample": async () => sensors.sample(),
    "GET /api/feed": async () => feed.items(),
    "POST /api/feed/refresh": async () => feed.refresh(),
    "GET /api/players": async () => players.snapshot(),
    "GET /api/meta": async () => meta.snapshot(),
    "GET /api/meta/hero": async (_body, url) => meta.heroDetail(url.searchParams.get("slug"), { force: url.searchParams.get("force") === "1" }),
    "GET /api/ai": async () => ai.status(),
    "POST /api/ai/ask": async (body) => ai.start(body ?? {}),
    "POST /api/ai/auto": async (body) => ai.setAuto(body ?? {}),
    "POST /api/meta/refresh": async () => meta.refresh(),
    "GET /api/net": async () => netStats.snapshot(),
    "GET /api/system": async () => sysStats.snapshot(),
    "GET /api/steam": async () => steam.snapshot(),
    "GET /api/sessions": async () => sessions.snapshot(),
    "GET /api/gamemode/history": async () => ({ runs: sessions.gameModeHistory() }),
    "GET /api/gamemode/active": async () => {
      const { entries } = gameMode.journal();
      return {
        active: entries.length > 0,
        steps: entries.map((e) => e.step).filter(Boolean),
      };
    },
    "GET /api/media": async () => media.status(),
    "GET /api/media/art": async () => media.art(),
    "POST /api/media/control": async (body) => media.control(body?.action, body?.ms),
    "GET /api/profiles": async () => ({ profiles: await gameMode.describeProfiles() }),
    "POST /api/step/apply": async (body) => {
      if (!body?.id) {
        const err = new Error("Missing step");
        err.status = 400;
        throw err;
      }
      try {
        const r = await gameMode.applyStep(body);
        sessions.recordStep("apply", body, true);
        return r;
      } catch (e) {
        sessions.recordStep("apply", body, false, e.message);
        throw e;
      }
    },
    "POST /api/step/restore": async (body) => {
      if (!body?.id) {
        const err = new Error("Missing step");
        err.status = 400;
        throw err;
      }
      try {
        const r = await gameMode.restoreStep(body);
        sessions.recordStep("restore", body, true);
        return r;
      } catch (e) {
        sessions.recordStep("restore", body, false, e.message);
        throw e;
      }
    },
  },
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log("shutting down");
  // Never hang on exit: force it if cleanup stalls.
  setTimeout(() => process.exit(0), 3000).unref();
  try {
    sensors.stop();
    feed.stop();
    players.stop();
    ai.stopAuto();
    meta.stop();
    netStats.stop();
    sessions.stop();
    media.stop();
    await server.close();
  } catch (e) {
    log(`shutdown error: ${e.message}`);
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  await gameMode.recoverIfNeeded();
  sensors.start();
  feed.start();
  players.start();
  ai.startAuto();
  meta.start();
  netStats.start();
  sessions.start();
  machine = await sensors.machine();
  await server.listen();
}

main().catch((e) => {
  if (e?.code === "EADDRINUSE") {
    console.error(`[station] Port ${config.port} is already in use. Is Command Station already running? Stop it, or set PORT to use another port.`);
    sensors.stop();
    feed.stop();
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});

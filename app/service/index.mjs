import { cleanMemory } from "./memclean.mjs";
import { loadConfig } from "./config.mjs";
import { PORT, VERSION } from "./constants.mjs";
import { createAi } from "./ai.mjs";
import { createCounterwatch } from "./counterwatch.mjs";
import { createFeed } from "./feed.mjs";
import { cleanStep, createGameMode } from "./gamemode.mjs";
import { createMedia } from "./media.mjs";
import { createSpotify } from "./spotify.mjs";
import { createNetStats } from "./netstats.mjs";
import { createPlayers } from "./players.mjs";
import { createSessions } from "./sessions.mjs";
import { createSteam } from "./steam.mjs";
import { createCpuTemp, createCost } from "./hwextra.mjs";
import { createLibrary } from "./library.mjs";
import { createSettings } from "./settings.mjs";
import { createDiscord } from "./discord.mjs";
import { createToasts } from "./toasts.mjs";
import { createSysStats } from "./sysstats.mjs";
import { createSensors } from "./sensors.mjs";
import { createServer } from "./server.mjs";
import { createLifecycle, shortStack } from "./lifecycle.mjs";

const config = loadConfig();
const log = (msg) => console.log(`[station] ${msg}`);
// A failed child process or a stray rejected promise must not take the whole service (and game mode's undo) down.
// But a bug that throws over and over would spin forever, so after MAX_CRASHES in a minute give up and exit non-zero
// (the sidecar supervisor or the user then sees a real failure instead of a zombie).
// stopAll and server are only looked up when an exit happens (both are defined further down).
const lifecycle = createLifecycle({ stopAll, closeServer: () => server.close(), log });
process.on("uncaughtException", (e) => lifecycle.onUncaught(e));
process.on("SIGINT", () => lifecycle.shutdown());
process.on("SIGTERM", () => lifecycle.shutdown());
process.on("unhandledRejection", (e) => log(`unhandled rejection: ${shortStack(e)}`));
for (const problem of config.problems ?? []) log(`config: ${problem}`);
if (config.corrupt) log("config: using built-in defaults; your config.json was left untouched, fix or delete it");

const sensors = createSensors(config, log);
const gameMode = createGameMode(config, sensors, log);
const feed = createFeed(config, log);
const players = createPlayers(config, log);
const meta = createCounterwatch(config, log);
const ai = createAi(log, () => Boolean(sensors.state.game));
const media = createMedia(log);
const spotify = createSpotify(log, () => server.port());
const netStats = createNetStats(config, log);
const sysStats = createSysStats(log);
const steam = createSteam(log);
const toasts = createToasts(log);
const sessions = createSessions(sensors, log);
const cpuTemp = createCpuTemp(config, log);
const cost = createCost(log);
const library = createLibrary(log);
const settings = createSettings(config, log);
const discord = createDiscord(log);

// A default until the PowerShell lookup finishes, so /api/machine answers at once.
let machine = { name: "This PC", cpu: "CPU", gpu: "GPU" };

/** Apply or restore one game-mode step and record the outcome in the session history. */
async function runStep(kind, body, action) {
  const step = cleanStep(body); // 400 for a missing, non-string or unknown id
  try {
    const r = await action(step);
    sessions.recordStep(kind, step, true);
    return r;
  } catch (e) {
    sessions.recordStep(kind, step, false, e.message);
    throw e;
  }
}

const server = createServer({
  host: config.host,
  port: PORT,
  log,
  allowedOrigins: config.allowedOrigins,
  handlers: {
    "GET /api/health": async () => ({
      ok: true,
      service: "command-station",
      version: VERSION,
      journal: gameMode.journal().entries.length,
      journalFailed: gameMode.journalFailed(),
      journalError: gameMode.journalError(),
    }),
    "GET /api/diag": async () => {
      const src = sensors.state.sources;
      return {
        service: "command-station",
        version: VERSION,
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
        port: server.port(),
        configProblems: config.problems ?? [],
        sources: {
          gpu: src.nvidia,
          cpu: src.typeperf,
          game: sensors.state.game,
        },
      };
    },
    "GET /api/machine": async () => machine,
    "GET /api/sample": async () => sensors.sample(),
    // Cache only — never wait on the slow network pull (that runs in the background).
    "GET /api/feed": async () => feed.items(),
    "POST /api/feed/refresh": async () => feed.refresh(),
    "GET /api/players": async () => players.snapshot(),
    // Always the last good copy at once; `updating` tells the card a scrape is still running.
    "GET /api/meta": async (_body, url) => meta.snapshot(url.searchParams.get("mode")),
    "GET /api/meta/hero": async (_body, url) =>
      meta.heroDetail(url.searchParams.get("slug"), { force: url.searchParams.get("force") === "1", mode: url.searchParams.get("mode") }),
    "GET /api/meta/map": async (_body, url) =>
      meta.mapHeroes(url.searchParams.get("slug"), { force: url.searchParams.get("force") === "1", mode: url.searchParams.get("mode") }),
    "GET /api/meta/rank": async (_body, url) =>
      meta.rank(url.searchParams.get("rank"), { force: url.searchParams.get("force") === "1", mode: url.searchParams.get("mode") }),
    "GET /api/ai": async () => ai.status(),
    "POST /api/ai/ask": async (body) => ai.start(body ?? {}),
    "POST /api/ai/auto": async (body) => ai.setAuto(body ?? {}),
    "POST /api/meta/refresh": async () => meta.refresh(),
    "GET /api/net": async () => netStats.snapshot(),
    "GET /api/system": async () => sysStats.snapshot(),
    "GET /api/steam": async () => steam.snapshot(),
    "GET /api/cputemp": async () => cpuTemp.snapshot(),
    "GET /api/cost": async () => cost.snapshot(),
    "GET /api/library": async () => library.snapshot(),
    "POST /api/library/launch": async (body) => library.launch(String(body?.id ?? "")),
    "GET /api/settings": async () => settings.view(),
    "POST /api/settings": async (body) => settings.update(body),
    "GET /api/discord": async () => discord.status(),
    "GET /api/discord/guilds": async () => discord.guilds(),
    "POST /api/discord/setup": async (body) => discord.setup(body),
    "POST /api/discord/login": async () => discord.login(),
    "POST /api/discord/set": async (body) => discord.set(body),
    "POST /api/discord/forget": async () => discord.forget(),
    "GET /api/toasts": async () => toasts.snapshot(),
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
    "GET /api/spotify": async () => spotify.status(),
    "GET /api/spotify/playlists": async () => spotify.playlists(),
    "POST /api/spotify/setup": async (body) => spotify.setup(body?.clientId),
    "POST /api/spotify/login": async () => spotify.login(),
    "GET /api/spotify/callback": async (_body, url) => spotify.callback(url),
    "POST /api/spotify/logout": async () => spotify.logout(),
    "POST /api/spotify/control": async (body) => spotify.control(body?.action, body ?? {}),
    "POST /api/memory/clean": async () => cleanMemory(),
    "GET /api/profiles": async () => ({ profiles: await gameMode.describeProfiles() }),
    "POST /api/step/apply": (body) => runStep("apply", body, gameMode.applyStep),
    "POST /api/step/restore": (body) => runStep("restore", body, gameMode.restoreStep),
  },
});

// Modules with a stop() because they own a timer, socket or child process. spotify, library and steam hold
// neither (one-shot requests only): add them here if that changes. Shutdown and the port-in-use exit stop this list.
const stoppable = { sensors, feed, players, ai, meta, netStats, sessions, media, toasts, discord };
function stopAll() {
  for (const [name, mod] of Object.entries(stoppable)) {
    try {
      mod.stop();
    } catch (e) {
      log(`stopping ${name} failed: ${e.message}`);
    }
  }
}

async function main() {
  // Bind the port first: a second copy then fails here, before it can "recover" (undo) the
  // game-mode steps a running copy has applied, and a cold PowerShell cannot delay the API.
  await server.listen();
  if (lifecycle.isShuttingDown()) return;
  // Recovery can wait on slow PowerShell calls (up to 15 s per step), so it runs in the background;
  // gameMode serialises it with any apply/restore a client sends meanwhile. A failed undo stays in the
  // journal (see journalFailed on /api/health) and is retried at the next start.
  gameMode.recoverIfNeeded().catch((e) => log(`game-mode recovery failed: ${e?.message ?? e}`));
  sensors.start();
  feed.start();
  players.start();
  ai.startAuto();
  meta.start();
  netStats.start();
  sessions.start();
  toasts.start();
  sensors
    .machine()
    .then((m) => (machine = m))
    .catch((e) => log(`machine lookup failed: ${e.message}`));
}

main().catch((e) => {
  if (e?.code === "EADDRINUSE") {
    console.error(`[station] Port ${PORT} is already in use. Is Command Station already running? Close the other copy and try again.`);
    stopAll();
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});

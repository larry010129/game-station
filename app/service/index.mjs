import { loadEnv } from "./loadEnv.mjs";
import { cleanMemory } from "./memclean.mjs";
import { createTrim } from "./trim.mjs";
import { createWaveLink } from "./wavelink.mjs";
import { loadConfig } from "./config.mjs";
import { PORT } from "./constants.mjs";
import { createAi } from "./ai.mjs";
import { createApexMeta } from "./apex-meta.mjs";
import { createCounterwatch } from "./counterwatch.mjs";
import { createFeed } from "./feed.mjs";
import { feedCacheFileFor, feedConfigFor, normalizeGame } from "./games.mjs";
import { createGameMode } from "./gamemode.mjs";
import { createMedia } from "./media.mjs";
import { createSpotify } from "./spotify.mjs";
import { createNetStats } from "./netstats.mjs";
import { createPlayers } from "./players.mjs";
import { createSessions } from "./sessions.mjs";
import { createSteam } from "./steam.mjs";
import { createCost } from "./hwextra.mjs";
import { createLibrary } from "./library.mjs";
import { createSettings } from "./settings.mjs";
import { createDiscord } from "./discord.mjs";
import { createToasts } from "./toasts.mjs";
import { createSysStats } from "./sysstats.mjs";
import { createSensors } from "./sensors.mjs";
import { createServer } from "./server.mjs";
import { createRoutes } from "./routes.mjs";
import { createLifecycle, shortStack } from "./lifecycle.mjs";

loadEnv();

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
// The desktop shell keeps our stdin open and closes it to ask for a clean shutdown (a hard kill would skip cleanup
// and orphan the helper processes). Only when it says so: a terminal or test harness may close stdin for other reasons.
if (process.env.COMMAND_STATION_STDIN_SHUTDOWN === "1") {
  process.stdin.on("end", () => lifecycle.shutdown());
  process.stdin.on("close", () => lifecycle.shutdown());
  process.stdin.resume();
}
process.on("unhandledRejection", (e) => log(`unhandled rejection: ${shortStack(e)}`));
for (const problem of config.problems ?? []) log(`config: ${problem}`);
if (config.corrupt) log("config: using built-in defaults; your config.json was left untouched, fix or delete it");

const sensors = createSensors(config, log);
const trim = createTrim({ log });
const gameMode = createGameMode(config, sensors, log, { trim: () => trim.run(), cleanMemory });
const feedOw = createFeed(config, log, { game: "overwatch", feedCfg: feedConfigFor(config, "overwatch"), cacheFile: feedCacheFileFor("overwatch") });
const feedApex = createFeed(config, log, { game: "apex", feedCfg: feedConfigFor(config, "apex"), cacheFile: feedCacheFileFor("apex") });
const feedOf = (game) => (normalizeGame(game) === "apex" ? feedApex : feedOw);
const players = createPlayers(config, log);
const metaOw = createCounterwatch(config, log);
const metaApex = createApexMeta(log);
const metaOf = (game) => (normalizeGame(game) === "apex" ? metaApex : metaOw);
const ai = createAi(log, () => Boolean(sensors.state.game), {}, {
  xHandles: () => (config.feed.x ?? []).map((x) => x.handle),
  trusted: () => config.feed.trusted ?? [],
  // Leak headlines the feed already has (Reddit, news search): shown to the AI, and added as extra sources to a matching leak.
  leakFeed: () =>
    feedOw
      .items()
      .filter((i) => i.kind === "leak" && Date.now() - i.publishedAt < 14 * 24 * 3600_000)
      .map((i) => ({ title: i.title, source: i.source, url: i.url ?? "", date: new Date(i.publishedAt).toISOString().slice(0, 10) })),
});
const media = createMedia(log);
const spotify = createSpotify(log, () => server.port());
const netStats = createNetStats(config, log);
const sysStats = createSysStats(log);
const steam = createSteam(log, config);
const toasts = createToasts(log, { read: (force) => media.toasts(force) });
const sessions = createSessions(sensors, log);
const cost = createCost(log);
const waveLink = createWaveLink({ log });
const library = createLibrary(log);
const settings = createSettings(config, log);
const discord = createDiscord(log);

// A default until the PowerShell lookup finishes, so /api/machine answers at once.
let machine = { name: "This PC", cpu: "CPU", gpu: "GPU" };

const routes = createRoutes({
  config, sensors, gameMode, sessions, feedOf, metaOf, players, ai, netStats, sysStats, steam, cost, waveLink, trim, library, settings, discord, toasts, media, spotify,
  machine: () => machine,
  port: () => server.port(),
});

const server = createServer({
  host: config.host,
  port: PORT,
  log,
  allowedOrigins: config.allowedOrigins,
  handlers: routes,
});

// Modules with a stop() because they own a timer, socket or child process. spotify, library and steam hold
// neither (one-shot requests only): add them here if that changes. Shutdown and the port-in-use exit stop this list.
const stoppable = { sensors, feedOw, feedApex, players, ai, metaOw, metaApex, netStats, sessions, media, toasts, discord };
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
  feedOw.start();
  feedApex.start();
  players.start();
  ai.startAuto();
  metaOw.start();
  metaApex.start();
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

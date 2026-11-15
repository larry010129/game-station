import { VERSION } from "./constants.mjs";
import { cleanStep } from "./gamemode.mjs";
import { cleanMemory } from "./memclean.mjs";
import { proxyApexImg } from "./apex-img.mjs";

/**
 * The service's HTTP routes, keyed "METHOD /path". `d` carries the modules and a few lookups that index.mjs owns
 * (`machine()` and `port()` are functions because both change after start-up). Nothing here starts a timer or a process.
 */
export function createRoutes(d) {
  const { config, sensors, gameMode, sessions, feedOf, metaOf, players, ai, netStats, sysStats, steam, cost, waveLink, trim, library, settings, discord, toasts, media, spotify, patreon, machine, port } = d;

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

  return {
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
          port: port(),
          configProblems: config.problems ?? [],
          sources: {
            gpu: src.nvidia,
            cpu: src.typeperf,
            game: sensors.state.game,
          },
        };
      },
      "GET /api/machine": async () => machine(),
      "GET /api/sample": async () => sensors.sample(),
      /** Dashboard tells the service to pause (kill switch) or slow (window hidden) the sensor helpers. */
      "POST /api/pace": async (body) => {
        if (body && typeof body.paused === "boolean") sensors.setPaused(body.paused);
        if (body && typeof body.slow === "boolean") sensors.setClientSlow(body.slow);
        return {
          ok: true,
          paused: sensors.state.paused,
          slow: sensors.state.slow || sensors.state.clientSlow,
        };
      },
      // Cache only — never wait on the slow network pull (that runs in the background).
      // `?game=overwatch|apex` swaps sources; default remains Overwatch.
      "GET /api/feed": async (_body, url) => feedOf(url.searchParams.get("game")).items(),
      "POST /api/feed/refresh": async (_body, url) => feedOf(url.searchParams.get("game")).refresh(),
      "GET /api/players": async (_body, url) => players.snapshot(url.searchParams.get("game")),
      /** Apex legend/weapon portraits from Tracker CDN, proxied so the Tauri CSP can show them. */
      "GET /api/img": async (_body, url) => proxyApexImg(url.searchParams.get("kind"), url.searchParams.get("slug")),
      // Always the last good copy at once; `updating` tells the card a scrape is still running.
      "GET /api/meta": async (_body, url) => metaOf(url.searchParams.get("game")).snapshot(url.searchParams.get("mode")),
      "GET /api/meta/hero": async (_body, url) =>
        metaOf(url.searchParams.get("game")).heroDetail(url.searchParams.get("slug"), {
          force: url.searchParams.get("force") === "1",
          mode: url.searchParams.get("mode"),
        }),
      "GET /api/meta/map": async (_body, url) =>
        metaOf(url.searchParams.get("game")).mapHeroes(url.searchParams.get("slug"), {
          force: url.searchParams.get("force") === "1",
          mode: url.searchParams.get("mode"),
        }),
      "GET /api/meta/rank": async (_body, url) =>
        metaOf(url.searchParams.get("game")).rank(url.searchParams.get("rank"), {
          force: url.searchParams.get("force") === "1",
          mode: url.searchParams.get("mode"),
        }),
      "GET /api/ai": async () => ai.status(),
      "POST /api/ai/ask": async (body) => ai.start(body ?? {}),
      "POST /api/ai/auto": async (body) => ai.setAuto(body ?? {}),
      // Kick off the scrape; return the cache immediately (same as GET). Cards poll while `updating`.
      "POST /api/meta/refresh": async (_body, url) => {
        const meta = metaOf(url.searchParams.get("game"));
        void meta.refresh();
        return meta.snapshot(url.searchParams.get("mode"));
      },
      "GET /api/net": async () => netStats.snapshot(),
      "GET /api/system": async () => sysStats.snapshot(),
      "GET /api/steam": async (_body, url) => steam.snapshot(url.searchParams.get("game")),
      "GET /api/cost": async () => cost.snapshot(),
      "GET /api/wavelink": async () => waveLink.snapshot(),
      "POST /api/wavelink/set": async (body) => waveLink.set(body ?? {}),
      "POST /api/cost/trim": async () => {
        const r = await trim.run();
        cost.invalidate();
        return r;
      },
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
      "GET /api/patreon": async () => patreon.status(),
      "POST /api/patreon/login": async () => patreon.login(),
      "GET /api/patreon/callback": async (_body, url) => patreon.callback(url),
      "POST /api/patreon/check": async () => patreon.check(),
      "POST /api/patreon/logout": async () => patreon.logout(),
      "POST /api/spotify/control": async (body) => spotify.control(body?.action, body ?? {}),
      "POST /api/memory/clean": async () => cleanMemory(),
      "GET /api/profiles": async () => ({ profiles: await gameMode.describeProfiles() }),
      "POST /api/step/apply": (body) => runStep("apply", body, gameMode.applyStep),
      "POST /api/step/restore": (body) => runStep("restore", body, gameMode.restoreStep),
  };
}

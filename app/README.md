# Command Station

Windows dashboard for Overwatch players and their PC: live thermals and load, one-tap game mode with undo, an Overwatch news and leak feed, meta cards, media, calendar and more. Built with React, TypeScript and Vite, with a local Node service that reads this PC. A Tauri desktop app wraps it. The overview and repo layout are in `../README.md`; this file holds the service API, config and data folder.

The look follows `../design/command-station-redesign.html`: charcoal glass tiles, thin Outfit type, hairline white charts, orange only for cautions and drops, red only for alerts and the kill switch.

## Status

| Piece | State |
| --- | --- |
| Dashboard (`src/`) | Working. Shows real data only; while the service is not reachable it says so and keeps retrying. |
| Local service (`service/`) | Working. Reads GPU/CPU/network/battery, fetches Overwatch news, runs game-mode steps. Localhost only, with an origin check. |
| Undo journal | Each game-mode step is written to disk before it runs, and leftovers are restored when the service starts. Stored in `%APPDATA%\CommandStation\journal.json`. |
| Players online | Hourly count from Steam's public API (Overwatch 2, Steam players only), with an estimated regional split on a world map. History builds while the app runs. |
| GPU temperature | From `nvidia-smi`, nothing extra needed. |
| Tauri desktop app | Build it with `npm run prepare:sidecar` then `npm run tauri build -- --bundles nsis`; the installer starts its own service. The old `CommandStation-v0.2` folder is outdated. |

Tests: `npm run test:service` covers the parsers, server guard, game mode, settings and config, spawn helpers and the API table below.

## Run it (browser version)

From a terminal in `app`, run `npm run live`. It starts the service on 127.0.0.1:8787 and the dashboard on http://localhost:1420 from one command.

`npm install` is needed once before the first run. Press Ctrl+C to stop; that ends both processes. The old `Start Command Station.bat` launcher was removed, because it opened the service in a second window that kept running after the dashboard closed.

The desktop app is the normal way to run it; this browser version is for working on the dashboard.

Details: `docs/SETUP.md`. Problems: `docs/TROUBLESHOOTING.md`.

## Run it (developer)

```bash
npm install
npm run live      # service on http://127.0.0.1:8787 + dev server on http://localhost:1420
```

- Dashboard only (needs the service running separately): `npm run dev`
- Service only: `npm run service`
- Service tests: `npm run test:service`
- Production build: `npm run build`

## Counterwatch stats (Meta cards)

The Hero tier list, Map hero picks and Best pick per role cards read hero stats from https://www.counterwatch.gg/stats/overwatch (community data, shrunk win rates, all ranks). The service reads the site's tier-list, maps and best-one-tricks pages (the data is embedded in the page, there is no public API), once at every start, again when the stats are over a day old, and when you press the reload button on a card. The site says it refreshes around 07:00 UTC. The last good copy is kept in `%APPDATA%\CommandStation\counterwatch.json`, so the cards still work offline. Hero portraits load from the site's image host. Click a hero or "counterwatch.gg" to open the page in your browser.

## Leak feed

The Leak feed card shows Overwatch leak headlines from the free feed. **Check every hour** and **Check now** both call `POST /api/feed/refresh`. That pull searches Google News RSS for `Overwatch leak`, `Overwatch season leak` and `Overwatch rumor`, plus Reddit, YouTube and Blizzard. It does not call Claude or Antigravity. The service also refreshes the same feed about every 30 minutes.

## Service API

Base URL `http://127.0.0.1:8787`. It binds to 127.0.0.1 only and accepts browser requests only from `http://localhost:1420`, `http://127.0.0.1:1420`, `http://tauri.localhost` or `tauri://localhost` (any other Origin gets 403; POSTs must be `application/json`; the Host header must be localhost). JSON in, JSON out.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | `ok`, service name, version (from package.json), number of journal entries, how many failed to undo, and `journalError` (set when `journal.json` cannot be read) |
| `GET /api/diag` | Version, Node, platform, pid, uptime, port, config problems and the state of the GPU and CPU sources |
| `GET /api/machine` | PC, CPU and GPU names (a default until the first lookup finishes) |
| `GET /api/sample` | One reading: temps, loads, clocks, ping, battery, with notes for anything missing |
| `POST /api/pace` | Pause or slow the sensor helpers. Body: `paused` (kill switch) and/or `slow` (window hidden). Returns `{ ok, paused, slow }` |
| `GET /api/feed` | Overwatch news, patch notes and community/leak items (cache only) |
| `POST /api/feed/refresh` | Pull the feed sources now |
| `GET /api/players` | Players online per hour (Steam) and the estimated regional shares |
| `GET /api/meta` | Counterwatch hero stats: tier list, per-map picks, best pick per role. Answers at once with the last good copy; `updating` is true while a scrape runs. Query: `mode` |
| `GET /api/meta/hero` | One hero's detail. Query: `slug`, `mode`, `force=1` |
| `GET /api/meta/map` | Hero list for one map. Query: `slug`, `mode`, `force=1` |
| `GET /api/meta/rank` | Tier list and maps for one rank. Query: `rank`, `mode`, `force=1` |
| `POST /api/meta/refresh` | Fetch fresh Counterwatch stats now (at most once a minute) |
| `GET /api/img` | Apex legend/weapon portrait proxy (Tracker CDN). Query: `kind` (`legend` or `weapon`), `slug`. Not an open proxy — fixed host and slug allowlist only |
| `GET /api/ai` | Optional CLI research state (off by default; Leak feed uses `/api/feed` instead) |
| `POST /api/ai/ask` | Start a one-off CLI search. Body: `engine` (antigravity or claude), `topic` (leaks, update or hero), `question` |
| `POST /api/ai/auto` | Optional hourly CLI leak check on or off, and which engine. Body: `enabled`, `engine`. Off by default so Claude/Antigravity are not used unless you turn them on |
| `GET /api/net` | Ping to Americas, Europe and Asia, jitter and packet loss, Wi-Fi details. Probing only runs while a card is asking |
| `GET /api/system` | Memory in use, top apps by memory, battery charge rate |
| `GET /api/steam` | Latest Overwatch 2 posts on Steam |
| `GET /api/cost` | This app's own CPU and memory (refreshed at most every 15 s) |
| `GET /api/library` | Installed Steam games and whether Battle.net is installed |
| `POST /api/library/launch` | Start a game by id (`steam:<appid>` or `battlenet`) |
| `GET /api/settings` | Close list, game programs and skipped game-mode steps |
| `POST /api/settings` | Change them. Answers 409 when config.json is damaged, so a hand-edited file is never overwritten |
| `GET /api/discord` | Discord voice status |
| `GET /api/discord/guilds` | Servers you are in, with icons |
| `POST /api/discord/setup` | Save your Discord application's client id and secret |
| `POST /api/discord/login` | Sign in to Discord (approve the prompt inside Discord) |
| `POST /api/discord/set` | Mute or deafen. Body: `mute`, `deaf` (booleans) |
| `POST /api/discord/forget` | Forget the saved Discord application and sign-in |
| `GET /api/toasts` | Windows notifications (Discord, LINE, ...) from the helper script |
| `GET /api/sessions` | Current play session and the saved history (`%APPDATA%\CommandStation\sessions.json`) |
| `GET /api/gamemode/history` | Game-mode steps applied and undone |
| `GET /api/gamemode/active` | Whether game mode has steps applied, and which |
| `GET /api/media` | Now playing from Windows' media session |
| `GET /api/media/art` | The cover picture for the current track |
| `POST /api/media/control` | Body `{"action":"playpause"\|"next"\|"previous"\|"seek","ms":n}` |
| `GET /api/spotify` | Spotify state: setup, login, idle or the current track |
| `GET /api/spotify/playlists` | Your playlists |
| `POST /api/spotify/setup` | Save your Spotify Client ID. Body: `clientId` |
| `POST /api/spotify/login` | Start the browser sign-in |
| `GET /api/spotify/callback` | The sign-in redirect target (HTML, used by the browser only) |
| `POST /api/spotify/logout` | Forget the Spotify sign-in |
| `POST /api/spotify/control` | Play, pause, next, previous, seek, volume, shuffle (`on` must be a boolean), repeat, playlist, transfer. Body: `action` plus its arguments |
| `POST /api/memory/clean` | Free RAM (Windows only; may show a UAC prompt) |
| `GET /api/wavelink` | Elgato Wave Link 3 mixer: mixes, channels and microphones with their levels and mute state. `{ "state": "offline" }` when Wave Link is not running. Uses the unofficial local WebSocket of Wave Link, which an update can change |
| `POST /api/wavelink/set` | Change one Wave Link control. Body: `kind` (`mix`, `channel` or `input`), `id`, `level` (0 to 1) and/or `isMuted`; a channel can also take `mixId` for its send to one mix, and an input needs `inputId` (mute only). 503 when Wave Link is not running |
| `POST /api/cost/trim` | Free this app's own memory: collect garbage, then hand the unused memory of the service, shell and web view back to Windows. No administrator needed. Returns `{ beforeMb, afterMb, freedMb, processes }` |
| `GET /api/profiles` | Game-mode profiles with each step's current ("before") and target ("after") state |
| `POST /api/step/apply` | Apply one step. Body: the step object (needs `id`) |
| `POST /api/step/restore` | Undo one step. Body: the step object (needs `id`) |

Every route above is checked against `service/index.mjs` by `service/test/backend.test.mjs`: the test fails when a handler is missing from this table, or the table lists one that no longer exists. Write each route in full, in backticks.

Step ids: `power`, `close`, `trim`, `memory`, `gpu`, `poll`, `launch`, `priority`, `obs` (OBS is not linked yet). `trim` frees this app's own memory, `memory` cleans system memory (it may show a UAC prompt, and a refusal does not stop game mode), and `priority` raises Overwatch to High priority once it is running (it waits up to about a minute for the game to start); a missing or unknown id on `/api/step/apply` or `/api/step/restore` gets 400. Errors come back as `{ "error": "..." }`. For the security checks and the journal, see `service/server.mjs` and `service/gamemode.mjs`.

## Config

On first run the service writes `%APPDATA%\CommandStation\config.json` with the defaults below. Edit it and restart the service. A key you leave out keeps its default.

| Key | Default | Meaning |
| --- | --- | --- |
| `host` | `127.0.0.1` | Bind address. Leave as is. The port is fixed at 8787 (a `port` key in an old config is ignored and the `PORT` environment variable is not used). |
| `allowedOrigins` | `[]` | Extra browser origins allowed to call the service (added to the four built-in ones) |
| `regionHost` | `battle.net` | Host pinged for the latency reading |
| `games` | `["Overwatch.exe"]` | Processes treated as the game |
| `disabledSteps` | `[]` | Game-mode step ids skipped in every profile |
| `closeApps` | OneDrive, ArmouryCrate, ASUSSoftwareManager (.exe) | Closed by the game-mode "close" step |
| `feed.newsUrl`, `feed.patchUrl` | Blizzard news and patch notes pages | Feed sources |
| `feed.reddit` | r/Overwatch, r/CompetitiveOverwatch (community; leak-worded posts show under Leaks), r/Overwatch_Leaks (`kind: "leak"`) | Subreddits to read. An older seeded list that still only has built-ins picks up new default subs on restart |
| `feed.refreshMs` | 1800000 (30 min) | Feed refresh interval |
| `feed.youtube` | PlayOverwatch, YourOverwatch (`@YourOverwatch`), Stylosa (`@stylosa`) | YouTube channels to read: `channelId`, `handle` (@name) or `url`, plus `name`; `kind: "leak"` makes every video a leak |
| `feed.newsSearch` | `Overwatch leak`, `Overwatch season leak`, `Overwatch rumor`, `Overwatch datamine`, `Overwatch hero leak`, `Overwatch 2 leak` (max 6, each ≤80 chars) | Google News keyword searches (last 30 days; only headlines that name Overwatch and a leak, datamine or rumour are kept). Plain words work best: quoted phrases return nothing |
| `feed.x`, `feed.xRssUrl` | PlayOverwatch (`official`), wiki_ow / SkaVorah (`leak`), OWCavalry / OmnicPost (`news`); empty | Optional X accounts with a role tag. Posts reach the feed only if `xRssUrl` is set to a bridge address with `{handle}` in it. An older built-in-only list picks up new default handles on restart |
| `feed.trusted` | Blizzard, PlayOverwatch, wiki_ow, SkaVorah | Sources that get a Trusted badge (name, optional note; a name with a dot is a website) |
| `feed.tracked` | `[]` | Written by Vault > Sources: `{ platform: x|youtube|reddit|website, value, note, kind? }`. `kind` is Official / Leak / News (X), Leak / Video (YouTube), or Community / Leak (Reddit). Added on top of the lists above |
| `feed.redditGapMs` | 12000 | Pause between Reddit requests |
| `feed.userAgent` | `CommandStation/0.2 ...` | User agent sent to feed sources |

## Data folder

`%APPDATA%\CommandStation\` (usually `C:\Users\<you>\AppData\Roaming\CommandStation`), created by `service/paths.mjs`:

- `config.json`: your settings
- `journal.json`: undo journal for game mode. If it cannot be read, a copy is kept as `journal.json.bad` and game mode refuses to start steps (409) until it is fixed or deleted
- `gamemode-history.json`: game-mode steps applied and undone
- `sessions.json`: play sessions
- `feed-cache.json`: last fetched news
- `counterwatch.json`: cached hero stats
- `players.json`: players-online history
- `ai-research.json`, `ai-auto.json`: saved AI answers and the hourly-check setting
- `discord.json`, `spotify.json`: your own app ids and sign-in tokens (never included in backups)
- `service.log`: the service log

Set `COMMAND_STATION_DATA` to use another folder (the tests use a temporary one).

Deleting the folder resets everything, including the Discord and Spotify sign-ins. Do not delete `journal.json` while game mode is on, or the undo is lost.

## Build the desktop app

Needs Rust, the Microsoft C++ build tools and Smart App Control off. In `app`:

```bash
npm run tauri build -- --bundles nsis
```

The installer lands in `src-tauri/target/release/bundle/nsis/`. The shell launches the bundled `node.exe` against `service/` and stops it on exit (log: `%APPDATA%\CommandStation\service.log`).

Before `tauri dev` or `tauri build`, run `npm run prepare:sidecar`: it copies `node.exe` and stages `service/` without its tests. Release output is local only and not committed.

## Choosing cards

Press **Edit layout**, then **Cards**. Home starts with the first-run set; add more from the list (or remove with **×**). **Starting set** goes back to the first-run cards. Your choice is saved. Groups: This PC (memory, power), Connection (ping by region, jitter and loss, Wi-Fi, verdict), Overwatch (player trend, patch summary, leak watch, season countdown, Steam news, best time to play), Game (session timer, play history, session report, game mode history), Media (now playing, Spotify), Tools (world clocks, checklist, notes).

Now playing works through Windows' own media session, so it controls Spotify and anything else that is playing, with no login. It can't browse playlists. The season end date is typed in by you because Blizzard does not publish it in a form this app can read. Patch buff or nerf labels are guessed from the wording. Region player shares are estimates; hourly totals are Steam players only.

## Vault settings

- **Smart alerts:** five rules (GPU hot, CPU hot, memory nearly full, ping spike, calendar event soon), each with its own switch and limit. A rule that fires waits five minutes before it can fire again.
- **Game mode:** untick steps to skip them in every profile, and edit the close list and the game program list. Saved to `config.json` (`closeApps`, `games`, `disabledSteps`). System programs and anti-cheat names can never be added to the close list.
- **Backup:** exports every `cs.*` setting (layout, cards, theme, alerts, calendar, notes) plus the game-mode lists to one JSON file, and restores it. Spotify and Discord sign-ins are never included.

## New cards

- **App cost:** CPU of the service, its helpers and the desktop window together (budget: under 1%), and memory of the service plus its helpers (budget: 200 MB). The window (command-station.exe and its Chromium web view) is shown for reference: about 300–370 MB private is Chromium’s floor and is not held to the memory budget. Memory is private bytes, not working set, so shared pages are not counted twice. Sensor helpers slow to every 3 s in game mode or when the window is hidden, and stop on the kill switch.
- **Game library:** installed Steam games, newest played first, with a Play button, plus a Battle.net button when it is installed. Only games found by the scan can be started.
- **Discord:** mute, deafen and who is in your voice channel, over Discord's local pipe. Needs your own Discord application (client id and secret from discord.com/developers, with `http://127.0.0.1` added as a redirect). The secret is kept in `%APPDATA%\CommandStation\discord.json`. Not yet tried against a real Discord account.

## Arranging the cards

Press **Edit layout** in the top bar. Drag a card to move it, drag its bottom-right corner to resize. Press **Done** or Esc to finish.

- The layout is saved and returns next launch. **Reset layout** in the edit bar (click twice) restores the defaults.
- Desktop (24 columns) and tablet (12 columns) each keep their own layout. Phone width is a fixed single column.
- Defaults and minimum sizes are in `src/layout/layouts.ts`.

## Smart App Control

This PC's Application Control policy blocks Rollup's native `.node` binary, so `package.json` overrides `rollup` with `@rollup/wasm-node`. On another machine you can remove the override.

## Layout

| Path | What it holds |
| --- | --- |
| `service/` | Local API, one module per concern, wired in `index.mjs`: `server.mjs` (guards), `sensors.mjs`, `gamemode.mjs`, `feed.mjs`, `counterwatch.mjs`, `media.mjs`, `spotify.mjs`, `discord.mjs`, `toasts.mjs`, `library.mjs`, `settings.mjs`, `config.mjs`, `spawn.mjs`, and more |
| `src/lib/types.ts` | `Sample`, `FeedItem`, `Profile`, `Provider` interface |
| `src/providers/` | `live.ts` talks to the service (the only provider) |
| `src/state/useStation.ts` | Samples once a second (3 s in game mode, 5 s when hidden), keeps 60 readings |
| `src/state/useGameMode.ts` | Applies a profile step by step, journal first, restores on exit or after a crash |
| `src/state/useEnvironment.ts` | Drops blur and motion when hidden or when a game is running and this window is not in front |
| `src/layout/` | Grid, card catalogue (`layouts.ts`) and card registry (`registry.tsx`) |
| `src/cards/`, `src/components/`, `src/pages/`, `src/boot/`, `src/styles/` | Cards, shared UI, full pages (Vault, themes, credits), boot screen, CSS |
| `src-tauri/` | Desktop shell |

## Next

- Link OBS scene switching (the `obs` step is a stub).
- Measure the app's cost with Overwatch running against the budget (under 1% CPU, service and helpers under 200 MB).
- Open decisions and code review findings: `../goldfish_review_report.md`.

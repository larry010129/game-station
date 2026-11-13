# Command Station

Windows dashboard for Overwatch: live frame rate and thermals, one-tap game mode with undo, an Overwatch news and leak feed, and a Stream Deck panel (preview only). Built with React, TypeScript and Vite, with a local Node service that reads this PC. A Tauri desktop app wraps it.

The look follows `../design/command-station-redesign.html`: charcoal glass tiles, thin Outfit type, hairline white charts, orange only for cautions and drops, red only for alerts and the kill switch.

## Status

| Piece | State |
| --- | --- |
| Dashboard (`src/`) | Working. Falls back to sample data when the service is not running. |
| Local service (`service/`) | Working. Reads GPU/CPU/network/battery, fetches Overwatch news, runs game-mode steps. Localhost only, with an origin check. |
| Undo journal | Each game-mode step is written to disk before it runs, and leftovers are restored when the service starts. Stored in `%APPDATA%\CommandStation\journal.json`. |
| Players online | Hourly count from Steam's public API (Overwatch 2, Steam players only), with an estimated regional split on a world map. History builds while the app runs. |
| GPU temperature | From `nvidia-smi`, nothing extra needed. CPU temperature is not shown. |
| Stream Deck panel | Preview only (on-screen mock, no hardware link). |
| Tauri desktop app | Built and running on this PC: `CommandStation-v0.2\command-station.exe`, plus an NSIS installer. It starts its own service. |

Tests: `npm run test:service` covers the parsers (not re-run when this doc was written).

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

- Dashboard only (sample data): `npm run dev`
- Service only: `npm run service`
- Parser tests: `npm run test:service`
- Production build: `npm run build`

## Counterwatch stats (Meta cards)

The Hero tier list, Map hero picks and Best pick per role cards read hero stats from https://www.counterwatch.gg/stats/overwatch (community data, shrunk win rates, all ranks). The service reads the site's tier-list, maps and best-one-tricks pages (the data is embedded in the page, there is no public API), once at every start, again when the stats are over a day old, and when you press the reload button on a card. The site says it refreshes around 07:00 UTC. The last good copy is kept in `%APPDATA%\CommandStation\counterwatch.json`, so the cards still work offline. Hero portraits load from the site's image host. Click a hero or "counterwatch.gg" to open the page in your browser.

## AI leak search

The AI leak search card asks Claude or Gemini to search the web for the newest Overwatch update, leaks and datamines, or any hero or topic you type. It runs the official command-line tool you are already signed in to, so it uses your existing subscription and needs no API key:

- **Claude:** the `claude` command (Claude Code), signed in with your Claude account. Limited to the web search and web fetch tools: no file or shell access.
- **Gemini:** the `gemini` command (`npm install -g @google/gemini-cli`, then run `gemini` once and sign in with Google). Not installed on this PC yet.

Each answer labels items Confirmed, Leak or Rumor, with the source link. A search takes about a minute and the last 20 answers are kept in `%APPDATA%\CommandStationi-research.json`. AI can be wrong: open the source before you trust a leak.

## Service API

Base URL `http://127.0.0.1:8787`. It binds to 127.0.0.1 only and accepts browser requests only from `http://localhost:1420`, `http://127.0.0.1:1420`, `http://tauri.localhost` or `tauri://localhost` (any other Origin gets 403; POSTs must be `application/json`; the Host header must be localhost). JSON in, JSON out.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | `ok`, version, PresentMon state, number of journal entries |
| `GET /api/machine` | PC, CPU and GPU names |
| `GET /api/sample` | One reading: fps, temps, clocks, ping, battery, with notes for anything missing |
| `GET /api/ai` | AI search state and saved answers |
| `POST /api/ai/ask` | Start a search. Body: `engine` (claude or gemini), `topic` (leaks, update or hero), `question` |
| `GET /api/meta` | Counterwatch hero stats: tier list, per-map picks, best pick per role |
| `POST /api/meta/refresh` | Fetch fresh Counterwatch stats now (at most once a minute) |
| `GET /api/net` | Ping to Americas, Europe and Asia, jitter and packet loss, Wi-Fi details. Probing only runs while a card is asking |
| `GET /api/system` | Memory in use, top apps by memory, battery charge rate |
| `GET /api/steam` | Latest Overwatch 2 posts on Steam |
| `GET /api/sessions` | Current play session and the saved history (`%APPDATA%\CommandStation\sessions.json`) |
| `GET /api/gamemode/history` | Game-mode steps applied and undone |
| `GET /api/media`, `GET /api/media/art`, `POST /api/media/control` | Now playing from Windows' media session; control body `{"action":"playpause"\|"next"\|"previous"\|"seek","ms":n}` |
| `GET /api/players` | Players online per hour (Steam) and the estimated regional shares |
| `GET /api/feed` | Overwatch news, patch notes and community/leak items |
| `GET /api/profiles` | Game-mode profiles with each step's current ("before") and target ("after") state |
| `POST /api/step/apply` | Apply one step. Body: the step object (needs `id`) |
| `POST /api/step/restore` | Undo one step. Body: the step object (needs `id`) |

Step ids: `power`, `close`, `gpu`, `poll`, `launch`, `obs` (OBS is not linked yet). Errors come back as `{ "error": "..." }`. The security checks and the journal are being reworked in parallel, so check `service/server.mjs` and `service/gamemode.mjs` for the current behaviour.

## Config

On first run the service writes `%APPDATA%\CommandStation\config.json` with the defaults below. Edit it and restart the service. A key you leave out keeps its default.

| Key | Default | Meaning |
| --- | --- | --- |
| `host` | `127.0.0.1` | Bind address. Leave as is. |
| `port` | `8787` | API port. The dashboard currently expects 8787. |
| `regionHost` | `battle.net` | Host pinged for the latency reading |
| `presentMonPath` | `null` | Full path to PresentMon.exe if not in a standard place |
| `presentMonArgs` | `["--process_name","{process}","--output_stdout","--terminate_existing"]` | Arguments; `{process}` is the game exe |
| `games` | `["Overwatch.exe"]` | Processes treated as the game |
| `closeApps` | Spotify, OneDrive, ArmouryCrate, ASUSSoftwareManager (.exe) | Closed by the game-mode "close" step |
| `feed.newsUrl`, `feed.patchUrl` | Blizzard news and patch notes pages | Feed sources |
| `feed.reddit` | r/Overwatch (community), r/OverwatchLeaks (leak) | Subreddits to read |
| `feed.refreshMs` | 1800000 (30 min) | Feed refresh interval |
| `feed.redditGapMs` | 8000 | Pause between Reddit requests |
| `feed.userAgent` | `CommandStation/0.2 ...` | User agent sent to feed sources |

## Data folder

`%APPDATA%\CommandStation\` (usually `C:\Users\<you>\AppData\Roaming\CommandStation`), created by `service/paths.mjs`:

- `config.json`: your settings
- `journal.json`: undo journal for game mode
- `feed-cache.json`: last fetched news

Deleting the folder resets everything. Do not delete `journal.json` while game mode is on, or the undo is lost.

## Build the desktop app

Needs Rust, the Microsoft C++ build tools and Smart App Control off. In `app`:

```bash
npm run tauri build -- --bundles nsis
```

The installer lands in `src-tauri/target/release/bundle/nsis/`. The shell launches the bundled `node.exe` against `service/` and stops it on exit (log: `%APPDATA%\CommandStation\service.log`).

## Prebuilt Phase 1 build

The project root has `CommandStation\` (command-station.exe plus WebView2Loader.dll) and `CommandStation-Phase1-windows-x64.zip` with the same files. It is unsigned and was built on Linux, so SmartScreen will warn (More info, Run anyway). It is the older Phase 1 shell and does not include the current service changes. Keep both files together. Its own README says `set STATION_PROVIDERS=mock` before launching forces sample data (unverified).

## Choosing cards

Press **Edit layout**, then **Cards**. A list of every card opens: tick one to add it, untick to remove it, or press the **×** on a card. **Starting set** goes back to the first-run cards. Your choice is saved. Groups: This PC (memory, power), Connection (ping by region, jitter and loss, Wi-Fi, verdict), Overwatch (player trend, patch summary, leak watch, season countdown, Steam news, best time to play), Game (session timer, play history, session report, game mode history), Media (now playing), Tools (world clocks, checklist, deck button map).

Now playing works through Windows' own media session, so it controls Spotify and anything else that is playing, with no login. It can't browse playlists. The season end date is typed in by you because Blizzard does not publish it in a form this app can read. Patch buff or nerf labels are guessed from the wording. Region player shares are estimates; hourly totals are Steam players only.

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
| `service/` | Local API: `server.mjs`, `sensors.mjs`, `gamemode.mjs`, `feed.mjs`, `system.mjs`, `config.mjs`, `paths.mjs`, `parsers.mjs` |
| `src/lib/types.ts` | `Sample`, `FeedItem`, `Profile`, `Provider` interface |
| `src/providers/` | `live.ts` (talks to the service), `mock.ts` (sample data), `index.ts` picks one |
| `src/state/useStation.ts` | Samples once a second (3 s in game mode, 5 s when hidden), keeps 60 readings |
| `src/state/useGameMode.ts` | Applies a profile step by step, journal first, restores on exit or after a crash |
| `src/state/useEnvironment.ts` | Drops blur and motion when hidden or when a game is running and this window is not in front |
| `src/components/`, `src/layout/`, `src/styles/app.css` | UI, grid and styles |
| `src-tauri/` | Desktop shell (minimal) |

## Next

3. Link the Stream Deck panel to real hardware (currently a preview) and OBS scene switching (the `obs` step is a stub).
4. Measure the app's cost with Overwatch running against the budget (under 1% CPU, under 150 MB).

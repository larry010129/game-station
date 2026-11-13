# Command Station: what was built

A Windows dashboard for Overwatch players. It shows real readings from this PC, a game mode with undo, Overwatch news and meta, and a card layout you arrange yourself. It runs as a desktop app (Tauri 2 + React + TypeScript) with a small local Node service.

Last updated: 12 November 2026.

## Where things are

| What | Where |
| --- | --- |
| Desktop app to run | `CommandStation-v0.2\command-station.exe` (keep `node.exe` and `service\` next to it) |
| Installer | `app\src-tauri\target\release\bundle\nsis\Command Station_0.2.0_x64-setup.exe` |
| Browser version (backup) | in `app`, run `npm run live`, then open http://localhost:1420 |
| Source | `app\` (`src` is the dashboard, `service` is the local service, `src-tauri` is the desktop shell) |
| Design pages | `design\world-clock-cards.html` (the five clock looks), `design\world-clock-options.html` (first, rejected attempt) |
| Your data | `%APPDATA%\CommandStation\` (config, journal, caches, `service.log`) |
| Docs | `START HERE.txt`, `app\README.md`, `app\docs\SETUP.md`, `app\docs\TROUBLESHOOTING.md` |
| Code graph | `graphify-out\` (`graph.html`, `GRAPH_REPORT.md`, `graph.json`) |

The old Phase 1 build in `CommandStation\` and its zip are superseded.

## How it works

- The desktop shell starts the bundled `node.exe` against `service\index.mjs` on `127.0.0.1:8787` and stops it when the app closes. The log is `%APPDATA%\CommandStation\service.log`.
- The service has an Origin allowlist, a Host check and a JSON-only check on POSTs.
- The dashboard only shows real data. If the service is not up yet it says "Starting the local service" and keeps retrying. The sample-data fallback was switched off and no made-up numbers appear.
- Building the exe needs Rust, the VS C++ Build Tools, and Smart App Control off.

## What the dashboard has

**This PC**
- GPU temperature with a limit gauge (from `nvidia-smi`), CPU and GPU load, ping and battery, alerts and events, memory, power.
- CPU temperature was removed on request, so LibreHardwareMonitor is no longer needed.
- Frame rate was removed on request (Frame rate, Frame time and 20-second averages cards and the big chart).

**Game mode**
- One-tap game mode with a write-ahead undo journal: power overlay, GPU preference registry and closing apps. Leftovers are restored when the service starts.

**Overwatch**
- **Players online:** hourly player count from Steam's public API (`GetNumberOfCurrentPlayers`, Overwatch 2 on Steam, Steam players only) with a world map. The regional split is an estimate from fixed shares and is labelled that way. History builds only while the app runs.
- **Feed:** news from Blizzard, Reddit and YouTube, with a platform icon per story and links that open the exact post.
- **Meta cards:** hero tier list, map hero picks and best pick per role, from counterwatch.gg.
- **Hero profile:** one hero's Counterwatch page. Win rate, matches, tier, confidence and honourable mention, a combat radar against the role average, a poke / rush / dive chart, per-10 bars, and best maps. The service caches it with the daily meta file (`GET /api/meta/hero`). The picker remembers the hero (`cs.meta.hero`). It is on for a fresh layout; a layout you already saved needs the card added, or Reset layout.
- **Leak feed:** the former AI search card. It searches for leaks on its own every hour (from a fork session).
- More cards: player trend, patch summary, season countdown, Steam news, best time to play.

**Tools and media**
- Stream Deck + preview (display only, no hardware link), now playing, session timer, play history, session report, game mode history, deck button map, pre-game checklist and notes.

**World clock card, five looks**
- Rulers, 24-hour ring, Day curve, Offset levels and Headline, drawn from the app's own tick rulers, dashed rings and hairline charts.
- Switch the look from **Customise** on the card or from the look dropdown while editing the layout. Customise also adds and removes cities (up to six; the first is your own time).

## Layout and look

- **Edit layout:** drag cards to move them, drag a corner to resize, press × to remove.
- **Add cards:** a list of every card. Drag a tile onto the dashboard, or press +. You can add the same card as many times as you like; each copy has its own position, size and look.
- **Save as default / Reset layout / Original layout:** the saved default covers which cards you have and where they sit.
- **Appearance panel** (palette button in the top bar): card colour and a background picture you upload.
- Layouts have desktop (24 columns), tablet (12) and a fixed one-column phone width.

## Known limits

- The installer has not been run end-to-end on this PC. Several features were checked in the browser preview; re-check drag-and-drop inside the exe after a rebuild (`dragDropEnabled` is now `true`; the + button remains as fallback).
- 21st.dev is connected in Cursor (server `21st` in `~/.cursor/mcp.json`). The hero profile charts are this app's own SVG, chosen after looking up radar and bar references there.
- Every Hero profile card uses the same chosen hero (`cs.meta.hero`).
- "Vault" in the top bar is a greyed-out placeholder from the original mockup with nothing behind it. Remove it or build it: not decided.

### Fixed (12 Nov 2026)

- Checklist and notes: each card copy stores its own content (`cs.checklist.<id>` / `cs.note.<id>`); the first copy inherits the old shared values once.
- Leak watch: always available in the card list; empty state says there are no leak posts right now.
- Reddit 429: one Retry-After backoff retry, and last-good items for a failed subreddit are kept in the feed cache.
- Game mode after reload: UI reads `/api/gamemode/active` and shows "on" when the service journal still has steps.
- PresentMon is no longer started when a game is detected (FPS cards were removed).
- Tauri `dragDropEnabled` set to `true` so picker drag-and-drop can work in the exe.

## Checks at last build

- Typecheck passed. 44 service tests passed. The exe built, started its own service within about 2 seconds, and the service returned real players, meta, feed and sensor data.
- After that build, the hero profile card and one hero-page parser test were added (46 tests in the suite). `CommandStation-v0.2\command-station.exe` is older than that source, so rebuild before expecting the card in the desktop app.

# Goldfish Review Report: Command Station (round 1)

Reviewers: design_critic (frontend), codebase_details (backend), zoom_out (whole repo). All three completed. No Blockers, 15 Major, ~16 Nit after de-duplication. Round is **not clean**.

All proposed fixes below are **PROPOSE FIX** (nothing contested yet). No code has been changed.

## A. Correctness / crash risks (backend)

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| B1 | Major | Spawned children have no `error` listener; an async spawn failure (e.g. Battle.net launcher) is an uncaught exception that kills the service | library.mjs:70,75; gamemode.mjs:11,17; spotify.mjs:165; toasts.mjs:21 | Shared `spawnDetached()` with `.on("error")`; add `uncaughtException` logger |
| B2 | Major | Write to dead media helper stdin -> EPIPE crash | media.mjs:132 | `stdin.on("error")`, resolve waiter with "" |
| B3 | Major | Unescaped WMI brand in `new RegExp` can throw at startup; `\\s` typo; `listen()` waits on cold PowerShell | sensors.mjs:333-341; index.mjs:207 | Escape/startsWith; listen first, fill `machine` async |
| B4 | Major | Settings save overwrites a corrupt config.json, losing hand edits | settings.mjs:44; config.mjs:33 | 409 when `config.corrupt`, or back up to .bak |
| B5 | Major | Counterwatch refresh overwrites cache entries written while it runs | counterwatch.mjs:703-755 | Merge at commit time |
| B6 | Major | `GET /api/meta` blocks for the whole scrape; forced refresh on every launch | index.mjs:87; counterwatch.mjs:779 | Return snapshot immediately; refresh only if older than DAY |
| B7 | Major | Discord pipe leaks sockets; `stop()` never called on shutdown | discord.mjs:56-107; index.mjs:178 | Remove listener, destroy on timeout, call `stop()` |
| B8 | Major | AI child orphaned on timeout/shutdown (shell:true kills only cmd.exe) | ai.mjs:106; index.mjs:178 | `taskkill /T /F` or spawn without shell; `ai.stop()` |
| B9 | Major | README API table drifted from handlers | README.md:62-83 | Generate from handler keys; add test |
| B10 | Nit | Elevated memclean timeout leaves child; any Origin-less local caller can trigger UAC | memclean.* | Custom header on POSTs; temp copy of script |
| B11 | Nit | Wi-Fi/ping parsing assumes English Windows; system is Traditional Chinese | netstats.mjs:26; parsers.mjs:227 | Locale-independent parse; add sample test |
| B12 | Nit | `tcpConnectMs` wrong for IP hosts; two ping helpers | sensors.mjs:346 | Set t0 before connect; one helper |
| B13 | Nit | Duplicated logic (Steam library scan, appId, battery reads, heavy cost poll) | library/system/steam/players/hwextra | Single helpers; longer TTL |
| B14 | Nit | Dead PresentMon code; `describeProfiles` 500s on PowerShell error; test gaps (spotify, settings, library, media, memclean, toasts, config) | sensors.mjs:198; index.mjs:46 | Delete/flag, `.catch`, add tests |
| B15 | Nit | Spotify callback clears `pending` before validating; strict bool parse; 429 backoff; stale toasts snapshot; 413 after destroy; GET errors drop `{error}` | various | Per item list in reviewer output |

## B. Look and frontend

| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| F1 | Major | Light themes: active controls render dark-on-dark (`background: var(--text); color:#111`) | app.css:84,376,397,611,931,987,1143,1158; meta.css:17,108 | Add `--on-text` token in `applyPalette`, use everywhere |
| F2 | Major | Spotify card hard-codes white/#111, unreadable on light | app.css:1103-1117; extras.css:56 | Token-based colors or dark scrim |
| F3 | Major | Whole dashboard re-renders every second (root clock + useStation tick, no memo) | App.tsx:145,295; useStation.ts:26 | Move clock into TopBar; store/context for samples; memo; lazy card map |
| F4 | Major | Side effects inside state updaters; double-fire under StrictMode | App.tsx:187; useDashboard.ts:141,160 | Compute outside updater, persist in effect |
| F5 | Major | Sample poller has no try/catch, can overlap, dead `onEvent` | useStation.ts:17 | Catch, skip in-flight, emit event once |
| F6 | Major | `--mute` below WCAG contrast; 85 declarations at <=11px | app.css:12; palette.ts:68 | Raise `--mute`, 12px floor, clamp custom themes |
| F7 | Major | Dead code: mock provider, ClocksCard, readTab, unused CSS classes | providers/mock*.ts; ToolCards.tsx:36; App.tsx:118 | Delete |
| F8 | Nit | Global one/two-letter class collisions (.off, .ring, .ph) | app.css:218-266 | Prefix/scope |
| F9 | Major | App.tsx god component; page routing string chain repeated 3x | App.tsx:236,263,281,387 | `kind` on TABS; extract VaultPage/PAGES |
| F10 | Nit | localStorage helpers copy-pasted in 6 files | App/useDashboard/useTheme/useEnvironment/ToolCards/WorldClock | `lib/storage.ts` |
| F11 | Major | Wallpaper base64 in localStorage can silently fill quota; `read(KEY)` every render | useTheme.ts:89,156,183 | Store file via service/IndexedDB |
| F12 | Nit | Escape closes select AND exits edit mode | App.tsx:222; StationSelect.tsx:138 | stopImmediatePropagation |
| F13 | Nit | A11y: Segmented tab roles, clickable `li`, single-slot toast overwrites | Segmented.tsx; CalendarCard.tsx:78; Toast.tsx | radiogroup, buttons, toast queue |
| F14 | Nit | Two notification systems; one event shown up to 3x | Toast.tsx / useToasts.ts / App.tsx:182 | Single notifier |
| F15 | Nit | Duplicate top-bar affordances (name x2, two Vault entries) | TopBar.tsx:37-69 | One entry point |
| F16 | Nit | BootDemo ships in prod bundle; unused "Coming soon" tiles; README drift | main.tsx:17; CardPicker.tsx:73 | DEV-gate/lazy-load, remove |

## C. Architecture / scope (zoom-out)

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| Z1 | Major | Scope outgrew "Overwatch dashboard" (Discord, Spotify, library, toasts, memclean, cost, world clock, calendar, themes, credits, boot) | Decide product scope; cut or put extras behind one `integrations/` boundary |
| Z2 | Major | Mock provider (~550 lines) unreachable; `?mock=1` gate does not exist | Delete, or wire gate plus contract test |
| Z3 | Major | `Provider` abstraction has one implementation; sample/feed/players bypass `useApi` | Replace with plain `api.ts`; move onto `useApi`; drop dead `Sample` fields |
| Z4 | Major | FPS/PresentMon removed in UI but alive in backend (sensors, parsers, health/diag, live.ts) | Delete path, parsers, tests, fields |
| Z5 | Major | `index.mjs` hand-wired composition root; shutdown lists drift; duplicated step handlers; hardcoded version | Modules export `routes`/`start`/`stop`; loop; read version from package.json |
| Z6 | Major | Tiny one-purpose service modules; cputemp card contradicts "removed"; `counterwatch.mjs` 1126 lines | Merge small readers; split parser vs cache; resolve cputemp |
| Z7 | Major | MetaCards.tsx 972 lines, App.tsx 526 | Split charts/cards; move registry next to layouts.ts |
| Z8 | Major | Docs drifted (Vault, DeckPanel, boot plan, test count, design pages) | One README; delete finished plans |
| Z9 | Major | Build artefacts beside source; second hand-synced `service/` copy; 1 commit with ~60 uncommitted files | Commit in chunks; single `dist/`; bundle service as Tauri resource |
| Z10 | Nit | Boot screen larger than its job | Keep readiness gate, simplify surface |

## Cross-reviewer overlap (higher confidence)
Dead mock provider (F7, Z2), PresentMon/FPS leftovers (B14, Z4), README/docs drift (B9, F16, Z8), `index.mjs` shutdown gaps (B7, B8, Z5), App.tsx too large (F9, Z7), duplicated storage/logic (F10, B13).

## Suggested fix order
1. Crash/data-loss: B1, B2, B3, B4, B7, B8, B5, B6.
2. Visible look bugs: F1, F2, F6, F11.
3. Performance/logic: F3, F4, F5, F12.
4. Cleanup (low risk, deletes code): Z2, Z3, Z4, F7, Z8.
5. Structural refactors (larger, need your call on scope): Z1, Z5, Z6, Z7, F9, Z9.

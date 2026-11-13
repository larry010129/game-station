# Command Station: what is left to clean and fix

Status after four review rounds: all approved findings applied; 130 service tests, `tsc` and `vite build` pass; nothing run in a real browser or the desktop shell; nothing committed. Review loop: 0 of 2 clean rounds (cap 5, round 5 remaining).

## Phase 0: make it safe and prove it works (do first, about an hour)

| # | Step | Why |
|---|------|-----|
| 0.1 | Commit the current state in logical chunks (backend fixes, frontend fixes, docs, tests). Check `git status` for secrets first (`discord.json`/`spotify.json` live in `%APPDATA%`, not the repo; confirm nothing similar is staged) | About 60 changed files and one commit: no rollback point |
| 0.2 | Run `npm run live`, open http://localhost:1420, open DevTools Network: dashboard calls to `127.0.0.1:8787` must return 200 (confirms the cross-site Blocker fix) | Fix is test-covered but never seen in a real browser |
| 0.3 | Click through: edit layout, add and remove cards, switch a light theme and a dark theme (check editbar, picker, toasts, selects, Spotify card, hero radar), Vault backup then restore (confirmation, summary toast, wallpaper), force a card error | Visual and runtime changes were verified by reading code only |
| 0.4 | Game mode: start and stop on a safe profile, confirm power mode restores; kill the service mid-game-mode and restart, confirm the journal recovers | Journal and power-step logic changed twice |
| 0.5 | `npm run prepare:sidecar` then `npm run tauri build -- --bundles nsis`; install and launch; check the log `%APPDATA%\CommandStation\service.log` | Bundle now stages `service/` without tests and refuses non-x64 |

## Phase 1: decisions only you can make

| ID | Decision | Options | My recommendation |
|----|----------|---------|-------------------|
| A1 | Desktop shell hard-kills the service (`child.kill()` = TerminateProcess), so `shutdown()` never runs in the shipped app and children (nvidia-smi, typeperf, PowerShell helpers, AI tree) are orphaned | Piped stdin: Rust keeps a pipe open, service shuts down on stdin end; or a Windows job object with kill-on-close | Piped stdin (small, testable). Needs a Rust build to verify |
| A4/M5 | Old builds `CommandStation/`, the Phase 1 zip, `CommandStation-v0.2/` (stale 18-file service) | Delete (permanent, they are not in git), move to `release/`, or leave | Rebuild once (0.5), then delete all three |
| M6 | `app/screenshot-cards.mjs` (untracked, unused) and the `playwright` devDependency | Delete both, or move to `scripts/` and wire `npm run shots` | Delete unless you use it |
| Z1 | Scope: Discord, Spotify, game library, toasts, memory clean, cost, world clock, calendar, themes, credits all grew past "Overwatch dashboard" | Keep all and put extras behind an `integrations/` boundary; or cut unused ones | Cut whatever you have not used in a month. Do this before more refactors |
| Z6 | `cputemp` card and `/api/cputemp` (needs LibreHardwareMonitor) | Keep, or remove card, endpoint, `lhmUrl` | Remove if you do not run LHM |

## Phase 2: remaining code work (after Phase 1 decisions)

### Correctness and safety
| ID | Item | Notes |
|----|------|-------|
| B10 | Memory clean: elevated PowerShell child outlives the 120 s timeout; any Origin-less local caller can pop a UAC prompt | Require a custom header on POSTs (forces CORS preflight); copy script to a restricted temp path before elevating |
| B15 | Spotify: no 429 backoff (two calls per tick keep polling) | Honour `Retry-After` |
| R-wall | Restore: wallpaper image is not snapshotted; a failed save restores the old reference but not the old picture | Snapshot via `loadPicture` before restore |
| H5b | Untested: `prepare-sidecar` staging filter, background recovery in `main()` | Export the filter, test on a temp dir |
| V | Bundled service has no `package.json`, so `VERSION` falls back to `0.2.0` | Ship `package.json` in the Tauri resources or stage a version file |
| X | Remaining raw `execFile`/`spawn` outside `spawn.mjs` (`system.mjs`, `memclean.mjs`, `ai.mjs` where-probe, `live.mjs`) are documented as exempt | Revisit only if one starts long-running work |

### Structure and simplification
| ID | Item | Notes |
|----|------|-------|
| Z3 | Replace the `Provider` interface (one implementation) with a plain `api.ts`; move sample, feed and players onto `useApi`; one polling path and one boot signal | About 25 cards plus 3 hooks touch it. Do after Z1 shrinks the card set |
| Z5 | `index.mjs` composition root: modules export `routes`/`start`/`stop` and `index.mjs` loops | Makes cutting a feature a one-line removal |
| Z6b | Merge one-purpose modules (`sysstats`, `steam`, `hwextra`) into `system.mjs` | Optional |
| Z10 | Boot screen is larger than its job (about 770 lines plus CSS) | Keep the readiness gate, simplify the surface |
| F14 | Two notification systems (single toast and persistent centre); one event can appear three times | One notifier with severity, persistence and toast preview |
| M7 | Card registry vs `layouts.ts` metadata vs card files: a new card still touches 2 to 3 files | Add a comment, or merge after Z1 |

### Polish (low priority)
| ID | Item |
|----|------|
| G7 | Edit mode is pointer-only: add Move up/down in the card picker |
| G3 | First paint on light themes: inline script in `index.html` (currently `useLayoutEffect`) |
| cs. | Centralise the `cs.` storage-key prefix |
| Q5 | Restore result via `sessionStorage` instead of delayed reload |
| St | `useStoredJson` accepts a stored `null` with no `validate`; Toast flashes the previous text for one frame |
| JS | Main bundle is 520 kB: dynamic `import()` for pages (Vault, Themes, Credits) or `manualChunks` |
| T | The three default tokens `--glass-hi`, `--edge`, `--edge-2` still use white alpha |

## Phase 3: close out the review loop

1. After Phase 0 and Phase 1 decisions, run round 5. Reviewers re-audit the changed code.
2. A round is clean when no unsettled Blocker or Major remains. Two clean rounds in a row ends the loop.
3. If round 5 still finds Majors (likely), the skill stops at the cap: list the open findings by severity and choose to accept, continue, or return to drafting.
4. Update `goldfish_review_report.md`, then archive it into `docs-archive/`.

## Suggested order

1. Phase 0 (commit, run, click through, build). Fix anything it exposes before any review.
2. Phase 1 decisions, especially Z1 and A4/M5.
3. Phase 2 safety items (B10, B15, R-wall, V), then Z3/Z5/Z10 after the scope cut.
4. Polish as time allows.
5. Round 5.

## Already done (for reference)

- Backend: spawn safety helpers, crash and shutdown handling, config corrupt/locked/validated handling, journal corruption guard, power-step downgrade fixes, media helper framing, Discord and AI leaks, non-blocking `/api/meta`, locale-independent Wi-Fi and ping parsing, cross-site guard (Blocker fixed), step-id validation, fixed port, `COMMAND_STATION_DATA` override, tests 68 to 130, `counterwatch.mjs` split.
- Frontend: light-theme tokens (`--on-text`, `--wash`), contrast guards, modern color import, sensor store with stale and no-signal state, per-card error boundaries, memoised cards, wallpaper in IndexedDB, restore replaces with confirmation and rollback, `lib/storage.ts` everywhere, `MetaCards` and `App.tsx` split, dead mock/FPS code removed.
- Docs: root README, trimmed `app/README.md`, `SETUP.md`, `TROUBLESHOOTING.md`, `START HERE.txt`, archived plans and review reports.

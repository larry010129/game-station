# Goldfish Review Report: Command Station (round 3)

Earlier rounds: `docs-archive/goldfish_review_round1.md`, `docs-archive/goldfish_review_round2.md`. Round 3: all three reviewers completed. No Blockers, 13 Major, ~20 Nit. Round is **not clean** (clean-round count: 0 of 2 needed; cap 5).

Settled/pending (not re-raised): Z1 scope cut, Provider -> api.ts, modular routes, A1 Tauri hard-kill, A4 Phase 1 deletion, B10, Spotify 429, F14.

Note: 4 of the Majors sit in code touched by round 2 fixes (gamemode power step, media recycle, crash exit, restore). They are follow-on bugs in the new code, not reasons to revert.

## Backend
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| H1 | Major | Transient EBUSY/EPERM on config.json read counts as "missing" and seeds defaults over the user's file | config.mjs:89-95,132 | `exists:false` only on ENOENT; else corrupt with message; test |
| H2 | Major | Power step: set ok but read-back throws falls through to Better (downgrade); all read-backs fail leaves PC changed with no restore | gamemode.mjs:240-264 | Track setOk separately; don't try next target after unverified set; test |
| H3 | Major | Crash-counter `process.exit(1)` skips `stopAll()`, orphaning nvidia-smi/typeperf/toasts/AI trees | index.mjs:37-40 | `stopAll()` in try/catch before exit |
| H4 | Major | Media stdout handler unguarded by `child === c`: late data from recycled helper corrupts the new helper's framing | media.mjs:122-135 | Guard; per-helper buffer |
| H5 | Major | Test gaps: crash counter/shuttingDown/background recovery, toasts backoff, media recycle, sensors stream restart, ai 9009/where, prepare-sidecar | service/test | Inject spawn/clock; extract `lifecycle.mjs`; add tests |
| H6 | Nit | `ENGINES[engine]`/`TOPICS[topic]` accept inherited keys ("constructor") | ai.mjs:60,204,242 | `Object.hasOwn` |
| H7 | Nit | Re-enabling auto can trigger a search within ~60 s of a finished one | ai.mjs:247 | `max(now+60s, last+HOUR)` |
| H8 | Nit | `get()` drops server `{error}`; `api(path, undefined)` turns POST into GET | live.ts:7-11 | Share error extractor |
| H9 | Nit | Cross-site no-cors GETs pass Origin/Host checks (side-effecting `?force=1`) | server.mjs:21-34 | Reject `Sec-Fetch-Site: cross-site`; or force via POST |
| H10 | Nit | sensors stream adds a `timers` entry per restart, never removed | sensors.mjs:61 | Remove on fire |

## Frontend
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| J1 | Major | Restore merges, not replaces (UI says replaces); default-layout backup keeps old layout/notes | VaultExtras.tsx:287-309,349 | Remove existing `cs.*` (except session/sign-in) before write |
| J2 | Major | Bad stored value (e.g. via restore) crashes NotesCard; no ErrorBoundary: blank window every launch | storage.ts:49; ToolCards.tsx:18; main.tsx | `validate` option in useStoredJson; ErrorBoundary per card cell |
| J3 | Major | ~40 hard-coded white-alpha overlays vanish on light themes | meta.css, select.css, extras.css, app.css (lines in reviewer list) | `--wash`/`--wash-2` tokens via color-mix on `--text` |
| J4 | Major | Reload fires before result toast; old backup without `picture` key drops current wallpaper | VaultExtras.tsx:306-319 | Reload after final toast; clear marker only when `picture === null` |
| J5 | Nit | Kill switch (`stopped`) leaves frozen readings looking live; no "restored" event | useStation.ts:57 | Push staleSample once; emit restore event |
| J6 | Nit | Memo on Dashboard defeated: `renderCard` depends on 12-input ctx | App.tsx:233-329 | ctx via ref/context, or drop the comment claim |
| J7 | Nit | `provider.profiles` mutated in place from settings page | VaultExtras.tsx:156 | useGameMode owns profiles |
| J8 | Nit | Toast alert priority visual only (no assertive live region); long messages in 999px pill | Toast.tsx:59; app.css:322 | role=alert for alerts; smaller radius |
| J9 | Nit | Contrast guards ignore alpha; repeated canvas reads (up to 36 per token) | palette.ts:94-196 | Resolve to RGB once; composite card over bg |
| J10 | Nit | WorldClock defaultCities new array each render; duplicate datalist id; exportFile no catch; orphaned per-instance storage keys | WorldClockCard.tsx:24,406; VaultExtras.tsx:252; storage.ts:49 | Per-item fixes |

## Architecture, docs, hygiene
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| M1 | Major | app/README.md describes older product (sample fallback, Deck panel, mock files, cputemp "not shown", typo in AI history path, stale "reworked") | app/README.md | Cut to API table, config table, data folder |
| M2 | Major | SETUP.md/TROUBLESHOOTING.md: sample data, Stream Deck, Phase 1 exe, CORS origin list | app/docs | Delete entries; align origins (doc edits only, not folder deletion) |
| M3 | Major | Dead `demo` flag and "Sample data" labels | types.ts:50,281,327; PlayersMap.tsx:88,152; meta/shared.tsx:218 | Delete |
| M4 | Major | spawn.mjs header claims all children go through it; live/system/ai/memclean do not | spawn.mjs:1-2 | Reword header (one-shot execFile and dev launcher exempt) |
| M5 | Major | Root clutter: release folders + zip beside source; two overlapping .gitignore; reports at root | repo root | `release/` folder, single ignore file incl. service-stage, reports to docs-archive/reviews |
| M6 | Major | Unused screenshot-cards.mjs and heavy playwright devDependency | app/screenshot-cards.mjs; package.json:37 | Delete both (or wire into scripts/ with npm run shots) |
| M7 | Nit | lib.rs speculative second sidecar name | lib.rs:37-41 | Drop or comment |
| M8 | Nit | Spotify/library/steam not in stoppable list; comment overstates | index.mjs:177 | Reword comment |

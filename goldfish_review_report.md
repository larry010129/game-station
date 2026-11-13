# Goldfish Review Report: Command Station (round 4)

Earlier rounds: `docs-archive/goldfish_review_round1.md` to `round3.md`. Round 4: all three reviewers completed. 1 Blocker (already fixed, see below), 15 Major, ~13 Nit. Round is **not clean** (clean rounds so far: 0 of 2 needed; cap 5, so one round remains).

Settled/pending (not re-raised): Z1 scope cut, Provider -> api.ts, modular routes, A1 Tauri hard-kill, A4 Phase 1 deletion, M5 move release folders, M6 delete screenshot script/playwright, B10, Spotify 429, F14.

## Blocker (FIXED during this round)
| ID | Finding | Fix applied |
|----|---------|-------------|
| N1 | Round 3 H9 rejected every `Sec-Fetch-Site: cross-site` request. The dashboard (localhost:1420 / tauri.localhost -> 127.0.0.1:8787) is cross-site in Chromium/WebView2, as is the Spotify redirect, so every dashboard call and Spotify login would 403. Tests missed it (never sent allowlisted Origin + cross-site). | Reject cross-site only when Origin is absent; exempt GET /api/spotify/callback; 2 tests added (112 pass). Confirm once in DevTools on the real app. |

## Backend
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| P1 | Major | Corrupt/locked `journal.json` read as empty and overwritten: undo journal lost | paths.mjs:12; gamemode.mjs:43 | `readJson` corrupt marker for non-ENOENT; refuse steps or keep `.bad`; test |
| P2 | Major | `ai.test.mjs` writes the real `ai-auto.json`/reads real history on every test run | ai.test.mjs:22-36 | Inject read/write or `COMMAND_STATION_DATA` temp dir override |
| P3 | Major | Power-set timeout treated as "nothing changed": no restore, or downgrade to Better | gamemode.mjs:246-278; system.mjs:7 | Only typed "refused" means unchanged; other failures = unverified, stop loop; test |
| P4 | Major | `AUTH_ERROR` regex on arbitrary CLI output misreports rate-limit/network errors as "not signed in" | ai.mjs:105,150 | Narrow to known phrases + non-zero exit; else raw message |
| P5 | Major | Malformed step body: truthy non-string id gives 500, polluted journal and session; whole client step object journaled | index.mjs:61; gamemode.mjs:310 | Validate string id in known set -> 400; journal `{id, label}` only |
| P6 | Nit | `Object.hasOwn(ENGINES, ["claude"])` true via coercion; setAuto(null) fragile | ai.mjs:210,246,248 | `typeof engine === "string"` |
| P7 | Nit | Tests: config test breaks if PORT env set; sensors 30 s reset untested; lifecycle shutdown path untested; server allowlisted-origin case (now added) | config.test.mjs:29; sensors/lifecycle tests | Stub env; add Date mock tests |
| P8 | Nit | `JSON.parse("null")` throws in media; `stop()` leaves `child` set | media.mjs:188,220 | Guard; `child = null` in stop |

## Frontend
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| Q1 | Major | Editbar, picker, card-name pills hard-coded near-black but text uses `--text`: dark-on-black on light themes | app.css:356,458,348,929; select.css:29,45; extras.css:12 | `--glass-solid`, `--wash`, `color-mix(--bg)` |
| Q2 | Major | `color-scheme: dark` hard-coded on `.cal-form input` and `.ssel-menu` | app.css:1108; select.css:66 | Remove/inherit |
| Q3 | Major | Scheme chosen by luminance threshold 0.45; mid-tone themes with dark text become "dark" | palette.ts:72-76 | `light = luminance(text) < luminance(bg)` |
| Q4 | Major | StrictMode defeats game-mode "still on after reload" sync in dev | useGameMode.ts:49-71 | Drop `synced` ref; alive guard |
| Q5 | Major | Restore summary toast cut by reload or queued behind another toast | VaultExtras.tsx:343; Toast.tsx:10,54 | Alert priority; reload after toast or toast after boot |
| Q6 | Major | Restore destructive/non-transactional, no confirmation; live effects can overwrite restored values | VaultExtras.tsx:305-331 | Snapshot+rollback, confirm, `restoring` flag or immediate reload |
| Q7 | Major | CardBoundary "Reset this card's data" often clears nothing; failed card never recovers | ErrorBoundary.tsx:40; cardKeys.ts:25 | "Try again" when no keys; pass `resetKey` |
| Q8 | Nit | Every card re-renders on any ctx change | registry.tsx:133; App.tsx:233 | memo cards or split ctx |
| Q9 | Nit | Translucent theme `card` makes `--glass-solid` popups see-through | palette.ts:96 | Flatten surface |

## Architecture, docs, hygiene
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| S1 | Major | `CommandStation-v0.2` documented as the working app but has a stale 18-file service | START HERE.txt:3; app/README.md:16 | Mark stale/rebuild; installer as documented path |
| S2 | Major | `port` config knob not real (UI and CSP fixed to 8787); docs contradict | config.mjs:7,120,130; live.ts:4; tauri.conf.json:30; README:121 | Drop `port` and env override; fix EADDRINUSE message |
| S3 | Major | README config table wrong (redditGapMs 12000, lhmUrl path, missing allowedOrigins/disabledSteps/feed.youtube); data folder lists 3 of ~12 files | app/README.md:114-139 | Correct; test config keys |
| S4 | Nit | Stale doc lines (SETUP test text, "quick start", docs-archive description) | SETUP.md:34,38; TROUBLESHOOTING.md:19; README.md:30 | Edit |
| S5 | Nit | Root report vs archived duplicate | goldfish_review_report.md | Single latest pointer (done by this rewrite) |
| S6 | Nit | `cardKeys.ts` hand-copied key list | cardKeys.ts:11 | Shared `storageKeys.ts` |
| S7 | Nit | `createAi(options)` vs `deps` pattern | ai.mjs:163 | Rename/split |
| S8 | Nit | `counterwatch.mjs` 1142 lines, two modules | counterwatch.mjs | Split parse/factory |

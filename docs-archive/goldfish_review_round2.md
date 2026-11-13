# Goldfish Review Report: Command Station (round 2)

Round 1 report is archived at `docs-archive/goldfish_review_round1.md`. Round 2 reviewers: design_critic (frontend), codebase_details (backend), zoom_out (repo). All three completed. No Blockers, 13 Major, ~17 Nit. Round is **not clean**.

Settled and not re-raised: Provider abstraction kept; F14 two notification systems; B10 memclean; Spotify 429; modular routes rewrite; battery read merge; Z1 feature-scope cut (owner decision).

## Regressions from round 1 fixes (fix, do not revert)
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| R1 | Major | No immediate first sensor read: every launch waits one interval; boot "Live telemetry" step delayed | useStation.ts:69 | `void tick()` after registering interval |
| R2 | Major | Failing sensor leaves old numbers on screen as live | useStation.ts:60 | After ~3 failures push null/stale sample; alerts skip stale |
| R3 | Major | Toast hard-coded dark bg, no text colour: unreadable on light themes | app.css:321 | `--glass-solid` / `--on-text` |
| R4 | Major | Backup/restore drops wallpaper (IndexedDB); restore leaves dangling `cs.bg.ref`; import writes unguarded | VaultExtras.tsx:219-277; useTheme.ts | Include picture in backup or clear ref on import; guard writes. (Found by two reviewers) |
| R5 | Nit | Toast queue delays alerts up to ~13 s; slice can evict visible head | Toast.tsx:22 | Priority for alerts; slice only waiting part |

## Backend
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| K1 | Major | Game mode downgrades power mode to "Better" when already on Best | gamemode.mjs:232-259 | Skip when previous is BEST (unchanged); add test |
| K2 | Major | Failed undo only retried at next start; `journalFailed` unused by UI; recovery blocks sensors start (up to 15 s per step); `main()` ignores `shuttingDown` | index.mjs:76-82,194; gamemode.mjs:121 | Surface in UI + type; background recovery; early return on shutdown |
| K3 | Major | `uncaughtException` handler swallows forever; sessions `writeJson` unguarded | index.mjs:26; sessions.mjs:48,77 | Count and exit after N/min; try/catch writes |
| K4 | Major | Toasts helper restarts every 4 s forever; "error" can double-start | toasts.mjs:54-66 | Backoff like sensors.stream; kill on error |
| K5 | Major | Corruption after startup defeats 409 guard; `SettingsData` lacks `corrupt` | settings.mjs:43,55; types.ts:370 | Check raw file before write; add type; test |
| K6 | Major | Unvalidated `feed` config: refreshMs 0/"30m" storms, non-array crashes, unencoded subreddit | config.mjs:56; feed.mjs:89,158 | Validate and default; encodeURIComponent |
| K7 | Major | AI "CLI not installed" detection English-only (Big5 machine); auth regex matches "design" | ai.mjs:128,133 | Exit code 9009 / `where` probe |
| K8 | Major | Counterwatch merge-at-commit untested; module hard-wired to real file/fetch | counterwatch.mjs:685; test | deps injection + test |
| K9 | Nit | live.mjs leaves orphan node on Windows | live.mjs:9 | use `killTree` |
| K10 | Nit | Wedged media helper never recycled | media.mjs:139 | kill after ~3 timeouts |
| K11 | Nit | killTree/spawn tests thin | spawn.mjs; backend.test.mjs | Add grandchild test; log taskkill failures |
| K12 | Nit | `Sample` type missing server fields; Discord `setup` doesn't clear guildCache | types.ts:8; discord.mjs:221 | Align types; clear cache |

## Frontend
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| G1 | Major | Modern colour formats (oklch, space-hsl, bare triplets) break contrast and scheme detection | palette.ts:138-176 | Normalise at import via canvas; reject unsupported |
| G2 | Nit | Only `--mute` guarded; `--dim` unchecked | palette.ts:68 | Guard both |
| G3 | Nit | First paint wrong for light themes (dark flash, wallpaper pop-in) | useTheme.ts:194; index.html | useLayoutEffect or inline script |
| G4 | Nit | `factory()` runs every render without user default | useDashboard.ts:84 | useMemo |
| G5 | Nit | Segmented: no Home/End, DOM-parent focus, dead selector | Segmented.tsx; app.css:313 | Refs, Home/End, remove selector |
| G6 | Nit | Hard-coded light-on-dark rgba in several rules | app.css:196,213,225,460; boot.css:253 | color-mix with `--text` |
| G7 | Nit | Dashboard aria-label on div without role; edit mode pointer-only | Dashboard.tsx:75 | Drop label or add move up/down |

## Architecture and hygiene
| ID | Sev | Finding | Where | Fix |
|----|-----|---------|-------|-----|
| A1 | Major | Tauri hard-kills service (TerminateProcess), so `shutdown()` never runs; children orphaned, port may stay held | src-tauri/src/lib.rs:13; index.mjs:174 | Piped stdin; service shuts down on stdin end; test |
| A2 | Major | `lib/storage.ts` half-adopted: ~13-20 sites still raw localStorage | many (see reviewer list) | Migrate mechanically; `useStoredJson` use `readJson` |
| A3 | Major | Round-1 report stale | README.md:31,41 | Archived now; update README |
| A4 | Major | Phase 1 README.txt / SETUP.md describe removed mock mode and PresentMon | CommandStation/README.txt; docs/SETUP.md:32 | Delete Phase 1 artefacts / section |
| A5 | Nit | Tauri bundle ships `service/test`; sidecar triple hard-coded x64 | tauri.conf.json:39; prepare-sidecar.mjs:9 | Stage clean copy; assert arch |
| A6 | Nit | sensors.mjs raw `spawn` duplicates error rule | sensors.mjs:61 | use spawnSafe/killTree |
| A7 | Nit | ~30 `memo` aliases in registry | registry.tsx:73-103 | Export cards pre-memoised |

## Open from round 1 (still deferred)
Z1 scope cut, Provider -> api.ts, modular routes, B10, Spotify 429, commit/repo hygiene.

# Stage 9 — Implementation Readiness report

- **Target:** `docs/designs/logic-fixes-round5.md`, DetailedRange (line 240 to end, §8).
- **Reviewers:** `egm-implementation-readiness` and `egm-codebase-details` (both against `implementation-readiness-standard.md`), and `egm-style`. All three completed. Codebase-details didn't read `app.css`, `app/README.md` or most of the C-group files, so its coverage is partial there.
- **Verdict:** **not ready.** 6 Blockers and 11 Majors after merging duplicates. Most of them sit in the parts Stage 8 recommended splitting out (G5 and the A2/A3/A7 exe seeding).

## Blockers

| ID | Reviewers | Lines | Finding | Fix |
|----|-----------|-------|---------|-----|
| IR-1 | readiness, codebase | 249-253, 256, 328 | `COMMAND_CMS_SEED` is a **file** today: `lib.rs:93` sets it to `seed/draft.json`, and `standalone.mjs:25-29` copies it. The plan treats it as a folder, never touches `lib.rs`, and says standalone sets it (`COMMAND_CMS_DATA` is set at `lib.rs:91`). The planned test would pass while the exe stays broken. | Add `lib.rs`, redefine the variable, keep the draft copy working. Or split A2/A3/A7 out (Stage 8 ZO8-1). |
| IR-2 | readiness, codebase | 262-264 | Step 2 turns the suite red. The stand-in host is `mockHost` in `scheduled-release.test.mjs:36-49`, not in `contentUpdate.test.mjs`, and it only provides `text()`. Its two "updated" tests (`:95`, `:103`) break once blobs are read with `arrayBuffer()`. The PNG release needs a signature, but the dev private key is gitignored. | Update `mockHost` to provide `arrayBuffer()`, and add the PNG test there. Sign it at test time with a throwaway keypair injected into the verifier, or with the local `.pem` when present. |
| IR-3 | readiness, codebase | 271 | Approve overwrites newer draft edits (`publish()` ends with `writeDraft`, `store.mjs:250`). `rollback()` never calls `publish()`. Undefined: Approve's use of the snapshot vs `files`, what `contentHash` is for, a past `effectiveAt`, `draftChangedSincePush`, and `reviewInfo()`'s shape and route. (Same as CR-1/Z2.) | Specify these, or split G5 out (ZO8-3). |
| IR-4 | readiness, codebase | 272, 275-276 | Wrong files. The routes are all in `http.mjs` (`draftApiPlugin.ts` defines none). The Push button and its "Release N is live now" text are in `cms/src/components/PushScheduler.tsx:99-104`. The nav is `CMS_NAV` in `cms/src/components/ui/sidebar-nav.tsx:42-50`. **No rollback UI or API client exists** in `cms/src`, so "the rollback confirm" refers to nothing. | Correct the file list, and drop or specify rollback UI. |
| IR-5 | readiness, codebase | 293-294 | The tests target logic with no importable entry point. B1's `idList` is private in the `useTheme` hook. B2's conversion happens in DrawPage after `drawMany` counted the pick (`gachaEngine.ts:622`). B4 is a `useCallback`. B11 is in a page component. `stationCredits.ts` has an extensionless import and reads `import.meta.env` when it loads, so it can't be imported under plain `node --test`. | Name the pure helpers to extract: waiting-pick capacity via `DrawOwned` into `drawMany`, `creditTick()`, `loadUnlocks()`, a storage-injectable credits module. |
| IR-6 | readiness, codebase | 287 | B3 is underspecified. It doesn't say what `readCredits` returns or stores after copying to `.bad`. `null` would mean both "too few" and "write failed", but `DrawPage.tsx:395-396` and `ThemesPage.tsx:394-398` always show "Not enough". The new `addCredits` return type hits `useQuests.ts:46,114`, `DrawPage.tsx:331` and `stationCredits.ts:74`. `readJson(key, null)` can't tell missing from invalid. | Use a distinct failure result, update the callers, and read raw for the missing/invalid split. |

## Majors

| ID | Lines | Finding |
|----|-------|---------|
| IR-7 | 250 | A3: a seeded number N with no `by-number/N` makes `/releases/current` point at a missing manifest, so dev apps report `failed`. Choose: stage the seed release itself, or seed a number floor only. |
| IR-8 | 285-286 | Commitments from §5 are missing from Step 4: the DrawPage day-change recompute (the memos at `DrawPage.tsx:303,305` have empty dependency lists); the B7 reset rule in `stepPity`; `migratedCoupons` in `GachaState`/`emptyGacha`/`cleanGacha` (otherwise `cleanGacha` drops it). The day-index formula and DST handling aren't given. The B5 test promised in §7 is missing. |
| IR-9 | 286 | B7 breaks the existing test `gacha.test.mjs:385-395`, which asserts the featured/rainbow split and isn't listed for change. The CR-2 reset bug also applies. |
| IR-10 | 286, 293 | B6: `test:service` doesn't set `TZ`, so it isn't said how `TZ=Asia/Taipei` is applied. The existing UTC-instant tests (`gacha.test.mjs:160-173, 256`) may change result. |
| IR-11 | 290 | B13: `useGameMode.ts` has no status poll, only a one-time read of `/api/gamemode/active`. A poll and its interval have to be specified. |
| IR-12 | 301, 303 | C4/C5: the work is in `index.mjs` (recovery at `:126`, lookup at `:139-141`), which can't be unit-tested and isn't listed for C5. The status route is `GET /api/gamemode/active` (`routes.mjs:122`). `routes.test.mjs:26` injects `machine`, so `pending` must live in the injected value. `bootSteps.ts:43` also reads `/api/machine`. The 5 s timeout outcome is unspecified. |
| IR-13 | 304 | C6: the last-track marker `$lastKey` is inside the PowerShell helper (`media.mjs:25,110`). Choose a reset command or a reset in the script itself. |
| IR-14 | 289 | B11: the weekly path has the same bug: `takePick()` at `ThemesPage.tsx:389` runs before the check at `:766`. `LOOK_COST` is also displayed at 5 places, and only the spend is changed. |
| IR-15 | 307 | C7: `useApi` caches by `path` only. Give the new cache-key signature. C9: say whether the timer is cleared in `stop()`. |
| IR-16 | 242, 328 | Claims don't match the plan. "Each step lands with its test" is false for many rows. "Test first" conflicts with "green after each". The "seed copy covered by the store test" doesn't cover staging or bundling. B2's return type (null vs false) differs across lines 50, 153 and 285. |
| IR-17 | 292 | The new `PLAN.md` wording uses "claim" in two senses ("That claim costs nothing" means choosing a look). Suggested: "a completed weekly look not collected by Sunday is lost; a collected pick stays waiting until the user chooses a look." |

## Nits

- The `tauri.conf.json` row changes nothing, because `stage/cms/` is already bundled. `updateContent.ts` needs no edit.
- A8: `pathname` is used at `http.mjs:69-91`, before the `try` at `:93`. Moving `new URL` inside it gives a 500, so it needs its own `try`/`catch` that returns 400.
- The rollback writes (`store.mjs:316-317`) are missing from the atomic-write list. `content-updates.md:15` isn't updated for A9.
- `cms/data/releases/current.json` is gitignored, so `prepare-desktop` needs a rule for when it's missing.
- Reuse: `listReleases()` for the scheduled-release list, and the `mockStorage` helper in `contentUpdate.test.mjs:26-42`.
- Style: use full paths instead of bare filenames; one notation for the tmp path; `120_000`; name the CSS selectors instead of "about lines"; list the six data files and three exes; mark each row Create/Modify/Delete.

## What this means

Stage 8's recommended scope removes IR-1, IR-3, IR-4, IR-7 and most of IR-16 at once: split G5 and the A2/A3/A7 seeding out, and keep only an early-push warning. The rest (IR-2, IR-5, IR-6, IR-8 to IR-15) is precise implementation detail that can go into §8 now. The code reviewers already located every file and line for it.

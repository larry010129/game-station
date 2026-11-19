# Stage 5 — Initial Zoom Out report

- **Target:** `docs/designs/logic-fixes-round5.md` (full file)
- **Reviewers:** `egm-zoom-out` (zoom-out standard) and `egm-inventive-catalyst`. Both ran in isolated contexts and read `PLAN.md`, `GACHA REDESIGN.md`, `app/docs/content-updates.md` and the cited code.
- **Result:** 0 Blockers, 10 Majors after merging duplicates, 9 Nits.

## Majors

| ID | Finding | Evidence | Recommendation |
|----|---------|----------|----------------|
| Z1 | **G5 is a new subsystem in a fix round, and A4's cause stays.** §5 says "none of them adds a new component", but G5 adds a page, three routes, `pending.json` and a split of `publish()`. Releases are still built from the whole draft, so Approve still makes scheduled changes live early; the warning only shows it. Push is already a two-click arm/confirm in `PushScheduler.tsx:26`, and that panel already shows the go-live time. | zoom-out M1; catalyst #3 | Re-confirm D4 with these facts. Option: put an "early" warning in the existing Push panel and the rollback confirm, and move G5 to its own design doc. Catalyst alternative: split a release into live + (draft − scheduled), then reissue the scheduled release. |
| Z2 | **Approve as written overwrites newer draft edits and can sign something other than what was reviewed.** Today's `publish()` ends with `writeDraft(draft)` (`store.mjs:250`). With a snapshot as input, that wipes later edits. `pending.json` keeps no `files` list, so Approve rebuilds from `uploads/` on disk. | catalyst #2 | Push saves the prepared bundle plus `files`/hashes. Approve signs only those, after re-checking each blob hash, and `commit` never calls `writeDraft`. Add a test. |
| Z3 | **The G5 plan misses the real Push UI and wrongly says rollback uses `publish()`.** The Push button and its "Release N is live now" message are in `cms/src/components/PushScheduler.tsx:104`. `rollback()` (`store.mjs:277-326`) has its own copy of the sign/write code, without `effectiveAt`. | zoom-out M2 | Add `PushScheduler.tsx` to Step 3. Make `rollback()` call `commit()`, so the atomic writes and `effectiveAt` live in one place. |
| Z4 | **The A2/A3/A7 seeding conflicts with the existing `COMMAND_CMS_SEED`.** `cms/src-tauri/src/lib.rs:93` sets it to the **file** `seed/draft.json`, and `standalone.mjs:25-30` already copies it. The plan treats it as a folder, spreads seeding over three modules, and never touches `lib.rs`. The planned test sets it to a folder, so it would pass while the exe stays broken. The `tauri.conf.json` row does nothing, because resources already map all of `stage/cms/`. | zoom-out M3; catalyst #1 | Keep all first-run seeding in `standalone.mjs` (derive the folder from `dirname(COMMAND_CMS_SEED)`). Leave `keys.mjs` and `ensureDataLayout` unchanged. Drop the `tauri.conf.json` row. |
| Z5 | **A2/A3 would ship a gitignored private key in the installer.** The key and `current.json` are not in the repo: `.gitignore:21-25` ignores them, and `cms/data/keys/README.md` says the private key must "never ship". A fresh clone already hits the same mismatch without any exe. Seeding number N with no `by-number/N` folder makes a dev app report `failed` on every boot until the first Push (`updateContent.ts:92-98`). | zoom-out M4; catalyst #1 | Either (a) a documented one-time manual copy of the `.pem` files into `%APPDATA%\CommandCMS\data`, with no code change, or (b) the dev app trusts a short list of keys: the bundled key plus extra keys from `app/.env`, dev only. The CMS shows its public key to copy, and a first-run "import from existing data folder" copies `current.json`, the matching release folder and uploads together. |
| Z6 | **B2's fix belongs in the engine, not DrawPage.** `drawMany` already turns over-cap picks into streak freezes (`gachaEngine.ts:582,595-597`). A DrawPage rewrite would duplicate that, the planned engine test can't reach it, and a ten-draw could still give two picks when only one slot is free. | zoom-out M5 | Pass waiting picks into `DrawOwned`, and treat "waiting + picks won in this batch ≥ cap" like `weeklyCapped`. |
| Z7 | **A draw writes several keys, and B3 protects only the spend.** A draw spends Credits, writes unlocks/picks, then writes `cs.gacha` without checking the result (`DrawPage.tsx:391-422`). If the last write fails, the user is charged and loses pity, crystals and `weeklyPicks`. | catalyst #5 | One `commitDraw` function: compute every next value, write gacha first and the spend last, and restore earlier writes on failure. B3, B5 and B11 become one tested rule. |
| Z8 | **B10 isn't connection-only.** `patreon.ts:38,47-64` stores the tier with no timestamp. On localhost, stopping the service lets a cancelled patron keep Basic and Brand forever, against `PLAN.md:51`. A restored backup brings old tiers back for the same reason. | catalyst #4 | Store `checkedAt` and treat the tier as valid for a grace period (for example 7 days). This also covers the Patreon half of B9. |
| Z9 | **Nits are scheduled without tests, against the Non-Goals.** B12, B13, B14, C10 and C13 are planned with no failing-first test. B14 is a policy change, B12 touches 7 call sites, and C13 is React wiring. | zoom-out M6 | Drop them to open nits, or add a test to each and relax the Non-Goal wording. |
| Z10 | **C1 covers one cause of a general ordering flaw.** `close` can't be undone, and it runs before steps that can still fail (gpu registry, journal save `gamemode.mjs:450`). Goal 6 promises more than the fix delivers. | catalyst #7; zoom-out N8 | Reorder so `close` runs after the steps that can fail (power, trim, memory, gpu, poll, then close, launch, priority), or narrow Goal 6. Keep the Overwatch-missing fix. |

## Nits

| ID | Finding | Recommendation |
|----|---------|----------------|
| N1 | B1's cap of 1000 is still a silent cut, and a lossy read gets saved back. | No numeric cap on unlocks; de-duplicate only. (both reviewers) |
| N2 | C4's retry loop: the doc doesn't say whether it delays boot. C4 retries on the client while C5 waits on the service, two patterns for the same race. | State that it runs after boot, and reuse the `useApi` poller. |
| N3 | `app/service/paths.mjs:57-62` already has an atomic `writeJson`. | Use the same name and signature in the CMS. Keep tmp/rename details in Step 1 only. |
| N4 | D1 widens pity to the Region pack, but `PLAN.md:34` and `GACHA REDESIGN.md` aren't scheduled for an update. A9 isn't reflected in `content-updates.md:15`. | Add those doc rows. |
| N5 | The change summary in G5 has nothing to reuse. The "preview only" direct-publish fallback keeps two publish paths. | Keep it to ids added, removed or changed, and drop the fallback. |
| N6 | Section order is G1, G2, G3, G5, G4, and the D table comes after the text that points to it as "below". | Reorder. |
| N7 | C10–C13 have no failure line or location ("see reviewer notes"). | Give each its own row. |
| N8 | §5 describes A5 at code level (`path.tmp-<pid>`). | Move that detail to Step 1. |
| N9 | Step 7.4 never builds the exe, yet A2/A3/A7 are exe-only fixes. | Say how they are checked, or move them out of this round. |

## Agreement

Both reviewers say the core fixes are plain bug fixes with no false compromise: A1, A5/A6, A8, A9, B2, B6, B11, C2, C3, C6 and C7. Their objections are about scope (G5, exe seeding) and about where a few fixes belong (engine vs page, one commit function).

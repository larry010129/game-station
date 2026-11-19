# Stage 6 — Comprehension Test report

- **Target:** `docs/designs/logic-fixes-round5.md`. FeatureRange is lines 1–239, DetailedRange is lines 240–end.
- **Reviewer:** `egm-comprehension`, which read the document alone, with no context files and no document standard.
- **Result:** 0 Blockers, 8 Majors, 4 Nits.

## What this proposes

Round 5 fixes defects found where two parts of the system meet. Reviewers found them by reading code, and a triage rule decides which are in scope: what fails on localhost is fixed, and so is real logic that fails only in the exe. Failures caused only by a server not being reachable are dropped. There are five groups of changes:

- **G1, release path:** the app downloads release files as raw bytes, so binary banner art passes its hash check. CMS files are written via temp file plus rename. A first-run seed (key pair, release number, referenced uploads) is bundled with the desktop CMS.
- **G2, dashboard economy state:** fixes to unlocks, picks, Credits, play minutes, gacha state across panes, local-day boundaries and pity results.
- **G3, dashboard and local service:** fixes to stale or wrong data (game-mode profile, game switch, Apex rank, a hardware "pending" flag, a recovery wait, album art, sign-in refetch).
- **G4, leftovers:** CSS and README corrections.
- **G5, review step:** CMS Push no longer signs straight away. It saves a pending snapshot that someone must Approve on a new Review tab, and the tab warns when the push would make a scheduled release's changes go live early.

Each logic fix comes with a test that fails first. React wiring is checked by hand.

## How the existing system works, per this document

There are three local processes:

- **The CMS (port 1430)** publishes signed content releases: draft, then release N with a manifest, blobs and `content.json`, with `current.json` as the pointer to the live one.
- **The dev dashboard app (1420)** fetches releases, checks hashes and the signature against a hard-coded dev public key, and applies a release only if its number is higher than the last one applied. The shipped app exe never fetches releases.
- **The local service (8787)** handles game mode, media, hardware info and meta scrapes.

The dashboard keeps the gacha, quest and Credits economy in `localStorage`. Today only Credits are re-read fresh at the moment of an action. The desktop CMS keeps its data in `%APPDATA%` (set by `COMMAND_CMS_DATA`) and ships only `draft.json`.

*Inferred, not stated:* a release with a future `effectiveAt` is held by the app until that time. A later Push is built from the whole draft, gets a higher number and an earlier go-live, so it carries the scheduled changes early. The app then skips the scheduled release because its number is lower.

## Findings

| # | Sev | Where | Finding | Recommendation |
|---|-----|-------|---------|----------------|
| 1 | Major | §5 intro, line 121, and the diagram | It says "four groups" and "none adds a new component". There are five groups, and G5 adds a page, a data file and three endpoints. The diagram shows only G1–G3, and G5 comes before G4. | Say five groups, qualify the claim, add G5 to the diagram, and put the groups in order. |
| 2 | Major | A4, D4, G5 | The doc never explains how scheduled releases work today: how the app learns a release is scheduled, why a later Push skips it, how rollback cancels it. The reader also might not notice that G5 doesn't change A4's behaviour, and Goal 1 hides that. | Add 2–3 sentences on the scheduled-release lifecycle. State that the early go-live remains and is only warned about at Approve. |
| 3 | Major | lines 38, 172, 188+, 212, 303 | "Pending" means three things: a scheduled release, a push waiting for review, and the `/api/machine` flag. | Use "scheduled release", "pending push" and "hardware lookup pending". |
| 4 | Major | G2 throughout | Economy terms are never defined: look, pick, crystals, rainbow, Brand/Region/Regular pack, featured, pity, streak freeze, coupon migration, armed, the "weekly look/unlock/pick" variants. `PLAN.md` isn't linked. | Add a short glossary, or link `PLAN.md` sections. |
| 5 | Major | B2 | It mixes the 5-picks-waiting cap with the 2-per-week cap, and cites `PLAN.md` for the wrong one. | Name both caps, and say whether the freeze on the waiting cap is a new rule. |
| 6 | Major | C1, Goal 6 | "Default profile" and "Overwatch profile" are never tied together. It's unclear whether apps still close when Overwatch is missing. | Say which profile is the default, and what it does after the fix. |
| 7 | Major | lines 99, 236, 293–294 | Pure tests are planned for B2 and B4, whose logic lives in React files, and no step moves that logic out. B5 is promised a stub test that isn't in the Step 4 table. | Name the pure functions the logic moves into, and fix the B5 test entry. |
| 8 | Major | A3, Step 1 | The fields of `current.json` aren't described. A fresh desktop CMS seeded with N, with no release N folder, serves something unclear. The seed number is frozen at build time, and the doc doesn't say how the dev app is pointed at the exe. | Describe the first-run state, the build-time limit and how the dev app is pointed at the exe. |
| 9 | Nit | lines 124, 195, 197 | "Dashboard" means both the app and the CMS dashboard. | Write "CMS dashboard" where the CMS is meant. |
| 10 | Nit | Overview, triage, D heading | The Overview's scope doesn't match the plan (nits are fixed too). A9 is in no triage bucket. B7–B9 still say "needs author" though all D items are decided. | Align the wording and update the status markers. |
| 11 | Nit | lines 12, 77, 57, 308 | P3 isn't defined. C10–C13 point to "see reviewer notes". `VaultExtras.tsx` isn't explained. | One line each. |
| 12 | Nit | various | "Seed" is used before it's defined. The purpose of `contentHash` in `pending.json` is unclear. Rollback appears both as a direct action and as a caller of `publish()`. Counterwatch, the media helper, the journal and split panes aren't introduced. | Define each in one clause where it first appears. |

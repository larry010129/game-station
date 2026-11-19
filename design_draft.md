# Logic, data-connection and UI-state fixes (round 5)

- **Author:** larry010129
- **Date:** 2026-11-16
- **Status:** Draft. Section 1 (Overview & Goals) is up for review.
- **Inputs:** four isolated reviewers that read the code (they did not run it), and the round-4 backlog in `goldfish_review_report.md`.

## 1. The Problem

`tsc --noEmit` passes in `app/` and `cms/`, and all 322 service tests pass. Those checks don't see the failures below. Every one sits where two parts meet: CMS and app, dashboard and service, a React effect and `localStorage`, or code and `PLAN.md`. None of these paths has a test.

The round-4 backlog is mostly closed. 13 of 16 items are fixed. P3 was reported as reopened, but the PowerShell snippet prints the native return code itself (`app/service/system.mjs:78-84`), so it holds. Still open: Q1 and S3, each partly. Three CSS rules still hard-code dark surfaces (`app.css:175`, `:271`, `:1539`), and the README's `games` default and data-folder list are out of date.

### 1.0 Triage rule (set by the author)

1. **Localhost first.** If a finding doesn't happen on localhost (app `npm run live` on 1420/8787 plus CMS `npm run dev` on 1430), it isn't fixed in this round unless rule 2 applies.
2. **Exe-only findings.** Check that the finding really happens only in the exe. If the exe has a real logic or data bug that localhost doesn't, fix it.
3. **Not a connection problem.** If localhost works and the exe fails only because a server or service isn't connected or reachable, it isn't an issue. Drop it.

### 1.0.1 Localhost run (2026-11-16)

- `tsc --noEmit` is clean in `app/` and `cms/`, and 322/322 service tests pass.
- Both servers started. The app's boot-time content update first reported `failed: signal is aborted`, because the CMS was still starting. After a reload it reported `updated` to release 11, which matches the CMS's `current.json`. The release path works on localhost for today's data. The first failure was a not-yet-connected server, so it isn't an issue under rule 3.
- **Content updates are dev-only.** `contentUpdatesEnabled()` is true only under `import.meta.env.DEV` (`app/src/content/contentSettings.ts:12-18`). The shipped app exe never contacts any CMS. So the only exe that matters for the release path is the **CMS** exe (Command CMS desktop) feeding a localhost dev app.
- The localhost run didn't reach A1 or the B-group findings. Today's draft has no uploaded banner art, and the B findings need specific user state (51+ looks, 5 waiting picks, PC sleep). These are latent localhost bugs, not exe or connection issues, so they stay in scope.

### 1.1 Findings

**Verified** means the author's session re-read both sides of the code and confirmed the failure. **Reported** means one reviewer traced it and nobody has re-checked it yet. Nothing here has been reproduced by running the app.

#### A. CMS → app content releases

| ID | Sev | Status | Failure | Where |
|----|-----|--------|---------|-------|
| A1 | Blocker | Verified | The app downloads every release file with `res.text()` and hashes the re-encoded UTF-8. Uploaded banner art (PNG/WebP) never matches its manifest hash, so once one banner image exists, every later release is rejected with "hash mismatch". | `app/src/content/fetchRelease.ts:13,63-71`; `applyRelease.ts:64`; `cms/server/store.mjs:182-189` |
| A2 | Blocker | Verified | The installed (desktop) CMS keeps its data in `%APPDATA%\CommandCMS\data` and doesn't ship keys, so on first run `ensureKeypair()` makes a new keypair. The app trusts only the hard-coded dev key, so every desktop Push is rejected with "bad signature". | `cms/server/keys.mjs:6-22`; `cms/scripts/prepare-desktop.mjs:4`; `app/src/content/devPublicKey.ts:9`; `verifyRelease.ts:45` |
| A3 | Major | Reported | The desktop CMS starts release numbers at 1. An app that already applied #11 from the repo CMS ignores desktop releases 1 to 11. | `cms/server/store.mjs:44-46,223`; `app/src/content/updateContent.ts:82` |
| A4 | Major | Reported | Each release is built from the whole draft. A Push after a scheduled release makes the scheduled changes go live early, and the scheduled release is then skipped. A rollback also cancels pending scheduled releases. | `cms/server/store.mjs:200,212,277-326`; `updateContent.ts:92-111` |
| A5 | Major | Reported | `draft.json` and `current.json` are written in place. A crash mid-write leaves truncated JSON, and every `/releases/current`, publish and rollback then returns 500. | `cms/server/store.mjs:101,120,246-249,318` |
| A6 | Major | Reported | A blob file that already exists is never rewritten, so a blob cut short by a crash stays broken for every later release that reuses that content. | `cms/server/store.mjs:161` |
| A7 | Major | Reported | The desktop seed packages only `draft.json`, not `data/uploads`. A seed draft with an uploaded banner can't be pushed ("missing asset"). | `cms/scripts/prepare-desktop.mjs:36-38`; `store.mjs:185` |
| A8 | Nit | Reported | URL parsing happens before the `try` in the standalone server. A request for `//` may crash the sidecar. | `cms/server/http.mjs:65`; `standalone.mjs:87` |
| A9 | Nit | Reported | `/releases/current` leaves out `effectiveAt`, which both type files declare. | `cms/server/store.mjs:328-336` |

#### B. Economy, gacha and quests (dashboard `localStorage` state)

| ID | Sev | Status | Failure | Where |
|----|-----|--------|---------|-------|
| B1 | Blocker | Verified | Unlocks are loaded with `idList(..., 50)` and the cut list is saved straight back. The 51st and later earned looks are deleted on the next launch. | `app/src/state/useTheme.ts:210,291-293` |
| B2 | Major | Verified | When 5 picks are already waiting, `grantPick()` returns null and DrawPage ignores that. The draw shows "Weekly unlock pick", grants nothing, and still counts toward the weekly cap. | `app/src/pages/DrawPage.tsx:419`; `questEngine.ts:264-270` |
| B3 | Major | Verified | `spendCredits` ignores the result of `writeCredits`. With storage full, the draw goes ahead but the balance isn't lowered. An unreadable balance is silently reset to 200. | `app/src/state/stationCredits.ts:39-67` |
| B4 | Major | Verified | Play minutes are wall-clock time since the session started. Eight hours of PC sleep with a game open is credited as about 480 minutes. | `app/src/state/useQuests.ts:105-117` |
| B5 | Major | Reported | Gacha state is read once per Draw pane. Two split panes on Draw can spend the same crystals twice, overwrite each other's pity, and get around the 2-per-week pick cap. | `app/src/pages/DrawPage.tsx:250,421-423,561-581` |
| B6 | Major | Reported | Brand and Region rotations use UTC day boundaries. Everything else (quest weeks, the CMS schedule, "days left") uses local time. | `app/src/state/gachaEngine.ts:208-210,254,295-297` |
| B7 | Major | Reported, **needs author** | Brand pity can give a rainbow Regular theme. `PLAN.md:34` says the 70th draw is one of this fortnight's two Brand looks. | `gachaEngine.ts:428-434,543-546` |
| B8 | Major | Reported, **needs author** | An unclaimed weekly look expires on Monday. `PLAN.md:7` says it stays waiting. | `app/src/state/questEngine.ts:204-217` |
| B9 | Major | Reported, **needs author** | Backups include Credits, gacha, quests and the Patreon cache. Export, draw, restore gives free re-rolls, and restoring an old backup brings back Patreon entitlements. | `app/src/components/VaultExtras.tsx:209,240-249` |
| B10 | Major | Reported | The cached Patreon tier never expires while the service can't be reached. | `app/src/state/patreon.ts:38,57-64` |
| B11 | Nit | Reported | Credits are spent before the "still buyable" check, so the user can pay and get nothing. | `app/src/pages/ThemesPage.tsx:394,766` |
| B12 | Nit | Reported | `LOOK_COST` comes from bundled content and ignores the CMS `lookCost`. | `gachaEngine.ts:55` |
| B13 | Nit | Reported | Game mode left on past midnight doesn't count the new day toward the "armed" quests. | `app/src/state/useGameMode.ts:23-25` |
| B14 | Nit | Reported | When the toast queue is full it drops from the front, which is where the older alerts are. | `app/src/state/Toast.tsx:42` |

#### C. Dashboard ↔ local service

| ID | Sev | Status | Failure | Where |
|----|-----|--------|---------|-------|
| C1 | Major | Reported | Without Overwatch installed, the default profile runs power, close-apps, trim and clean, then fails at the gpu step. It rolls back everything except the closed apps, and does the same on every try. | `app/service/gamemode.mjs:152-157,216-268,291-293` |
| C2 | Major | Reported | A slow "Check now" for one game lands in the list of another game after a switch, and every story fires a "new" toast. | `app/src/state/useFeed.ts:68-77` |
| C3 | Major | Reported | Apex ignores the selected rank but answers `empty:false`, so "Diamond" shows the all-ranks list under the Diamond label. | `app/service/apex-meta.mjs:405-418`; `TierListCard.tsx:28-31,91` |
| C4 | Major | Reported | `/api/machine` returns placeholders until hardware lookup finishes. The dashboard reads it once, so "GPU" can stay for the whole session. | `app/service/index.mjs:88-89,138-141`; `app/src/lib/connect.ts:24` |
| C5 | Major | Reported | After a crash, game-mode status reads the journal before startup recovery finishes. The UI shows "still on" and pauses the feed and alerts. | `app/service/routes.mjs:122-128`; `gamemode.mjs:182-201` |
| C6 | Major | Reported | Album art is cleared on a brief "nothing playing", but the helper's last-track marker isn't reset, so the art never comes back for that track. | `app/service/media.mjs:100-111,138,276-280` |
| C7 | Major | Reported | Discord icons and Spotify playlists are fetched once and cached forever. After signing in, or switching Spotify account, the card shows an empty or wrong list. | `ExtraCards.tsx:165`; `SpotifyCard.tsx:31`; `useApi.ts:84-96` |
| C8 | Major | Reported | If the service dies after startup, cards keep their last values with no stale or offline sign. Media keeps advancing the play position. | `app/src/state/useApi.ts:109-113` |
| C9 | Major | Reported | The Apex meta scrape never refreshes (`start()` does nothing). | `app/service/apex-meta.mjs:383,387` |
| C10–C13 | Nit | Reported | The Wave Link slider snaps back, notifications lag up to 60 s, calendar feed events go stale, and two quick step toggles lose the first change. | see reviewer notes |

#### R. Leftovers from round 4 (not the decisions; those are D1–D4 in section 5)

| ID | Sev | Failure | Where |
|----|-----|---------|-------|
| Q1-rest | Nit | Three rules still hard-code dark surfaces and are unreadable on light themes. | `app/src/styles/app.css:175,271,1539` |
| S3-rest | Nit | The README's `games` default lists 1 exe, the code has 3, and the README is missing 6 data files. | `app/README.md:136,154-163` |

### 1.2 Triage result

| Bucket | Findings | Decision |
|--------|----------|----------|
| **Localhost, real** (happens on localhost given the state described) | A1, A4, A5, A6, B1–B9, B11–B14, C1–C7, C9–C13, Q1-rest, S3-rest | In scope |
| **CMS exe only, real logic** (localhost CMS uses the repo key, number series and data folder, so it doesn't happen there) | A2 (new signing key), A3 (numbering restarts at 1), A7 (seed missing uploads), A8 (standalone server can crash on a bad URL) | In scope under rule 2. A2 and A3 matter only when the CMS exe feeds a localhost dev app, because the app exe never fetches releases. |
| **Connection-only** (fails only when a server or service can't be reached) | C8 (cards freeze when the service dies), B10 (Patreon cache while the service is unreachable), boot content-update failure while the CMS is still starting | **Dropped** under rule 3 |
| **Exe-only, no consumer** | none | n/a |

C4 (GPU placeholder) stays in scope. It is a race inside a service that is running and reachable: it answers before its own hardware lookup finishes. That happens on localhost on every cold start.

## 2. Overview

This round fixes the Blockers and the Majors that lose or corrupt user data. It also fixes the ones that make a feature silently do the wrong thing. Each logic fix ships with a test that fails before the change: a `node --test` case under `app/service/test` or `cms/` for service and CMS code, and a pure-function test for the state engines (`questEngine`, `gachaEngine`, `stationCredits`). React wiring has no test harness, so it is checked in the browser preview and listed as manually verified.

## 3. Goals

1. A localhost release with binary assets is accepted by the localhost app (A1). A release from the CMS exe is accepted by a localhost dev app (A2). Release numbers and scheduled releases behave as the author decides (A3, A4).
2. CMS release files can't be left half-written by a crash (A5, A6).
3. No earned item is lost: looks past 50 (B1), picks at the cap (B2), Credits on a failed write (B3).
4. Earned values match `PLAN.md` wherever the author confirms `PLAN.md` is canonical (B7, B8). Play minutes count real awake time (B4).
5. The dashboard never shows one game's or one account's data under another (C2, C3, C7). It never shows a placeholder value as live while the service is reachable (C4, C5).
6. Game mode doesn't close apps it can't finish setting up (C1).

## 4. Non-Goals

- The production signing key and host. A2 needs a working answer for the desktop CMS, not the final trust model.
- Redesigning backup/restore beyond deciding which keys it includes (B9).
- The visual or UX redesign in the uncommitted `app.css` work. That file is only touched for Q1-rest.
- Nits C10–C13, A8, A9 and B11–B14 unless a fix is one line and testable. Every nit left open stays in the report.
- Connection-only failures (C8, B10, the boot update while the CMS is starting). They are listed in 1.2 and won't be fixed.
- Committing. Nothing is committed unless the author asks.

## 5. Technical Plan

The fixes fall into four groups, one per seam. None of them adds a new component. Each group changes the code on one side of a seam so it matches the contract the other side already expects.

```
 CMS (1430)                         Dashboard (1420)                      Service (8787)
 +--------------+  /releases/*  +---------------------------+   /api/*  +------------------+
 | store.mjs    |-------------->| content/fetchRelease.ts   |<--------->| gamemode.mjs     |
 |  publish()   |  bytes + sig  | content/applyRelease.ts   |           | apex-meta.mjs    |
 |  atomic I/O  |  (G1)         |                           |   (G3)    | media.mjs        |
 | keys.mjs     |               | state/ (localStorage)     |           | index.mjs        |
 | standalone   |               |  useTheme, stationCredits |           |  /api/machine    |
 +--------------+               |  DrawPage, useQuests      |           +------------------+
                                |  gachaEngine, questEngine |
                                |  (G2)                     |
                                +---------------------------+
```

### G1. Release path (A1–A9)

- **A1, binary assets.** `fetchChangedFiles` returns raw bytes (`Uint8Array` from `res.arrayBuffer()`) for every file. `applySignedRelease` already accepts `string | Uint8Array` and hashes either, and it already decodes `content.json` with `TextDecoder`. So hashing now covers the exact bytes the CMS hashed. The only caller, `updateContent.ts`, passes the map straight through.
- **A2, CMS exe signing key.** The repo's `cms/data/keys` pair is a documented throwaway dev key, and the app trusts only that key. `prepare-desktop.mjs` stages that pair as `seed/keys/`. On first run, `ensureKeypair()` copies the seed pair into the data folder before it would generate a new one. A key that already exists in the data folder is never overwritten. The production trust model stays out of scope.
- **A3, numbering.** On first run the CMS exe seeds `current.json` with the repo's current number (staged as `seed/current.json`) instead of 0. Release numbers then continue past whatever a localhost app has already applied.
- **A4, scheduled releases.** Needs an author decision (D4, below).
- **A5, A6, half-written files.** Add a small `writeFileAtomic(path, data)` to `cms/server/store.mjs`: write `path.tmp-<pid>`, then `renameSync`. It replaces the in-place writes of `draft.json`, both `current.json` writes, and the manifest. `putBlob` writes through it too, and re-hashes an existing blob before skipping it, so a truncated blob gets rewritten. `current.json` is still written last, so a crash leaves the previous release as current.
- **A7.** `prepare-desktop.mjs` also stages every `uploads/` file that the seed draft references. First run copies them into the data folder.
- **A8.** In `http.mjs`, move the `new URL(...)` inside the existing `try`, so a bad URL answers 400.
- **A9.** `currentInfo()` returns `effectiveAt`.

### G2. Dashboard state (B1–B14)

The economy rule stays as it is: every read-modify-write reads fresh from `localStorage` at the moment of the action. Today only Credits do this.

- **B1.** Raise the unlock cap from 50 to a ceiling above the whole catalog (1000).
- **B2.** `grantPick` reports whether it granted. When it didn't, the draw result becomes a streak freeze, as `PLAN.md` says for weekly-cap overflow, and the pick doesn't count toward the weekly cap.
- **B3.** `spendCredits` returns `null` when the write fails. `readCredits` re-seeds 200 only when the key is **missing**. An unreadable value is first copied to `cs.stationCredits.bad`, so it can be recovered.
- **B4.** `credit()` remembers the last tick time. Each tick credits at most `min(elapsed since last tick, 2 minutes)`, so sleep or suspend gaps aren't paid.
- **B5.** `draw` and `spendPick` re-read `cs.gacha` inside the handler. A change event keeps other panes in sync, the same way Credits do. The old-coupon migration runs once, guarded by a flag in the saved state.
- **B6.** Replace `utcDay` with a local-date day index. DrawPage recomputes the featured pair and days left when the local day changes.
- **B7 (D1).** `forcedFiveStar` always returns `forceBrandLook(featured, …)` for any pack with featured looks (Brand and Region). It falls back to a Regular theme only when `featured` is empty. Brand pity resets only on a featured-look result.
- **B8 (D2).** No code change. `PLAN.md:7` is corrected.
- **B9 (D3).** Deferred to the cloud-save design. No change.
- **B11.** Run the `isCreditBuyableTheme` check before `spendCredits`.
- **B12.** Read `LOOK_COST` from `getContent().lookCost` when spending.
- **B13.** While the phase is "on", call `trackQuest.armed()` from the existing status poll, so each new local day counts once.
- **B14.** When the toast queue is over its limit, drop plain messages first, then the oldest alerts.

### G3. Dashboard ↔ service (C1–C7, C9–C13)

- **C1.** When `ensureOverwatch()` finds nothing at profile-listing time, the Overwatch profile leaves out the `gpu`, `launch` and `priority` steps. It no longer runs the side effects that can't be undone, like closing apps, and then fails.
- **C2.** `checkNow` remembers which game it asked for, and drops the result if the selected game has changed.
- **C3.** Apex `rank()` returns `empty: true` for any rank other than All. The card already renders `empty`.
- **C4.** `/api/machine` returns `pending: true` while the hardware lookup is still running. `connect.ts` asks again (every 2 s, up to 30 s) until `pending` is false.
- **C5.** The gamemode status route waits for the startup recovery promise, with a timeout of 5 s, before reading the journal.
- **C6.** When the service clears the album art, it also resets the helper's last-track marker, so the next poll sends the art again.
- **C7.** Discord guilds and Spotify playlists are refetched when the matching sign-in state changes.
- **C9.** Apex meta `start()` gets the same daily staleness check as counterwatch.
- **C10, C13** are one-liners and are fixed. C11 and C12 stay open as Nits.

### G5. Push → Review → Approve (D4)

Today `POST /api/publish` signs a release and makes it current in one step. After this change it takes two:

```
 Draft --Push--> Pending review --Approve--> Signed release N (current, or scheduled for effectiveAt)
                       |
                       +--Discard--> (nothing published; draft is untouched)
```

- **Push** (`POST /api/publish`, same request body) validates the draft and builds the bundle exactly as today, including the asset check. It then saves `{ draftSnapshot, notes, effectiveAt, pushedAt, contentHash }` to `data/pending.json` (written atomically), instead of signing it. It answers `{ ok, pending: true }`. Only one pending push exists at a time. A new Push replaces it, and the Review tab says so.
- **Review tab** (new `cms/src/pages/ReviewPage.tsx`, linked in the CMS nav). It shows:
  - the pending notes, go-live time and push time;
  - a change summary against the live release (themes, banners, odds and items added, removed or changed), computed from the two bundles;
  - a warning when any release is still scheduled. A pending push timed **before** that scheduled release would make its changes live early, and the warning names that release.
- **Approve** (`POST /api/pending/approve`) runs today's `publish()` on the saved snapshot. It signs the release, writes it, then updates `current.json` last, and deletes `pending.json`. If the live draft changed after the push, Approve still publishes the **snapshot**, and the tab shows that the draft has newer edits.
- **Discard** (`POST /api/pending/discard`) deletes `pending.json`.
- **Status for the Releases page and dashboard:** `GET /api/pending` returns the pending push, or `null`.
- **Rollback** stays a direct action, as it is today, because it's a recovery tool. It now also warns when it would cancel a scheduled release.
- The CMS dashboard's Push button now says "Push for review". After a push it links to the Review tab.
- **Who approves:** there is one local CMS user today, so Approve is a deliberate second click on a separate screen. It isn't a second person. Multi-user approval waits for the server-side CMS.

### G4. Leftovers

- **Q1-rest.** Replace the three hard-coded dark surfaces with theme tokens. This is a minimal edit inside the user's uncommitted `app.css` work.
- **S3-rest.** Correct the README's `games` default and data-file list.

### D. Decisions the author must make (D1–D4)

| ID | Question | Options |
|----|----------|---------|
| D1 (B7) | What does Brand pity (the 70th draw) give? | **Decided:** the same rule applies to every pack that has featured looks (Brand and Region). The forced pity draw always gives one of that pack's current featured looks, unowned first. It falls back to a Regular theme only when the pack has no featured looks. `forcedFiveStar` stops rolling the rainbow Regular row for forced draws. |
| D2 (B8) | Does a completed but unclaimed weekly look expire on Monday? | **Decided:** yes, it expires. The code stays as it is. `PLAN.md:7` is corrected to say an unclaimed weekly unlock is lost at the end of the week, and that a claimed one stays waiting. |
| D3 (B9) | Do backups include economy state (Credits, gacha, quests, check-ins, Patreon cache)? | **Deferred:** economy state is expected to move to a cloud save once the CMS runs server-side. Backups don't change this round. The known gap (export, draw, restore gives a free re-roll) is handed to that cloud-save design. |
| D4 (A4) | What happens to a publish whose go-live time is before a pending scheduled release? | **Decided:** every Push goes to a **Review** step first. Nothing is signed or visible to apps until someone presses **Approve** on the Review tab. The Review tab shows what goes live and when, including a warning when scheduled changes from another release would go live early. See G5. |

## 6. Alternatives Considered

| For | Alternative | Why it was not chosen |
|-----|-------------|----------------------|
| Triage | Fix every finding, including exe-only and connection-only ones | Rejected by author: localhost behaviour is the bar. An exe-only failure is fixed only if it is a real logic bug. A failure that comes from a server or service not being reachable is not an issue. |
| A1 | Leave binary assets out of the manifest `files` list | The app would no longer verify banner art at all, so an unsigned image could be swapped in on the host. Downloading bytes keeps every file covered by the signature. |
| A1 | Base64-encode assets inside `content.json` | It inflates every release by about a third, and it changes the release format both sides already agree on. |
| A2 | Make the app trust whatever key `GET /releases/public-key` serves | The signature would then prove nothing: anyone who can serve the key can sign. The trust root has to ship with the app. |
| A2 | Point the CMS exe's data folder back at the repo's `cms/data` | It undoes the reason for `COMMAND_CMS_DATA`, which is that updates must never touch user data. |
| A5/A6 | A database such as SQLite for CMS state | Too big a change for a crash-safety fix. Temp file plus rename gives the same all-or-nothing write for single files. |
| B5 | Stop a second split pane from opening Draw | It hides the race instead of removing it. Credits already show that reading fresh state at the moment of the action works across panes. |
| B6 | Keep UTC and change "days left" to UTC as well | Quest weeks and the CMS schedule are local, and "Monday" means the user's Monday. |
| D1 | Keep today's roll (a Brand look or a rainbow Regular theme) at pity | Rejected by author: the guarantee should be a real guarantee, and it should be the same rule in every pack that has featured looks. |
| D2 | Add the weekly pick automatically, or keep past weeks claimable | Rejected by author: the weekly pick must be claimed within its week. The plan text is corrected instead. |
| D3 | Leave economy state out of backups, or make restore never raise balances | Rejected by author for now: economy state is expected to move to a cloud save once the CMS runs server-side. Deciding it here would be redone then. |
| D4 | Refuse an early Push, or allow it with a warning | Rejected by author: every Push should pass an explicit Review and Approve step, which covers the early-Push case and every other mistaken Push. |
| G5 | Keep several pending pushes in a queue | One local user doesn't need a queue. A single pending push that a new Push replaces (and the Review tab says so) is simpler to reason about. |

## 7. Testing

- **G5:** CMS server tests, with `COMMAND_CMS_DATA` set to a temp folder. A Push writes `pending.json` and does not change `current.json`. Approve publishes the snapshot even after the draft is edited. Discard removes the pending push. The Review data flags a pending push timed before a scheduled release.
- **G1:** extend `app/service/test/contentUpdate.test.mjs` with a release that includes a PNG blob, served by an in-memory stand-in host. Add CMS tests for atomic writes, blob repair, and first-run key/number seeding, with `COMMAND_CMS_DATA` pointed at a temp folder. They never touch `cms/data`.
- **G2:** pure-function tests in `gacha.test.mjs` / `quest-spec.test.mjs` for B2, B6 (fixed `Date` under `TZ=Asia/Taipei`), B4 and the D1–D2 outcomes. B1, B3, B5 and B11 are tested against a stub `localStorage`.
- **G3:** service tests for C1 (no Overwatch found), C3, C4 (`pending`), C5 and C6. C2 and C7 are React wiring, so they are checked in the localhost preview.
- Every new test must fail on today's code before its fix lands.

## 8. Detailed Implementation Plan

The steps are ordered so each lands with its test and the suite stays green after each one. Paths are from the repo root. "Test first" means the new test is written and seen failing on today's code before the fix.

### Step 1: G1 release path, CMS side

| File | Change | Why |
|------|--------|-----|
| `cms/server/store.mjs` | Add `writeFileAtomic(p, data)`: write `p + ".tmp-" + pid`, then `renameSync`. Use it for `writeDraft`, the manifest and `content.json` writes in `publish`, and both `current.json` writes (publish and rollback). In `putBlob`, when the blob exists, re-hash it and rewrite it if the hash differs. `currentInfo()` adds `effectiveAt: cur.effectiveAt ?? null`. | A5, A6, A9 |
| `cms/server/keys.mjs` | In `ensureKeypair()`, before generating: if `COMMAND_CMS_SEED/keys/` holds the pair, copy it into `KEYS_DIR`. Never overwrite an existing pair. | A2 |
| `cms/server/store.mjs` (`ensureDataLayout`) | When `current.json` is missing and `COMMAND_CMS_SEED/current.json` exists, seed from it instead of `{ number: 0 }`. Copy `COMMAND_CMS_SEED/uploads/**` into `DATA_DIR/uploads`, skipping files already there. | A3, A7 |
| `cms/scripts/prepare-desktop.mjs` | Also stage the dev keypair, `data/releases/current.json`, and every `uploads/` file the seed draft references, into `stage/cms/seed/`. Correct the header comment, which says keys are never staged. | A2, A3, A7 |
| `cms/server/standalone.mjs` | Set `COMMAND_CMS_SEED` to the bundled `seed/` folder before importing the store, the same way `COMMAND_CMS_DATA` is set. | A2, A3, A7 |
| `cms/src-tauri/tauri.conf.json` | Make sure the resources glob covers all of `stage/cms/seed/**`, not only `draft.json`. | A2, A3, A7 |
| `cms/server/http.mjs` | Move `new URL(...)` inside the existing `try`, so a bad URL answers 400. | A8 |
| `cms/README.md` | Say that the desktop CMS seeds the dev keypair, the release number and the referenced uploads on first run. | Docs |
| `app/service/test/cms-store.test.mjs` (new) | Set `COMMAND_CMS_DATA` and `COMMAND_CMS_SEED` to temp folders before a dynamic import of `store.mjs`. Check that an atomic write leaves no `.tmp` file, that a truncated blob is repaired on the next publish, that first run copies the seed keypair and continues numbering from the seed, and that `currentInfo()` includes `effectiveAt`. | Test first |

### Step 2: G1 release path, app side

| File | Change | Why |
|------|--------|-----|
| `app/src/content/fetchRelease.ts` | Add `getBytes(url, signal)`, with the same timeout and abort handling, returning `Uint8Array`. `fetchChangedFiles` uses it and returns `Map<string, Uint8Array>`. `getText` stays for `current` and the manifest. | A1 |
| `app/src/content/updateContent.ts` | Type-only change: the map passed to `applySignedRelease` now holds bytes. | A1 |
| `app/service/test/contentUpdate.test.mjs` | The stand-in host serves a release whose `files` include a PNG blob that isn't valid UTF-8. `runContentUpdate` must report `updated`. | Test first |

### Step 3: G5 Push → Review → Approve

| File | Change | Why |
|------|--------|-----|
| `cms/server/paths.mjs` | Export `PENDING_PATH = DATA_DIR/pending.json`. | G5 |
| `cms/server/store.mjs` | Split `publish()` into `prepare(opts)` and `commit(prepared)`. `prepare` validates, builds the bundle and writes blobs only. `commit` does today's signing and file writes, `current.json` last. `publish()` stays as `commit(prepare(opts))` for scripts and rollback. Add `stagePush(opts)`, which prepares and writes `pending.json` with `{ draftSnapshot, notes, effectiveAt, pushedAt, contentHash }`. Add `readPending()`, `approvePending()`, `discardPending()`, and `reviewInfo()`. `reviewInfo()` returns: the pending push; a change summary against the live bundle (themes, banners, odds and items added, removed or changed, by id); the scheduled releases; `early` when the pending go-live is before any of them; and `draftChangedSincePush`. | G5 |
| `cms/server/draftApiPlugin.ts`, `cms/server/http.mjs` | `POST /api/publish` calls `stagePush` and answers `{ ok, pending: true, errors? }`. Add `GET /api/pending`, `POST /api/pending/approve` (answers `{ ok, number }`) and `POST /api/pending/discard`. Rollback answers include `cancelsScheduled: number[]`. | G5 |
| `cms/src/api/contentApi.ts` | `publishDraft` returns `{ ok, pending }`. Add `getPending`, `approvePending` and `discardPending`. The localStorage fallback for static preview keeps direct publish, labelled "preview only". | G5 |
| `cms/src/pages/ReviewPage.tsx` (new) | Shows: pending notes, go-live time and push time; the change summary; an amber warning naming the scheduled release(s) when `early` is set; a note when the draft changed after the push. **Approve** and **Discard** are disabled while a request is running, so a double click can't approve twice. Empty state: "Nothing waiting for review." | G5 |
| `cms/src/App.tsx`, `cms/src/layout/AdminLayout.tsx` | Add a `review` route and a "Review" nav entry with a badge while a push is pending. | G5 |
| `cms/src/state/DraftContext.tsx`, `cms/src/pages/ReleasesPage.tsx` | Rename the button to "Push for review" and link to Review after a push. The Releases page shows "1 push waiting for review". The rollback confirm names any scheduled release it cancels. | G5 |
| `cms/README.md` | Describe the Review step. | Docs |
| `app/service/test/cms-review.test.mjs` (new) | Uses a temp data folder. Check that Push writes `pending.json` and leaves `current.json` alone, that Approve publishes the snapshot even after the draft changes, that Discard removes the push, and that `early` is true for a push timed before a scheduled release. | Test first |

### Step 4: G2 dashboard state

| File | Change | Why |
|------|--------|-----|
| `app/src/state/useTheme.ts` | Raise the unlock cap from 50 to a named `MAX_UNLOCKS = 1000`. | B1 |
| `app/src/pages/DrawPage.tsx` | Use `grantPick()`'s result. When it returns false, turn that result into a streak freeze that doesn't count toward `weeklyPicks`. Re-read `cs.gacha` at the start of `draw` and `spendPick`. Dispatch a `cs-gacha` event after each write and listen for it to refresh. Guard the coupon migration with a `migratedCoupons` flag. | B2, B5 |
| `app/src/state/gachaEngine.ts` | Replace `utcDay` with a local-date day index, and parse `epochDay` as a local date. In `forcedFiveStar`, any pack with featured looks returns `forceBrandLook`. Export `lookCost()`, which reads `getContent().lookCost`. | B6, B7, B12 |
| `app/src/state/stationCredits.ts` | `readCredits` seeds only when the key is absent. An invalid value is first copied to `cs.stationCredits.bad`. `spendCredits` and `addCredits` return `null` when the write fails. | B3 |
| `app/src/state/useQuests.ts` | The session keeps `lastTick`. Each tick adds `min(now - lastTick, 120 000)` ms and credits whole minutes from the running total. | B4 |
| `app/src/pages/ThemesPage.tsx` | Run the `isCreditBuyableTheme` check before `spendCredits`, and take the price from `lookCost()`. | B11, B12 |
| `app/src/state/useGameMode.ts` | When a status poll sees phase "on", call `trackQuest.armed()`. It already counts once per day. | B13 |
| `app/src/state/Toast.tsx` | Over the cap, drop plain messages first, then the oldest alerts. | B14 |
| `PLAN.md` | Line 7: an unclaimed weekly unlock is lost when the week ends; a claimed one stays waiting. | D2 |
| `app/service/test/gacha.test.mjs`, `quest-spec.test.mjs` | B6: Monday 03:00 local under `TZ=Asia/Taipei` picks the new week. B7: forced pity always gives a featured look in the Brand and Region packs. B2: a pick won while full becomes a freeze. B4: an 8-hour gap credits at most 2 minutes. | Test first |
| `app/service/test/economy-storage.test.mjs` (new) | Uses a stub `localStorage`. B1: a 60-id unlock list survives a read and write. B3: a failed write returns `null`, and a corrupt value is copied to `.bad`. B11: no charge when the theme isn't buyable. | Test first |

### Step 5: G3 dashboard ↔ service

| File | Change | Why |
|------|--------|-----|
| `app/service/gamemode.mjs` | When `ensureOverwatch()` finds nothing, leave `gpu`, `launch` and `priority` out of the Overwatch profile. | C1 |
| `app/service/gamemode.mjs`, `app/service/routes.mjs` | Expose the startup recovery promise as `gameMode.ready`. The status route awaits it, up to 5 s. | C5 |
| `app/service/apex-meta.mjs` | `rank()` returns `empty: true` for any rank except "All". `start()` gets the daily staleness check from `counterwatch.mjs`. | C3, C9 |
| `app/service/index.mjs`, `app/src/lib/connect.ts` | `/api/machine` includes `pending: true` until the lookup settles. `connect.ts` asks again every 2 s, for up to 30 s, while `pending` is set. | C4 |
| `app/service/media.mjs` | Wherever the stored art is cleared, also reset the helper's last-track marker. | C6 |
| `app/service/wavelink.mjs` | `set()` discards any read already in progress before caching. | C10 |
| `app/src/state/useFeed.ts` | `checkNow` remembers which game it asked for and ignores the result if the game has changed. | C2 |
| `app/src/cards/ExtraCards.tsx`, `SpotifyCard.tsx`, `app/src/state/useApi.ts` | Refetch guilds and playlists when the sign-in state or account changes, by keying the cache on it. | C7 |
| `app/src/components/VaultExtras.tsx` | Build each step toggle from the latest list, using a functional update. | C13 |
| `app/service/test/gamemode.test.mjs`, `apex-meta.test.mjs`, `media.test.mjs`, `routes.test.mjs` | C1: without Overwatch, no gpu, launch or priority steps. C3: `empty` for "Diamond". C4: `pending` until the lookup settles. C5: status waits for recovery. C6: art comes back after a blank poll. | Test first |

### Step 6: G4 leftovers

| File | Change | Why |
|------|--------|-----|
| `app/src/styles/app.css` | Replace the hard-coded dark backgrounds at about lines 175, 271 and 1539 with theme tokens, keeping the diff minimal inside the uncommitted work. | Q1-rest |
| `app/README.md` | The `games` default lists all three exes, and the data-folder list adds the six missing files. | S3-rest |

### Step 7: Verify

1. `node --test app/service/test/*.test.mjs` passes, and every new test was seen failing first.
2. `tsc --noEmit` passes in `app/` and `cms/`.
3. Localhost preview:
   - CMS Push, then Review, then Approve, and the localhost app reports `updated`.
   - A Push that includes an uploaded banner image is accepted by the app.
   - Discard leaves the app unchanged.
   - The Draw page in two split panes keeps one Credits and crystal balance.
   - Pressing Check now and then switching game shows no stories from the other game.
4. Not covered: the CMS exe build itself (`npm run desktop:build`) isn't run. The seed copying is covered by the store test, which sets `COMMAND_CMS_SEED`.

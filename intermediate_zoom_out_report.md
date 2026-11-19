# Stage 8 — Intermediate Zoom Out report

- **Target:** `docs/designs/logic-fixes-round5.md`, full file. It hasn't been edited since Stage 5.
- **Reviewer:** `egm-zoom-out` (zoom-out standard). It read the three baseline docs and the Stage 5, 6 and 7 reports, and doesn't repeat their findings.
- **Result:** 0 Blockers, 6 Majors, 1 Nit. The main message is **narrow the scope**.

## Findings

| ID | Sev | Where | Finding | Recommendation |
|----|-----|-------|---------|----------------|
| ZO8-1 | Major | §1.2, G1 A2/A3/A7, Step 1 | The desktop CMS (`cms/src-tauri/`, `standalone.mjs`, `prepare-desktop.mjs`) is untracked work in progress. A2, A3 and A7 are gaps in an unfinished feature, not regressions. Fixing them needs key-provisioning and numbering decisions, and `content-updates.md:38` leaves the production key and host TBD. Nine earlier findings attach only to this seeding: Z4, Z5, CR-7, CR-8, comprehension #8 and N9. | Move A2, A3 and A7 into the desktop-CMS feature's own design. Document a one-time manual `.pem` copy for now. Keep A8 here, since its fix is in the shared `http.mjs`. |
| ZO8-2 | Major | D3, G5, Non-Goals | The doc argues against itself. D3 is deferred because "server-side CMS would redo it", yet G5 builds a local approval flow while saying multi-user approval waits for that server-side CMS. A2 builds a temporary trust path while the production trust model is out of scope. The same reasoning applies to all three. | Re-confirm D4 with this point in front of the author. |
| ZO8-3 | Major | G5, D4 | G5 adds a second holding state on top of the existing scheduled release. Push already requires a go-live time (`http.mjs:195-197`), releases carry `effectiveAt` (`store.mjs:136`), and Releases already shows a Scheduled badge (`ReleasesPage.tsx:124-125`). The result would be draft → pending push → scheduled → live, with two cancel paths. D4 really needs a warning, and the client can compute it from `/api/releases`. **Correction to Z1:** the two-click arm guards only "Push now" (`PushScheduler.tsx:239`). "Schedule push" is a single click (`:247`), so that is where the warning belongs. Nine earlier findings attach only to G5, including Blocker CR-1. | Put the early-push warning in the Push panel and the rollback confirm. Mark A4 "mitigated (warned), not fixed". Give G5 and delta releases their own design. |
| ZO8-4 | Major | §8 step order | The shipped app never contacts the CMS, so only the author benefits from G1 and G5. B1 (Blocker), B2 and B3 lose earned items for every real user, yet they wait until Step 4. | Do the B-group data-loss fixes first, then the core of G1. |
| ZO8-5 | Major | §1.1 status column | Nothing has been reproduced, and most rows are single-reviewer "Reported". Earlier stages already reversed one triage call (B10) and found a bug in a decided fix (CR-2). | A finding enters the round only if it is Verified, or its failing-first test has been written and seen failing. Everything else stays in the report. |
| ZO8-6 | Major | earlier recommendations | Several earlier recommendations would enlarge the round. **Take:** Z6 (B2 in the engine), N1 (no numeric cap), Z8 (Patreon `checkedAt` grace). **Take narrowly:** from Z7, only the write order (gacha first, spend last, check each result). **Z10:** reorder only if a test covers it, otherwise narrow Goal 6. **Defer:** Z5b (the key list and import flow) and delta releases. | Take the smallest variant of each. |
| ZO8-7 | Nit | §5 intro | Once G5 and the seeding leave, "none adds a new component" becomes true. That resolves CR-4 and comprehension #1 with no further edits. | none |

## Recommended scope for round 5

- **In:** A1, A5, A6, A8, A9; B1 (no cap), B2 (engine), B3 (plus draw write order), B4, B5, B6, B7 (with the CR-2 reset fix), B8 (doc only), B10 (re-triaged), B11; C1–C7, C9; Q1-rest, S3-rest. Also the **early-push warning** in the Push panel and rollback confirm (A4 mitigated).
- **Own design later:** G5 Review/Approve and the A4 root cause (delta releases); A2/A3/A7 (desktop-CMS feature).
- **Deferred or open:** B9 (D3), B12–B14, C10–C13, unless they pass the ZO8-5 entry rule.

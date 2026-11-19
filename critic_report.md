# Stage 7 — Critic Review report (round 1)

- **Target:** `docs/designs/logic-fixes-round5.md`, FeatureRange lines 1–239.
- **Reviewers:** `egm-design` and `egm-structural` (both against `feature-spec-standard.md`), and `egm-style`. All three completed. Context files: `PLAN.md`, `GACHA REDESIGN.md`, `app/docs/content-updates.md`.
- **Round status:** not clean. After merging duplicates there are 3 Blockers, 9 Majors and about 12 Nits.

## Blockers

| ID | Reviewer | Lines | Finding | Recommendation |
|----|----------|-------|---------|----------------|
| CR-1 | design | 188, 193 | **Approve would delete newer draft edits.** Approve runs today's `publish()`, which ends with `writeDraft(draft)` (`store.mjs:250`). On a snapshot, that overwrites the live draft. The doc also claims newer edits survive. (Stage 5 Z2 raised the same issue.) | Split publish into build-and-sign versus save-draft. Approve never writes the draft. |
| CR-2 | design | 158 | **D1 pity reset bug.** "Resets only on a featured-look result" plus the fallback to a Regular theme when `featured` is empty means the counter never resets, so every later draw is forced. Today `stepPity` resets on any rainbow result (`gachaEngine.ts:543-546`). The author's own session checked this against the code. | Reset on any forced result, or freeze the counter while `featured` is empty, matching `GACHA REDESIGN.md:108`. |
| CR-3 | structural, design | whole range | **No Risks & Mitigations section**, which the feature-spec standard requires. Risks left unlisted: the dev private key shipping in the installer (A2); `renameSync` EPERM/EBUSY on Windows; B6 moving rotation boundaries on upgrade; G5 changing what `POST /api/publish` means; the D3 re-roll gap; C5's 5 s wait. | Add `## Risks & Mitigations`, one row per risk. |

## Majors

| ID | Reviewer | Lines | Finding | Recommendation |
|----|----------|-------|---------|----------------|
| CR-4 | all three | 121, 123-135, 178, 200 | "Four groups… none adds a new component" is false: there are five, and G5 adds a page, three routes and `pending.json`. The diagram leaves out G5, and G5 comes before G4. | Correct the intro, extend the diagram, reorder the groups. |
| CR-5 | design | 121, 212, 196 | A4's cause stays (every release is built from the whole draft). G5 only warns about it, and rollback still cancels scheduled releases. Goal 1 overstates the fix. (Same as Stage 5 Z1.) | Call A4 "mitigated" in Goal 1, or design releases as changes on top of the last release. |
| CR-6 | design | 188, 193, 212 | The G5 lifecycle isn't specified. Approve doesn't re-check an `effectiveAt` that has since passed. A new Push can replace the pending push while someone is reviewing it, so Approve would publish something nobody reviewed. `contentHash` has no stated use. | Approve sends `pushedAt`/`contentHash` as a version check and refuses on mismatch; re-check `effectiveAt`; check the rebuilt bundle's hash. |
| CR-7 | design | 140, 141, 144 | A2, A3 and A7 only help **new** installs. A CMS exe that has already run keeps its own key and numbering, so the install that found the bug stays broken. | Add a migration (back up a non-seed key and replace it) or a documented reset step. |
| CR-8 | design | 141 | A3: seeding `current.json` to N with no `by-number/N` folder makes a behind app fail until the first Push. A build-time seed number also clashes once the repo CMS publishes again under the same key. (Same as Stage 5 Z5.) | Decide how two CMSs share one key's numbering, and record the alternatives. |
| CR-9 | structural, design | 218, 226-229 | "Rejected by author" with no link breaks the standard's rule on alternatives. A3, A5, B1, B3, B4, C1 and C4 have no alternatives listed. | Use concrete technical reasons, and add alternatives (for example B4: OS suspend/resume events; C1: check before any step with side effects). |
| CR-10 | structural, style | 55-57, 106, 142, 103 | Statuses are stale: B7, B8 and B9 still say "needs author"; A4 says "needs decision"; Goal 4 assumes `PLAN.md` is canonical for B8 although D2 corrects `PLAN.md` instead. | Sync the statuses with the D table, and restate Goals 1 and 4 as outcomes that can be checked. |
| CR-11 | structural, style, design | 99, 115, 145-146, 161-164, 176, 232-238 | Test and scope rules don't match the plan. The Nit rule ("one line and testable") is broken by B14, B11-B13, A8 and A9. A7, A8, A9, B12-B14, C9, C10, C13 and G4 have no test entry. There is no CMS test harness (`cms/package.json` has no `test` script). | Add a finding-to-test table (manual or doc-only where it applies), state which nits are in, and add the CMS test script as a task. |
| CR-12 | design | 155 | B4 is incomplete. Session length is still wall-clock time (`useQuests.ts:123`), so "Long watch" and the under-60-second rule can be gamed by sleeping the PC. The 2-minute cap ignores timer throttling in a hidden WebView2 window. | Use counted time for session length, and justify the cap. |
| CR-13 | design | 92 | B10 is a localhost logic gap, not connection-only. The Patreon tier never expires, against `PLAN.md:51`. (Same as Stage 5 Z8.) | Re-triage B10. |

## Nits

- A9 isn't in any triage bucket (structural, style, design).
- C10–C13 say "see reviewer notes", which a reader can't find. Give each its own row (all three).
- Heading numbers: "1.0.1" sits at the same level as "1.0"; section 1 uses decimals while section 5 uses G and D (structural).
- Tables: C10–C13 are merged into one row, and table R has no Status column (structural).
- P3, Q1 and S3 aren't defined, and `goldfish_review_report.md` isn't linked (structural, style, design).
- The header status lists only some sections and includes process history (structural, style).
- Line 10's claims that every failure sits where two parts meet and that none has a test are too broad (style).
- "Localhost, real" overstates what are only code-traced findings. C4's "every cold start" isn't reproduced (style).
- B1's 1000 is a magic number. State the catalog size, or drop the cap (style, design).
- C4 and C5 don't say what happens when their timeout runs out (design).
- Goal 3 "no earned item is lost" conflicts with D2's expiry (design).
- D1 extends pity to the Region pack with no `PLAN.md:34` update planned. B2 applies the streak freeze to the waiting cap, which `PLAN.md` doesn't describe (design).
- Filler or subjective wording at lines 143, 223, 226 and 230. Line 176 "are fixed" should be future tense. Line 202 should say whose work (style).

## Overlap with earlier stages

CR-1 matches Z2, CR-4 and CR-5 match Z1 and comprehension #1/#2, CR-8 matches Z5 and comprehension #8, CR-13 matches Z8, and CR-11 matches Z9 and comprehension #7. Three independent stages raising the same issues confirms them.

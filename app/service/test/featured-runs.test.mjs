// Durations for the Region focus and the Brand Pack's featured queue (a run now, runs up next), from the CMS draft
// through the release to what the app features each day.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BUNDLED_CONTENT, validateContent } from "../../src/state/gachaContent.ts";
import { activeSpecial, brandDaysLeft, featuredBrand, featuredRegion, regionDaysLeft, regionRun } from "../../src/state/gachaEngine.ts";
import { draftToContentBundle, specialQueueOf } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";

const [A, B, C, D] = BUNDLED_CONTENT.brandThemeIds;
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const withQueue = (specialQueue) => ({ ...BUNDLED_CONTENT, specialQueue });

test("a featured run lasts its weeks from its start Monday, then the next run, then the rotation", () => {
  // 2026-11-16 is a Monday.
  const c = withQueue([
    { weekOf: "2026-11-16", weeks: 2, brandIds: [A, B] },
    { weekOf: "2026-11-30", brandIds: [C, D] },
  ]);
  assert.equal(validateContent(c), true);
  assert.deepEqual([...featuredBrand(at(2026, 11, 16), c)], [A, B]);
  assert.deepEqual([...featuredBrand(at(2026, 11, 29, 23), c)], [A, B]); // last Sunday of the 2-week run
  assert.deepEqual([...featuredBrand(at(2026, 11, 30), c)], [C, D]);
  assert.equal(activeSpecial(at(2026, 12, 7), c), null); // after the queue: the fortnight rotation
  assert.deepEqual([...featuredBrand(at(2026, 12, 7), c)], [...featuredBrand(at(2026, 12, 7), BUNDLED_CONTENT)]);
  assert.equal(brandDaysLeft(at(2026, 11, 16), c), 14);
  assert.equal(brandDaysLeft(at(2026, 11, 29), c), 1);
});

test("overlapping runs, bad durations and unknown themes are refused", () => {
  assert.equal(validateContent(withQueue([{ weekOf: "2026-11-16", weeks: 2, brandIds: [A, B] }, { weekOf: "2026-11-23", brandIds: [C, D] }])), false);
  assert.equal(validateContent(withQueue([{ weekOf: "2026-11-16", weeks: 9, brandIds: [A, B] }])), false);
  assert.equal(validateContent(withQueue([{ weekOf: "2026-11-16", weeks: 0, brandIds: [A, B] }])), false);
  assert.equal(validateContent(withQueue([{ weekOf: "2026-11-16", brandIds: [A, A] }])), false);
  assert.equal(validateContent(withQueue([{ weekOf: "2026-11-16", brandIds: [A, "not-a-brand"] }])), false);
});

test("an older release's single weekly special still works for its one week", () => {
  const c = { ...BUNDLED_CONTENT, weeklySpecial: { weekOf: "2026-11-16", brandIds: [C, D] } };
  assert.deepEqual([...featuredBrand(at(2026, 11, 18), c)], [C, D]);
  assert.equal(activeSpecial(at(2026, 11, 23), c), null);
});

test("a Region focus runs for its weeks and keeps the same two companies the whole time", () => {
  const pool = BUNDLED_CONTENT.brandThemeIds.map((id) => ({ id, tags: { packs: ["region"], country: "US", region: "na" } }));
  const c = { ...BUNDLED_CONTENT, regionWeek: { weekOf: "2026-11-16", kind: "region", value: "na", weeks: 3 } };
  assert.equal(validateContent(c), true);
  const first = featuredRegion(pool, at(2026, 11, 16), c);
  const third = featuredRegion(pool, at(2026, 12, 6), c);
  assert.equal(first.scheduled, true);
  assert.equal(third.scheduled, true);
  assert.deepEqual(third.ids, first.ids);
  assert.equal(featuredRegion(pool, at(2026, 12, 7), c).scheduled, false);
  assert.equal(regionDaysLeft(at(2026, 11, 16), c), 21);
  assert.ok(regionRun(at(2026, 12, 6), c));
  assert.equal(validateContent({ ...c, regionWeek: { ...c.regionWeek, weeks: 12 } }), false);
});

test("the CMS publishes the queue (and reads an older draft's weekly special as a one-week run)", () => {
  const draft = JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));
  const pool = draft.brandThemeIds;
  delete draft.specialQueue;
  draft.weeklySpecial = { weekOf: "2026-11-16", brandIds: [pool[0], pool[1]] };
  assert.deepEqual(specialQueueOf(draft), [{ weekOf: "2026-11-16", weeks: 1, brandIds: [pool[0], pool[1]] }]);

  draft.weeklySpecial = null;
  draft.specialQueue = [
    { weekOf: "2026-11-16", weeks: 2, brandIds: [pool[0], pool[1]] },
    { weekOf: "2026-11-30", weeks: 1, brandIds: [pool[2], pool[3]] },
  ];
  draft.regionWeek = { weekOf: "2026-11-16", kind: "region", value: "na", weeks: 3 };
  const gacha = draftToContentBundle(draft).gacha;
  assert.deepEqual(gacha.specialQueue, [
    { weekOf: "2026-11-16", weeks: 2, brandIds: [pool[0], pool[1]] },
    { weekOf: "2026-11-30", brandIds: [pool[2], pool[3]] },
  ]);
  assert.equal(gacha.weeklySpecial, null);
  assert.equal(gacha.regionWeek.weeks, 3);
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(validateContent(gacha), true);

  draft.specialQueue[1].weekOf = "2026-11-23";
  assert.ok(validateCmsDraft(draft).some((e) => /overlap/.test(e)));
});

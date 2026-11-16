// 5-star soft pity: from a set draw the 5-star chance climbs to 100% at the guaranteed draw, shaped by a curve
// (base + (1 - base) * progress^curve). Company packs set featured and rainbow Regular 5-stars as two rows.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BUNDLED_CONTENT, fiveStarBase, fiveStarChanceAt, resetContent, setContent } from "../../src/state/gachaContent.ts";
import { drawMany } from "../../src/state/gachaEngine.ts";
import { chanceAt } from "../../../cms/src/lib/softPity.ts";
import { draftToContentBundle } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";

const seq = (...n) => {
  let i = 0;
  return () => n[i++ % n.length];
};
const owned = { looks: [], items: [], regularPool: ["look-a"], rainbowPool: ["rain-a"], week: "2026-11-16", featured: ["spotify-night", "twitch-purple"] };

test.afterEach(() => resetContent());

test("the chance stays at base, climbs from the soft pity draw, and is 100% at the guaranteed draw", () => {
  const soft = { from: 74, curve: 1 };
  assert.equal(fiveStarChanceAt(1, 0.01, 90, soft), 0.01);
  assert.equal(fiveStarChanceAt(73, 0.01, 90, soft), 0.01);
  assert.ok(fiveStarChanceAt(74, 0.01, 90, soft) > 0.01);
  assert.equal(fiveStarChanceAt(90, 0.01, 90, soft), 1);
  // Even steps: every draw adds the same amount.
  const step = fiveStarChanceAt(75, 0.01, 90, soft) - fiveStarChanceAt(74, 0.01, 90, soft);
  assert.ok(Math.abs(fiveStarChanceAt(80, 0.01, 90, soft) - fiveStarChanceAt(79, 0.01, 90, soft) - step) < 1e-12);
  // Fast climbs higher early; late stays lower at the same draw.
  const mid = 82;
  assert.ok(fiveStarChanceAt(mid, 0.01, 90, { from: 74, curve: 0.4 }) > fiveStarChanceAt(mid, 0.01, 90, soft));
  assert.ok(fiveStarChanceAt(mid, 0.01, 90, { from: 74, curve: 3 }) < fiveStarChanceAt(mid, 0.01, 90, soft));
  // Off: no climb before the guaranteed draw.
  assert.equal(fiveStarChanceAt(89, 0.01, 90, null), 0.01);
});

test("the CMS chart uses the same rule as the app", () => {
  for (const curve of [0.2, 0.5, 1, 2.3, 5]) {
    for (const d of [1, 60, 74, 80, 89, 90]) {
      assert.equal(chanceAt(d, 0.015, 90, { from: 74, curve }), fiveStarChanceAt(d, 0.015, 90, { from: 74, curve }));
    }
  }
});

test("soft pity raises the 5-star rows in a draw, and without it the same roll misses", () => {
  // 89th draw since the last 5-star in the Regular Pack: the chance is about 94%, so 0.5 lands on the 5-star row.
  const pity = { look: 0, brand: 88, weeklyPicks: { week: null, count: 0 } };
  const hit = drawMany("regular", 1, owned, pity, seq(0.5, 0.0));
  assert.equal(hit.results[0].rainbow, true);
  const { softPity, ...off } = BUNDLED_CONTENT;
  setContent(off);
  const miss = drawMany("regular", 1, owned, pity, seq(0.5, 0.0));
  assert.notEqual(miss.results[0].rainbow, true);
});

test("a company pack's base 5-star chance is its two rows together", () => {
  assert.equal(fiveStarBase("brand"), 0.015);
  assert.equal(fiveStarBase("regular"), 0.01);
});

test("the CMS publishes soft pity and the two 5-star rows, and checks them", () => {
  const draft = JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));
  draft.packs.brand.weights = { regularTheme: 13, brandTheme: 1.2, rainbowRegular: 0.6, pick: 3, customUpload: 0.5, better: 25, common: 56.7 };
  draft.packs.region = { ...draft.packs.brand, id: "region" };
  draft.economy.softPity = { regular: { from: 74, curve: 1 }, company: { from: 58, curve: 2.5 } };
  const gacha = draftToContentBundle(draft).gacha;
  assert.equal(gacha.packs.brand.weights.brandTheme, 0.012);
  assert.equal(gacha.packs.brand.weights.rainbowRegular, 0.006);
  assert.equal("rainbowRegular" in gacha.packs.regular.weights, false);
  assert.deepEqual(gacha.softPity, { regular: { from: 74, curve: 1 }, company: { from: 58, curve: 2.5 } });
  assert.equal("promotedChance" in gacha, false);
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);

  draft.economy.brandPityAfter = 69;
  draft.economy.softPity.company.from = 80; // past the guaranteed draw 70
  assert.ok(validateCmsDraft(draft).some((e) => /soft pity must start before/.test(e)));
  draft.economy.softPity.company = { from: 58, curve: 9 };
  assert.ok(validateCmsDraft(draft).some((e) => /curve must be 0.2 to 5/.test(e)));
});

test("repeat rewards: a rainbow Regular repeat has its own value, falling back to the Regular theme value", async () => {
  const { crystalValueFor } = await import("../../src/state/gachaEngine.ts");
  const rainbowRepeat = { kind: "look", id: "rain-a", brand: false, rainbow: true, repeat: true };
  const standardRepeat = { kind: "look", id: "look-a", brand: false, repeat: true };
  assert.equal(crystalValueFor(rainbowRepeat), BUNDLED_CONTENT.crystalValues.regularTheme);
  const c = { ...BUNDLED_CONTENT, crystalValues: { ...BUNDLED_CONTENT.crystalValues, rainbowTheme: 7 } };
  assert.equal(setContent(c), true);
  assert.equal(crystalValueFor(rainbowRepeat), 7);
  assert.equal(crystalValueFor(standardRepeat), BUNDLED_CONTENT.crystalValues.regularTheme);
  assert.equal(setContent({ ...c, crystalValues: { ...c.crystalValues, better: -1 } }), false);

  const draft = JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));
  draft.economy.crystalValues = { ...draft.economy.crystalValues, rainbowTheme: 6 };
  draft.economy.regularCrystalCost = 12;
  const gacha = draftToContentBundle(draft).gacha;
  assert.equal(gacha.crystalValues.rainbowTheme, 6);
  assert.equal(gacha.regularCrystalCost, 12);
});

// Checks src/state/playerLevel.ts: the agreed pacing (2026-11-18), counted time, level carry, saved state and Perk Points by level.
import test from "node:test";
import assert from "node:assert/strict";
import {
  addCountedMs,
  ALL_PAID_LEVEL,
  LAST_POINT_LEVEL,
  cleanLevel,
  countedGapMs,
  emptyLevel,
  hoursForLevel,
  levelProgress,
  MAX_LEVEL,
  pointsAtLevel,
  xpLabel,
  xpPerHour,
  xpToNext,
} from "../../src/state/playerLevel.ts";
import { PLAYER_LEVELS } from "../../src/content/playerLevelData.ts";
import { PERK_TREE } from "../../src/content/perkTreeData.ts";

const HOUR = 3_600_000;
const hoursTo = (L) => {
  let h = 0;
  for (let l = 1; l < L; l++) h += hoursForLevel(l);
  return h;
};
const weeks = (hoursCounted, perWeek) => hoursCounted / perWeek;
const days = (hoursCounted, perWeek) => weeks(hoursCounted, perWeek) * 7;

test("the table covers levels 1 to 300 and the real MapleStory numbers are kept", () => {
  assert.equal(MAX_LEVEL, 300);
  assert.equal(PLAYER_LEVELS.need.length, 299);
  assert.equal(PLAYER_LEVELS.perHour.length, 299);
  // MapleStory levels 1 to 199 are unchanged; from 200 the XP needed is halved.
  assert.deepEqual([1, 2, 3].map(xpToNext), [15, 34, 57]);
  assert.equal(xpToNext(199), 571115568);
  assert.equal(xpToNext(200), 2207026470 / 2);
  assert.equal(xpToNext(MAX_LEVEL), 0);
});

test("every level earns between 0.5% and 4.2% of itself per 10 minutes", () => {
  for (let L = 1; L < MAX_LEVEL; L++) {
    const pct = ((xpPerHour(L) / 6) / xpToNext(L)) * 100;
    assert.ok(pct >= 0.4999 && pct <= 4.2001, `level ${L} earns ${pct.toFixed(3)}% per 10 min`);
  }
});

test("pacing: level 100 in about a season at 31 h a week, level 250 in 11.2 months at 56 h a week", () => {
  assert.ok(Math.abs(days(hoursTo(100), 31) - 89) < 2, `level 100 at ${days(hoursTo(100), 31).toFixed(1)} days`);
  const months250 = (days(hoursTo(250), 56) / 30.44);
  assert.ok(Math.abs(months250 - 11.2) < 0.05, `level 250 at ${months250.toFixed(2)} months`);
  // 90-day seasons: level 250 at 31 h a week is about 6.8 seasons.
  assert.ok(Math.abs(days(hoursTo(250), 31) / 90 - 6.84) < 0.05);
  // The cap is far past the tree: about 18 months at 56 h a week.
  assert.ok(Math.abs(days(hoursTo(300), 56) / 30.44 - 18) < 0.2);
});

test("Perk Points by level: 4 to start, 12 a level to level 50, level 250 pays bands I to V and the levels after pay band VI", () => {
  assert.equal(pointsAtLevel(1), 4);
  assert.equal(pointsAtLevel(50), 4 + 49 * 12);
  assert.equal(pointsAtLevel(100), 1092);
  assert.equal(pointsAtLevel(150), 1542);
  assert.equal(pointsAtLevel(200), 1892);
  assert.equal(pointsAtLevel(250), 2132);
  assert.equal(pointsAtLevel(262), 2144, "levels 251 to 262 give 1 point each: they pay for one band VI path (12 points)");
  assert.equal(pointsAtLevel(300), 2144, "no points after level 262");
  assert.equal(LAST_POINT_LEVEL, 262);
  assert.equal(pointsAtLevel(0), 4);
  assert.equal(pointsAtLevel(Number.NaN), 4);
  // Points never fall as the level rises.
  for (let L = 2; L <= MAX_LEVEL; L++) assert.ok(pointsAtLevel(L) >= pointsAtLevel(L - 1));
});

test("level 250 is the first level that pays for everything a player can take", () => {
  const reach = PERK_TREE.pacing.reachCost;
  assert.equal(PLAYER_LEVELS.reachCost, reach);
  assert.ok(pointsAtLevel(249) < reach, "level 249 is short");
  assert.ok(pointsAtLevel(250) >= reach, "level 250 covers it");
  assert.equal(ALL_PAID_LEVEL, 250);
  assert.ok(reach < PERK_TREE.pacing.treeCost, "a player cannot take the whole tree");
});

test("counted time adds XP inside a level and carries over levels", () => {
  const one = hoursForLevel(1);
  let s = addCountedMs(emptyLevel(), (one / 2) * HOUR);
  assert.equal(s.level, 1);
  assert.ok(Math.abs(levelProgress(s) - 0.5) < 1e-9);
  s = addCountedMs(s, (one / 2) * HOUR);
  assert.equal(s.level, 2);
  assert.ok(s.xp < 1e-6);
  // Many hours at once carry through several levels and match the summed hours.
  const big = addCountedMs(emptyLevel(), 100 * HOUR);
  assert.ok(big.level > 20 && big.level < 40, `100 h reaches level ${big.level}`);
  const left = 100 - hoursTo(big.level);
  assert.ok(left >= -1e-9 && Math.abs(levelProgress(big) - left / hoursForLevel(big.level)) < 1e-6);
  // No time, no change; negative time is ignored.
  assert.deepEqual(addCountedMs(s, 0), s);
  assert.deepEqual(addCountedMs(s, -5 * HOUR), s);
});

test("the level stops at 300 and XP does not pile up there", () => {
  const top = addCountedMs(emptyLevel(), 10_000 * HOUR);
  assert.deepEqual(top, { level: MAX_LEVEL, xp: 0 });
  assert.deepEqual(addCountedMs(top, HOUR), { level: MAX_LEVEL, xp: 0 });
  assert.equal(levelProgress(top), 1);
});

test("a long gap between ticks (sleep) counts only the clamp; time going backwards counts nothing", () => {
  assert.equal(countedGapMs(1_000, 16_000), 15_000);
  assert.equal(countedGapMs(0, 8 * HOUR), 3 * 60_000);
  assert.equal(countedGapMs(50_000, 10_000), 0);
});

test("saved state is cleaned: bad input starts over, levels are bounded, xp stays inside the level", () => {
  assert.deepEqual(cleanLevel(null), { level: 1, xp: 0 });
  assert.deepEqual(cleanLevel("nope"), { level: 1, xp: 0 });
  assert.deepEqual(cleanLevel({ level: 12.9, xp: 5 }), { level: 12, xp: 5 });
  assert.deepEqual(cleanLevel({ level: 9999, xp: 5 }), { level: MAX_LEVEL, xp: 0 });
  assert.deepEqual(cleanLevel({ level: -3, xp: -1 }), { level: 1, xp: 0 });
  assert.deepEqual(cleanLevel({ level: Number.NaN, xp: Number.POSITIVE_INFINITY }), { level: 1, xp: 0 });
  assert.ok(cleanLevel({ level: 1, xp: 1e30 }).xp < xpToNext(1), "xp cannot exceed the level");
});

test("xpLabel shortens big numbers", () => {
  assert.equal(xpLabel(950), "950");
  assert.equal(xpLabel(12_400), "12.4K");
  assert.equal(xpLabel(3_200_000), "3.20M");
  assert.equal(xpLabel(2_207_026_470), "2.21B");
  assert.equal(xpLabel(1.7e15), "1.70Q");
});

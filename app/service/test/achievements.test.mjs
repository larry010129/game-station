// Checks src/state/achievements.ts: unlocking, seeding, permanence and tallies.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS,
  CATEGORIES,
  categoryTally,
  cleanAchievements,
  emptyAchievements,
  evaluate,
  progressOf,
  tierTally,
} from "../../src/state/achievements.ts";

const NOW = 1_800_000_000_000;
const zero = {
  minutesTotal: 0,
  tasksClaimed: 0,
  checkinDays: 0,
  draws: 0,
  skinsOwned: 0,
  fiveStarSkins: 0,
  themesUnlocked: 0,
  widgetsWon: 0,
  nameSet: false,
  skinEquipped: false,
  newsRead: 0,
};

test("every achievement has a unique id, a known category and a positive target", () => {
  const ids = new Set();
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const a of ACHIEVEMENTS) {
    assert.ok(!ids.has(a.id), `duplicate ${a.id}`);
    ids.add(a.id);
    assert.ok(cats.has(a.category), `${a.id} category`);
    assert.ok(a.target > 0, `${a.id} target`);
    assert.equal(a.value(zero) >= a.target, false, `${a.id} must not be unlocked by an empty station`);
  }
  for (const c of CATEGORIES) assert.ok(ACHIEVEMENTS.some((a) => a.category === c.id), `${c.id} has achievements`);
});

test("the first check seeds quietly; later ones announce", () => {
  const snap = { ...zero, draws: 3 };
  const first = evaluate(emptyAchievements(), snap, NOW);
  assert.equal(first.state.seeded, true);
  assert.ok(first.state.unlocked["draw-1"]);
  assert.deepEqual(first.fresh, [], "nothing is announced on the seeding check");

  const second = evaluate(first.state, { ...snap, nameSet: true }, NOW + 1000);
  assert.deepEqual(second.fresh.map((a) => a.id), ["name"]);
  assert.equal(second.state.unlocked.name, NOW + 1000);
});

test("nothing new returns the same object", () => {
  const seeded = evaluate(emptyAchievements(), zero, NOW).state;
  const again = evaluate(seeded, zero, NOW + 1);
  assert.equal(again.state, seeded);
  assert.deepEqual(again.fresh, []);
});

test("an unlock stays when the number drops", () => {
  const s = evaluate(evaluate(emptyAchievements(), zero, NOW).state, { ...zero, tasksClaimed: 5 }, NOW).state;
  const later = evaluate(s, { ...zero, tasksClaimed: 0 }, NOW + 5);
  assert.ok(later.state.unlocked["tasks-5"]);
});

test("progress is capped at the target", () => {
  const a = ACHIEVEMENTS.find((x) => x.id === "tasks-5");
  assert.deepEqual(progressOf(a, { ...zero, tasksClaimed: 2 }), { have: 2, share: 0.4 });
  assert.deepEqual(progressOf(a, { ...zero, tasksClaimed: 50 }), { have: 5, share: 1 });
});

test("tallies count by tier and category", () => {
  const s = evaluate(emptyAchievements(), { ...zero, draws: 60, nameSet: true }, NOW).state;
  assert.deepEqual(tierTally(s), { bronze: 2, silver: 1, gold: 0 });
  assert.deepEqual(categoryTally(s, "draw"), { have: 2, of: 3 });
});

test("cleanAchievements drops unknown ids and junk", () => {
  const s = cleanAchievements({ seeded: true, unlocked: { "draw-1": NOW, nope: NOW, name: "x", equip: -1 } });
  assert.deepEqual(s, { v: 1, seeded: true, unlocked: { "draw-1": NOW } });
  assert.deepEqual(cleanAchievements(null), emptyAchievements());
});

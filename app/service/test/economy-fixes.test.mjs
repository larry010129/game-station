// Round 5 economy fixes (docs/designs/logic-fixes-round5.md): B1, B2, B3, B7.
import test from "node:test";
import assert from "node:assert/strict";
import { PACK_BRAND, PACK_REGULAR, drawMany, resetContent } from "../../src/state/gachaEngine.ts";
import { cleanUnlocks } from "../../src/state/unlocks.ts";
import { startPlayClock, tickPlayClock } from "../../src/state/questEngine.ts";
import { CREDITS_KEY, STARTING_CREDITS, readCredits, spendCredits } from "../../src/state/stationCredits.ts";

const seq = (...n) => {
  let i = 0;
  return () => n[i++ % n.length];
};
const owned = (over = {}) => ({
  looks: [],
  items: [],
  regularPool: ["look-a", "look-b", "look-c"],
  week: "2024-01-01",
  featured: ["spotify-night", "twitch-purple"],
  ...over,
});
const pity0 = () => ({ look: 0, brand: 0, weeklyPicks: { week: null, count: 0 } });

/** A localStorage stand-in; `full` makes every write throw like a full store. */
function mockStorage() {
  const store = new Map();
  const s = {
    full: false,
    store,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (s.full) throw new Error("QuotaExceededError");
      store.set(k, String(v));
    },
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
  globalThis.localStorage = s;
  return s;
}

test.beforeEach(() => resetContent());

test("B1: more than 50 earned looks survive a load (no numeric cap, duplicates and junk dropped)", () => {
  const ids = Array.from({ length: 60 }, (_, i) => `look-${i}`);
  const cleaned = cleanUnlocks([...ids, "look-3", 7, "", null]);
  assert.equal(cleaned.length, 60);
  assert.deepEqual(cleaned, ids);
  assert.deepEqual(cleanUnlocks("not a list"), []);
});

test("B2: a pick won while the waiting-picks slots are full becomes a streak freeze and is not counted", () => {
  // seq(0.16) lands on the pick row of the Regular Pack. With no free slot that row is gone and its chance sits in
  // the streak-freeze row after common (≥ 0.97), exactly as for the weekly cap.
  const full = drawMany(PACK_REGULAR, 1, owned({ pickRoom: 0 }), pity0(), seq(0.16));
  assert.notEqual(full.results[0].kind, "pick");
  const freeze = drawMany(PACK_REGULAR, 1, owned({ pickRoom: 0 }), pity0(), seq(0.98));
  assert.deepEqual(freeze.results[0], { kind: "item", id: "streak-freeze", repeat: false });
  assert.equal(freeze.pity.weeklyPicks.count, 0, "a pick that was never granted does not use the weekly cap");

  // One free slot: a ten-draw can give one pick, not two.
  const ten = drawMany(PACK_REGULAR, 10, owned({ pickRoom: 1 }), pity0(), seq(...Array.from({ length: 30 }, () => 0.16)));
  assert.equal(ten.results.filter((r) => r.kind === "pick").length, 1);

  // Without pickRoom (older callers) nothing changes.
  assert.equal(drawMany(PACK_REGULAR, 1, owned(), pity0(), seq(0.16)).results[0].kind, "pick");
});

test("B3: a corrupt balance is kept aside before the 200 re-seed, and a missing one is just seeded", () => {
  const s = mockStorage();
  assert.equal(readCredits(), STARTING_CREDITS);
  s.store.set(CREDITS_KEY, '"garbage"');
  assert.equal(readCredits(), STARTING_CREDITS);
  assert.equal(s.store.get(`${CREDITS_KEY}.bad`), '"garbage"');
});

test("B3: a spend whose save fails reports null and leaves the balance", () => {
  const s = mockStorage();
  s.store.set(CREDITS_KEY, "500");
  s.full = true;
  assert.equal(spendCredits(100), null);
  s.full = false;
  assert.equal(readCredits(), 500);
  assert.equal(spendCredits(100), 400);
});

test("B4: a long gap between ticks (PC asleep) is not paid as play time; normal ticks are", () => {
  const t0 = 1_000_000;
  let clock = startPlayClock(t0);
  // Eight hours asleep, then one tick.
  const slept = tickPlayClock(clock, t0 + 8 * 3600_000);
  assert.ok(slept.due <= 3, `paid ${slept.due} minutes for an 8-hour sleep`);
  // Ten minutes of 15-second ticks pays ten minutes.
  let paid = 0;
  for (let t = t0 + 15_000; t <= t0 + 600_000; t += 15_000) {
    const r = tickPlayClock(clock, t);
    clock = r.clock;
    paid += r.due;
  }
  assert.equal(paid, 10);
  // A hidden window's timers fire about once a minute: still paid in full.
  clock = startPlayClock(t0);
  paid = 0;
  for (let t = t0 + 60_000; t <= t0 + 600_000; t += 60_000) {
    const r = tickPlayClock(clock, t);
    clock = r.clock;
    paid += r.due;
  }
  assert.equal(paid, 10);
  assert.equal(clock.activeMs, 600_000, "session length for Long watch uses the same counted time");
});

test("B10: the dashboard's saved Patreon unlocks expire after the same offline grace as the service", async () => {
  mockStorage();
  globalThis.location ??= { search: "" }; // api.ts reads the page URL when it loads
  const { cleanEntitlement, ENTITLEMENT_GRACE_MS } = await import("../../src/state/patreon.ts");
  const now = 1_700_000_000_000;
  const paid = { basic: true, brand: true, tierName: "Gold", checkedAt: now - 1000 };
  assert.equal(cleanEntitlement(paid, now).basic, true);
  const old = { ...paid, checkedAt: now - ENTITLEMENT_GRACE_MS - 1 };
  assert.equal(cleanEntitlement(old, now).basic, false, "never refreshed for longer than the grace: unlocks off");
  assert.equal(cleanEntitlement(old, now).brand, false);
  // A save from before this change has no time: it is kept, and its grace starts now (no surprise loss on upgrade).
  const legacy = cleanEntitlement({ basic: true, brand: false, tierName: "Silver" }, now);
  assert.equal(legacy.basic, true);
  assert.equal(legacy.checkedAt, now);
});

test("B10: an older saved tier is stamped once at load, so its grace does not restart on every launch", async () => {
  const s = mockStorage();
  globalThis.location ??= { search: "" };
  const { loadEntitlement, ENTITLEMENT_GRACE_MS } = await import("../../src/state/patreon.ts");
  s.store.set("cs.patreon", JSON.stringify({ basic: true, brand: true, tierName: "Gold" }));
  const t0 = 1_700_000_000_000;
  assert.equal(loadEntitlement(t0).basic, true);
  assert.equal(JSON.parse(s.store.get("cs.patreon")).checkedAt, t0, "the first load saved its time");
  // A launch after the grace, with the service never answering: the unlocks are off.
  assert.equal(loadEntitlement(t0 + ENTITLEMENT_GRACE_MS + 1).basic, false);
});

test("B7 (D1): the forced pity draw in a company pack always gives a featured look", () => {
  const rainbowPool = ["rain-a", "rain-b"];
  const pity = { look: 0, brand: 69, weeklyPicks: { week: null, count: 0 } };
  for (const r of [0.0, 0.5, 0.8, 0.99]) {
    const out = drawMany(PACK_BRAND, 1, owned({ rainbowPool }), pity, seq(r, 0.0));
    assert.equal(out.results[0].brand, true, `rand ${r}`);
    assert.equal(out.pity.brand, 0);
  }
});

test("B7 (D1): a rainbow Regular theme in a company pack does not reset that pack's featured pity", () => {
  const rainbowPool = ["rain-a", "rain-b"];
  // [0.14, 0.145) is the rainbow Regular row of the Brand Pack.
  const out = drawMany(PACK_BRAND, 1, owned({ rainbowPool }), { look: 0, brand: 10, weeklyPicks: { week: null, count: 0 } }, seq(0.142, 0.0));
  assert.equal(out.results[0].rainbow, true);
  assert.equal(out.pity.brand, 11);
});

test("B7 (D1): with no featured looks the company pity holds instead of forcing every draw", () => {
  const pity = { look: 0, brand: 69, weeklyPicks: { week: null, count: 0 } };
  const out = drawMany(PACK_BRAND, 1, owned({ featured: [], rainbowPool: ["rain-a"] }), pity, seq(0.9, 0.0));
  assert.equal(out.pity.brand, 69, "pity holds while there is nothing featured to force");
});

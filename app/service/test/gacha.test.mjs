// Checks src/state/gachaEngine.ts against the gacha section of PLAN.md.
import test from "node:test";
import assert from "node:assert/strict";
import { DRAW_COST, DRAW_TEN_COST, LOOK_COST, applyResults, cleanGacha, drawMany, emptyGacha, priceOf } from "../../src/state/gachaEngine.ts";

// A fixed sequence of "random" numbers, so every outcome is exact.
const seq = (...n) => {
  let i = 0;
  return () => n[i++ % n.length];
};

test("prices match the plan: 100 for one draw, 900 for ten as one purchase, 120 for a chosen look", () => {
  assert.equal(DRAW_COST, 100);
  assert.equal(DRAW_TEN_COST, 900);
  assert.equal(LOOK_COST, 120);
  assert.equal(priceOf(1), 100);
  assert.equal(priceOf(10), 900);
  assert.equal(priceOf(5), null, "no other bundle is sold");
  assert.equal(priceOf(0), null);
});

test("a draw awards a look the user does not own, or a coupon", () => {
  const win = drawMany(1, [], ["a", "b"], seq(0.0, 0.0));
  assert.deepEqual(win, [{ kind: "look", id: "a" }]);
  const lose = drawMany(1, [], ["a", "b"], seq(0.99));
  assert.deepEqual(lose, [{ kind: "coupon" }]);
});

test("a look the user already owns is never awarded again", () => {
  const r = drawMany(20, ["a"], ["a", "b"], seq(0.0, 0.99));
  const looks = r.filter((x) => x.kind === "look").map((x) => x.id);
  assert.ok(!looks.includes("a"));
});

test("when every preset is owned, a draw is a coupon, whatever the roll", () => {
  assert.deepEqual(drawMany(3, ["a", "b"], ["a", "b"], seq(0.0)), [{ kind: "coupon" }, { kind: "coupon" }, { kind: "coupon" }]);
  assert.deepEqual(drawMany(1, [], [], seq(0.0)), [{ kind: "coupon" }]);
});

test("a batch of ten never repeats a look it won earlier in the batch", () => {
  const r = drawMany(10, [], ["a", "b", "c"], seq(0.0, 0.0));
  const looks = r.filter((x) => x.kind === "look").map((x) => x.id);
  assert.equal(new Set(looks).size, looks.length);
  assert.equal(looks.length, 3, "all three are won, the rest are coupons");
  assert.equal(r.filter((x) => x.kind === "coupon").length, 7);
});

test("brand colours are not in the pool: only the ids passed in can be won", () => {
  const r = drawMany(50, [], ["preset-1"], seq(0.0));
  for (const x of r) if (x.kind === "look") assert.equal(x.id, "preset-1");
});

test("coupons and draws add up; a saved value in the wrong shape starts fresh", () => {
  const s = applyResults(emptyGacha(), [{ kind: "coupon" }, { kind: "look", id: "a" }, { kind: "coupon" }]);
  assert.deepEqual(s, { v: 1, coupons: 2, draws: 3 });
  for (const bad of [null, 5, "x", {}, { coupons: -2, draws: "z" }]) assert.deepEqual(cleanGacha(bad), emptyGacha());
});

// Checks src/state/lookAccess.ts against the Looks section of PLAN.md.
import test from "node:test";
import assert from "node:assert/strict";
import { FREE_LOOK_COUNT, isLookLocked, lockedIdsOf } from "../../src/state/lookAccess.ts";

const ids = (n) => Array.from({ length: n }, (_, i) => `look-${i + 1}`);

test("the first 30 looks are free and every look after them is locked", () => {
  assert.equal(FREE_LOOK_COUNT, 30);
  const catalog = ids(121);
  const locked = lockedIdsOf(catalog, []);
  assert.equal(locked.length, 91);
  assert.equal(locked[0], "look-31");
  assert.ok(!locked.includes("look-30"), "look 30 is the last free one");
  assert.ok(!locked.includes("look-1"));
});

test("a gated look outside the catalogue is locked too, and is not listed twice", () => {
  const catalog = ids(40);
  const locked = lockedIdsOf(catalog, ["nightsteel", "look-35"]);
  assert.equal(locked.filter((x) => x === "nightsteel").length, 1);
  assert.equal(locked.filter((x) => x === "look-35").length, 1);
  assert.equal(locked.length, 10 + 1);
});

test("a gated id that is already among the free 30 stays free", () => {
  assert.ok(!lockedIdsOf(ids(40), ["look-3"]).includes("look-3"));
});

test("a locked look opens when it is earned or Patreon Basic is on, and a free look is never locked", () => {
  const locked = new Set(lockedIdsOf(ids(50), ["nightsteel"]));
  assert.equal(isLookLocked("look-40", locked, [], false), true);
  assert.equal(isLookLocked("look-40", locked, ["look-40"], false), false, "earned");
  assert.equal(isLookLocked("look-40", locked, [], true), false, "Patreon Basic");
  assert.equal(isLookLocked("look-5", locked, [], false), false, "free");
  assert.equal(isLookLocked("nightsteel", locked, [], false), true);
  assert.equal(isLookLocked("my-own-module", locked, [], false), false, "a look you made is yours");
});

test("the local creator unlock opens a locked look, including Nightsteel, and turning it off locks it again", () => {
  const locked = new Set(lockedIdsOf(ids(50), ["nightsteel"]));
  assert.equal(isLookLocked("nightsteel", locked, [], false, true), false);
  assert.equal(isLookLocked("look-40", locked, [], false, true), false);
  assert.equal(isLookLocked("nightsteel", locked, [], false, false), true);
  assert.equal(isLookLocked("look-40", locked, ["look-40"], false, false), false, "an earned look stays open");
});

test("cancelling Patreon relocks only what Basic was opening; earned looks stay open", () => {
  const locked = new Set(lockedIdsOf(ids(50), []));
  const earned = ["look-33"];
  assert.equal(isLookLocked("look-33", locked, earned, true), false);
  assert.equal(isLookLocked("look-33", locked, earned, false), false, "earned survives");
  assert.equal(isLookLocked("look-34", locked, earned, true), false);
  assert.equal(isLookLocked("look-34", locked, earned, false), true, "relocked after cancelling");
});

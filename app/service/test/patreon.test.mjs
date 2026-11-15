import test from "node:test";
import assert from "node:assert/strict";
import { OFFLINE_GRACE_MS, entitlementFrom, tierOf, viewOf } from "../patreon.mjs";

const tier = (id, title, cents) => ({ type: "tier", id, attributes: { title, amount_cents: cents } });
const member = (campaign, tierIds, status = "active_patron") => ({
  type: "member",
  id: `m${campaign}`,
  attributes: { patron_status: status },
  relationships: { campaign: { data: { id: campaign } }, currently_entitled_tiers: { data: tierIds.map((id) => ({ id, type: "tier" })) } },
});
const answer = (...included) => ({ data: { attributes: { full_name: "Pat" } }, included });

test("tiers are read by their name first, then by price", () => {
  assert.equal(tierOf(tier("1", "Bronze", 299)).id, "bronze");
  assert.equal(tierOf(tier("2", "Silver supporter", 599)).id, "silver");
  assert.equal(tierOf(tier("3", "Creator", 0)).id, "creator");
  assert.equal(tierOf(tier("4", "Some other name", 1000)).id, "gold");
  assert.equal(tierOf(tier("5", "Some other name", 299)).id, "bronze");
  assert.equal(tierOf(tier("6", "Free", 0)), null);
});

test("Bronze turns on Basic only; Silver, Gold, Diamond and Creator turn on Basic and Brand", () => {
  const e = (name, cents) => entitlementFrom(answer(tier("t", name, cents), member("c1", ["t"])), "c1");
  assert.deepEqual([e("Bronze", 299).basic, e("Bronze", 299).brand], [true, false]);
  for (const [n, c] of [["Silver", 599], ["Gold", 999], ["Diamond", 1199], ["Creator", 0]]) {
    assert.deepEqual([e(n, c).basic, e(n, c).brand], [true, true], n);
  }
});

test("the best entitled tier wins", () => {
  const r = entitlementFrom(answer(tier("a", "Bronze", 299), tier("b", "Gold", 999), member("c1", ["a", "b"])), "c1");
  assert.equal(r.tier, "gold");
});

test("a patron of another page, or a cancelled or declined member, unlocks nothing", () => {
  const t = tier("t", "Diamond", 1199);
  assert.equal(entitlementFrom(answer(t, member("someone-else", ["t"])), "c1"), null);
  assert.equal(entitlementFrom(answer(t, member("c1", ["t"], "former_patron")), "c1"), null);
  assert.equal(entitlementFrom(answer(t, member("c1", ["t"], "declined_patron")), "c1"), null);
  assert.equal(entitlementFrom(answer(t, member("c1", [])), "c1"), null);
  assert.equal(entitlementFrom({}, "c1"), null);
  assert.equal(entitlementFrom(null, "c1"), null);
});

test("without a campaign id configured, any active membership counts", () => {
  const r = entitlementFrom(answer(tier("t", "Silver", 599), member("anything", ["t"])), "");
  assert.equal(r.tier, "silver");
});

test("the view is all-off when sign-in is not set up or nobody is signed in", () => {
  assert.deepEqual(viewOf({}, false), { configured: false, signedIn: false, basic: false, brand: false, tier: null });
  const v = viewOf({}, true);
  assert.equal(v.signedIn, false);
  assert.equal(v.basic, false);
});

test("cancelling removes the unlocks on the next check; offline keeps the last answer only for a while", () => {
  const now = Date.now();
  const signed = { refresh: "r", entitled: { tier: "silver", name: "Silver", basic: true, brand: true }, checkedAt: now - 1000 };
  assert.equal(viewOf(signed, true, now).brand, true);
  // The next good check finds no entitlement: both go off.
  assert.equal(viewOf({ ...signed, entitled: null, checkedAt: now }, true, now).basic, false);
  // No check has worked for longer than the grace: they go off and the view says it is stale.
  const old = viewOf({ ...signed, checkedAt: now - OFFLINE_GRACE_MS - 1 }, true, now);
  assert.equal(old.basic, false);
  assert.equal(old.stale, true);
});

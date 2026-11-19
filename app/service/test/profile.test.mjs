// Checks src/state/profile.ts: the profile's small labels.
import test from "node:test";
import assert from "node:assert/strict";
import { checkinDays, hoursLabel, initialsOf } from "../../src/state/profile.ts";

test("labels", () => {
  assert.equal(hoursLabel(0), "0 h");
  assert.equal(hoursLabel(150), "2.5 h");
  assert.equal(hoursLabel(14 * 60 + 20), "14 h");
  assert.equal(initialsOf(""), "?");
  assert.equal(initialsOf("  nova "), "NO");
  assert.equal(initialsOf("night owl"), "NO");
  assert.equal(checkinDays({ days: { a: { minutes: 0, checkin: true }, b: { minutes: 4 }, c: { minutes: 0, checkin: true } } }), 2);
});

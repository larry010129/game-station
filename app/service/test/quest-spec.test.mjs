// Checks src/state/questEngine.ts against the Theme and Credits spec in CLEANUP PLAN.md.
import test from "node:test";
import assert from "node:assert/strict";
import {
  QUESTS, INCOME_PER_HOUR, MINUTES_PER_INCOME, LOOKS_WAITING_CAP, addMinutes, canClaim, claim, cleanState, dayKey, emptyState, grantPick,
  nextReset, progress, recordArmed, recordCheckin, recordOnce, recordSession, takeLookPick,
  visibleQuests, weekKey, monthKey,
} from "../../src/state/questEngine.ts";

const q = (id) => QUESTS.find((x) => x.id === id);
// Local times, so the tests do not depend on the machine's time zone.
const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi);
const day = (n) => 86_400_000 * n;

test("periods reset at local midnight, Monday 00:00 and the 1st", () => {
  assert.notEqual(dayKey(at(2026, 11, 15, 23, 59)), dayKey(at(2026, 11, 16, 0, 0)));
  assert.equal(weekKey(at(2026, 11, 15, 23, 59)), "2026-11-09"); // Sunday belongs to the week that began Monday 9 Nov
  assert.equal(weekKey(at(2026, 11, 16, 0, 0)), "2026-11-16");
  assert.equal(monthKey(at(2026, 11, 30, 23, 59)), "2026-11");
  assert.equal(monthKey(at(2026, 12, 1, 0, 0)), "2026-12");
  assert.deepEqual(nextReset("weekly", at(2026, 11, 15)), at(2026, 11, 16, 0, 0));
  assert.deepEqual(nextReset("monthly", at(2026, 11, 15)), at(2026, 12, 1, 0, 0));
});

test("every spec quest exists with the spec reward and target", () => {
  const want = { checkin: [5, 1], thirty: [8, 30], arm: [6, 1], longwatch: [12, 1], nightwatch: [15, 90], weeklook: [0, 5], threehour: [12, 180], armed3: [8, 3], halfmonth: [20, 12], tenhour: [20, 600], armed8: [15, 8], look: [15, 1], calendar: [10, 1], vault: [10, 1], star: [12, 1] };
  for (const [id, [credits, target]] of Object.entries(want)) {
    assert.equal(q(id)?.credits, credits, `${id} reward`);
    assert.equal(q(id)?.target, target, `${id} target`);
  }
  assert.equal(QUESTS.length, Object.keys(want).length);
});

test("there are no ranks: play pays one flat rate, 1 Income per 6 counted minutes", () => {
  assert.equal(MINUTES_PER_INCOME, 6);
  assert.equal(INCOME_PER_HOUR, 10);
  assert.ok(QUESTS.every((x) => !("minRank" in x)), "no quest waits for a rank");
});

test("a daily claim pays once, then returns the next local day", () => {
  const t = at(2026, 11, 15);
  let s = recordCheckin(emptyState(), t);
  const r = claim(s, "checkin", t);
  assert.equal(r.credits, 5);
  assert.equal(claim(r.state, "checkin", t), null, "no second payout the same day");
  const next = at(2026, 11, 16, 9);
  assert.equal(canClaim(r.state, q("checkin"), next), false);
  s = recordCheckin(r.state, next);
  assert.equal(claim(s, "checkin", next).credits, 5);
});

test("a quest that is not done cannot be claimed", () => {
  const t = at(2026, 11, 15);
  assert.equal(claim(emptyState(), "arm", t), null);
  assert.equal(claim(recordArmed(emptyState(), t), "arm", t).credits, 6);
});

test("counted minutes bank into Income at the flat rate and keep the leftover", () => {
  const t = at(2026, 11, 15, 20);
  let s = emptyState();
  let earned = 0;
  for (let i = 0; i < 14; i++) { const r = addMinutes(s, 1, t); s = r.state; earned += r.credits; }
  assert.equal(earned, 2, "14 minutes at 1 per 6 make 2 Credits");
  assert.equal(s.minuteBank, 2);
  const longtime = { ...emptyState(), minutesTotal: 1500, tasksClaimed: 40 };
  assert.equal(addMinutes(longtime, 12, t).credits, 2, "a long history pays the same rate");
});

test("minutes add to the day, so Thirty on the clock completes at 30", () => {
  const t = at(2026, 11, 15, 20);
  let s = addMinutes(emptyState(), 29, t).state;
  assert.equal(canClaim(s, q("thirty"), t), false);
  s = addMinutes(s, 1, t).state;
  assert.equal(canClaim(s, q("thirty"), t), true);
});

test("a session under 60 seconds adds nothing; 45 minutes or more is a long watch", () => {
  const t = at(2026, 11, 15, 20);
  assert.equal(progress(recordSession(emptyState(), 59, t), q("longwatch"), t), 0);
  assert.equal(progress(recordSession(emptyState(), 44 * 60, t), q("longwatch"), t), 0);
  const long = recordSession(emptyState(), 45 * 60, t);
  assert.equal(progress(long, q("longwatch"), t), 1);
  assert.equal(canClaim(long, q("longwatch"), t), true, "open to everyone");
});

test("Weekly theme: 4 check-in days grant nothing, 5 grant one pick, once a week; the pick waits across weeks", () => {
  const mon = at(2026, 11, 9, 10);
  let s = emptyState();
  for (let d = 0; d < 4; d++) s = recordCheckin(s, new Date(mon.getTime() + day(d)));
  assert.equal(canClaim(s, q("weeklook"), new Date(mon.getTime() + day(3))), false);
  s = recordCheckin(s, new Date(mon.getTime() + day(4)));
  const sat = new Date(mon.getTime() + day(5));
  const r = claim(s, "weeklook", sat);
  assert.equal(r.credits, 0);
  assert.equal(r.state.looksWaiting, 1);
  assert.equal(claim(r.state, "weeklook", sat), null);
  const nextWeek = at(2026, 11, 17, 10);
  assert.equal(progress(r.state, q("weeklook"), nextWeek), 0);
  assert.equal(r.state.looksWaiting, 1);
  const used = takeLookPick(r.state);
  assert.equal(used.looksWaiting, 0);
  assert.equal(takeLookPick(used), null);
});

test("weekly and monthly quests add up across days", () => {
  const mon = at(2026, 11, 9, 12);
  let s = emptyState();
  s = addMinutes(s, 100, mon).state;
  s = addMinutes(s, 80, new Date(mon.getTime() + day(1))).state;
  for (let d = 0; d < 3; d++) s = recordArmed(s, new Date(mon.getTime() + day(d)));
  const wed = new Date(mon.getTime() + day(2));
  assert.equal(progress(s, q("threehour"), wed), 180);
  assert.equal(canClaim(s, q("threehour"), wed), true);
  assert.equal(progress(s, q("armed3"), wed), 3);
  assert.equal(progress(s, q("armed8"), wed), 3);
  assert.equal(progress(s, q("tenhour"), wed), 180);
  // A new week starts at zero.
  assert.equal(progress(s, q("threehour"), at(2026, 11, 16, 9)), 0);
});

test("Star a theme is open to everyone, pays 12 and unlocks nothing", () => {
  const t = at(2026, 11, 15);
  const s = recordOnce(emptyState(), "star");
  assert.ok(visibleQuests("once").some((x) => x.id === "star"));
  const r = claim(s, "star", t);
  assert.equal(r.credits, 12);
  assert.equal(r.state.looksWaiting, 0);
});

test("starters pay once, ever", () => {
  const s = recordOnce(emptyState(), "vault");
  const r = claim(s, "vault", at(2026, 11, 15));
  assert.equal(r.credits, 10);
  assert.equal(claim(r.state, "vault", at(2027, 3, 1)), null);
});

test("a saved value in the wrong shape starts fresh instead of throwing", () => {
  for (const bad of [null, 5, "x", {}, { v: 2 }, { v: 1, days: "no", claims: [], minutesTotal: -4 }]) {
    const s = cleanState(bad);
    assert.equal(s.minutesTotal, 0);
    assert.deepEqual(s.days, {});
  }
});

test("grantPick adds one looksWaiting and refuses at the cap", () => {
  assert.equal(LOOKS_WAITING_CAP, 5);
  let s = emptyState();
  for (let i = 0; i < LOOKS_WAITING_CAP; i++) {
    const next = grantPick(s);
    assert.ok(next);
    s = next;
  }
  assert.equal(s.looksWaiting, LOOKS_WAITING_CAP);
  assert.equal(grantPick(s), null);
});

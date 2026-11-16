// Checks src/state/checkinBoard.ts: the 7-day check-in board that pays Draw Tickets.
import test from "node:test";
import assert from "node:assert/strict";
import { BOARD_PRIZES, canClaimBoard, claimBoard, cleanBoard, emptyBoard, shownClaimed, spendBoardTickets } from "../../src/state/checkinBoard.ts";

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);

/** Claims on each of the given dates in order and returns the final state. */
function run(dates, s = emptyBoard()) {
  for (const d of dates) {
    const r = claimBoard(s, true, d);
    assert.ok(r, `claim on ${d.toDateString()}`);
    s = r.state;
  }
  return s;
}

test("a run pays 5 Regular Tickets (Days 1, 2, 4, 5, 6) and 5 Special Tickets (2 on Day 3, 3 on Day 7)", () => {
  assert.equal(BOARD_PRIZES.length, 7);
  const paid = [];
  let s = emptyBoard();
  for (let i = 0; i < 7; i++) {
    const r = claimBoard(s, true, at(2026, 11, 2 + i));
    paid.push([r.day, r.kind, r.count]);
    s = r.state;
  }
  assert.deepEqual(paid, [[1, "regular", 1], [2, "regular", 1], [3, "special", 2], [4, "regular", 1], [5, "regular", 1], [6, "regular", 1], [7, "special", 3]]);
  assert.deepEqual(s.tickets, { regular: 5, special: 5 });
});

test("a claim needs today's check-in", () => {
  assert.equal(claimBoard(emptyBoard(), false, at(2026, 11, 15)), null);
  assert.equal(canClaimBoard(emptyBoard(), true, at(2026, 11, 15)), true);
});

test("one box per local day, and the next opens at local midnight", () => {
  const s = run([at(2026, 11, 15, 9)]);
  assert.equal(claimBoard(s, true, at(2026, 11, 15, 23)), null);
  assert.ok(claimBoard(s, true, at(2026, 11, 16, 0)));
});

test("a missed day pauses the board, with no catch-up", () => {
  const s = run([at(2026, 11, 1), at(2026, 11, 5)]);
  assert.equal(s.claimed, 2);
  const r = claimBoard(s, true, at(2026, 11, 20));
  assert.equal(r.day, 3);
  assert.equal(claimBoard(r.state, true, at(2026, 11, 20)), null);
});

test("Day 7 shows claimed for the rest of that day, then the board restarts at Day 1", () => {
  const s = run(Array.from({ length: 7 }, (_, i) => at(2026, 11, 2 + i)));
  assert.equal(shownClaimed(s, at(2026, 11, 8, 23)), 7);
  assert.equal(canClaimBoard(s, true, at(2026, 11, 8, 23)), false);
  assert.equal(shownClaimed(s, at(2026, 11, 9)), 0);
  const r = claimBoard(s, true, at(2026, 11, 9));
  assert.equal(r.day, 1);
  assert.deepEqual([r.kind, r.count], ["regular", 1]);
  assert.deepEqual(r.state.tickets, { regular: 6, special: 5 });
});

test("setting the clock back cannot claim again", () => {
  const s = run([at(2026, 11, 15)]);
  assert.equal(claimBoard(s, true, at(2026, 11, 10)), null);
});

test("spending tickets needs enough of that kind held", () => {
  const s = { ...emptyBoard(), tickets: { regular: 3, special: 0 } };
  assert.deepEqual(spendBoardTickets(s, "regular", 1).tickets, { regular: 2, special: 0 });
  assert.equal(spendBoardTickets(s, "regular", 10), null);
  assert.equal(spendBoardTickets(s, "special", 1), null);
  assert.equal(spendBoardTickets(s, "regular", 0), null);
});

test("saved state is cleaned", () => {
  assert.deepEqual(cleanBoard(null), emptyBoard());
  assert.deepEqual(cleanBoard({ claimed: 99, lastDay: "nope", tickets: -4 }), { v: 1, claimed: 7, lastDay: null, tickets: { regular: 0, special: 0 } });
  assert.deepEqual(cleanBoard({ claimed: 3.7, lastDay: "2026-11-15", tickets: { regular: 2.5, special: "x" } }), { v: 1, claimed: 3, lastDay: "2026-11-15", tickets: { regular: 2, special: 0 } });
});

test("tickets saved before the Regular/Special split become Special Tickets", () => {
  assert.deepEqual(cleanBoard({ claimed: 1, lastDay: "2026-11-15", tickets: 8 }).tickets, { regular: 0, special: 8 });
});

test("each pack takes its ticket kind: defaults, and a release can change them", async () => {
  const { BUNDLED_CONTENT, ticketFor, regularExtraIds, validateContent, setContent, resetContent, getContent } = await import("../../src/state/gachaContent.ts");
  assert.deepEqual(["regular", "brand", "region"].map((p) => ticketFor(p)), ["regular", "special", "special"]);
  assert.deepEqual(regularExtraIds(), []);
  const release = { ...BUNDLED_CONTENT, packTickets: { brand: "regular" }, regularExtraIds: ["spotify-night"] };
  assert.equal(validateContent(release), true);
  assert.equal(setContent(release), true);
  assert.deepEqual(["regular", "brand", "region"].map((p) => ticketFor(p, getContent())), ["regular", "regular", "special"]);
  assert.deepEqual(regularExtraIds(getContent()), ["spotify-night"]);
  resetContent();
  assert.equal(validateContent({ ...BUNDLED_CONTENT, packTickets: { brand: "gold" } }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, packTickets: { mystery: "special" } }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, regularExtraIds: ["a", "a"] }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, regularExtraIds: "a" }), false);
});

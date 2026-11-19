// Checks src/state/newsRead.ts: what counts as unread on the News board.
import test from "node:test";
import assert from "node:assert/strict";
import { FIRST_RUN_WINDOW_MS, MAX_READ, cleanNewsRead, freshNewsRead, isUnread, markRead, unreadCount } from "../../src/state/newsRead.ts";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

test("a fresh install treats only the last few days as new", () => {
  const s = freshNewsRead(NOW);
  assert.equal(s.since, NOW - FIRST_RUN_WINDOW_MS);
  assert.equal(isUnread(s, "old", NOW - 10 * DAY), false);
  assert.equal(isUnread(s, "recent", NOW - DAY), true);
});

test("a notice with no date stays unread until read", () => {
  const s = freshNewsRead(NOW);
  assert.equal(isUnread(s, "release-4-notes"), true);
  assert.equal(isUnread(markRead(s, ["release-4-notes"]), "release-4-notes"), false);
});

test("markRead adds once and returns the same object when nothing changes", () => {
  const s = markRead(freshNewsRead(NOW), ["a", "a", "b"]);
  assert.deepEqual(s.read, ["a", "b"]);
  assert.equal(markRead(s, ["a"]), s);
  assert.equal(markRead(s, []), s);
});

test("the read list keeps only the newest marks", () => {
  let s = freshNewsRead(NOW);
  s = markRead(s, Array.from({ length: MAX_READ + 5 }, (_, i) => `id-${i}`));
  assert.equal(s.read.length, MAX_READ);
  assert.equal(s.read[0], "id-5");
  assert.equal(s.read.at(-1), `id-${MAX_READ + 4}`);
});

test("unreadCount counts stories and notices", () => {
  const s = markRead(freshNewsRead(NOW), ["seen"]);
  const items = [
    { id: "seen", publishedAt: NOW - DAY },
    { id: "new", publishedAt: NOW - DAY },
    { id: "ancient", publishedAt: NOW - 30 * DAY },
    { id: "notice" },
  ];
  assert.equal(unreadCount(s, items), 2);
});

test("cleanNewsRead repairs junk and keeps a valid state", () => {
  assert.deepEqual(cleanNewsRead(null, NOW), freshNewsRead(NOW));
  assert.deepEqual(cleanNewsRead("x", NOW), freshNewsRead(NOW));
  const kept = cleanNewsRead({ since: NOW - DAY, read: ["a", 3, "", "a", "b"] }, NOW);
  assert.deepEqual(kept, { v: 1, since: NOW - DAY, read: ["a", "b"] });
  // A `since` in the future (a clock that jumped back) is pulled to now so new stories still show.
  assert.equal(cleanNewsRead({ since: NOW + DAY, read: [] }, NOW).since, NOW);
});

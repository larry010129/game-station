import test from "node:test";
import assert from "node:assert/strict";
import { isUpcomingLeak, leakCopy, seasonNumberFromMeta } from "../../src/lib/leakSeason.ts";

test("season number comes from Counterwatch number, then the name", () => {
  assert.equal(seasonNumberFromMeta({ name: "A Grim Doctrine", number: 5 }), 5);
  assert.equal(seasonNumberFromMeta({ name: "Season 5", number: null }), 5);
  assert.equal(seasonNumberFromMeta({ name: "A Grim Doctrine", number: null }), null);
  assert.equal(seasonNumberFromMeta(null), null);
});

test("current season 5 keeps only later seasons and clear unreleased leaks", () => {
  const keep = (title, summary) => isUpcomingLeak({ title, summary }, 5);
  assert.equal(keep("Season 6 expected to start December 8", "Battle Pass timer, not a Blizzard date."), true);
  assert.equal(keep("6v6 Role Queue test in Competitive", "Tested for the first four weeks of Season 6."), true);
  assert.equal(keep("Hero 55 is the Omnic Detective", "Season 6 timing and role are unconfirmed."), true);
  assert.equal(keep("Hero reveal possible at OWCS World Finals", "Blizzard has not confirmed this."), true);
  assert.equal(keep("After Season 5, a new hero arrives", ""), true);
  assert.equal(keep("Unreleased support hero", "Still no name."), true);
  assert.equal(keep("Season 5 battle pass rewards", "Live now."), false);
  assert.equal(keep("S4 datamine recap", ""), false);
  assert.equal(keep("First balance patch aimed at 6v6", "A patch is planned. No hero changes yet."), false);
  assert.equal(keep("Omnic Detective teased by Blizzard", "Teased in February 2026. The hero will reveal clues about the 2027 story."), false);
  assert.equal(keep("Leaked 2026 roadmap of 10 new heroes", "An earlier leak. The leak is old."), false);
  assert.equal(keep("This season's new hero", ""), false);
  assert.equal(keep("Leak", ""), false);
  assert.equal(keep("Rumor", "Just a rumor."), false);
});

test("unknown current season hides anything that names a season", () => {
  assert.equal(isUpcomingLeak({ title: "Season 6 hero", summary: "" }, null), false);
  assert.equal(isUpcomingLeak({ title: "Next hero still unreleased", summary: "" }, null), true);
});

test("a tag is not the leak heading when the summary has the info", () => {
  assert.deepEqual(leakCopy({ title: "Leak", summary: "Season 6 starts in December." }), {
    title: "Season 6 starts in December.",
    detail: "",
  });
  assert.deepEqual(leakCopy({ title: "Season 7 map", summary: "A new escort map." }), {
    title: "Season 7 map",
    detail: "A new escort map.",
  });
  assert.deepEqual(leakCopy({ title: "Post title", summary: "u/someone" }), {
    title: "Post title",
    detail: "",
  });
});

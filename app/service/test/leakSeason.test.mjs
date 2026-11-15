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
  // A collab that leaked from encrypted files names no season but is clearly unreleased.
  assert.equal(keep("Fortnite x Overwatch wave 2: Kiriko skin plus a second female hero", "HYPEX and ShiinaBR found an encrypted Overwatch bundle in the Nov 13 Fortnite update files."), true);
  // Official news about what is coming (the next Spotlight, a hero trailer) is wanted next to the leaks.
  assert.equal(keep("Next Overwatch Spotlight set for February 2027", "BlizzCon 2026 coverage says the next Overwatch Spotlight is due in February 2027."), true);
  assert.equal(keep("Developers tease a new hero trailer and a '2027 story' cinematic", "An interview with the developers."), true);
  // Something scheduled for a year that has not started counts as upcoming (the year is passed in so the test does not age).
  const later = (title, summary) => isUpcomingLeak({ title, summary }, 5, 2026);
  assert.equal(later("Overwatch Spotlight 2027 set for February 2027", "The showcase is scheduled for the new year."), true);
  assert.equal(later("Omnic Detective teased by Blizzard", "Teased in February 2026. The hero will reveal clues about the 2027 story."), false);
  assert.equal(later("Overwatch Spotlight 2027 set for February 2027", "Blizzard said a new story and Season 1 follow after Reign of Talon concludes."), true);
  assert.equal(later("Season 4 recap", "Season 4 is over and the recap is due in 2026."), false);
  assert.equal(later("Patch recap", "Released and due in 2026 notes."), false);
  // An unconfirmed leak or rumor that names no season is kept (it is about something unreleased); a confirmed item still needs a cue.
  const tagged = (status, title, summary) => isUpcomingLeak({ title, summary, status }, 5, 2026);
  assert.equal(tagged("leak", "Developers let slip Hudson's name and Support-to-DPS switch", "An interview mentioned the new hero."), true);
  assert.equal(tagged("rumor", "Midtown map teaser shows a 'Hudson Investigations' card", "Fans think it hints at the next hero."), true);
  assert.equal(tagged("leak", "Fortnite x Overwatch collab reportedly delayed", "Not cancelled."), true);
  assert.equal(tagged("leak", "Old Mythic skin", "This leak is old and the skin is already out."), false);
  assert.equal(tagged("leak", "Season 4 map leak", "Season 4 is live."), false);
  assert.equal(tagged("confirmed", "Blizzard posts a recap", "A look back at last year."), false);
  assert.equal(keep("Hudson's abilities expected at the OWCS World Finals", "Blizzard says more will be shown."), true);
  // The search's own "upcoming" mark is believed, unless the text says it is already out.
  const marked = (upcoming, title, summary) => isUpcomingLeak({ title, summary, status: "confirmed", upcoming }, 5, 2026);
  assert.equal(marked(true, "Hudson heads the next story arc after Reign of Talon", "Blizzard confirmed the new arc."), true);
  assert.equal(marked(true, "Old skin", "This skin is already out."), false);
  assert.equal(marked(false, "Hudson heads the next story arc after Reign of Talon", "Blizzard confirmed the new arc."), false);
  // A roadmap of seasons that are already out stays hidden.
  assert.equal(keep("SkaVorah roadmap: Hashimoto-clan Damage hero, D.Mon Tank", "Listed a Season 3 hero, a Season 4 Tank and a Season 5 omnic detective."), false);
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

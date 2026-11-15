import test from "node:test";
import assert from "node:assert/strict";
import { downgradeSpeculative } from "../ai.mjs";

test("a confirmed item that calls itself a guess becomes a rumor; real confirmations stay", () => {
  const out = downgradeSpeculative([
    { title: "Midtown map teaser shows a 'Hudson Investigations' card", summary: "The Game Haus speculates that Blizzard shows more of Hudson. The umbrella idea is also its guess.", status: "confirmed" },
    { title: "Hudson confirmed as the Season 6 Damage hero", summary: "Blizzard announced him. His abilities have not been revealed.", status: "confirmed" },
    { title: "Hudson reportedly 'got the highest scores of any hero we tested'", summary: "Said in an interview.", status: "confirmed" },
    { title: "Fans think a skin is coming", summary: "Unofficial.", status: "leak" },
  ]);
  assert.deepEqual(out.map((i) => i.status), ["rumor", "confirmed", "rumor", "leak"]);
});

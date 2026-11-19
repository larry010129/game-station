// Checks src/state/perkWiki.ts: the Wiki's Skill tree section covers the whole tree and follows the player's taken nodes.
import test from "node:test";
import assert from "node:assert/strict";
import { buildPerkWiki, perkRank } from "../../src/state/perkWiki.ts";
import { CLASSES, NODES } from "../../src/state/perks.ts";

test("every node except Station Core and the class starts has an entry, plus the rules page and one page per class", () => {
  const all = buildPerkWiki([], []);
  const nodeIds = new Set(all.filter((e) => e.id.startsWith("perk:") && e.id !== "perk:rules").map((e) => e.id.slice(5)));
  const expected = NODES.filter((n) => n.type !== "start" && n.type !== "class").map((n) => n.id);
  assert.equal(nodeIds.size, expected.length);
  for (const id of expected) assert.ok(nodeIds.has(id), id);
  assert.equal(all.filter((e) => e.group === "Classes").length, CLASSES.length);
  assert.equal(all.filter((e) => e.id === "perk:rules").length, 1);
  assert.ok(all.every((e) => e.category === "perks"));
});

test("small nodes share a tile by name and effect; named nodes stand alone", () => {
  const all = buildPerkWiki([], []);
  const small = all.filter((e) => e.group === "Small nodes");
  assert.ok(small.length > 0 && small.every((e) => e.kindKey && e.kindName));
  assert.ok(all.filter((e) => e.group !== "Small nodes").every((e) => !e.kindKey));
});

test("taken nodes and starting classes count as collected", () => {
  const keystone = NODES.find((n) => n.type === "keystone");
  const cls = CLASSES[0];
  const all = buildPerkWiki([keystone.id], [`${cls.id}-class`]);
  assert.equal(all.find((e) => e.id === `perk:${keystone.id}`).owned, true);
  assert.equal(all.find((e) => e.id === `perk-class:${cls.id}`).owned, true);
  assert.equal(all.filter((e) => e.owned).length, 2);
});

test("a node whose effect the app does not apply is marked Not active yet", () => {
  const all = buildPerkWiki([], []);
  const notYet = all.filter((e) => e.status === "not-yet");
  assert.ok(notYet.length > 0);
  for (const e of notYet) assert.equal(e.facts.find(([k]) => k === "Works now")[1], "Not active yet");
});

test("sorting by kind puts the rules and classes first, small nodes last", () => {
  assert.ok(perkRank({ group: "How it works" }) > perkRank({ group: "Classes" }));
  assert.ok(perkRank({ group: "Classes" }) > perkRank({ group: "Keystones" }));
  assert.ok(perkRank({ group: "Keystones" }) > perkRank({ group: "Small nodes" }));
});

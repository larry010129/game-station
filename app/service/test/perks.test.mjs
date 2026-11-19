// Checks src/state/perks.ts and the generated tree in src/content/perkTreeData.ts: the tree's shape, points, taking
// paths, the two starting regions, the monthly reset, effects and the Income bonuses.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CLASSES,
  CORE_LINK,
  LIVE_STATS,
  MAX_STARTS,
  NODES,
  POINTS,
  START_ID,
  TREE,
  MAX_SQUARES,
  MAX_PENTAGONS,
  isPentagon,
  bandLocked,
  bandSixBranch,
  bandSixOwner,
  chosenBranch,
  neighbours,
  pentagonsHeld,
  activeNodes,
  extraLive,
  isSquare,
  squaresHeld,
  canReset,
  canTake,
  cleanPerks,
  effectsOf,
  emptyPerks,
  hourBonus,
  incomePct,
  nodeById,
  pathTo,
  percentBonus,
  pointsEarned,
  pointsLeft,
  pointsSpent,
  resetPerks,
  statTotals,
  takeNode,
} from "../../src/state/perks.ts";
import { pointsAtLevel, LAST_POINT_LEVEL } from "../../src/state/playerLevel.ts";

const NOV = new Date(2026, 10, 17, 12);
const DEC = new Date(2026, 11, 2, 12);
const LOTS = 150;

const ofType = (t) => NODES.filter((n) => n.type === t);
const firstIn = (region) => CORE_LINK[region];

test("the generated tree is whole: one core, eight classes each with a Season Key, links between known nodes, all reachable", () => {
  assert.equal(ofType("start").length, 1);
  assert.equal(CLASSES.length, 8);
  assert.equal(Object.keys(CORE_LINK).length, 8);
  const gates = ofType("gate");
  assert.equal(gates.length, 8);
  assert.deepEqual(new Set(gates.map((n) => n.region)), new Set(CLASSES.map((c) => c.id)));
  const ids = new Set(NODES.map((n) => n.id));
  assert.equal(ids.size, NODES.length, "ids are unique");
  for (const [a, b] of TREE.edges) assert.ok(ids.has(a) && ids.has(b), `edge ${a} ${b}`);
  for (const n of NODES) {
    assert.ok(n.type === "start" || n.type === "class" || isSquare(n) || isPentagon(n) ? n.cost === 0 : n.cost > 0, `${n.id} cost`);
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y));
  }
  const adj = new Map(NODES.map((n) => [n.id, []]));
  for (const [a, b] of TREE.edges) {
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  const seen = new Set([START_ID]);
  const q = [START_ID];
  while (q.length) for (const nb of adj.get(q.shift())) if (!seen.has(nb)) seen.add(nb), q.push(nb);
  assert.equal(seen.size, NODES.length);
});

test("every stat the app applies is on the tree", () => {
  const stats = new Set(NODES.map((n) => n.stat));
  for (const s of LIVE_STATS) assert.ok(stats.has(s), s);
});

test("points come from the player level: 4 to start, banded after, nothing past level 250; no ranks", () => {
  assert.equal(pointsEarned(1), 4);
  assert.equal(pointsEarned(0), 4, "a bad level still gets the start points");
  assert.equal(pointsEarned(2), 16);
  assert.equal(pointsEarned(100), 1092);
  assert.equal(pointsEarned(250), TREE.pacing.reachCost + 1, "level 250 covers what a player can take");
  assert.equal(pointsEarned(10_000), pointsEarned(300), "no other cap: points stop where the bands stop");
  assert.ok(!("perRank" in POINTS));
});

test("taking a node takes the shortest path to it and makes its class a starting region", () => {
  const first = firstIn("payroll");
  const second = nodeById(first) && TREE.edges.find(([a, b]) => (a === first || b === first) && a !== START_ID && b !== START_ID);
  const target = second[0] === first ? second[1] : second[0];
  const p = pathTo(emptyPerks(), target);
  assert.deepEqual(p.nodes, [first, target]);
  assert.equal(p.opens, "payroll");
  const s = takeNode(emptyPerks(), target, LOTS);
  assert.deepEqual(s.taken, [first, target]);
  assert.deepEqual(s.starts, ["payroll"]);
  assert.equal(pointsSpent(s), p.cost);
  assert.equal(canTake(s, target, LOTS), "owned");
});

test("too few points: nothing is taken", () => {
  const key = ofType("gate")[0];
  const p = pathTo(emptyPerks(), key.id);
  assert.ok(p.cost > 2);
  assert.equal(canTake(emptyPerks(), key.id, 2), "points");
  assert.equal(takeNode(emptyPerks(), key.id, 2).taken.length, 0);
});

test("after two starting regions the core's other links close", () => {
  let s = emptyPerks();
  s = takeNode(s, firstIn("payroll"), LOTS);
  s = takeNode(s, firstIn("pass"), LOTS);
  assert.deepEqual(s.starts, ["payroll", "pass"]);
  assert.equal(MAX_STARTS, 2);
  // The third class's first node can no longer be reached straight from the core.
  const p = pathTo(s, firstIn("loot"));
  assert.ok(p === null || p.nodes[0] !== firstIn("loot"), "no direct link");
  assert.ok(p === null || p.opens === null, "a third start never opens");
});

test("the Season Key opens Pass levels 46 to 60, and only one Key can be held", () => {
  assert.equal(effectsOf([]).passLevelCap, 45);
  const s = takeNode(emptyPerks(), ofType("gate").find((g) => g.region === "payroll").id, LOTS);
  assert.equal(effectsOf(s.taken).passLevelCap, 60);
  const other = ofType("gate").find((g) => g.region === "pass").id;
  assert.equal(canTake(s, other, LOTS), "key");
  assert.equal(takeNode(s, other, LOTS), s);
  // A save with two Keys (edited by hand) keeps the first.
  const two = cleanPerks({ ...s, taken: [...s.taken, ...pathTo(emptyPerks(), other).nodes], starts: [...s.starts, "pass"] });
  assert.equal(two.taken.filter((id) => nodeById(id).type === "gate").length, 1);
});

test("effects add up the live stats", () => {
  const pick = (stat) => NODES.find((n) => n.stat === stat);
  const ids = ["creditsPerHour", "playCreditPct", "questCreditPct", "allCreditPct", "passXpPct", "passCap"].map((s) => pick(s).id);
  const fx = effectsOf(ids);
  assert.equal(fx.creditsPerHour, pick("creditsPerHour").value);
  assert.equal(fx.playIncomePct, pick("playCreditPct").value);
  assert.equal(fx.questIncomePct, pick("questCreditPct").value);
  assert.equal(fx.allIncomePct, pick("allCreditPct").value);
  assert.equal(fx.passXpMult, 1 + pick("passXpPct").value / 100);
  assert.equal(fx.passCapBonus, pick("passCap").value);
  assert.equal(incomePct(fx, "play"), fx.allIncomePct + fx.playIncomePct);
  assert.equal(incomePct(fx, "quest"), fx.allIncomePct + fx.questIncomePct);
  assert.equal(incomePct(fx, "pass"), fx.allIncomePct);
});

test("points below what was spent: the newest nodes stop counting, oldest first stays", () => {
  const s = takeNode(emptyPerks(), ofType("gate")[0].id, LOTS);
  const spent = pointsSpent(s);
  assert.deepEqual(activeNodes(s, spent), s.taken);
  const fewer = activeNodes(s, spent - 1);
  assert.deepEqual(fewer, s.taken.slice(0, fewer.length));
  assert.ok(fewer.length < s.taken.length);
  assert.equal(pointsLeft(s, spent - 1), 0);
});

test("cleanPerks keeps only nodes joined to the core and real starts", () => {
  const good = takeNode(emptyPerks(), ofType("gate")[0].id, LOTS);
  assert.deepEqual(cleanPerks(JSON.parse(JSON.stringify(good))), good);
  assert.deepEqual(cleanPerks(null), emptyPerks());
  assert.deepEqual(cleanPerks([1, 2]), emptyPerks());
  // A far node with nothing leading to it, a made-up id and a third start are dropped.
  const far = ofType("keystone")[0].id;
  const junk = cleanPerks({ taken: [far, "nope", ...good.taken], starts: [...good.starts, "loot", "rig"], resetMonth: "bad" });
  assert.deepEqual(junk.taken, good.taken);
  assert.deepEqual(junk.starts, good.starts);
  assert.equal(junk.resetMonth, null);
  // A start whose first node is not taken is not a start, and its nodes fall away with it.
  const noEntry = cleanPerks({ taken: good.taken.slice(2), starts: good.starts });
  assert.deepEqual(noEntry, emptyPerks());
  // A save from before the class nodes (its start began at the first spoke node) gets the class node put back.
  const old = cleanPerks({ taken: good.taken.slice(1), starts: good.starts });
  assert.deepEqual(old.taken, good.taken);
});

test("one free reset a month gives every point and both starts back", () => {
  const s = takeNode(emptyPerks(), ofType("gate")[0].id, LOTS);
  assert.ok(canReset(s, NOV));
  const r = resetPerks(s, NOV);
  assert.deepEqual(r.taken, []);
  assert.deepEqual(r.starts, []);
  assert.equal(r.resetMonth, "2026-11");
  const again = takeNode(r, ofType("gate")[0].id, LOTS);
  assert.ok(!canReset(again, NOV));
  assert.equal(resetPerks(again, NOV), again);
  assert.ok(canReset(again, DEC));
  assert.ok(!canReset(emptyPerks(), NOV), "nothing to reset");
});

test("hour bonus pays for each whole counted hour crossed", () => {
  assert.equal(hourBonus(50, 70, 2), 2);
  assert.equal(hourBonus(0, 59, 2), 0);
  assert.equal(hourBonus(110, 250, 1), 3);
  assert.equal(hourBonus(70, 50, 2), 0);
  assert.equal(hourBonus(0, 600, 0), 0);
});

test("percent bonuses carry their fraction so small payments add up", () => {
  let carry = 0;
  let paid = 0;
  for (let i = 0; i < 100; i++) {
    const r = percentBonus(1, 3, carry);
    paid += r.bonus;
    carry = r.carry;
  }
  assert.equal(paid, 3);
  assert.deepEqual(percentBonus(200, 5, 0), { bonus: 10, carry: 0 });
  assert.equal(percentBonus(0, 5, 0.5).bonus, 0);
  assert.equal(percentBonus(10, 0, 0.5).bonus, 0);
});

test("squares: every class has a Season Key and eleven Specials, all free", () => {
  const squares = NODES.filter((n) => isSquare(n));
  assert.equal(squares.length, 96);
  for (const c of CLASSES) {
    assert.equal(squares.filter((n) => n.region === c.id && n.type === "gate").length, 1, `${c.id} key`);
    assert.equal(squares.filter((n) => n.region === c.id && n.type === "special").length, 11, `${c.id} specials`);
  }
  assert.ok(squares.every((n) => n.cost === 0));
  assert.equal(MAX_SQUARES, 8);
});

test("pentagons: five per class, free, and a player holds at most three", () => {
  const pents = NODES.filter((n) => isPentagon(n));
  assert.equal(pents.length, 40);
  for (const c of CLASSES) assert.equal(pents.filter((n) => n.region === c.id).length, 5, `${c.id} pentagons`);
  assert.ok(pents.every((n) => n.cost === 0));
  assert.equal(MAX_PENTAGONS, 3);
  let s = emptyPerks();
  for (const n of pents.filter((n) => n.region === "payroll").slice(0, 3)) s = takeNode(s, n.id, 100_000);
  assert.equal(pentagonsHeld(s), 3);
  const fourth = pents.find((n) => n.region === "payroll" && !s.taken.includes(n.id));
  assert.equal(canTake(s, fourth.id, 100_000), "pentagons");
  const cleaned = cleanPerks({ ...s, taken: [...s.taken, ...pathTo(s, fourth.id).nodes] });
  assert.equal(pentagonsHeld(cleaned), 3);
});

test("each class's Season Key opens levels 46 to 60 and has its own extra", () => {
  const keys = ofType("gate");
  assert.equal(new Set(keys.map((k) => k.name)).size, 8, "eight different names");
  for (const k of keys) {
    assert.equal(k.stat, "passLevelCap");
    assert.ok(k.stat2 && k.value2 > 0, `${k.id} extra`);
  }
  const payroll = keys.find((k) => k.region === "payroll");
  const quests = keys.find((k) => k.region === "quests");
  const fx = effectsOf([payroll.id, quests.id]);
  assert.equal(fx.passLevelCap, 60, "two Keys still open 46 to 60 once");
  assert.equal(fx.creditsPerHour, payroll.value2);
  assert.equal(fx.questIncomePct, quests.value2);
  assert.ok(extraLive(payroll));
  assert.ok(!extraLive(keys.find((k) => k.region === "rig")), "the Gearhead Key's extra is not applied yet");
});

test("a player holds at most eight squares; a ninth is refused, and cleanPerks drops extras", () => {
  const squares = NODES.filter((n) => isSquare(n) && (n.region === "payroll" || n.region === "pass"));
  let s = emptyPerks();
  for (const n of squares.slice(0, 8)) s = takeNode(s, n.id, 100_000);
  assert.equal(squaresHeld(s), 8);
  const seventh = squares[8];
  assert.equal(canTake(s, seventh.id, 100_000), "squares");
  assert.equal(takeNode(s, seventh.id, 100_000), s);
  // A save with too many squares (edited by hand) keeps the first eight.
  const path = pathTo(s, seventh.id);
  const cleaned = cleanPerks({ ...s, taken: [...s.taken, ...path.nodes] });
  assert.equal(squaresHeld(cleaned), 8);
  assert.ok(!cleaned.taken.includes(seventh.id));
});

test("player level pacing keeps the decided timing for this tree: one full class in a month at 8 h a day", () => {
  const pc = TREE.pacing;
  const r = pc.rules;
  // The costs are this tree's real costs.
  assert.equal(pc.treeCost, NODES.reduce((n, x) => n + x.cost, 0));
  const classCost = Math.max(...CLASSES.map((c) => NODES.filter((n) => n.id.startsWith(c.id + "-")).reduce((n, x) => n + x.cost, 0)));
  assert.equal(pc.classCost, classCost);
  // Hours to the first full class, from the quick levels and the flat XP per level.
  const levelFor = (pts) => 1 + Math.ceil(Math.max(0, pts - r.start_points) / r.points_per_level);
  const hoursTo = (L) => Math.min(L - 1, r.quick_levels) * (r.quick_minutes / 60) + Math.max(0, L - 1 - r.quick_levels) * (pc.flatXp / r.xp_per_minute / 60);
  const weeks = hoursTo(levelFor(pc.classCost)) / r.ref_hours_per_week;
  assert.ok(Math.abs(weeks - 52.18 / 12) < 0.1, `first class in ${weeks.toFixed(2)} weeks, not a month`);
  // Max level gives enough points for everything a player can take (every class to band III, bands IV and V in 2).
  assert.ok(r.start_points + (pc.maxLevel - 1) * r.points_per_level >= pc.reachCost, "max level covers what a player can take");
  assert.ok(pc.reachCost < pc.treeCost, "a player cannot take the whole tree");
  assert.equal(pc.treeLevel, levelFor(pc.reachCost));
  assert.equal(pc.treeLevel, 250, "everything a player can take is paid for at level 250");
});


test("bands IV and V open only in a class you started in", () => {
  const BIG = 1_000_000;
  assert.equal(pathTo(emptyPerks(), "payroll-b4-gkey"), null, "no start yet: band IV is shut");
  let s = takeNode(emptyPerks(), CORE_LINK.payroll, BIG);
  s = takeNode(s, CORE_LINK.pass, BIG);
  assert.deepEqual(s.starts, ["payroll", "pass"]);
  assert.equal(canTake(s, "payroll-b4-gkey", BIG), "ok");
  assert.equal(canTake(s, "payroll-b5-gkey", BIG), "ok");
  assert.equal(canTake(s, "rig-b3-gkey", BIG), "ok", "band III of another class stays open over the bridges");
  assert.equal(canTake(s, "rig-b4-gkey", BIG), "closed");
  assert.ok(bandLocked(s.starts, "rig-b5-gkey"));
  // No path may cut through a locked band either.
  const p = pathTo(s, "rig-b3-gkey");
  assert.ok(p.nodes.every((id) => !bandLocked(s.starts, id)));
  // A hand-edited save cannot hold a locked node.
  const cleaned = cleanPerks({ ...s, taken: [...s.taken, ...pathTo({ ...s, starts: ["payroll", "rig"] }, "rig-b4-gkey")?.nodes ?? []] });
  assert.ok(cleaned.taken.every((id) => !bandLocked(cleaned.starts, id)));
});

test("trade-off notables: a smaller downside on a different theme, only on notables, never on rules", () => {
  const trades = NODES.filter((n) => (n.value2 ?? 0) < 0);
  assert.ok(trades.length >= 80, `${trades.length} trade-off notables`);
  const theme = (stat) => (/pass/i.test(stat) ? "pass" : /fragment/i.test(stat) ? "fragments" : /ticket/i.test(stat) ? "tickets" : "income");
  for (const n of trades) {
    assert.equal(n.type, "notable", `${n.id} is not a notable`);
    assert.match(n.effect, /, −\d+(%| ).+/, `${n.id} names its downside`);
    assert.ok(!n.stat2.startsWith("key") && !n.stat2.startsWith("pent"), `${n.id} downside is a number, not a rule`);
    // The downside is on another theme than the gain, so a node never gives Income and takes Income of the same kind.
    assert.notEqual(n.stat2, n.stat, `${n.id} takes from its own gain`);
    // Smaller than the gain when both are percentages.
    if (/Pct$/.test(n.stat) && /Pct$/.test(n.stat2)) assert.ok(-n.value2 < n.value, `${n.id}: downside ${n.value2} is not smaller than ${n.value}`);
  }
  // About a third of the notables.
  const notables = NODES.filter((n) => n.type === "notable").length;
  assert.ok(trades.length / notables > 0.25 && trades.length / notables < 0.45);
  // Small circles, squares and pentagons stay plus only.
  assert.ok(NODES.filter((n) => n.type !== "notable" && (n.value2 ?? 0) < 0).length === 0);
});

test("a downside only counts while its gain is in force, and totals never drop below base", () => {
  // Long Haul gives +% Income from long sessions (not in the app yet) and takes 5% Income from quests.
  const node = nodeById("payroll-notB");
  assert.ok(node && node.value2 < 0 && !LIVE_STATS.has(node.stat));
  assert.equal(statTotals([node.id])[node.stat2], undefined, "the downside waits for its gain");
  assert.equal(effectsOf([node.id]).questIncomePct, 0);
  // Every total from effectsOf is at base or above, even with nothing taken.
  const fx = effectsOf([]);
  for (const k of ["creditsPerHour", "playIncomePct", "questIncomePct", "allIncomePct", "passCapBonus"]) assert.ok(fx[k] >= 0);
  assert.ok(fx.passXpMult >= 1);
});

test("band VI: three paths per class, each ending on its own keystone; one path and one class only", () => {
  const BIG = 1_000_000;
  // A path's nodes from the band V keystone outward: small nodes, its one mid notable, then its own keystone.
  const pathOf = (cid, b) => NODES.filter((n) => bandSixBranch(n.id) === b && n.id.startsWith(`${cid}-b6-`)).sort((x, y) => x.step - y.step);
  const costs = new Set();
  for (const c of CLASSES) {
    const six = NODES.filter((n) => n.id.startsWith(`${c.id}-b6-`));
    assert.equal(six.filter((n) => n.type === "notable").length, 6, `${c.id}: each path has an opening notable and a mid`);
    assert.equal(six.filter((n) => n.type === "keystone").length, 3);
    for (const b of ["a", "b", "c"]) {
      // 8 nodes along the class's constellation, from the band V keystone to the path's keystone at its end.
      const chain = pathOf(c.id, b);
      assert.equal(chain.length, 8, `${c.id} path ${b}: an opening notable, 5 small, its mid and its keystone`);
      assert.equal(chain.filter((n) => n.type === "notable").length, 2);
      assert.equal(chain[0].type, "notable", "every band VI path opens on a notable");
      assert.ok(chain[0].passive && chain[0].passive.length > 5, `${chain[0].id} has a passive`);
      assert.equal(chain.at(-1).id, `${c.id}-b6-${b}k`);
      assert.equal(chain.at(-1).type, "keystone");
      assert.match(chain.at(-1).name, /^VI●\S/, "a band VI keystone is named VI●name");
      assert.ok(neighbours(`${c.id}-b5-gkey`).includes(chain[0].id));
      for (let k = 1; k < chain.length; k++) assert.ok(neighbours(chain[k - 1].id).includes(chain[k].id));
      assert.equal(neighbours(chain.at(-1).id).length, 1, "a path's keystone is its end");
      costs.add(chain.reduce((n, x) => n + x.cost, 0));
    }
    // Each path's small nodes share one name and stat, and the three paths differ.
    const smalls = ["a", "b", "c"].map((b) => pathOf(c.id, b).filter((n) => n.type === "small"));
    for (const list of smalls) assert.equal(new Set(list.map((n) => `${n.name}|${n.stat}`)).size, 1);
    assert.equal(new Set(smalls.map((l) => l[0].name)).size, 3, `${c.id}: each band VI path has its own small nodes`);
    assert.equal(new Set(smalls.map((l) => l[0].stat)).size, 3);
    // The three mids and the three keystones are all different: own name and own rule.
    const mids = ["a", "b", "c"].map((b) => nodeById(`${c.id}-b6-${b}m`));
    const keys = ["a", "b", "c"].map((b) => nodeById(`${c.id}-b6-${b}k`));
    assert.equal(new Set(mids.map((n) => n.name)).size, 3);
    assert.equal(new Set(mids.map((n) => n.stat)).size, 3);
    assert.equal(new Set(keys.map((n) => n.name)).size, 3);
    assert.equal(new Set(keys.map((n) => n.stat)).size, 3);
    for (const n of mids) {
      assert.ok(n.stat2 && n.value2 < 0, `${n.id} has a downside`);
      assert.match(n.effect, /, −\d+% .+/, `${n.id} names its downside`);
      assert.ok(n.passive && n.passive.length > 5, `${n.id} has a passive`);
    }
  }
  assert.deepEqual([...costs], [12], "every band VI path costs the same: opening notable 2 + 5 small + mid 2 + keystone 3");
  // The levels after 250 pay for the dearest path.
  assert.equal(pointsAtLevel(LAST_POINT_LEVEL) - pointsAtLevel(250), Math.max(...costs));
  assert.equal(bandSixBranch("payroll-b6-a1"), "a");
  assert.equal(bandSixBranch("payroll-b6-ck"), "c");
  assert.equal(bandSixBranch("payroll-b5-gkey"), null);
  // No start, no band VI.
  assert.equal(pathTo(emptyPerks(), "payroll-b6-ak"), null);
  let s = takeNode(emptyPerks(), CORE_LINK.payroll, BIG);
  s = takeNode(s, CORE_LINK.pass, BIG);
  assert.equal(bandSixOwner(s.taken), null);
  assert.equal(chosenBranch(s.taken), null);
  assert.equal(canTake(s, "pass-b6-a1", BIG), "ok", "band VI is open before any band VI is started");
  // Take Tycoon's path b to its keystone.
  const withB = takeNode(s, "payroll-b6-bk", BIG);
  assert.ok(pathOf("payroll", "b").every((n) => withB.taken.includes(n.id)));
  assert.equal(bandSixOwner(withB.taken), "payroll");
  assert.equal(chosenBranch(withB.taken), "b");
  // The other two paths and their keystones are closed; the other class's band VI is closed whole.
  for (const id of ["payroll-b6-a1", "payroll-b6-am", "payroll-b6-ak", "payroll-b6-ck"]) assert.equal(canTake(withB, id, BIG), "closed", id);
  assert.ok(bandLocked(withB.starts, "payroll-b6-am", withB.taken));
  assert.ok(!bandLocked(withB.starts, "payroll-b6-bm", withB.taken));
  assert.equal(canTake(withB, "pass-b6-a1", BIG), "closed");
  assert.ok(pathTo(withB, "pass-b6-ak") === null);
  assert.equal(canTake(withB, "pass-b5-gkey", BIG), "ok", "bands IV and V of the other class stay open");
  // A hand-edited save cannot hold two paths or two classes: the first one taken wins.
  const edited = cleanPerks({ ...withB, taken: [...withB.taken, "payroll-b6-a1", "pass-b6-a1"] });
  assert.ok(!edited.taken.includes("payroll-b6-a1") && !edited.taken.includes("pass-b6-a1"));
  assert.ok(edited.taken.includes("payroll-b6-bk"));
});

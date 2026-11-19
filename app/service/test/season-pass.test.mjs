// Checks src/state/seasonPass.ts: seasons, XP from the quest totals, the weekly cap, levels and claims.
import test from "node:test";
import assert from "node:assert/strict";
import {
  LEVELS,
  MAX_XP,
  PASS_LEVELS,
  SEASON_DAYS,
  WEEKLY_CAP,
  XP_PER_MINUTE,
  XP_PER_LEVEL,
  BASE_LEVEL_CAP,
  openLevelCap,
  XP_PER_TASK,
  canClaim,
  claimable,
  cleanPass,
  emptyPass,
  lifetimeLevels,
  levelOf,
  markClaimed,
  seasonAt,
  syncPass,
  timeLeft,
} from "../../src/state/seasonPass.ts";
import { weekKey } from "../../src/state/questEngine.ts";
import { getContent } from "../../src/state/gachaContent.ts";
import { cardSkinById } from "../../src/state/cardSkins.ts";

const day = (y, m, d, h = 12) => new Date(y, m, d, h);
const NOW = day(2026, 10, 17);
const base = () => syncPass(emptyPass(seasonAt(NOW).number, weekKey(NOW)), { minutesTotal: 100, tasksClaimed: 4 }, NOW);

test("seasons run SEASON_DAYS from the anchor", () => {
  const s1 = seasonAt(day(2026, 10, 2, 0));
  assert.equal(s1.number, 1);
  assert.equal(seasonAt(NOW).number, 1);
  const s2 = seasonAt(new Date(s1.start.getFullYear(), s1.start.getMonth(), s1.start.getDate() + SEASON_DAYS, 1));
  assert.equal(s2.number, 2);
  assert.equal(s1.end.getTime(), s2.start.getTime());
  assert.equal(timeLeft(day(2027, 0, 31, 0), s1.end), "1 d 0 h");
  assert.equal(timeLeft(s1.end, s1.end), "0 m");
});

test("the first sync only records the totals", () => {
  const s = base();
  assert.equal(s.xp, 0);
  assert.deepEqual(s.last, { minutesTotal: 100, tasksClaimed: 4 });
});

test("XP comes from new minutes and tasks, and nothing changes without them", () => {
  const s = syncPass(base(), { minutesTotal: 130, tasksClaimed: 6 }, NOW);
  assert.equal(s.xp, 30 * XP_PER_MINUTE + 2 * XP_PER_TASK);
  assert.equal(syncPass(s, { minutesTotal: 130, tasksClaimed: 6 }, NOW), s);
  // Totals that go down (a restored backup) give nothing and do not go negative.
  assert.equal(syncPass(s, { minutesTotal: 10, tasksClaimed: 0 }, NOW).xp, s.xp);
});

test("the weekly cap holds within a week and resets the next", () => {
  const capped = syncPass(base(), { minutesTotal: 100 + 2000, tasksClaimed: 4 }, NOW);
  assert.equal(capped.xp, WEEKLY_CAP);
  assert.equal(syncPass(capped, { minutesTotal: 2200, tasksClaimed: 5 }, NOW).xp, WEEKLY_CAP);
  const nextWeek = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 7, 12);
  const s = syncPass(capped, { minutesTotal: 2110, tasksClaimed: 4 }, nextWeek);
  assert.equal(s.xp, WEEKLY_CAP + 10 * XP_PER_MINUTE);
  assert.equal(s.weekXp, 10 * XP_PER_MINUTE);
});

test("XP stops at the last level once the perk opens it", () => {
  let s = { ...base(), xp: MAX_XP - 50 };
  s = syncPass(s, { minutesTotal: 200, tasksClaimed: 4 }, NOW, { levelCap: LEVELS });
  assert.equal(s.xp, MAX_XP);
  assert.equal(levelOf(s.xp).level, LEVELS);
});

test("a new season starts over", () => {
  const s = { ...syncPass(base(), { minutesTotal: 400, tasksClaimed: 4 }, NOW), claimed: { free: [1], patron: [] } };
  const later = new Date(2027, 1, 10, 12);
  const next = syncPass(s, { minutesTotal: 500, tasksClaimed: 9 }, later);
  assert.equal(next.season, 2);
  assert.equal(next.xp, 0);
  assert.deepEqual(next.claimed, { free: [], patron: [] });
  assert.deepEqual(next.last, { minutesTotal: 500, tasksClaimed: 9 });
});

test("claims: reached levels only, Patreon row only for patrons, once each", () => {
  const s = { ...base(), xp: 2 * XP_PER_LEVEL + XP_PER_LEVEL / 2 };
  assert.equal(levelOf(s.xp).level, 2);
  assert.equal(canClaim(s, 2, "free", false), true);
  assert.equal(canClaim(s, 3, "free", false), false);
  assert.equal(canClaim(s, 1, "patron", false), false);
  assert.equal(canClaim(s, 1, "patron", true), true);
  assert.equal(claimable(s, false).length, 2);
  assert.equal(claimable(s, true).length, 4);
  const c = markClaimed(s, 1, "free");
  assert.equal(canClaim(c, 1, "free", false), false);
  assert.equal(markClaimed(c, 1, "free"), c);
});

test("every level has two rewards and Patreon rewards are never Credits or Tickets", () => {
  assert.equal(PASS_LEVELS.length, LEVELS);
  for (const l of PASS_LEVELS) {
    assert.ok(!["credits", "ticket"].includes(l.patron.kind), `level ${l.level}`);
    assert.ok(["credits", "ticket"].includes(l.free.kind), `level ${l.level}`);
  }
  assert.equal(PASS_LEVELS.at(-1).patron.kind, "skin");
});

test("cleanPass repairs junk", () => {
  const s = cleanPass({ season: 1, xp: 99999999, claimed: { free: [1, 1, 0, 99, "x"] }, last: { minutesTotal: 5 } }, NOW);
  assert.equal(s.xp, MAX_XP);
  assert.deepEqual(s.claimed, { free: [1], patron: [] });
  assert.deepEqual(s.last, { minutesTotal: 5, tasksClaimed: 0 });
  assert.equal(cleanPass(null, NOW).last, null);
});

test("every Patreon reward is a real item or skin, and one-time items are never given twice", () => {
  const items = new Map(getContent().items.map((i) => [i.id, i]));
  const seen = new Set();
  for (const l of PASS_LEVELS) {
    const r = l.patron;
    if (r.kind === "skin") {
      assert.ok(cardSkinById(r.id), `skin ${r.id}`);
      continue;
    }
    const def = items.get(r.id);
    assert.ok(def, `level ${l.level}: ${r.id} is not an item`);
    if (!def.stackable) {
      assert.ok(!seen.has(r.id), `level ${l.level}: ${r.id} given twice`);
      seen.add(r.id);
    }
  }
});

test("a new season banks the levels reached, for the lifetime count", () => {
  const s = { ...base(), xp: 7 * XP_PER_LEVEL + 300, banked: 4 };
  assert.equal(lifetimeLevels(s), 11);
  const next = syncPass(s, { minutesTotal: 100, tasksClaimed: 4 }, new Date(2027, 1, 10, 12));
  assert.equal(next.banked, 11);
  assert.equal(lifetimeLevels(next), 11);
  assert.equal(cleanPass(next, new Date(2027, 1, 10, 12)).banked, 11);
});

test("perk mods raise XP and the weekly cap", () => {
  const s = syncPass(base(), { minutesTotal: 110, tasksClaimed: 4 }, NOW, { xpMult: 1.2 });
  assert.equal(s.xp, Math.floor(10 * XP_PER_MINUTE * 1.2));
  const capped = syncPass(base(), { minutesTotal: 100 + 5000, tasksClaimed: 4 }, NOW, { capBonus: 2000 });
  assert.equal(capped.xp, WEEKLY_CAP + 2000);
  // A multiplier under 1 is ignored.
  assert.equal(syncPass(base(), { minutesTotal: 110, tasksClaimed: 4 }, NOW, { xpMult: 0.1 }).xp, 10 * XP_PER_MINUTE);
});

test("the pass stops at level 45 until a Season Key opens 46 to 60", () => {
  assert.equal(LEVELS, 60);
  assert.equal(BASE_LEVEL_CAP, 45);
  assert.equal(openLevelCap(), 45);
  assert.equal(openLevelCap({ levelCap: 60 }), 60);
  assert.equal(openLevelCap({ levelCap: 999 }), LEVELS);
  const near = { ...base(), xp: BASE_LEVEL_CAP * XP_PER_LEVEL - 100 };
  const capped = syncPass(near, { minutesTotal: 200, tasksClaimed: 4 }, NOW);
  assert.equal(capped.xp, BASE_LEVEL_CAP * XP_PER_LEVEL, "XP stops at the cap");
  assert.equal(levelOf(capped.xp).level, 45);
  assert.equal(capped.weekXp, 100, "only the XP actually earned counts toward the week");
  // More play while capped earns nothing and is not saved up for later.
  const still = syncPass(capped, { minutesTotal: 260, tasksClaimed: 4 }, NOW);
  assert.equal(still.xp, capped.xp);
  // With the perk, play earns again from level 45.
  const open = syncPass(still, { minutesTotal: 300, tasksClaimed: 4 }, NOW, { levelCap: 60 });
  assert.equal(open.xp, capped.xp + 40 * XP_PER_MINUTE);
});

test("all 60 levels take 8 to 10 weeks at the weekly cap, with no boosts", () => {
  const weeks = (LEVELS * XP_PER_LEVEL) / WEEKLY_CAP;
  assert.ok(weeks >= 8 && weeks <= 10, `${weeks} weeks`);
  assert.ok(SEASON_DAYS / 7 >= weeks, "the season is long enough");
});

test("rewards: card skins at 30, 45 and 60, and three Special Tickets at the end", () => {
  const skins = PASS_LEVELS.filter((l) => l.patron.kind === "skin").map((l) => l.level);
  assert.deepEqual(skins, [30, 45, 60]);
  assert.deepEqual(PASS_LEVELS.at(-1).free, { kind: "ticket", ticket: "special", n: 3 });
});

// Checks the Card Pack (src/state/cardEngine.ts) and the CMS check-in window (gachaContent.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { applyCardResults, cardOddsRows, cardPriceOf, cardsExhausted, drawCards } from "../../src/state/cardEngine.ts";
import { CARD_SKINS } from "../../src/state/cardSkins.ts";
import {
  BUNDLED_CARD_PACK,
  BUNDLED_CONTENT,
  checkinOpen,
  drawableSkins,
  resetContent,
  setContent,
  validateContent,
} from "../../src/state/gachaContent.ts";
import { cleanGacha, crystalValueFor, emptyGacha, isRainbowResult } from "../../src/state/gachaEngine.ts";

function seq(values) {
  let i = 0;
  return () => values[i++ % values.length];
}
const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const withCards = (patch) => ({ ...BUNDLED_CONTENT, cardPack: { ...BUNDLED_CARD_PACK, ...patch } });

test.afterEach(() => resetContent());

test("bundled Card Pack: 12 four-star and 6 five-star skins, odds sum to 100%, 120 / 1080 Credits", () => {
  assert.equal(drawableSkins(4).length, 12);
  assert.equal(drawableSkins(5).length, 6);
  assert.equal(cardOddsRows().reduce((s, r) => s + r.chance, 0), 100);
  assert.equal(cardPriceOf(1), 120);
  assert.equal(cardPriceOf(10), 1080);
  assert.equal(cardPriceOf(3), null);
  assert.equal(CARD_SKINS.length, 18);
});

test("a 4-star-or-better skin comes at least every 10 draws", () => {
  const rand = lcg(7);
  let pity = { four: 0, five: 0 };
  let since = 0;
  for (let i = 0; i < 2000; i++) {
    const { results, pity: p } = drawCards(1, { skins: [], items: [] }, pity, rand);
    pity = p;
    since = results[0].kind === "card" ? 0 : since + 1;
    assert.ok(since < 10, `went ${since} draws without a skin`);
  }
});

test("a 5-star skin is forced on the 70th draw since the last one, and prefers a skin not owned", () => {
  const owned = drawableSkins(5).slice(1);
  const { results, pity } = drawCards(1, { skins: owned, items: [] }, { four: 0, five: 69 }, seq([0.99]));
  assert.equal(results[0].kind, "card");
  assert.equal(results[0].stars, 5);
  assert.equal(results[0].id, drawableSkins(5)[0]);
  assert.equal(results[0].repeat, false);
  assert.deepEqual(pity, { four: 0, five: 0 });
  assert.equal(isRainbowResult(results[0]), true);
});

test("a 4-star skin resets only the 4-star counter; anything else moves both", () => {
  const four = drawCards(1, { skins: [], items: [] }, { four: 3, five: 12 }, seq([0.05, 0]));
  assert.equal(four.results[0].stars, 4);
  assert.deepEqual(four.pity, { four: 0, five: 13 });
  const item = drawCards(1, { skins: [], items: [] }, { four: 3, five: 12 }, seq([0.9, 0, 0]));
  assert.equal(item.results[0].kind, "item");
  assert.deepEqual(item.pity, { four: 4, five: 13 });
});

test("repeat skins pay Regular crystals (2 for 4-star, 5 for 5-star) and card pity is saved", () => {
  const all = [...drawableSkins(4), ...drawableSkins(5)];
  const { results, pity } = drawCards(10, { skins: all, items: [] }, { four: 0, five: 0 }, lcg(3));
  const state = applyCardResults(emptyGacha(), results, pity);
  const want = results.reduce((s, r) => s + crystalValueFor(r), 0);
  assert.equal(state.crystals, want);
  assert.equal(state.prisms, 0);
  assert.equal(state.draws, 10);
  assert.deepEqual(state.cardPity, pity);
  assert.equal(crystalValueFor({ kind: "card", id: "holo-foil", stars: 5, repeat: true }), 5);
  assert.equal(crystalValueFor({ kind: "card", id: "blueprint", stars: 4, repeat: true }), 2);
  assert.deepEqual(cleanGacha({ cardPity: { four: 4, five: "x" } }).cardPity, { four: 4, five: 0 });
});

test("Hidden skins never drop; with no 5-star skin on, there is no 5-star row or guarantee", () => {
  const skins = BUNDLED_CARD_PACK.skins.map((s) => (s.stars === 5 ? { ...s, status: "Hidden" } : s));
  assert.equal(setContent(withCards({ skins })), true);
  const { results } = drawCards(200, { skins: [], items: [] }, { four: 0, five: 69 }, lcg(11));
  assert.ok(results.every((r) => r.kind !== "card" || r.stars === 4));
});

test("the pack is exhausted when switched off, or when every skin and one-time item is owned", () => {
  assert.equal(cardsExhausted({ skins: [], items: [] }), false);
  assert.equal(setContent(withCards({ enabled: false })), true);
  assert.equal(cardsExhausted({ skins: [], items: [] }), true);
  assert.equal(cardPriceOf(1), null);
});

test("releases: a bad Card Pack or check-in window is refused; older releases without them still load", () => {
  assert.equal(validateContent({ ...BUNDLED_CONTENT }), true);
  assert.equal(validateContent(withCards({ weights: { five: 0.5, four: 0.1, better: 0.1, common: 0.1 } })), false);
  assert.equal(validateContent(withCards({ ticket: "gold" })), false);
  assert.equal(validateContent(withCards({ skins: [{ id: "x", stars: 3, status: "Available" }] })), false);
  // Unknown skin ids are allowed in a release (a newer CMS) and ignored by this app.
  assert.equal(validateContent(withCards({ skins: [{ id: "future-skin", stars: 5, status: "Available" }] })), true);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, checkinEvent: { start: "2026-12-01T10:00", end: "2026-12-14T10:00" } }), true);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, checkinEvent: { start: "2026-12-14T10:00", end: "2026-12-01T10:00" } }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, checkinEvent: { start: "2026-12-01", end: "2026-12-14" } }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, checkinEvent: null }), true);
});

test("the check-in window is local time, start inclusive and end exclusive; no window means always open", () => {
  assert.equal(checkinOpen(new Date(2026, 0, 1)), true);
  setContent({ ...BUNDLED_CONTENT, checkinEvent: { start: "2026-12-01T10:00", end: "2026-12-14T10:00" } });
  assert.equal(checkinOpen(new Date(2026, 11, 1, 9, 59)), false);
  assert.equal(checkinOpen(new Date(2026, 11, 1, 10, 0)), true);
  assert.equal(checkinOpen(new Date(2026, 11, 14, 9, 59)), true);
  assert.equal(checkinOpen(new Date(2026, 11, 14, 10, 0)), false);
});

test("the 4-star guarantee is 4-star or better: during soft pity it keeps the raised 5-star chance", () => {
  // Draw 68 since the last 5-star (82% 5-star chance) on the 10th draw without a skin: a low roll is a 5-star.
  const hit = drawCards(1, { skins: [], items: [] }, { four: 9, five: 67 }, seq([0, 0]));
  assert.equal(hit.results[0].stars, 5);
  assert.deepEqual(hit.pity, { four: 0, five: 0 });
  // A high roll on the same draw is still a skin: a 4-star.
  const miss = drawCards(1, { skins: [], items: [] }, { four: 9, five: 67 }, seq([0.99, 0]));
  assert.equal(miss.results[0].stars, 4);
});

test("with every 4-star skin Hidden its row is shared by the other rows in proportion", () => {
  const skins = BUNDLED_CARD_PACK.skins.map((s) => (s.stars === 4 ? { ...s, status: "Hidden" } : s));
  assert.equal(setContent(withCards({ skins })), true);
  const rand = lcg(5);
  let better = 0;
  let pity = { four: 0, five: 0 };
  const n = 200000;
  for (let i = 0; i < n; i++) {
    const { results, pity: p } = drawCards(1, { skins: [], items: [] }, pity, rand);
    pity = p;
    const r = results[0];
    assert.ok(r.kind !== "card" || r.stars === 5);
    if (r.kind === "item" && ["wallpaper", "boot", "layout-slot"].some((k) => r.id.startsWith(k))) better++;
  }
  // Better is 25 of the 89 non-5-star weight: about 27.8% of draws (a little less once soft pity lifts the 5-star row).
  assert.ok(Math.abs(better / n - 0.27) < 0.015, `better share ${better / n}`);
});

test("buying: 4-star skins cost 300 Credits by default, 5-star are draw-only, and only Available skins are for sale", async () => {
  const { skinPrice, cardBuyOf } = await import("../../src/state/gachaContent.ts");
  assert.equal(skinPrice("blueprint"), 300);
  assert.equal(skinPrice("holo-foil"), null);
  assert.equal(cardBuyOf().crystalPick, true);
  const skins = BUNDLED_CARD_PACK.skins.map((s) => (s.id === "blueprint" ? { ...s, status: "Hidden" } : s));
  assert.equal(setContent(withCards({ skins, buy: { fourPrice: 250, fivePrice: 1200, crystalPick: false } })), true);
  assert.equal(skinPrice("blueprint"), null);
  assert.equal(skinPrice("neon-rim"), 250);
  assert.equal(skinPrice("holo-foil"), 1200);
  assert.equal(validateContent(withCards({ buy: { fourPrice: 0, fivePrice: null, crystalPick: true } })), false);
  assert.equal(validateContent(withCards({ buy: { fourPrice: 300, fivePrice: null, crystalPick: "yes" } })), false);
});

test("Regular crystals unlock a 4-star skin only when the CMS allows it", async () => {
  const { spendCrystalsOnSkin } = await import("../../src/state/cardEngine.ts");
  const rich = { ...emptyGacha(), crystals: 12 };
  const ok = spendCrystalsOnSkin(rich, "blueprint", []);
  assert.equal(ok.ok, true);
  assert.equal(ok.state.crystals, 2);
  assert.equal(spendCrystalsOnSkin(rich, "holo-foil", []).reason, "not-4-star");
  assert.equal(spendCrystalsOnSkin(rich, "blueprint", ["blueprint"]).reason, "owned");
  assert.equal(spendCrystalsOnSkin({ ...rich, crystals: 3 }, "blueprint", []).reason, "short");
  setContent(withCards({ buy: { fourPrice: 300, fivePrice: null, crystalPick: false } }));
  assert.equal(spendCrystalsOnSkin(rich, "blueprint", []).reason, "off");
});

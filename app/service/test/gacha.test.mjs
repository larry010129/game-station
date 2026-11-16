// Checks src/state/gachaEngine.ts against GACHA REDESIGN.md / PLAN.md Gacha section.
import test from "node:test";
import assert from "node:assert/strict";
import {
  BUNDLED_CONTENT,
  LOOK_COST,
  PACK_BRAND,
  PACK_REGULAR,
  applyResults,
  brandDaysLeft,
  cleanGacha,
  crystalValueFor,
  drawMany,
  emptyGacha,
  featuredBrand,
  getContent,
  packExhausted,
  pityFor,
  priceOf,
  resetContent,
  setContent,
  spendBrandPrisms,
  spendRegularCrystals,
  validateContent,
} from "../../src/state/gachaEngine.ts";

const seq = (...n) => {
  let i = 0;
  return () => n[i++ % n.length];
};

const owned = (over = {}) => ({
  looks: [],
  items: [],
  regularPool: ["look-a", "look-b", "look-c"],
  week: "2024-01-01",
  featured: ["spotify-night", "twitch-purple"],
  ...over,
});

const pity0 = () => ({ look: 0, brand: 0, weeklyPicks: { week: null, count: 0 } });

test.beforeEach(() => resetContent());

test("prices: Regular 100/900, Brand 150/1350, chosen look 120", () => {
  assert.equal(LOOK_COST, 120);
  assert.equal(priceOf(PACK_REGULAR, 1), 100);
  assert.equal(priceOf(PACK_REGULAR, 10), 900);
  assert.equal(priceOf(PACK_BRAND, 1), 150);
  assert.equal(priceOf(PACK_BRAND, 10), 1350);
  assert.equal(priceOf(PACK_REGULAR, 5), null);
  assert.equal(getContent().packs.regular.weights.common, 0.57);
  assert.equal(getContent().packs.brand.weights.common, 0.57);
  assert.equal(getContent().packs.brand.weights.regularTheme, 0.13);
  assert.equal(getContent().packs.brand.weights.brandTheme, 0.01, "Brand Pack featured 5-star row");
  assert.equal(getContent().packs.brand.weights.rainbowRegular, 0.005, "Brand Pack rainbow Regular 5-star row");
  assert.equal(getContent().packs.regular.weights.regularTheme, 0.14);
  assert.equal(getContent().packs.regular.weights.brandTheme, 0.01, "Regular Pack rainbow rate");
});

test("default content equals the redesign plan and validates", () => {
  assert.ok(validateContent(BUNDLED_CONTENT));
  assert.equal(BUNDLED_CONTENT.lookPityAfter, 9);
  assert.equal(BUNDLED_CONTENT.brandPityAfter, 69);
  assert.equal(BUNDLED_CONTENT.weeklyPickCap, 2);
  assert.equal(BUNDLED_CONTENT.regularCrystalCost, 10);
  assert.equal(BUNDLED_CONTENT.brandPrismCost, 5);
  assert.equal(BUNDLED_CONTENT.crystalValues.common, 1);
  assert.equal(BUNDLED_CONTENT.crystalValues.better, 2);
  assert.equal(BUNDLED_CONTENT.crystalValues.regularTheme, 3);
  assert.equal(BUNDLED_CONTENT.crystalValues.brandTheme, 5);
  assert.equal(BUNDLED_CONTENT.brandThemeIds.length, 68);
  assert.deepEqual(getContent().packs.regular.betterInner, { wallpaper: 0.7, boot: 0.2, layout: 0.1 });
  assert.deepEqual(getContent().packs.brand.betterInner, { wallpaper: 0.55, boot: 0.3, layout: 0.15 });
});

test("invalid content is rejected and bundled content is kept", () => {
  const bad = structuredClone(BUNDLED_CONTENT);
  bad.packs.brand.weights.common = 0.565;
  assert.equal(setContent(bad), false);
  assert.equal(getContent().packs.brand.weights.common, 0.57);

  const missing = structuredClone(BUNDLED_CONTENT);
  missing.items = missing.items.filter((i) => i.id !== "streak-freeze");
  assert.equal(validateContent(missing), false);
  assert.equal(setContent(missing), false);
});

test("Regular pack weights via fixed rand: theme / pick / better / common", () => {
  // rows: theme 0.14, rainbow 0.01, pick 0.03, better 0.25, common 0.57
  const theme = drawMany(PACK_REGULAR, 1, owned(), pity0(), seq(0.0, 0.0));
  assert.equal(theme.results[0].kind, "look");
  assert.equal(theme.results[0].brand, false);

  const pick = drawMany(PACK_REGULAR, 1, owned(), pity0(), seq(0.16));
  assert.deepEqual(pick.results[0], { kind: "pick" });

  const better = drawMany(PACK_REGULAR, 1, owned(), pity0(), seq(0.2, 0.0, 0.0));
  assert.equal(better.results[0].kind, "item");
  assert.ok(better.results[0].id.startsWith("wallpaper"));

  const common = drawMany(PACK_REGULAR, 1, owned(), pity0(), seq(0.5, 0.0));
  assert.equal(common.results[0].kind, "item");
  assert.equal(common.results[0].id, "streak-freeze");
});

test("Brand pack weights: brand theme and custom upload rows", () => {
  // cumulative: 0.13 theme, +0.01 featured → [0.13, 0.14), +0.005 rainbow Regular → [0.14, 0.145), then the pick.
  const brand = drawMany(PACK_BRAND, 1, owned(), pity0(), seq(0.135, 0.0));
  assert.equal(brand.results[0].kind, "look");
  assert.equal(brand.results[0].brand, true);
  assert.ok(["spotify-night", "twitch-purple"].includes(brand.results[0].id));

  // +0.03 pick +0.005 custom → custom in [0.175, 0.18)
  const custom = drawMany(PACK_BRAND, 1, owned(), pity0(), seq(0.176));
  assert.deepEqual(custom.results[0], { kind: "item", id: "custom-upload", repeat: false });
});

test("look pity forces a Regular theme at 10 and is counted per pack", () => {
  const forced = drawMany(PACK_REGULAR, 1, owned(), { look: 9, brand: 0, weeklyPicks: { week: null, count: 0 } }, seq(0.99, 0.0));
  assert.equal(forced.results[0].kind, "look");
  assert.equal(forced.results[0].brand, false);
  assert.equal(forced.pity.look, 0);

  const brandPack = drawMany(PACK_BRAND, 1, owned(), { look: 9, brand: 50, weeklyPicks: { week: null, count: 0 } }, seq(0.99, 0.0));
  assert.equal(brandPack.results[0].brand, false, "look pity never forces a Brand theme");
  assert.equal(brandPack.pity.look, 0);
  assert.equal(brandPack.pity.brand, 51, "Regular look still counts toward Brand pity");
});

test("Brand Pack rainbow pity forces a rainbow at 70; a won 50/50 is a Brand theme", () => {
  const r = drawMany(
    PACK_BRAND,
    1,
    owned(),
    { look: 0, brand: 69, weeklyPicks: { week: null, count: 0 } },
    seq(0.0),
  );
  assert.equal(r.results[0].kind, "look");
  assert.equal(r.results[0].brand, true);
  assert.equal(r.pity.brand, 0);
});

test("Brand pity holds while both featured themes are owned, and carries across rotation", () => {
  const bothOwned = owned({ looks: ["spotify-night", "twitch-purple"] });
  const held = drawMany(PACK_BRAND, 1, bothOwned, { look: 0, brand: 69, weeklyPicks: { week: null, count: 0 } }, seq(0.5, 0.0));
  assert.notEqual(held.results[0].kind === "look" && held.results[0].brand, true, "does not force Brand when both owned");
  assert.equal(held.pity.brand, 69, "counter held");

  // Counter value is stored on state — featured change does not reset it.
  const state = applyResults(emptyGacha(), PACK_BRAND, held.results, held.pity);
  assert.equal(state.brandPity, 69);
  const nextFeatured = owned({ featured: ["netflix-cinema", "youtube-signal"] });
  const after = drawMany(PACK_BRAND, 1, nextFeatured, { look: 0, brand: state.brandPity, weeklyPicks: state.weeklyPicks }, seq(0.0));
  assert.equal(after.results[0].brand, true);
  assert.ok(["netflix-cinema", "youtube-signal"].includes(after.results[0].id));
});

test("featuredBrand returns 2 themes, stable within 14 days, changes after, covers every Brand theme before repeat", () => {
  const a = featuredBrand(new Date("2024-01-01T12:00:00Z"));
  const b = featuredBrand(new Date("2024-01-14T12:00:00Z"));
  const c = featuredBrand(new Date("2024-01-15T12:00:00Z"));
  assert.equal(a.length, 2);
  assert.equal(new Set(a).size, 2);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(brandDaysLeft(new Date("2024-01-01T12:00:00Z")), 14);

  const seen = new Set();
  const pairs = BUNDLED_CONTENT.brandThemeIds.length / 2;
  for (let i = 0; i < pairs; i++) {
    const day = new Date(Date.UTC(2024, 0, 1 + i * 14));
    for (const id of featuredBrand(day)) seen.add(id);
  }
  assert.equal(seen.size, BUNDLED_CONTENT.brandThemeIds.length, "one full cycle covers every Brand theme");
});

test("repeat look / one-time item gives crystals of that pack; stackable never repeats", () => {
  const repLook = drawMany(
    PACK_REGULAR,
    1,
    owned({ looks: ["look-a", "look-b", "look-c"] }),
    pity0(),
    seq(0.0, 0.0),
  );
  assert.equal(repLook.results[0].repeat, true);
  assert.equal(crystalValueFor(repLook.results[0]), 3);
  const s1 = applyResults(emptyGacha(), PACK_REGULAR, repLook.results, repLook.pity);
  assert.equal(s1.crystals, 3);
  assert.equal(s1.prisms, 0);

  const repBrand = drawMany(
    PACK_BRAND,
    1,
    owned({ looks: ["look-a", "look-b", "look-c", "spotify-night", "twitch-purple"] }),
    pity0(),
    seq(0.135, 0.0),
  );
  assert.equal(repBrand.results[0].brand, true);
  assert.equal(repBrand.results[0].repeat, true);
  const s2 = applyResults(emptyGacha(), PACK_BRAND, repBrand.results, repBrand.pity);
  assert.equal(s2.prisms, 5);
  assert.equal(s2.crystals, 0);

  // common row + streak-freeze kind + pick-from-pool, twice
  const freeze = drawMany(PACK_REGULAR, 2, owned({ items: ["streak-freeze"] }), pity0(), seq(0.5, 0.0, 0.0, 0.5, 0.0, 0.0));
  assert.ok(freeze.results.every((r) => r.kind === "item" && r.id === "streak-freeze" && r.repeat === false));
});

test("forced and guaranteed themes prefer unowned while any remain", () => {
  const r = drawMany(
    PACK_REGULAR,
    1,
    owned({ looks: ["look-a"], regularPool: ["look-a", "look-b"] }),
    { look: 9, brand: 0, weeklyPicks: { week: null, count: 0 } },
    seq(0.0),
  );
  assert.equal(r.results[0].id, "look-b");
  assert.equal(r.results[0].repeat, false);
});

test("ten-draw always holds at least one Regular theme", () => {
  // All rolls land in common (r=0.9); second rand unused for streak-freeze path uses 0.
  const rolls = Array.from({ length: 40 }, () => 0.9);
  const r = drawMany(PACK_REGULAR, 10, owned(), pity0(), seq(...rolls));
  assert.equal(r.results.length, 10);
  assert.ok(r.results.some((x) => x.kind === "look" && !x.brand));
});

test("pack is disabled only when everything in it is owned", () => {
  const items = getContent().items.filter((i) => !i.stackable && i.tier !== "brand").map((i) => i.id);
  assert.equal(packExhausted(PACK_REGULAR, ["look-a", "look-b"], items, ["look-a", "look-b"]), true);
  assert.equal(packExhausted(PACK_REGULAR, ["look-a"], items, ["look-a", "look-b"]), false);
  const brandItems = getContent().items.filter((i) => !i.stackable).map((i) => i.id);
  assert.equal(
    packExhausted(PACK_BRAND, ["look-a", "spotify-night", "twitch-purple"], brandItems, ["look-a"], ["spotify-night", "twitch-purple"]),
    true,
  );
});

test("Regular crystals cost 10 and only unlock a Regular look; Brand prisms cost 5 and only a featured Brand", () => {
  const rich = { ...emptyGacha(), crystals: 10, prisms: 5 };
  assert.equal(spendRegularCrystals(rich, "look-a", [], ["look-a"]).ok, true);
  assert.equal(spendRegularCrystals(rich, "spotify-night", [], ["look-a"]).ok, false);
  assert.equal(spendRegularCrystals({ ...rich, crystals: 9 }, "look-a", [], ["look-a"]).reason, "short");
  assert.equal(spendRegularCrystals(rich, "look-a", ["look-a"], ["look-a"]).reason, "owned");

  assert.equal(spendBrandPrisms(rich, "spotify-night", [], ["spotify-night", "twitch-purple"]).ok, true);
  assert.equal(spendBrandPrisms(rich, "look-a", [], ["spotify-night", "twitch-purple"]).reason, "not-featured");
  assert.equal(spendBrandPrisms(rich, "netflix-cinema", [], ["spotify-night", "twitch-purple"]).reason, "not-featured");
  assert.equal(spendBrandPrisms({ ...rich, prisms: 4 }, "spotify-night", [], ["spotify-night"]).reason, "short");
});

test("crystals survive a rotation (state is independent of featuredBrand)", () => {
  const s = { ...emptyGacha(), crystals: 7, prisms: 3 };
  const featured = featuredBrand(new Date("2024-06-01Z"));
  const later = featuredBrand(new Date("2024-08-01Z"));
  assert.notDeepEqual(featured, later);
  assert.equal(s.crystals, 7);
  assert.equal(s.prisms, 3);
});

test("v1 coupons migrate to pendingCredits at 15 each", () => {
  const s = cleanGacha({ v: 1, coupons: 4, draws: 2 });
  assert.equal(s.v, 2);
  assert.equal(s.pendingCredits, 60);
  assert.equal(s.draws, 2);
  assert.equal("coupons" in s, false);
  for (const bad of [null, 5, "x", {}]) assert.deepEqual(cleanGacha(bad), emptyGacha());
});

test("weekly pick cap: at most 2/week across packs; overflow → streak freeze; resets on new week", () => {
  const week = "2024-01-01";
  const p1 = drawMany(PACK_REGULAR, 1, owned({ week }), pity0(), seq(0.16));
  assert.equal(p1.results[0].kind, "pick");
  const p2 = drawMany(PACK_BRAND, 1, owned({ week }), p1.pity, seq(0.16));
  assert.equal(p2.results[0].kind, "pick");
  assert.equal(p2.pity.weeklyPicks.count, 2);

  // When capped, pick weight sits after common (≥0.97 on Regular).
  const overflow = drawMany(PACK_REGULAR, 1, owned({ week }), p2.pity, seq(0.98));
  assert.deepEqual(overflow.results[0], { kind: "item", id: "streak-freeze", repeat: false });
  assert.equal(overflow.pity.weeklyPicks.count, 2);

  const nextWeek = drawMany(PACK_REGULAR, 1, owned({ week: "2024-01-08" }), overflow.pity, seq(0.16));
  assert.equal(nextWeek.results[0].kind, "pick");
  assert.equal(nextWeek.pity.weeklyPicks.count, 1);

  // Ten-draw cannot go over the 2 remaining.
  const ten = drawMany(
    PACK_REGULAR,
    10,
    owned({ week }),
    { look: 0, brand: 0, weeklyPicks: { week, count: 1 } },
    seq(...Array.from({ length: 30 }, () => 0.16)),
  );
  const picks = ten.results.filter((r) => r.kind === "pick").length;
  assert.ok(picks <= 1);
  assert.equal(ten.pity.weeklyPicks.count, 2);
});

test("weekly special: the CMS pair replaces the rotation for its own week only, and bad pairs are rejected", () => {
  const base = getContent();
  const day = new Date(2024, 0, 17, 12); // a Wednesday; its Monday is 2024-01-15
  const special = { ...base, weeklySpecial: { weekOf: "2024-01-15", brandIds: ["notion-ink", "figma-frame"] } };
  assert.deepEqual([...featuredBrand(day, special)], ["notion-ink", "figma-frame"]);
  assert.equal(brandDaysLeft(day, special), 5); // Wed..Sun
  assert.deepEqual([...featuredBrand(new Date(2024, 0, 22, 12), special)], [...featuredBrand(new Date(2024, 0, 22, 12), base)]); // next week: rotation again
  assert.equal(validateContent(special), true);
  assert.equal(validateContent({ ...base, weeklySpecial: { weekOf: "2024-01-15", brandIds: ["notion-ink", "notion-ink"] } }), false);
  assert.equal(validateContent({ ...base, weeklySpecial: { weekOf: "2024-01-15", brandIds: ["notion-ink", "not-a-brand"] } }), false);
  assert.equal(validateContent({ ...base, weeklySpecial: { weekOf: "Monday", brandIds: ["notion-ink", "figma-frame"] } }), false);
});

test("a Brand look the CMS added back to the Regular pool counts as a Regular theme", () => {
  // Pool holds only the added-back Brand look; the Regular theme row is rolled.
  const r = drawMany(PACK_REGULAR, 1, owned({ regularPool: ["spotify-night"], looks: ["spotify-night"] }), pity0(), seq(0.0, 0.0));
  assert.deepEqual(r.results[0], { kind: "look", id: "spotify-night", brand: false, repeat: true });
  // A repeat pays Regular crystals, not Brand prisms, and Brand pity is untouched.
  assert.equal(crystalValueFor(r.results[0]), BUNDLED_CONTENT.crystalValues.regularTheme);
  const next = applyResults(emptyGacha(), PACK_REGULAR, r.results, r.pity);
  assert.equal(next.crystals, BUNDLED_CONTENT.crystalValues.regularTheme);
  assert.equal(next.prisms, 0);
  // Regular crystals can pick it, because it is in the Regular pool.
  const rich = { ...emptyGacha(), crystals: 99 };
  assert.equal(spendRegularCrystals(rich, "spotify-night", [], ["spotify-night"]).ok, true);
});

// ---------------------------------------------------------------- rainbow (5-star) tier and the 50/50 (GACHA ODDS v5)
const RAINBOW = ["rain-a", "rain-b"];
const withRainbow = (over = {}) => owned({ rainbowPool: RAINBOW, ...over });

test("bundled rainbow settings: eight rainbow Regular themes, pity 90 / 70, soft pity from 74 / 58", () => {
  assert.equal(BUNDLED_CONTENT.rainbowThemeIds.length, 8);
  assert.ok(BUNDLED_CONTENT.rainbowThemeIds.includes("retro-arcade"));
  assert.equal(BUNDLED_CONTENT.rainbowPityAfter, 89);
  assert.equal(BUNDLED_CONTENT.brandPityAfter, 69);
  assert.deepEqual(BUNDLED_CONTENT.softPity, { regular: { from: 74, curve: 1 }, company: { from: 58, curve: 1 } });
  assert.equal(validateContent({ ...BUNDLED_CONTENT, softPity: { regular: { from: 0, curve: 1 } } }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, softPity: { company: { from: 50, curve: 9 } } }), false);
  assert.equal(validateContent({ ...BUNDLED_CONTENT, rainbowThemeIds: ["spotify-night"] }), false, "a Brand look cannot be a rainbow Regular theme");
  const { rainbowPityAfter, rainbowThemeIds, softPity, ...old } = BUNDLED_CONTENT;
  assert.equal(validateContent(old), true, "older releases without rainbow fields still load");
});

test("Regular Pack rainbow row gives a rainbow Regular theme, never a Brand look", () => {
  // [0.14, 0.15) is the rainbow row
  const r = drawMany(PACK_REGULAR, 1, withRainbow(), pity0(), seq(0.145, 0.0));
  assert.deepEqual(r.results[0], { kind: "look", id: "rain-a", brand: false, rainbow: true, repeat: false });
  assert.equal(r.pity.brand, 0, "rainbow pity resets");
  // The Regular theme row stays standard.
  const std = drawMany(PACK_REGULAR, 1, withRainbow(), pity0(), seq(0.0, 0.0));
  assert.equal(std.results[0].rainbow, undefined);
  assert.ok(owned().regularPool.includes(std.results[0].id));
});

test("Regular Pack rainbow pity forces a rainbow at 90, before look pity, and prefers unowned", () => {
  const r = drawMany(PACK_REGULAR, 1, withRainbow({ looks: ["rain-a"] }), { look: 9, brand: 89, weeklyPicks: { week: null, count: 0 } }, seq(0.9, 0.0));
  assert.equal(r.results[0].rainbow, true);
  assert.equal(r.results[0].id, "rain-b");
  assert.equal(r.pity.brand, 0);
  assert.equal(r.pity.look, 0);
  // One short of pity: a common draw counts up (0.99 lands past the soft-pity-raised 5-star rows).
  const one = drawMany(PACK_REGULAR, 1, withRainbow(), { look: 0, brand: 88, weeklyPicks: { week: null, count: 0 } }, seq(0.99, 0.0));
  assert.equal(one.pity.brand, 89);
  // Every rainbow owned: the counter holds.
  const held = drawMany(PACK_REGULAR, 1, withRainbow({ looks: RAINBOW }), { look: 0, brand: 89, weeklyPicks: { week: null, count: 0 } }, seq(0.9, 0.0));
  assert.notEqual(held.results[0].rainbow, true);
  assert.equal(held.pity.brand, 89);
});

test("company packs: featured and rainbow Regular are two rows, with no carry-over between pulls", () => {
  // [0.13, 0.14) featured, [0.14, 0.145) rainbow Regular.
  const featured = drawMany(PACK_BRAND, 1, withRainbow(), pity0(), seq(0.135, 0.0));
  assert.equal(featured.results[0].brand, true);
  const rainbow = drawMany(PACK_BRAND, 1, withRainbow(), pity0(), seq(0.142, 0.0));
  assert.deepEqual(rainbow.results[0], { kind: "look", id: "rain-a", brand: false, rainbow: true, repeat: false });
  assert.equal(rainbow.pity.brand, 0, "any 5-star resets rainbow pity");
  // The next pull rolls the same rows again: a rainbow Regular theme does not make the next 5-star featured.
  const again = drawMany(PACK_BRAND, 1, withRainbow(), rainbow.pity, seq(0.142, 0.0));
  assert.equal(again.results[0].rainbow, true);
  assert.equal(again.pity.guaranteed, false);
});

test("the guaranteed 5-star in a company pack splits by the two rows", () => {
  // Featured 0.01 and rainbow Regular 0.005: a forced 5-star is featured when rand * 0.015 < 0.01.
  const pity = { look: 0, brand: 69, weeklyPicks: { week: null, count: 0 } };
  const f = drawMany(PACK_BRAND, 1, withRainbow(), pity, seq(0.5, 0.0));
  assert.equal(f.results[0].brand, true);
  const r = drawMany(PACK_BRAND, 1, withRainbow(), pity, seq(0.8, 0.0));
  assert.equal(r.results[0].rainbow, true);
  // Without rainbow Regular themes the forced 5-star is always featured.
  const only = drawMany(PACK_BRAND, 1, owned({ rainbowPool: [] }), pity, seq(0.8, 0.0));
  assert.equal(only.results[0].brand, true);
});

test("an older save's 50/50 guarantee is ignored", () => {
  const s = { ...emptyGacha(), guaranteed: { brand: true, region: false } };
  const r = drawMany(PACK_BRAND, 1, withRainbow(), pityFor(s, PACK_BRAND), seq(0.142, 0.0));
  assert.equal(r.results[0].rainbow, true, "the rainbow Regular row still gives a rainbow Regular theme");
  assert.equal(r.pity.guaranteed, false);
  assert.equal(cleanGacha({ v: 2, brandPity: 3 }).rainbowPity, 0, "old saves load with no rainbow pity");
});

test("look pity and the ten-draw guarantee give standard themes only", () => {
  const forced = drawMany(PACK_REGULAR, 1, withRainbow(), { look: 9, brand: 0, weeklyPicks: { week: null, count: 0 } }, seq(0.99, 0.0));
  assert.equal(forced.results[0].rainbow, undefined);
  assert.ok(owned().regularPool.includes(forced.results[0].id));
  const ten = drawMany(PACK_REGULAR, 10, withRainbow(), pity0(), seq(...Array.from({ length: 40 }, () => 0.9)));
  const looks = ten.results.filter((r) => r.kind === "look");
  assert.ok(looks.length >= 1);
  assert.ok(looks.every((r) => r.rainbow === undefined));
});

test("ten-draw guarantee keeps a Brand look and rewrites a non-look slot", () => {
  // Draw 1 is the guaranteed 5-star (0.6 * 0.015 < 0.01: featured); the other nine land on items.
  const r = drawMany(PACK_BRAND, 10, withRainbow(), { look: 0, brand: 69, weeklyPicks: { week: null, count: 0 } }, seq(0.6));
  assert.ok(r.results.some((x) => x.kind === "look" && x.brand), "the Brand look is still there");
  assert.ok(r.results.some((x) => x.kind === "look" && !x.brand), "and a Regular theme was added");
});

test("a rainbow repeat pays Regular theme crystals (prisms in a company pack)", () => {
  const r = drawMany(PACK_REGULAR, 1, withRainbow({ looks: RAINBOW }), pity0(), seq(0.145, 0.0));
  assert.equal(r.results[0].repeat, true);
  assert.equal(crystalValueFor(r.results[0]), BUNDLED_CONTENT.crystalValues.regularTheme);
});

test("a pack with an unowned rainbow theme is not exhausted", () => {
  const items = getContent().items.filter((i) => !i.stackable && i.tier !== "brand").map((i) => i.id);
  assert.equal(packExhausted(PACK_REGULAR, ["look-a"], items, ["look-a"], [], ["rain-a"]), false);
  assert.equal(packExhausted(PACK_REGULAR, ["look-a", "rain-a"], items, ["look-a"], [], ["rain-a"]), true);
});

test("rainbow Regular themes are draw-only: not for Credits, weekly picks or Regular crystals", async () => {
  const cat = await import("../../src/state/themeCatalog.ts");
  const drawable = cat.listDrawableThemes();
  const retro = drawable.find((t) => t.id === "retro-arcade");
  assert.ok(retro, "retro-arcade is drawable");
  assert.equal(cat.isRainbowTheme(retro), true);
  assert.equal(cat.isCreditBuyableTheme(retro), false);
  assert.equal(drawable.filter(cat.isRainbowTheme).length, 8);
});


test("a release without rainbowThemeIds has no rainbow tier and plays as before v5", async () => {
  const cat = await import("../../src/state/themeCatalog.ts");
  const { rainbowThemeIds, ...old } = BUNDLED_CONTENT;
  assert.equal(setContent(old), true);
  const retro = cat.listDrawableThemes().find((t) => t.id === "retro-arcade");
  assert.equal(cat.isRainbowTheme(retro), false);
  assert.equal(cat.isCreditBuyableTheme(retro), true, "sold for Credits again, as before");
  resetContent();
  assert.equal(cat.isRainbowTheme(retro), true, "the bundled content carries the eight");
});

test("repeats pay by what repeated: a featured theme pays Special crystals, everything else Regular crystals in any pack", async () => {
  const { crystalKindFor } = await import("../../src/state/gachaEngine.ts");
  const cv = BUNDLED_CONTENT.crystalValues;
  const featured = { kind: "look", id: "spotify-night", brand: true, repeat: true };
  const rainbow = { kind: "look", id: "rain-a", brand: false, rainbow: true, repeat: true };
  const standard = { kind: "look", id: "look-a", brand: false, repeat: true };
  const better = { kind: "item", id: "wallpaper-01", repeat: true };
  const upload = { kind: "item", id: "custom-upload", repeat: true };
  assert.equal(crystalKindFor(featured), "special");
  for (const r of [rainbow, standard, better, upload]) assert.equal(crystalKindFor(r), "regular");

  // A Brand Pack draw of all five: only the featured repeat becomes Special crystals (saved as prisms).
  const s = applyResults(emptyGacha(), PACK_BRAND, [featured, rainbow, standard, better, upload], pity0());
  assert.equal(s.prisms, cv.brandTheme);
  assert.equal(s.crystals, (cv.rainbowTheme ?? cv.regularTheme) + cv.regularTheme + cv.better + cv.customUpload);
  // The Regular Pack routes the same way.
  const r = applyResults(emptyGacha(), PACK_REGULAR, [standard, better], pity0());
  assert.equal(r.crystals, cv.regularTheme + cv.better);
  assert.equal(r.prisms, 0);
});

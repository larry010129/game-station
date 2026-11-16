// Region Pack (a fork of the Brand Pack) and the tagged 150-theme company library.
import test from "node:test";
import assert from "node:assert/strict";
import {
  BUNDLED_CONTENT,
  PACK_BRAND,
  PACK_REGION,
  applyResults,
  cleanGacha,
  drawMany,
  emptyGacha,
  featuredRegion,
  packTable,
  priceOf,
  regionDaysLeft,
  regionPackOn,
  resetContent,
  setContent,
  validateContent,
} from "../../src/state/gachaEngine.ts";
import { BRAND_TAGS, REGIONS, idsTagged, validTags } from "../../src/content/brandTags.ts";
import { BRAND_LOGOS } from "../../src/content/brandLogos.ts";
import { CATALOG } from "../../src/state/themeCatalog.ts";

const seq = (...n) => {
  let i = 0;
  return () => n[i++ % n.length];
};
const member = (id) => ({ id, tags: BRAND_TAGS[id] });
const owned = (featured) => ({ looks: [], items: [], regularPool: ["regular-a"], week: "2024-01-01", featured });

test.afterEach(() => resetContent());

test("the company library is 150 tagged themes: 68 in the Brand Pack, all 150 in the Region Pack", () => {
  const brands = CATALOG.filter((t) => t.group === "Brand");
  assert.equal(brands.length, 150);
  assert.equal(Object.keys(BRAND_TAGS).length, 150);
  assert.equal(idsTagged("brand").length, 68);
  assert.equal(idsTagged("region").length, 150);
  assert.deepEqual([...BUNDLED_CONTENT.brandThemeIds], idsTagged("brand"));
  for (const t of brands) {
    assert.ok(validTags(t.tags), `${t.id} has tags`);
    assert.ok(BRAND_LOGOS[t.id], `${t.id} has a logo`);
    assert.equal(t.status === "Hidden" || t.status === "Available", true);
  }
  for (const key of Object.keys(REGIONS)) {
    assert.ok(Object.values(BRAND_TAGS).some((t) => t.region === key), `${key} has at least one company`);
  }
});

test("Brand list may be any size of 2+ unique ids; duplicates and singletons are rejected", () => {
  const small = { ...structuredClone(BUNDLED_CONTENT), brandThemeIds: BUNDLED_CONTENT.brandThemeIds.slice(0, 28) };
  assert.equal(validateContent(small), true);
  assert.equal(validateContent({ ...small, brandThemeIds: ["spotify-night"] }), false);
  assert.equal(validateContent({ ...small, brandThemeIds: ["spotify-night", "spotify-night"] }), false);
});

test("regionWeek must name a known region or an ISO country", () => {
  const base = structuredClone(BUNDLED_CONTENT);
  assert.equal(validateContent({ ...base, regionWeek: { weekOf: "2024-01-15", kind: "region", value: "eu-east" } }), true);
  assert.equal(validateContent({ ...base, regionWeek: { weekOf: "2024-01-15", kind: "country", value: "TW" } }), true);
  assert.equal(validateContent({ ...base, regionWeek: { weekOf: "2024-01-15", kind: "region", value: "mars" } }), false);
  assert.equal(validateContent({ ...base, regionWeek: { weekOf: "2024-01-15", kind: "country", value: "taiwan" } }), false);
  assert.equal(validateContent({ ...base, regionWeek: { weekOf: "Monday", kind: "country", value: "TW" } }), false);
});

test("the CMS can switch the Region Pack off; absent means on", () => {
  const base = structuredClone(BUNDLED_CONTENT);
  assert.equal(validateContent(base), true);
  assert.equal(validateContent({ ...base, regionPackEnabled: true }), true);
  assert.equal(validateContent({ ...base, regionPackEnabled: false }), true);
  assert.equal(validateContent({ ...base, regionPackEnabled: "no" }), false);
  try {
    assert.equal(setContent(base), true);
    assert.equal(regionPackOn(), true);
    assert.equal(priceOf(PACK_REGION, 1), base.packs.region.priceOne);
    assert.equal(setContent({ ...base, regionPackEnabled: false }), true);
    assert.equal(regionPackOn(), false);
    assert.equal(priceOf(PACK_REGION, 1), null, "an off Region Pack is not sold");
    assert.equal(priceOf(PACK_REGION, 10), null);
    assert.equal(priceOf(PACK_BRAND, 1), base.packs.brand.priceOne, "the other packs are unaffected");
  } finally {
    resetContent();
  }
});

test("a release without a Region table borrows the Brand one", () => {
  const raw = structuredClone(BUNDLED_CONTENT);
  delete raw.packs.region;
  raw.packs.brand.priceOne = 175;
  assert.equal(setContent(raw), true);
  assert.equal(priceOf(PACK_REGION, 1), 175);
  assert.equal(packTable(PACK_REGION).id, "region");
});

test("a country week features only that country's companies", () => {
  const pool = idsTagged("region").map(member);
  const content = { ...BUNDLED_CONTENT, regionWeek: { weekOf: "2024-01-15", kind: "country", value: "TW" } };
  const focus = featuredRegion(pool, new Date(2024, 0, 17), content);
  assert.equal(focus.kind, "country");
  assert.equal(focus.label, "Taiwan");
  assert.equal(focus.scheduled, true);
  assert.equal(focus.ids.length, 2);
  for (const id of focus.ids) assert.equal(BRAND_TAGS[id].country, "TW");
});

test("a region week features that region; the week after falls back to the rotation", () => {
  const pool = idsTagged("region").map(member);
  const content = { ...BUNDLED_CONTENT, regionWeek: { weekOf: "2024-01-15", kind: "region", value: "eu-east" } };
  const focus = featuredRegion(pool, new Date(2024, 0, 15), content);
  assert.equal(focus.label, "East Europe");
  for (const id of focus.ids) assert.equal(BRAND_TAGS[id].region, "eu-east");
  const next = featuredRegion(pool, new Date(2024, 0, 22), content);
  assert.equal(next.scheduled, false);
});

test("without a CMS week the pack rotates through regions that have 2+ looks, and is stable within a week", () => {
  const pool = ["asus-tw", "acer-tw", "spotify-night"].map(member);
  const a = featuredRegion(pool, new Date(2024, 0, 15));
  const b = featuredRegion(pool, new Date(2024, 0, 20));
  assert.equal(a.value, "asia-east", "only East Asia has two looks");
  assert.deepEqual(a.ids, b.ids);
  assert.deepEqual([...a.ids].sort(), ["acer-tw", "asus-tw"]);
  const empty = featuredRegion([], new Date(2024, 0, 15));
  assert.deepEqual(empty.ids, []);
  assert.ok(regionDaysLeft(new Date(2024, 0, 15)) === 7 && regionDaysLeft(new Date(2024, 0, 21)) === 1);
});

test("Region pity forces a rainbow (a won 50/50 is a featured company look) and is kept apart from Brand pity", () => {
  const featured = ["asus-tw", "acer-tw"];
  const pity = { look: 0, brand: BUNDLED_CONTENT.brandPityAfter, weeklyPicks: { week: null, count: 0 } };
  const out = drawMany(PACK_REGION, 1, owned(featured), pity, seq(0.0));
  assert.equal(out.results[0].kind, "look");
  assert.equal(out.results[0].brand, true);
  assert.ok(featured.includes(out.results[0].id));
  const start = { ...emptyGacha(), brandPity: 12 };
  const next = applyResults(start, PACK_REGION, out.results, out.pity);
  assert.equal(next.regionPity, 0);
  assert.equal(next.brandPity, 12, "Brand pity untouched by a Region draw");
  const brandOut = drawMany(PACK_BRAND, 1, owned(["spotify-night", "twitch-purple"]), { look: 0, brand: 0, weeklyPicks: { week: null, count: 0 } }, seq(0.99));
  const afterBrand = applyResults(next, PACK_BRAND, brandOut.results, brandOut.pity);
  assert.equal(afterBrand.regionPity, 0, "Region pity untouched by a Brand draw");
});

test("Region Pack with no featured looks never gives a company look", () => {
  const pity = { look: 0, brand: 999, weeklyPicks: { week: null, count: 0 } };
  const out = drawMany(PACK_REGION, 10, owned([]), pity, seq(0.137));
  assert.equal(out.results.some((r) => r.kind === "look" && r.brand), false);
});

test("old saves without Region fields load with Region pity at zero", () => {
  const s = cleanGacha({ v: 2, draws: 4, lookPity: { regular: 1, brand: 2 }, brandPity: 9, crystals: 3, prisms: 1 });
  assert.equal(s.regionPity, 0);
  assert.equal(s.lookPity.region, 0);
  assert.equal(s.brandPity, 9);
});

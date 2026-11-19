// Checks src/state/wikiData.ts: the Draw Wiki's chances match the bundled tables (row × inner weight ÷ entries).
import test from "node:test";
import assert from "node:assert/strict";
import { buildWiki } from "../../src/state/wikiData.ts";
import { readFileSync } from "node:fs";
import { draftToContentBundle } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";
import { BUNDLED_CARD_PACK, BUNDLED_CONTENT, resetContent, setContent } from "../../src/state/gachaContent.ts";

const look = (id, group = "Dark") => ({ id, name: id, author: "t", group, source: "station", palette: null });

test("wiki chances follow the bundled tables", () => {
  resetContent();
  const wiki = buildWiki({
    ownedLooks: ["reg-a"],
    ownedSkins: [],
    ownedItems: [],
    stacks: { "streak-freeze": 3 },
    regular: [look("reg-a"), look("reg-b")],
    rainbow: [look("rb-a")],
    company: [look("co-a", "Brand"), look("co-b", "Brand"), look("co-c", "Brand")],
    brandFeatured: ["co-a", "co-b"],
    region: null,
    odds: {},
  });
  const by = (id) => wiki.find((e) => e.id === id);
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  const reg = BUNDLED_CONTENT.packs.regular;

  // Alert sound: Common row × alert share ÷ 20 sounds; `chance` is the best pack (the Card Pack's bigger Common row).
  const perPack = [reg.weights.common, BUNDLED_CARD_PACK.weights.common].map((row) => (row * reg.commonInner.alert * 100) / 20);
  near(by("item:alert-sound-01").chance, Math.max(...perPack));
  // A featured company look: the Brand row split over the 2 featured looks; an unfeatured one cannot drop now.
  near(by("theme:co-a").chance, (BUNDLED_CONTENT.packs.brand.weights.brandTheme * 100) / 2);
  assert.equal(by("theme:co-c").chance, 0);
  // A 5-star skin: the five row split over the Available 5-star skins (6 bundled).
  near(by("skin:holo-foil").chance, 1 / 6);
  // Owned and stack counts reach the infobox.
  assert.deepEqual(by("theme:reg-a").facts.at(-1), ["Owned", "Yes"]);
  assert.deepEqual(by("item:streak-freeze").facts.find(([k]) => k === "Owned"), ["Owned", "3 in stack"]);
  for (const c of ["themes", "skins", "items", "mechanics"]) assert.ok(wiki.some((e) => e.category === c), c);
});

test("CMS draft → release → app: wikiHiddenIds keeps prizes off the wiki, draw rules stay", () => {
  const d = JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));
  d.wikiHiddenIds = ["holo-foil", "alert-sound-01"];
  assert.deepEqual(validateCmsDraft(d), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(gacha.wikiHiddenIds, ["holo-foil", "alert-sound-01"]);
  assert.deepEqual(validateGacha(gacha), []);
  assert.ok(setContent(gacha));
  try {
    const ids = buildWiki({ ownedLooks: [], ownedSkins: [], ownedItems: [], stacks: {}, regular: [], rainbow: [], company: [], brandFeatured: [], region: null, odds: {} }).map((e) => e.id);
    assert.ok(!ids.includes("skin:holo-foil") && !ids.includes("item:alert-sound-01"));
    assert.ok(ids.includes("skin:aurora-drift") && ids.includes("item:alert-sound-02") && ids.includes("rule:pity"));
  } finally {
    resetContent();
  }
  assert.deepEqual(validateCmsDraft({ ...d, wikiHiddenIds: ["x", "x"] }), ["wikiHiddenIds has duplicate ids"]);
});

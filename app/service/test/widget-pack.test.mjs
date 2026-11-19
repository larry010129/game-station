// Checks the Widget Pack: dashboard cards as prizes (src/state/widgets.ts and the shared rules in cardEngine.ts).
import test from "node:test";
import assert from "node:assert/strict";
import { applyCardResults, cardOddsRows, cardsExhausted, drawCards } from "../../src/state/cardEngine.ts";
import { CARD_SKINS } from "../../src/state/cardSkins.ts";
import { BUNDLED_CONTENT, BUNDLED_WIDGET_PACK, resetContent, setContent, validateContent, widgetStatus } from "../../src/state/gachaContent.ts";
import { emptyGacha, crystalValueFor, isRainbowResult } from "../../src/state/gachaEngine.ts";
import { CARD_IDS } from "../../src/layout/layouts.ts";
import { CATALOG } from "../../src/state/themeCatalog.ts";
import { drawableWidgets, isWidgetLocked, WIDGET_COST, WIDGET_IDS, widgetPackOn, widgetsToRecord } from "../../src/state/widgets.ts";

const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const withWidgets = (widgets, patch = {}) => ({ ...BUNDLED_CONTENT, widgetPack: { ...BUNDLED_WIDGET_PACK, widgets, ...patch } });
const LOCKED = [
  { id: "spotify", stars: 5, status: "Available" },
  { id: "discord", stars: 5, status: "Available" },
  { id: "notes", stars: 4, status: "Available" },
  { id: "memory", stars: 4, status: "Available" },
  { id: "wavelink", stars: 5, status: "Hidden" },
  { id: "media", stars: 5, status: "Archived" },
  { id: "clocks", stars: 4, status: "Free" },
];

test.afterEach(() => resetContent());

test("every dashboard card has a cost row, and its Wiki key never clashes with a theme, skin or item id", () => {
  assert.deepEqual([...WIDGET_IDS].sort(), [...CARD_IDS].sort());
  const others = new Set([...CATALOG.map((t) => t.id), ...CARD_SKINS.map((s) => s.id), ...BUNDLED_CONTENT.items.map((i) => i.id)]);
  // Bare ids do clash ("discord" is a theme and a card), which is why cards go in wikiHiddenIds as "widget:<id>".
  assert.ok(others.has("discord"));
  for (const id of WIDGET_IDS) assert.ok(!others.has(`widget:${id}`), `widget:${id} clashes`);
  // The resource-hungry cards are the 5-star ones.
  assert.deepEqual(WIDGET_IDS.filter((id) => WIDGET_COST[id].stars === 5).sort(), ["airesearch", "chart", "discord", "heroprofile", "media", "spotify", "wavelink"]);
});

test("bundled content: every card is Free, nothing is locked, and the pack has no tab", () => {
  for (const id of WIDGET_IDS) assert.equal(widgetStatus(id), "Free");
  assert.equal(isWidgetLocked("spotify", [], false, false), false);
  assert.equal(widgetPackOn(), false);
});

test("lock rule: status × owned × Patreon / creator", () => {
  assert.ok(setContent(withWidgets(LOCKED)));
  assert.equal(isWidgetLocked("spotify", [], false, false), true);
  assert.equal(isWidgetLocked("spotify", ["spotify"], false, false), false);
  assert.equal(isWidgetLocked("spotify", [], true, false), false, "Patreon Basic opens it");
  assert.equal(isWidgetLocked("spotify", [], false, true), false, "the creator unlock opens it");
  assert.equal(isWidgetLocked("wavelink", [], false, false), true, "Hidden is locked");
  assert.equal(isWidgetLocked("media", ["media"], false, false), false, "Archived stays with owners");
  assert.equal(isWidgetLocked("clocks", [], false, false), false, "listed Free");
  assert.equal(isWidgetLocked("gpu", [], false, false), false, "not listed means Free");
  assert.deepEqual(drawableWidgets(5).sort(), ["discord", "spotify"]);
  assert.deepEqual(drawableWidgets(4).sort(), ["memory", "notes"]);
  assert.equal(widgetPackOn(), true);
});

test("a card placed while Free is recorded as owned; one placed after its lock is not", () => {
  // Before the lock: Spotify is Free, so placing it records it.
  assert.deepEqual(widgetsToRecord(["spotify", "gpu", "spotify"], []), ["spotify", "gpu"]);
  // After the lock (a restored layout, an import, a reset): Spotify is no longer Free, so it is not recorded.
  assert.ok(setContent(withWidgets(LOCKED)));
  assert.deepEqual(widgetsToRecord(["spotify", "gpu"], []), ["gpu"]);
  assert.deepEqual(widgetsToRecord(["gpu"], ["gpu"]), []);
});

test("release validation: Free is a Widget Pack status, bad rows are refused", () => {
  assert.ok(validateContent(withWidgets(LOCKED)));
  assert.ok(!validateContent(withWidgets([{ id: "spotify", stars: 3, status: "Available" }])));
  assert.ok(!validateContent(withWidgets([{ id: "spotify", stars: 5, status: "Locked" }])));
  assert.ok(!validateContent(withWidgets([LOCKED[0], LOCKED[0]])));
  // Free is not a Card Pack (skin) status.
  assert.ok(!validateContent({ ...BUNDLED_CONTENT, cardPack: { ...BUNDLED_CONTENT.cardPack, enabled: true, ticket: "special", priceOne: 120, priceTen: 1080, weights: { five: 0.01, four: 0.1, better: 0.25, common: 0.64 }, fourPityAfter: 9, fivePityAfter: 69, crystalValues: { four: 2, five: 5 }, skins: [{ id: "holo-foil", stars: 5, status: "Free" }] } }));
});

test("draws: widgets drop with pity, repeats pay Regular crystals, and the Card Pack's pity is untouched", () => {
  assert.ok(setContent(withWidgets(LOCKED)));
  const run = drawCards(10, { skins: [], items: [] }, { four: 0, five: 0 }, lcg(7), undefined, "widgets");
  assert.equal(run.results.length, 10);
  // The 4-star-or-better guarantee: at least one card in 10 draws.
  assert.ok(run.results.some((r) => r.kind === "widget"));
  for (const r of run.results) if (r.kind === "widget") assert.ok(["spotify", "discord", "notes", "memory"].includes(r.id));
  assert.ok(run.results.every((r) => r.kind !== "card"), "the Widget Pack never gives a skin");

  // The 5-star guarantee on draw 70.
  const forced = drawCards(1, { skins: [], items: [] }, { four: 0, five: 69 }, () => 0.999, undefined, "widgets");
  assert.equal(forced.results[0].kind, "widget");
  assert.equal(forced.results[0].stars, 5);
  assert.ok(isRainbowResult(forced.results[0]));

  // A repeat pays the Widget Pack's crystal value, and pity goes to widgetPity only.
  const repeat = { kind: "widget", id: "spotify", stars: 5, repeat: true };
  assert.equal(crystalValueFor(repeat), BUNDLED_WIDGET_PACK.crystalValues.five);
  const after = applyCardResults(emptyGacha(), [repeat], { four: 0, five: 0 }, "widgets");
  assert.equal(after.crystals, BUNDLED_WIDGET_PACK.crystalValues.five);
  assert.deepEqual(after.cardPity, { four: 0, five: 0 });
  assert.deepEqual(after.widgetPity, { four: 0, five: 0 });
  assert.equal(cardOddsRows(undefined, "widgets")[0].label, "5-star dashboard card");
  // Owning every drawable card and one-time item empties the pack.
  assert.equal(cardsExhausted({ skins: ["spotify", "discord", "notes", "memory"], items: [] }, undefined, "widgets"), false);
});

test("buying: only Available cards have a price, by stars; the 4-star crystal pick follows the Widget Pack's switch", async () => {
  const { widgetPrice, widgetBuyOf } = await import("../../src/state/widgets.ts");
  const { spendCrystalsOnSkin } = await import("../../src/state/cardEngine.ts");
  assert.ok(setContent(withWidgets(LOCKED, { buy: { fourPrice: 250, fivePrice: 900, crystalPick: true } })));
  assert.equal(widgetPrice("notes"), 250);
  assert.equal(widgetPrice("spotify"), 900);
  assert.equal(widgetPrice("wavelink"), null, "Hidden cannot be bought");
  assert.equal(widgetPrice("media"), null, "Archived cannot be bought");
  assert.equal(widgetPrice("gpu"), null, "Free needs no buying");
  assert.equal(widgetBuyOf().crystalPick, true);
  const rich = { ...emptyGacha(), crystals: 50 };
  assert.equal(spendCrystalsOnSkin(rich, "notes", [], undefined, "widgets").ok, true);
  assert.equal(spendCrystalsOnSkin(rich, "spotify", [], undefined, "widgets").ok, false, "5-star cards are never crystal picks");
  assert.equal(spendCrystalsOnSkin(rich, "notes", ["notes"], undefined, "widgets").ok, false, "already owned");
  // A draw-only 5-star tier and the crystal pick switched off.
  assert.ok(setContent(withWidgets(LOCKED, { buy: { fourPrice: null, fivePrice: null, crystalPick: false } })));
  assert.equal(widgetPrice("notes"), null);
  assert.equal(spendCrystalsOnSkin(rich, "notes", [], undefined, "widgets").ok, false);
});

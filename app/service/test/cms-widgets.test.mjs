// CMS draft → release → app: the Widget Pack survives the trip, a bad one blocks publish, and the CMS card list
// matches the app's dashboard cards.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftToContentBundle } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";
import { DEFAULT_WIDGET_PACK, WIDGET_CATALOG, widgetWikiKey } from "../../../cms/src/types/draft.ts";
import { CARD_IDS, CARDS } from "../../src/layout/layouts.ts";
import { getContent, resetContent, setContent, widgetPackOf, widgetStatus } from "../../src/state/gachaContent.ts";
import { drawableWidgets, widgetPackOn } from "../../src/state/widgets.ts";

const draft = () => JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));

const widgetPack = () => ({
  ...structuredClone(DEFAULT_WIDGET_PACK),
  weights: { five: 2, four: 12, better: 26, common: 60 },
  widgets: [
    { id: "spotify", stars: 5, status: "Available", locked: true },
    { id: "discord", stars: 5, status: "Hidden" },
    { id: "tierlist", stars: 4, status: "Available" },
    { id: "mappicks", stars: 4, status: "Archived" },
    { id: "gpu", stars: 4, status: "Free" },
    { id: "not-in-this-app", stars: 4, status: "Available" },
  ],
});

test.afterEach(() => resetContent());

test("the CMS card list is the app's dashboard cards, with the same names and groups", () => {
  assert.deepEqual(WIDGET_CATALOG.map((w) => w.id).sort(), [...CARD_IDS].sort());
  for (const w of WIDGET_CATALOG) {
    assert.equal(w.name, CARDS[w.id].name, w.id);
    assert.equal(w.group, CARDS[w.id].group, w.id);
  }
});

test("a draft without a Widget Pack publishes none, so every card stays Free", () => {
  const d = draft();
  delete d.widgetPack;
  const gacha = draftToContentBundle(d).gacha;
  assert.equal("widgetPack" in gacha, false);
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  assert.equal(widgetStatus("spotify", getContent()), "Free");
  assert.equal(widgetPackOn(getContent()), false);
});

test("the default Widget Pack (every card Free) publishes and keeps every card Free", () => {
  const d = draft();
  d.widgetPack = structuredClone(DEFAULT_WIDGET_PACK);
  assert.deepEqual(validateCmsDraft(d), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  for (const id of CARD_IDS) assert.equal(widgetStatus(id, getContent()), "Free", id);
  assert.equal(widgetPackOn(getContent()), false, "on with nothing drawable shows no tab");
});

test("a Widget Pack from the CMS reaches the app as set", () => {
  const d = draft();
  d.widgetPack = widgetPack();
  d.wikiHiddenIds = [widgetWikiKey("discord")];
  assert.deepEqual(validateCmsDraft(d), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(validateGacha(gacha), []);
  // Fractions, and only {id, stars, status} per card: the CMS row lock stays in the CMS.
  assert.deepEqual(gacha.widgetPack.weights, { five: 0.02, four: 0.12, better: 0.26, common: 0.6 });
  assert.deepEqual(gacha.widgetPack.widgets[0], { id: "spotify", stars: 5, status: "Available" });
  assert.deepEqual(gacha.wikiHiddenIds, ["widget:discord"]);
  assert.equal(setContent(gacha), true);
  const c = getContent();
  assert.equal(widgetPackOf(c).priceOne, DEFAULT_WIDGET_PACK.priceOne);
  assert.equal(widgetStatus("spotify", c), "Available");
  assert.equal(widgetStatus("discord", c), "Hidden");
  assert.equal(widgetStatus("mappicks", c), "Archived");
  assert.equal(widgetStatus("gpu", c), "Free");
  assert.equal(widgetStatus("chart", c), "Free", "a card the pack does not list is Free");
  // An id this app does not know is published but never drawn.
  assert.deepEqual(drawableWidgets(5, c), ["spotify"]);
  assert.deepEqual(drawableWidgets(4, c), ["tierlist"]);
  assert.equal(widgetPackOn(c), true);
});

test("a Widget Pack that is off with a Drawable card blocks publish, as a draft and as a release", () => {
  const d = draft();
  d.widgetPack = { ...widgetPack(), enabled: false };
  assert.match(validateCmsDraft(d).join("\n"), /Widget Pack is off/);
  const gacha = draftToContentBundle({ ...d, widgetPack: widgetPack() }).gacha;
  gacha.widgetPack.enabled = false;
  assert.match(validateGacha(gacha).join("\n"), /Widget Pack is off/);
});

test("a broken Widget Pack is refused by the CMS", () => {
  const d = draft();
  d.widgetPack = {
    ...widgetPack(),
    weights: { five: 1, four: 1, better: 1, common: 1 },
    widgets: [
      { id: "spotify", stars: 3, status: "Free" },
      { id: "spotify", stars: 5, status: "Gone" },
    ],
  };
  const errors = validateCmsDraft(d).join("\n");
  assert.match(errors, /Widget Pack row chances must total 100%/);
  assert.match(errors, /spotify must be 4 or 5 stars/);
  assert.match(errors, /spotify has an unknown status/);
  assert.match(errors, /spotify is listed twice/);
});

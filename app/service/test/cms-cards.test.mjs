// CMS draft → release → app: the Card Pack and the check-in event window survive the trip, and bad ones block publish.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftToContentBundle } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";
import { cardPackOf, checkinOpen, drawableSkins, getContent, resetContent, setContent } from "../../src/state/gachaContent.ts";

const draft = () => JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));

const cardPack = () => ({
  enabled: true,
  ticket: "special",
  priceOne: 150,
  priceTen: 1350,
  weights: { five: 2, four: 12, better: 26, common: 60 },
  fourPityAfter: 7,
  fivePityAfter: 59,
  softPity: { from: 50, curve: 1.5 },
  crystalValues: { four: 3, five: 6 },
  skins: [
    { id: "holo-foil", stars: 5, status: "Available" },
    { id: "starfield", stars: 5, status: "Hidden" },
    { id: "blueprint", stars: 4, status: "Available" },
    { id: "neon-rim", stars: 5, status: "Available" },
  ],
});

test.afterEach(() => resetContent());

test("a draft without a Card Pack or check-in event publishes the app defaults", () => {
  const d = draft();
  delete d.cardPack;
  delete d.checkinEvent;
  const gacha = draftToContentBundle(d).gacha;
  assert.equal("cardPack" in gacha, false);
  assert.equal(gacha.checkinEvent, null);
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  assert.equal(cardPackOf(getContent()).priceOne, 120);
  assert.equal(checkinOpen(new Date(2026, 0, 1), getContent()), true);
});

test("a Card Pack and a check-in window from the CMS reach the app as set", () => {
  const d = draft();
  d.cardPack = cardPack();
  d.checkinEvent = { start: "2026-12-01T10:00", end: "2026-12-15T10:00" };
  assert.deepEqual(validateCmsDraft(d), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  const c = getContent();
  assert.deepEqual(cardPackOf(c).weights, { five: 0.02, four: 0.12, better: 0.26, common: 0.6 });
  assert.equal(cardPackOf(c).priceTen, 1350);
  // A skin's stars come from the release: Neon Rim was moved up to 5 stars; Hidden Starfield never drops.
  assert.deepEqual(drawableSkins(5, c), ["holo-foil", "neon-rim"]);
  assert.deepEqual(drawableSkins(4, c), ["blueprint"]);
  assert.equal(checkinOpen(new Date(2026, 11, 1, 9), c), false);
  assert.equal(checkinOpen(new Date(2026, 11, 8), c), true);
});

test("publish is blocked by Card Pack odds that miss 100%, a pack with no skin on, or a backwards check-in window", () => {
  const d = draft();
  d.cardPack = { ...cardPack(), weights: { five: 2, four: 12, better: 26, common: 50 } };
  assert.ok(validateCmsDraft(d).some((e) => e.includes("Card Pack row chances")));
  d.cardPack = { ...cardPack(), skins: cardPack().skins.map((s) => ({ ...s, status: "Hidden" })) };
  assert.ok(validateCmsDraft(d).some((e) => e.includes("no skin is Available")));
  d.cardPack = cardPack();
  d.checkinEvent = { start: "2026-12-15T10:00", end: "2026-12-01T10:00" };
  assert.ok(validateCmsDraft(d).some((e) => e.includes("Check-in event")));
});

test("the server checks a Card Pack release as strictly as the app does", () => {
  const d = draft();
  d.cardPack = cardPack();
  const gacha = draftToContentBundle(d).gacha;
  const bad = (patch) => validateGacha({ ...gacha, cardPack: { ...gacha.cardPack, ...patch } });
  assert.ok(bad({ weights: { ...gacha.cardPack.weights, five: "0.02" } }).length > 0);
  assert.ok(bad({ softPity: null }).length > 0);
  assert.ok(bad({ softPity: { from: 70, curve: 1 } }).some((e) => e.includes("before the guaranteed draw")));
  // A draft that is off by a hair is refused at the draft step, not only after conversion.
  d.cardPack = { ...cardPack(), weights: { five: 2, four: 12, better: 26, common: 59.98 } };
  assert.ok(validateCmsDraft(d).some((e) => e.includes("Card Pack row chances")));
});

test("per-day check-in prizes set in the CMS reach the app; bad ones block publish", async () => {
  const { checkinPrizesOf, validateContent } = await import("../../src/state/gachaContent.ts");
  const d = draft();
  delete d.checkinPrizes;
  assert.equal("checkinPrizes" in draftToContentBundle(d).gacha, false);
  const oneTime = d.items.find((i) => !i.stackable);
  d.checkinPrizes = [
    { kind: "special", count: 2 },
    { kind: "regular", count: 1 },
    { kind: "item", id: "streak-freeze", count: 4 },
    { kind: "item", id: oneTime.id, count: 1 },
    { kind: "special", count: 1 },
    { kind: "special", count: 1 },
    { kind: "special", count: 10 },
  ];
  assert.deepEqual(validateCmsDraft(d), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  assert.deepEqual(checkinPrizesOf(getContent()), d.checkinPrizes);
  // A one-time item paying 2, an unknown item, a zero amount and six days are all refused, on both sides.
  for (const bad of [
    d.checkinPrizes.map((p, i) => (i === 3 ? { ...p, count: 2 } : p)),
    d.checkinPrizes.map((p, i) => (i === 0 ? { kind: "item", id: "nope", count: 1 } : p)),
    d.checkinPrizes.map((p, i) => (i === 0 ? { ...p, count: 0 } : p)),
    d.checkinPrizes.slice(0, 6),
  ]) {
    assert.ok(validateCmsDraft({ ...d, checkinPrizes: bad }).length > 0);
    assert.equal(validateContent({ ...gacha, checkinPrizes: bad }), false);
  }
});

test("buy settings and the CMS lock survive the trip; a bad buy price blocks publish", () => {
  const d = draft();
  d.cardPack = { ...cardPack(), buy: { fourPrice: 250, fivePrice: null, crystalPick: false }, skins: cardPack().skins.map((s, i) => (i === 0 ? { ...s, locked: true } : s)) };
  assert.deepEqual(validateCmsDraft(d), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(gacha.cardPack.buy, { fourPrice: 250, fivePrice: null, crystalPick: false });
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  d.cardPack = { ...cardPack(), buy: { fourPrice: -5, fivePrice: null, crystalPick: true } };
  assert.ok(validateCmsDraft(d).some((e) => e.includes("buy price")));
});

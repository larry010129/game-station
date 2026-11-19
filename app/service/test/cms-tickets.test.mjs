// CMS draft → release → app: the per-pack Draw Ticket and the themes added back into the Regular pool survive the trip.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftToContentBundle } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";
import { regularExtraIds, resetContent, setContent, ticketFor, validateContent, getContent } from "../../src/state/gachaContent.ts";

const draft = () => JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));

test.afterEach(() => resetContent());

test("a draft without ticket or add-back settings publishes the defaults", () => {
  const d = draft();
  delete d.packTickets;
  delete d.regularExtraIds;
  const gacha = draftToContentBundle(d).gacha;
  assert.equal("packTickets" in gacha, false);
  assert.equal("regularExtraIds" in gacha, false);
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(setContent(gacha), true);
  assert.deepEqual(["regular", "brand", "region"].map((p) => ticketFor(p, getContent())), ["special", "special", "special"]);
  assert.deepEqual(regularExtraIds(getContent()), []);
});

test("ticket choices and Brand looks added back to Regular reach the app", () => {
  const d = draft();
  const brandId = d.themes.find((t) => t.group === "Brand").id;
  d.packTickets = { region: "regular" };
  d.regularExtraIds = [brandId];
  assert.deepEqual(validateCmsDraft(d).filter((e) => /packTickets|regularExtraIds/.test(e)), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(validateContent(gacha), true);
  setContent(gacha);
  assert.deepEqual(["regular", "brand", "region"].map((p) => ticketFor(p, getContent())), ["special", "special", "regular"]);
  assert.deepEqual(regularExtraIds(getContent()), [brandId]);
});

test("the CMS rejects a bad ticket kind, an unknown pack and an unknown theme", () => {
  const d = draft();
  d.packTickets = { brand: "gold", mystery: "special" };
  d.regularExtraIds = ["no-such-theme"];
  const errors = validateCmsDraft(d).join("\n");
  assert.match(errors, /packTickets\.brand must be/);
  assert.match(errors, /"mystery" is not a pack/);
  assert.match(errors, /no-such-theme is not a theme/);
});

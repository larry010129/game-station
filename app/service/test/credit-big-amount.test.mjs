// The Credits icon: one gain above the CMS "big amount" shows the cash bundle, anything else shows the coins.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { draftToContentBundle } from "../../../cms/server/convert.mjs";
import { validateCmsDraft, validateGacha } from "../../../cms/server/validate.mjs";
import {
  BUNDLED_CONTENT,
  CREDIT_BIG_AMOUNT_DEFAULT,
  creditBigAmount,
  getContent,
  isBigCreditGain,
  resetContent,
  setContent,
  validateContent,
} from "../../src/state/gachaContent.ts";

const draft = () => JSON.parse(readFileSync(new URL("../../../cms/data/draft.json", import.meta.url), "utf8"));

test.afterEach(() => resetContent());

test("a gain is big only above the amount, never at it", () => {
  const content = { ...BUNDLED_CONTENT, creditBigAmount: 50 };
  assert.equal(isBigCreditGain(49, content), false);
  assert.equal(isBigCreditGain(50, content), false, "the amount itself still shows the coins");
  assert.equal(isBigCreditGain(51, content), true);
});

test("bundled content uses the default, and today's rewards (5 to 20) stay under it", () => {
  assert.equal(creditBigAmount(BUNDLED_CONTENT), CREDIT_BIG_AMOUNT_DEFAULT);
  for (const n of [5, 8, 12, 15, 20]) assert.equal(isBigCreditGain(n, BUNDLED_CONTENT), false);
});

test("an older release without the field still loads and falls back to the default", () => {
  const { creditBigAmount: _dropped, ...old } = BUNDLED_CONTENT;
  assert.equal(validateContent(old), true);
  assert.equal(creditBigAmount(old), CREDIT_BIG_AMOUNT_DEFAULT);
  assert.equal(isBigCreditGain(CREDIT_BIG_AMOUNT_DEFAULT + 1, old), true);
});

test("the app rejects an amount that is not a number of 0 or more", () => {
  assert.equal(validateContent({ ...BUNDLED_CONTENT, creditBigAmount: 0 }), true, "0 means every gain is big");
  for (const bad of [-1, "100", null, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(validateContent({ ...BUNDLED_CONTENT, creditBigAmount: bad }), false, `rejects ${String(bad)}`);
  }
});

test("the amount set in the CMS reaches the app, and takes effect when the release is applied", () => {
  const d = draft();
  d.economy.creditBigAmount = 30;
  assert.deepEqual(validateCmsDraft(d).filter((e) => /creditBigAmount/.test(e)), []);
  const gacha = draftToContentBundle(d).gacha;
  assert.equal(gacha.creditBigAmount, 30);
  assert.deepEqual(validateGacha(gacha), []);
  assert.equal(isBigCreditGain(31), false, "before the release, the default is still in force");
  assert.equal(setContent(gacha), true);
  assert.equal(creditBigAmount(getContent()), 30);
  assert.equal(isBigCreditGain(30), false);
  assert.equal(isBigCreditGain(31), true);
});

test("a draft that never set the amount publishes the default", () => {
  const d = draft();
  delete d.economy.creditBigAmount;
  assert.equal(draftToContentBundle(d).gacha.creditBigAmount, CREDIT_BIG_AMOUNT_DEFAULT);
});

test("the CMS rejects a negative or non-number amount", () => {
  for (const bad of [-5, Number.NaN]) {
    const d = draft();
    d.economy.creditBigAmount = bad;
    assert.ok(validateCmsDraft(d).some((e) => /creditBigAmount/.test(e)), `draft check rejects ${String(bad)}`);
    assert.ok(validateGacha({ ...draftToContentBundle(draft()).gacha, creditBigAmount: bad }).some((e) => /creditBigAmount/.test(e)), `release check rejects ${String(bad)}`);
  }
});

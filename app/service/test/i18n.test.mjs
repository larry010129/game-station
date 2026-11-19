// Checks src/lib/i18n.ts and the two dictionaries: every English key has Traditional Chinese, placeholders match,
// and the language picks and fallbacks behave.
import test from "node:test";
import assert from "node:assert/strict";
import { EN } from "../../src/i18n/en.ts";
import { ZH_TW } from "../../src/i18n/zhTW.ts";
import { prefersTraditional, spanText, translate } from "../../src/lib/i18n.ts";
import { QUESTS } from "../../src/state/questEngine.ts";

const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("every English key has a Traditional Chinese string, and no extras", () => {
  assert.deepEqual(Object.keys(ZH_TW).filter((k) => !(k in EN)), [], "keys only in zhTW.ts");
  assert.deepEqual(Object.keys(EN).filter((k) => !(k in ZH_TW)), [], "keys missing from zhTW.ts");
});

test("placeholders match between the two languages", () => {
  for (const k of Object.keys(EN)) assert.deepEqual(holes(ZH_TW[k]), holes(EN[k]), k);
});

test("every quest has a translated title and description", () => {
  for (const q of QUESTS) {
    assert.ok(ZH_TW[`quest.${q.id}.title`], q.id);
    assert.ok(ZH_TW[`quest.${q.id}.blurb`], q.id);
    assert.equal(EN[`quest.${q.id}.title`], q.title, `${q.id}: en.ts title matches questEngine`);
  }
});

test("placeholders fill, and missing keys fall back to English, then the caller's text", () => {
  assert.equal(translate("zh-TW", "income.plus", { n: 12 }), "+12 收入");
  assert.equal(translate("en", "income.plus", { n: 12 }), "+12 Income");
  assert.equal(translate("zh-TW", "no.such.key", undefined, "Fallback"), "Fallback");
  assert.equal(translate("zh-TW", "no.such.key"), "no.such.key");
});

test("time spans", () => {
  assert.equal(spanText("en", 5 * 60 + 12), "5h 12m");
  assert.equal(spanText("zh-TW", 3 * 1440 + 4 * 60), "3 天 4 小時");
  assert.equal(spanText("zh-TW", 40), "40 分");
});

test("only Traditional Chinese system languages start in Chinese", () => {
  assert.equal(prefersTraditional(["zh-TW"]), true);
  assert.equal(prefersTraditional(["zh-HK", "en-US"]), true);
  assert.equal(prefersTraditional(["en-US", "zh-Hant-TW"]), false, "only the first language counts");
  assert.equal(prefersTraditional(["zh-Hant-TW"]), true);
  assert.equal(prefersTraditional(["zh-CN"]), false);
  assert.equal(prefersTraditional(["en-US"]), false);
});

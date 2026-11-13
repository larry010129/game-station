import test from "node:test";
import assert from "node:assert/strict";
import { parseAnswer, createAi } from "../ai.mjs";

test("parseAnswer reads JSON wrapped in a fence and cleans each item", () => {
  const text = 'Here you go:\n```json\n{"summary":"S","items":[{"title":"A","status":"leak","summary":"x","source":"Reddit","url":"https://r.example/1","date":"2026-11-01"},{"title":"B","status":"made-up","url":"javascript:alert(1)"},{"nope":1}]}\n```';
  const r = parseAnswer(text);
  assert.equal(r.summary, "S");
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].status, "leak");
  assert.equal(r.items[1].status, "rumor");
  assert.equal(r.items[1].url, "");
});

test("parseAnswer falls back to plain text when there is no JSON", () => {
  const r = parseAnswer("I could not search the web.");
  assert.deepEqual(r.items, []);
  assert.match(r.summary, /could not search/);
});

test("start rejects bad input before running anything", () => {
  const ai = createAi(() => {});
  assert.throws(() => ai.start({ engine: "nope", topic: "leaks" }), /Unknown AI engine/);
  assert.throws(() => ai.start({ engine: "claude", topic: "x" }), /Unknown topic/);
  assert.throws(() => ai.start({ engine: "claude", topic: "hero", question: "  " }), /Type what to look up/);
});

test("setAuto validates the engine and reports the hourly schedule", () => {
  const ai = createAi(() => {});
  assert.throws(() => ai.setAuto({ engine: "nope" }), /Unknown AI engine/);
  const st = ai.setAuto({ enabled: false, engine: "gemini" });
  assert.equal(st.auto.enabled, false);
  assert.equal(st.auto.engine, "gemini");
  ai.setAuto({ enabled: true, engine: "claude" });
});

import test from "node:test";
import assert from "node:assert/strict";
import { parseAnswer, createAi, AUTH_ERROR, looksSignedOut } from "../ai.mjs";
import { fakeSpawner, flush } from "./fakeChild.mjs";

// Every createAi in this file gets in-memory storage: no test reads or writes ai-research.json / ai-auto.json.
const memory = (extra = {}) => ({ readJson: (_f, d) => d, writeJson: () => {}, ...extra });
const mkAi = (busy, extra) => createAi(() => {}, busy, memory(extra));

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
  const ai = mkAi();
  assert.throws(() => ai.start({ engine: "nope", topic: "leaks" }), /Unknown AI engine/);
  assert.throws(() => ai.start({ engine: "claude", topic: "x" }), /Unknown topic/);
  assert.throws(() => ai.start({ engine: "claude", topic: "hero", question: "  " }), /Type what to look up/);
});

test("setAuto validates the engine and reports the hourly schedule", () => {
  const ai = mkAi();
  assert.throws(() => ai.setAuto({ engine: "nope" }), /Unknown AI engine/);
  const st = ai.setAuto({ enabled: false, engine: "gemini" });
  assert.equal(st.auto.enabled, false);
  assert.equal(st.auto.engine, "gemini");
  ai.setAuto({ enabled: true, engine: "claude" });
});

test("auth detection matches sign-in problems but not words that merely contain 'sign'", () => {
  for (const t of ["Please log in first", "Not logged in", "You are not signed in", "Invalid API key", "401 Unauthorized", "OAuth token expired", "credentials missing"]) {
    assert.match(t, AUTH_ERROR, t);
  }
  for (const t of ["Error while parsing design.json", "assignment failed", "Overwatch hero design notes", "resigned"]) {
    assert.doesNotMatch(t, AUTH_ERROR, t);
  }
});

test("inherited object keys are not engines or topics", () => {
  const ai = mkAi();
  for (const bad of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    assert.throws(() => ai.start({ engine: bad, topic: "leaks" }), /Unknown AI engine/, bad);
    assert.throws(() => ai.start({ engine: "claude", topic: bad }), /Unknown topic/, bad);
    assert.throws(() => ai.setAuto({ engine: bad }), /Unknown AI engine/, bad);
  }
});

function aiWithHistory(lastLeakAt) {
  const results = lastLeakAt == null ? [] : [{ id: "1", topic: "leaks", at: lastLeakAt, items: [] }];
  return mkAi(undefined, { readJson: (f, d) => (String(f).includes("ai-research") ? { results } : d) });
}

test("re-enabling auto right after a finished check waits until an hour after it", () => {
  const HOUR = 3600_000;
  const last = Date.now() - 10 * 60_000;
  const st = aiWithHistory(last).setAuto({ enabled: true });
  assert.ok(st.auto.nextAt >= last + HOUR, "not within the hour of the last check");
});

test("re-enabling auto after a long gap checks in about a minute", () => {
  const before = Date.now();
  const st = aiWithHistory(Date.now() - 5 * 3600_000).setAuto({ enabled: true });
  assert.ok(st.auto.nextAt >= before + 60_000 && st.auto.nextAt <= Date.now() + 61_000);
  const none = aiWithHistory(null).setAuto({ enabled: true });
  assert.ok(none.auto.nextAt <= Date.now() + 61_000);
});

async function runEngine({ code, stderr = "", exists }) {
  const spawn = fakeSpawner();
  const ai = mkAi(undefined, { spawnSafe: spawn, commandExists: async () => exists });
  ai.start({ engine: "claude", topic: "leaks" });
  await flush();
  const { child } = spawn.calls[0];
  if (stderr) child.stderr.write(stderr);
  await flush();
  child.finish(code);
  for (let i = 0; i < 20 && ai.status().job.state === "running"; i++) await flush();
  return ai.status().job;
}

test("exit 9009 and 127 mean 'not installed' without asking PATH", async () => {
  for (const code of [9009, 127]) {
    const job = await runEngine({ code, exists: true }); // exists:true would hide it if the code were ignored
    assert.equal(job.state, "error");
    assert.match(job.error, /is not installed/);
  }
});

test("any other failure asks PATH: absent -> not installed, present -> sign-in or raw message", async () => {
  assert.match((await runEngine({ code: 1, exists: false })).error, /is not installed/);
  assert.match((await runEngine({ code: 1, stderr: "401 Unauthorized", exists: true })).error, /isn't signed in/);
  assert.match((await runEngine({ code: 1, stderr: "something odd happened", exists: true })).error, /something odd happened/);
});

test("a sign-in message only counts on a non-zero exit and a short line; limits and network errors stay raw", async () => {
  // Rate limit / network text that happens to mention a key or login must not be reported as "not signed in".
  const limit = "Rate limit exceeded for this API key, please try again later";
  const net = "request failed: ECONNRESET while contacting the login server";
  assert.match((await runEngine({ code: 1, stderr: limit, exists: true })).error, /Rate limit exceeded/);
  assert.match((await runEngine({ code: 1, stderr: net, exists: true })).error, /ECONNRESET/);
  // A long blob that mentions "credentials" somewhere is shown as is.
  const long = `${"x".repeat(200)} credentials`;
  assert.doesNotMatch((await runEngine({ code: 1, stderr: long, exists: true })).error, /isn't signed in/);
  // Exit 0 with no output is never a sign-in problem; a killed child (null code) neither.
  assert.equal(looksSignedOut("401 Unauthorized", 0), false);
  assert.equal(looksSignedOut("401 Unauthorized", null), false);
  assert.equal(looksSignedOut("Not logged in", 1), true);
  assert.match((await runEngine({ code: 0, stderr: "401 Unauthorized", exists: true })).error, /401 Unauthorized/);
});

test("engine and topic must be strings: arrays that coerce to a key are rejected", () => {
  const ai = mkAi();
  assert.throws(() => ai.start({ engine: ["claude"], topic: "leaks" }), /Unknown AI engine/);
  assert.throws(() => ai.start({ engine: "claude", topic: ["leaks"] }), /Unknown topic/);
  assert.throws(() => ai.setAuto({ engine: ["claude"] }), /Unknown AI engine/);
  assert.throws(() => ai.setAuto({ engine: null }), /Unknown AI engine/);
  assert.doesNotThrow(() => ai.setAuto(null)); // no body: just the status
  assert.doesNotThrow(() => ai.setAuto(undefined));
});

test("the busy dependency is a named argument and is not part of the test deps", () => {
  let busyCalls = 0;
  const ai = mkAi(() => (busyCalls++, true));
  assert.equal(typeof ai.status().auto.enabled, "boolean");
  assert.equal(busyCalls, 0); // only asked by the hourly tick
  ai.stop();
});

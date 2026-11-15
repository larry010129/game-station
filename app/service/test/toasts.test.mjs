import test from "node:test";
import assert from "node:assert/strict";
import { createToasts } from "../toasts.mjs";

const flush = () => new Promise((r) => setImmediate(r));

/** A `read` that answers from a queue and remembers whether each call asked for the whole list. */
function mk(answers) {
  const calls = [];
  const logs = [];
  const queue = [...answers];
  const read = async (force) => {
    calls.push(force);
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return next;
  };
  const toasts = createToasts((m) => logs.push(m), { read, platform: "win32", everyMs: 60_000 });
  return { calls, logs, toasts };
}

test("a list becomes the snapshot, and an 'unchanged' answer keeps it", async () => {
  const { calls, toasts } = mk([
    { toasts: true, access: "allowed", items: [{ app: "Discord" }], error: null },
    { toasts: true, unchanged: true },
  ]);
  toasts.start();
  await flush();
  assert.equal(toasts.snapshot().access, "allowed");
  assert.equal(toasts.snapshot().items.length, 1);
  assert.deepEqual(calls, [true]); // the first ask is for the whole list (nothing is known yet)
  toasts.stop();
});

test("while the last answer was not a good one the whole list is asked for", async () => {
  const { calls, toasts } = mk([null, { toasts: true, access: "allowed", items: [], error: null }]);
  toasts.start();
  await flush();
  assert.equal(toasts.snapshot().access, "error"); // no answer: shown as an error, not as an empty list
  assert.match(toasts.snapshot().error, /did not answer/);
  assert.deepEqual(calls, [true]);
  toasts.stop();
});

test("a read that throws is reported once and shown as an error", async () => {
  const { logs, toasts } = mk([new Error("pipe closed")]);
  toasts.start();
  await flush();
  assert.equal(toasts.snapshot().access, "error");
  assert.match(toasts.snapshot().error, /pipe closed/);
  assert.equal(logs.length, 1);
  toasts.stop();
});

test("a denied listener is passed through; items are capped at 40", async () => {
  const many = Array.from({ length: 60 }, (_, i) => ({ id: String(i) }));
  const a = mk([{ toasts: true, access: "denied", items: [], error: null }]);
  a.toasts.start();
  await flush();
  assert.equal(a.toasts.snapshot().access, "denied");
  a.toasts.stop();
  const b = mk([{ toasts: true, access: "allowed", items: many, error: null }]);
  b.toasts.start();
  await flush();
  assert.equal(b.toasts.snapshot().items.length, 40);
  b.toasts.stop();
});

test("an answer that is not a toast reply is not trusted; stop() ends the polling", async () => {
  const { calls, toasts } = mk([{ available: false }]);
  toasts.start();
  await flush();
  assert.equal(toasts.snapshot().access, "error");
  toasts.stop();
  const before = calls.length;
  toasts.start(); // stopped for good
  await flush();
  assert.equal(calls.length, before);
});

test("off Windows there is nothing to read", () => {
  const toasts = createToasts(() => {}, { read: async () => ({}), platform: "linux" });
  toasts.start();
  assert.equal(toasts.snapshot().access, "unsupported");
  toasts.stop();
});

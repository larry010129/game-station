import test from "node:test";
import assert from "node:assert/strict";
import { createLifecycle } from "../lifecycle.mjs";

function setup(extra = {}) {
  const t = { now: 0, exits: [], stops: 0, logs: [], timers: [] };
  const lc = createLifecycle({
    stopAll: () => {
      t.stops++;
      if (extra.stopThrows) throw new Error("stop boom");
    },
    closeServer: extra.closeServer,
    exit: (code) => t.exits.push(code),
    log: (m) => t.logs.push(m),
    now: () => t.now,
    ...(extra.caps ?? {}),
    setTimer: (fn, ms) => {
      const h = { fn, ms, unref() {} };
      t.timers.push(h);
      return h;
    },
  });
  return { t, lc };
}

test("4 uncaught exceptions in a minute do not exit", () => {
  const { t, lc } = setup();
  for (let i = 0; i < 4; i++) lc.onUncaught(new Error("x"));
  assert.deepEqual(t.exits, []);
  assert.equal(t.stops, 0);
});

test("the 5th stops everything first, then exits 1, with a hard cap armed", () => {
  const { t, lc } = setup();
  for (let i = 0; i < 5; i++) lc.onUncaught(new Error("x"));
  assert.equal(t.stops, 1);
  assert.deepEqual(t.exits, [1]);
  assert.equal(t.timers.length, 1);
  assert.equal(t.timers[0].ms, 1500);
  t.timers[0].fn(); // the cap itself also exits 1
  assert.deepEqual(t.exits, [1, 1]);
});

test("crashes older than a minute fall out of the window", () => {
  const { t, lc } = setup();
  for (let i = 0; i < 4; i++) lc.onUncaught(new Error("x"));
  t.now = 61_000;
  lc.onUncaught(new Error("x"));
  assert.equal(lc.crashCount(), 1);
  assert.deepEqual(t.exits, []);
});

test("a throwing stopAll still ends in exit(1)", () => {
  const { t, lc } = setup({ stopThrows: true });
  for (let i = 0; i < 5; i++) lc.onUncaught(new Error("x"));
  assert.deepEqual(t.exits, [1]);
  assert.ok(t.logs.some((l) => /cleanup before exit failed: stop boom/.test(l)));
});

test("further crashes after the exit began do not stop or exit twice", () => {
  const { t, lc } = setup();
  for (let i = 0; i < 8; i++) lc.onUncaught(new Error("x"));
  assert.equal(t.stops, 1);
  assert.deepEqual(t.exits, [1]);
});

test("shutdown runs once: caps, stops, closes the server, exits 0", async () => {
  let closed = 0;
  const { t, lc } = setup({ closeServer: async () => closed++ });
  assert.equal(lc.isShuttingDown(), false);
  await Promise.all([lc.shutdown(), lc.shutdown()]);
  assert.equal(lc.isShuttingDown(), true);
  assert.equal(t.stops, 1);
  assert.equal(closed, 1);
  assert.deepEqual(t.exits, [0]);
  assert.equal(t.timers[0].ms, 3000);
});

test("shutdown still exits 0 when the server close fails", async () => {
  const { t, lc } = setup({
    closeServer: async () => {
      throw new Error("close boom");
    },
  });
  await lc.shutdown();
  assert.deepEqual(t.exits, [0]);
  assert.ok(t.logs.some((l) => /shutdown error: close boom/.test(l)));
});

test("during shutdown an uncaught exception is logged and ignored: no second exit, no second stopAll", async () => {
  let release;
  const { t, lc } = setup({ closeServer: () => new Promise((r) => (release = r)) });
  const done = lc.shutdown(); // stuck closing the server
  for (let i = 0; i < 8; i++) lc.onUncaught(new Error("while stopping"));
  assert.equal(t.stops, 1);
  assert.deepEqual(t.exits, []); // nothing exited early with code 1
  assert.equal(lc.crashCount(), 0);
  assert.equal(t.timers.length, 1); // only the shutdown cap, no crash cap
  assert.equal(t.timers[0].ms, 3000);
  assert.ok(t.logs.some((l) => /during shutdown \(ignored\)/.test(l)));
  release();
  await done;
  assert.deepEqual(t.exits, [0]);
});

test("the shutdown cap forces exit 0 if cleanup stalls; the crash exit arms its own (shorter) cap", async () => {
  const stalled = setup({ closeServer: () => new Promise(() => {}) });
  stalled.lc.shutdown(); // never resolves
  await Promise.resolve();
  assert.deepEqual(stalled.t.exits, []);
  assert.equal(stalled.t.timers[0].ms, 3000);
  stalled.t.timers[0].fn();
  assert.deepEqual(stalled.t.exits, [0]);

  const crash = setup({ caps: { crashCapMs: 250, shutdownCapMs: 9000 } });
  for (let i = 0; i < 5; i++) crash.lc.onUncaught(new Error("x"));
  assert.equal(crash.t.timers[0].ms, 250);
  await crash.lc.shutdown(); // a signal during the crash exit does nothing
  assert.equal(crash.t.stops, 1);
  assert.equal(crash.t.timers.length, 1);
  assert.deepEqual(crash.t.exits, [1]);
});

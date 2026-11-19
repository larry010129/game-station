import test from "node:test";
import assert from "node:assert/strict";
import { createRoutes } from "../routes.mjs";

const stubs = () => {
  const calls = [];
  const gameMode = {
    journal: () => ({ entries: [{ step: "power" }] }),
    journalFailed: () => 0,
    journalError: () => null,
    applyStep: async (s) => ({ applied: s.id }),
    restoreStep: async (s) => ({ restored: s.id }),
  };
  const sessions = { recordStep: (...a) => calls.push(a) };
  const d = { config: { problems: [] }, sensors: { state: { sources: {} } }, gameMode, sessions, machine: () => ({ name: "PC" }), port: () => 8787 };
  return { d, calls };
};

test("health reports the journal and the diag reads the live port", async () => {
  const { d } = stubs();
  const r = createRoutes(d);
  const h = await r["GET /api/health"]();
  assert.equal(h.ok, true);
  assert.equal(h.journal, 1);
  assert.equal((await r["GET /api/diag"]()).port, 8787);
  assert.deepEqual(await r["GET /api/machine"](), { name: "PC" });
});

test("a game-mode step is recorded in the session history, and an unknown step id is a 400", async () => {
  const { d, calls } = stubs();
  const r = createRoutes(d);
  await assert.rejects(() => r["POST /api/step/apply"]({ id: "no-such-step" }), (e) => e.status === 400);
  assert.equal(calls.length, 0);
});

test("the route table has no duplicate-shaped or non-function entries", () => {
  const r = createRoutes(stubs().d);
  for (const [k, fn] of Object.entries(r)) {
    assert.match(k, /^(GET|POST) \/api\//);
    assert.equal(typeof fn, "function", k);
  }
});

test("C5: game-mode status waits for startup recovery instead of reporting leftovers as still on", async () => {
  const { d } = stubs();
  let entries = [{ step: { id: "power" } }];
  let finish;
  const recovered = new Promise((r) => (finish = r));
  d.gameMode = { ...d.gameMode, journal: () => ({ entries }), whenRecovered: async () => (await recovered, true) };
  const r = createRoutes(d);
  const pending = r["GET /api/gamemode/active"]();
  // Recovery undoes the leftover step, then finishes.
  entries = [];
  finish();
  const status = await pending;
  assert.equal(status.active, false, "the leftovers were being undone, not on");

  // Recovery still running past the wait: say so, and do not claim game mode is on.
  entries = [{ step: { id: "power" } }];
  d.gameMode.whenRecovered = async () => false;
  const slow = await createRoutes(d)["GET /api/gamemode/active"]();
  assert.equal(slow.active, false);
  assert.equal(slow.recovering, true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createGameMode } from "../gamemode.mjs";
import { isProtected, validProcessName } from "../system.mjs";

const BEST = "ded574b5-45a0-4f42-8737-46345c09c238";
const BALANCED = "00000000-0000-0000-0000-000000000000";
const EXE = "C:\\Games\\Overwatch\\Overwatch.exe";

/** Everything is fake: an in-memory "disk", registry and power setting. No real system calls. */
function makeEnv({ overlay = BALANCED, gpu = null, powerIgnored = false } = {}) {
  const env = {
    overlay,
    gpu, // registry value for EXE, null = absent
    disk: { entries: [] },
    calls: [],
    failUndo: new Set(), // call names that should throw once armed
    slow: false,
    crashOnSave: null,
  };
  const system = {
    detectOverwatch: async () => ({ exe: EXE, appId: "1" }),
    getPowerOverlay: async () => env.overlay,
    setPowerOverlay: async (g) => {
      env.calls.push(["setPower", g]);
      if (env.failUndo.has("setPower")) throw new Error("boom");
      if (!powerIgnored) env.overlay = g;
    },
    getGpuPreference: async () => env.gpu,
    setGpuPreference: async (exe, v) => {
      env.calls.push(["setGpu", exe, v]);
      if (env.failUndo.has("setGpu")) throw new Error("reg boom");
      env.gpu = v;
    },
    findProcesses: async () => [],
    closePolitely: async () => true,
    isRunning: async () => true,
    gpuWord: () => "x",
  };
  const sensors = { setSlow: (v) => (env.slow = v) };
  const logs = [];
  let n = 0;
  const deps = {
    system,
    journalFile: "fake-journal.json",
    readJson: () => JSON.parse(JSON.stringify(env.disk)),
    writeJson: (_f, v) => {
      if (env.crashOnSave?.(v)) throw new Error("disk full");
      env.disk = JSON.parse(JSON.stringify(v));
    },
    launch: () => env.calls.push(["launch"]),
    newId: () => `id-${++n}`,
  };
  const make = () => createGameMode({ closeApps: ["spotify.exe"] }, sensors, (m) => logs.push(m), deps);
  return { env, logs, make };
}

const step = (id) => ({ id, label: id });

test("write-ahead: a pending entry is on disk before the system changes", async () => {
  const { env, make } = makeEnv({ gpu: "GpuPreference=1;" });
  const seen = [];
  const push = env.calls.push.bind(env.calls);
  env.calls.push = (c) => {
    if (c[0] === "setGpu") seen.push(JSON.parse(JSON.stringify(env.disk)));
    return push(c);
  };
  const gm = make();
  await gm.applyStep(step("gpu"));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].entries.length, 1);
  assert.equal(seen[0].entries[0].status, "pending");
  assert.equal(seen[0].entries[0].undo.previous, "GpuPreference=1;");
  assert.equal(env.disk.entries[0].status, "applied");
});

test("failed apply is undone best-effort and removed", async () => {
  const { env, make } = makeEnv({ gpu: "GpuPreference=1;" });
  const gm = make();
  env.failUndo.add("setGpu"); // the apply itself fails; so does the undo, so it stays
  await assert.rejects(gm.applyStep(step("gpu")));
  assert.equal(env.disk.entries.length, 1);
  assert.equal(env.disk.entries[0].status, "pending");
  assert.equal(gm.journalFailed(), 1);
  env.failUndo.clear();
  const r = await gm.restoreStep(step("gpu"));
  assert.equal(r.ok, true);
  assert.equal(env.disk.entries.length, 0);
  assert.equal(env.gpu, "GpuPreference=1;");
});

test("crash mid-recovery: entries are removed one at a time, only after undo succeeds", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED, gpu: "GpuPreference=1;" });
  const gm = make();
  await gm.applyStep(step("power"));
  await gm.applyStep(step("gpu"));
  await gm.applyStep(step("poll"));
  assert.equal(env.overlay, BEST);
  assert.equal(env.disk.entries.length, 3);

  // New process. The gpu undo fails (registry error), the others must still go.
  env.failUndo.add("setGpu");
  const gm2 = make();
  const res = await gm2.recoverIfNeeded();
  assert.deepEqual(res, { restored: 2, failed: 1 });
  assert.equal(env.slow, false);
  assert.equal(env.overlay, BALANCED);
  assert.equal(env.disk.entries.length, 1);
  assert.equal(env.disk.entries[0].step.id, "gpu");
  assert.equal(env.disk.entries[0].retries, 1);
  assert.equal(gm2.journal().journalFailed, 1);
  assert.equal(gm2.journal().entries.length, 1);

  // Next launch: it retries and succeeds.
  env.failUndo.clear();
  const gm3 = make();
  assert.deepEqual(await gm3.recoverIfNeeded(), { restored: 1, failed: 0 });
  assert.equal(env.disk.entries.length, 0);
  assert.equal(env.gpu, "GpuPreference=1;");
});

test("crash between pending write and apply leaves a recoverable entry", async () => {
  const { env, make } = makeEnv({ gpu: null });
  // Simulate: process died after the pending write. Disk holds a pending gpu entry.
  env.disk = {
    entries: [{ id: "x1", step: step("gpu"), undo: { kind: "gpu", exe: EXE, previous: null }, status: "pending" }],
  };
  env.gpu = "GpuPreference=2;";
  const gm = make();
  await gm.recoverIfNeeded();
  assert.equal(env.gpu, null);
  assert.equal(env.disk.entries.length, 0);
});

test("double apply does not overwrite the original previous value", async () => {
  const { env, make } = makeEnv({ gpu: "GpuPreference=1;" });
  const gm = make();
  const a = await gm.applyStep(step("gpu"));
  const b = await gm.applyStep(step("gpu"));
  assert.equal(b.already, true);
  assert.equal(b.entryId, a.entryId);
  assert.equal(env.disk.entries.length, 1);
  assert.equal(env.disk.entries[0].undo.previous, "GpuPreference=1;");
  await gm.restoreStep(step("gpu"));
  assert.equal(env.gpu, "GpuPreference=1;");
});

test("concurrent applies are serialized", async () => {
  const { env, make } = makeEnv({ gpu: "GpuPreference=1;" });
  const gm = make();
  const [a, b] = await Promise.all([gm.applyStep(step("gpu")), gm.applyStep(step("gpu"))]);
  assert.equal(a.ok && b.ok, true);
  assert.equal(env.disk.entries.length, 1);
  assert.equal(env.calls.filter((c) => c[0] === "setGpu").length, 1);
});

test("restoring an unknown or already-undone step is a no-op", async () => {
  const { env, make } = makeEnv({ gpu: "GpuPreference=1;" });
  const gm = make();
  assert.deepEqual(await gm.restoreStep(step("nope")), { ok: true, already: true });
  assert.deepEqual(await gm.restoreStep({ id: "gpu", entryId: "missing" }), { ok: true, already: true });
  const { entryId } = await gm.applyStep(step("gpu"));
  assert.equal((await gm.restoreStep({ ...step("gpu"), entryId })).ok, true);
  const calls = env.calls.length;
  assert.deepEqual(await gm.restoreStep({ ...step("gpu"), entryId }), { ok: true, already: true });
  assert.equal(env.calls.length, calls); // nothing touched the registry again
});

test("unknown step id is rejected and journals nothing", async () => {
  const { env, make } = makeEnv();
  const gm = make();
  await assert.rejects(gm.applyStep(step("bogus")), /Unknown game-mode step/);
  assert.equal(env.disk.entries.length, 0);
});

test("GPU with no previous value restores by deleting (previous = null)", async () => {
  const { env, make } = makeEnv({ gpu: null });
  const gm = make();
  await gm.applyStep(step("gpu"));
  assert.equal(env.gpu, "GpuPreference=2;");
  assert.equal(env.disk.entries[0].undo.previous, null);
  await gm.restoreStep(step("gpu"));
  assert.equal(env.gpu, null);
  assert.deepEqual(env.calls.at(-1), ["setGpu", EXE, null]);
});

test("GPU pre-existing value is restored exactly", async () => {
  const { env, make } = makeEnv({ gpu: "GpuPreference=1;" });
  const gm = make();
  await gm.applyStep(step("gpu"));
  await gm.restoreStep(step("gpu"));
  assert.equal(env.gpu, "GpuPreference=1;");
});

test("power 'unchanged' marker is skipped on restore", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED, powerIgnored: true });
  const gm = make();
  await gm.applyStep(step("power"));
  assert.equal(env.disk.entries[0].undo.unchanged, true);
  env.calls.length = 0;
  await gm.restoreStep(step("power"));
  assert.equal(env.calls.filter((c) => c[0] === "setPower").length, 0);
  assert.equal(env.disk.entries.length, 0);
});

test("power that did change is restored to the previous mode", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED });
  const gm = make();
  await gm.applyStep(step("power"));
  assert.equal(env.overlay, BEST);
  await gm.restoreStep(step("power"));
  assert.equal(env.overlay, BALANCED);
});

test("entry ids are unique across steps and restarts of the same step", async () => {
  const { env, make } = makeEnv({ gpu: null });
  const gm = make();
  const a = await gm.applyStep(step("gpu"));
  await gm.restoreStep(step("gpu"));
  const b = await gm.applyStep(step("gpu"));
  assert.notEqual(a.entryId, b.entryId);
  const c = await gm.applyStep(step("poll"));
  assert.notEqual(c.entryId, b.entryId);
  assert.equal(new Set(env.disk.entries.map((e) => e.id)).size, env.disk.entries.length);
});

test("a failed pending write stops the step before anything changes", async () => {
  const { env, make } = makeEnv({ gpu: null });
  const gm = make();
  env.crashOnSave = () => true;
  await assert.rejects(gm.applyStep(step("gpu")), /disk full/);
  assert.equal(env.gpu, null);
  assert.equal(env.calls.length, 0);
});

test("isProtected blocks system, anti-cheat and own processes", () => {
  for (const n of ["explorer.exe", "SVCHOST", "steam.exe", "Overwatch.exe", "EasyAntiCheat_EOS", "node", "claude"]) {
    assert.equal(isProtected(n), true, n);
  }
  for (const n of ["spotify.exe", "OneDrive.exe", "chrome"]) assert.equal(isProtected(n), false, n);
});

test("validProcessName rejects anything that could inject into a command", () => {
  for (const n of ["spotify.exe", "One Drive", "a-b_c.1"]) assert.equal(validProcessName(n), true, n);
  for (const n of ["", "-x", "a'b", "a;b", "a,b", "$(x)", "a\nb", "x".repeat(70)]) {
    assert.equal(validProcessName(n), false, JSON.stringify(n));
  }
});

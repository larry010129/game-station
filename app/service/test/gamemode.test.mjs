import test from "node:test";
import assert from "node:assert/strict";
import { cleanStep, createGameMode } from "../gamemode.mjs";
import { PowerRefusedError, isProtected, validProcessName } from "../system.mjs";

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
    ignore: new Set(), // power GUIDs Windows silently ignores
    breakReadOn: null, // power GUID after which getPowerOverlay throws
    readBroken: false,
    afterSet: new Map(), // power GUID -> () => Error thrown after the set took effect
    beforeSet: new Map(), // power GUID -> () => Error thrown without changing anything
    journalReadError: null, // makes the journal read throw (corrupt / locked file)
    journalReads: 0,
    running: true, // is the game running
    priority: "Normal", // the game's priority class
    startAfter: 0, // the game starts after this many sleeps (0 = never changes)
    sleeps: 0,
    trimFails: null,
    cleanFails: null,
  };
  const system = {
    detectOverwatch: async () => ({ exe: EXE, appId: "1" }),
    getPowerOverlay: async () => {
      if (env.readBroken) throw new Error("read-back boom");
      return env.overlay;
    },
    setPowerOverlay: async (g) => {
      env.calls.push(["setPower", g]);
      if (env.failUndo.has("setPower")) throw new Error("boom");
      if (env.beforeSet.has(g)) throw env.beforeSet.get(g)();
      if (!powerIgnored && !env.ignore.has(g)) env.overlay = g;
      if (env.breakReadOn === g) env.readBroken = true; // the set worked, but reading it back now throws
      if (env.afterSet.has(g)) throw env.afterSet.get(g)(); // the set worked, then the call "timed out"
    },
    getGpuPreference: async () => env.gpu,
    setGpuPreference: async (exe, v) => {
      env.calls.push(["setGpu", exe, v]);
      if (env.failUndo.has("setGpu")) throw new Error("reg boom");
      env.gpu = v;
    },
    findProcesses: async () => [],
    closePolitely: async () => true,
    isRunning: async () => env.running,
    getProcessPriority: async () => (env.running ? env.priority : null),
    setProcessPriority: async (name, level) => {
      env.calls.push(["setPriority", name, level]);
      env.priority = level;
    },
    gpuWord: () => "x",
  };
  const sensors = { setSlow: (v) => (env.slow = v) };
  const logs = [];
  let n = 0;
  const deps = {
    system,
    journalFile: "fake-journal.json",
    readJson: () => {
      env.journalReads++;
      if (env.journalReadError) throw env.journalReadError;
      return JSON.parse(JSON.stringify(env.disk));
    },
    keepBad: (f) => env.calls.push(["keepBad", f]),
    writeJson: (_f, v) => {
      if (env.crashOnSave?.(v)) throw new Error("disk full");
      env.disk = JSON.parse(JSON.stringify(v));
    },
    launch: () => env.calls.push(["launch"]),
    trim: async () => {
      env.calls.push(["trim"]);
      if (env.trimFails) throw env.trimFails;
      return { freedMb: 40 };
    },
    cleanMemory: async () => {
      env.calls.push(["cleanMemory"]);
      if (env.cleanFails) throw env.cleanFails;
      return { freedMb: 900 };
    },
    sleep: async () => {
      env.sleeps++;
      if (env.startAfter && env.sleeps >= env.startAfter) env.running = true;
    },
    priorityTries: 3,
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

test("power: already on Best is left alone, never downgraded to Better", async () => {
  const { env, make } = makeEnv({ overlay: BEST });
  const gm = make();
  await gm.applyStep(step("power"));
  assert.equal(env.overlay, BEST);
  assert.equal(env.calls.filter((c) => c[0] === "setPower").length, 0);
  assert.equal(env.disk.entries[0].undo.unchanged, true);
  await gm.restoreStep(step("power"));
  assert.equal(env.calls.filter((c) => c[0] === "setPower").length, 0);
  assert.equal(env.overlay, BEST);
});

const BETTER = "3af9b8d9-7c97-431d-ad78-34a8bfea439f";

test("power: set succeeded but read-back throws -> no downgrade to Better, undo still restores", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED });
  env.breakReadOn = BEST;
  const gm = make();
  await gm.applyStep(step("power"));
  const sets = env.calls.filter((c) => c[0] === "setPower");
  assert.deepEqual(sets, [["setPower", BEST]]); // Better was never tried on top of an unverified Best
  assert.equal(env.overlay, BEST);
  assert.notEqual(env.disk.entries[0].undo.unchanged, true);
  env.readBroken = false;
  await gm.restoreStep(step("power"));
  assert.equal(env.overlay, BALANCED);
  assert.equal(env.disk.entries.length, 0);
});

test("power: Best ignored, Better set but unreadable -> restore still puts the old mode back", async () => {
  const { env, logs, make } = makeEnv({ overlay: BALANCED });
  env.ignore.add(BEST); // Best: set ok, read-back confirms nothing moved
  env.breakReadOn = BETTER; // Better: set ok, read-back throws
  const gm = make();
  await gm.applyStep(step("power"));
  assert.equal(env.calls.filter((c) => c[0] === "setPower").length, 2);
  assert.notEqual(env.disk.entries[0].undo.unchanged, true);
  assert.ok(logs.some((l) => /could not be verified/.test(l)));
  env.overlay = BETTER; // the unverified set did take effect
  env.readBroken = false;
  await gm.restoreStep(step("power"));
  assert.equal(env.overlay, BALANCED);
});

test("power: read-back confirms the old value for every target -> unchanged, nothing to restore", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED, powerIgnored: true });
  const gm = make();
  await gm.applyStep(step("power"));
  assert.equal(env.disk.entries[0].undo.unchanged, true);
  assert.equal(env.calls.filter((c) => c[0] === "setPower").length, 2);
});

const timeoutErr = () => Object.assign(new Error("Command failed: timed out after 15000 ms"), { killed: true, signal: "SIGTERM" });

test("power: a set that times out is unverified -> loop stops, not marked unchanged, restore re-sets the previous mode", async () => {
  const { env, logs, make } = makeEnv({ overlay: BALANCED });
  env.afterSet.set(BEST, timeoutErr); // Best was applied, then the call timed out
  const gm = make();
  await gm.applyStep(step("power"));
  assert.deepEqual(env.calls.filter((c) => c[0] === "setPower"), [["setPower", BEST]]); // Better never stacked on top
  assert.notEqual(env.disk.entries[0].undo.unchanged, true);
  assert.ok(logs.some((l) => /could not be verified/.test(l)));
  env.afterSet.clear();
  await gm.restoreStep(step("power"));
  assert.equal(env.overlay, BALANCED); // restore set the previous mode again
  assert.equal(env.disk.entries.length, 0);
});

test("power: only a typed Windows refusal means unchanged and lets the next target be tried", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED });
  env.beforeSet.set(BEST, () => new PowerRefusedError(5)); // Windows said no to Best
  const gm = make();
  await gm.applyStep(step("power"));
  assert.deepEqual(env.calls.filter((c) => c[0] === "setPower").map((c) => c[1]), [BEST, BETTER]);
  assert.equal(env.overlay, BETTER);
  assert.notEqual(env.disk.entries[0].undo.unchanged, true); // Better did apply

  const b = makeEnv({ overlay: BALANCED });
  b.env.beforeSet.set(BEST, () => new PowerRefusedError(5));
  b.env.beforeSet.set(BETTER, () => new PowerRefusedError(5));
  const gm2 = b.make();
  await gm2.applyStep(step("power"));
  assert.equal(b.env.disk.entries[0].undo.unchanged, true); // refused everywhere: nothing to restore
});

test("power: a plain failure that is not a typed refusal (kill, timeout before any answer) is unverified too", async () => {
  const { env, make } = makeEnv({ overlay: BALANCED });
  env.beforeSet.set(BEST, timeoutErr);
  const gm = make();
  await gm.applyStep(step("power"));
  assert.equal(env.calls.filter((c) => c[0] === "setPower").length, 1); // stopped after the first
  assert.notEqual(env.disk.entries[0].undo.unchanged, true);
});

test("an unreadable journal is never treated as empty: steps refuse, a copy is kept, health reports it", async () => {
  const { env, logs, make } = makeEnv({ gpu: null });
  env.disk = { entries: [{ id: "keep", step: step("gpu"), undo: { kind: "gpu", exe: EXE, previous: null }, status: "applied" }] };
  const before = JSON.stringify(env.disk);
  env.journalReadError = Object.assign(new SyntaxError("Unexpected token } in JSON"), { code: undefined });
  const gm = make();
  assert.ok(gm.journalError());
  assert.equal(gm.journalFailed(), 1);
  assert.equal(gm.journal().journalError, gm.journalError());
  assert.ok(env.calls.some((c) => c[0] === "keepBad"));
  assert.ok(logs.some((l) => /could not be read/.test(l)));
  await assert.rejects(gm.applyStep(step("gpu")), (e) => e.status === 409 && /journal could not be read/.test(e.message));
  await gm.recoverIfNeeded();
  assert.equal(env.gpu, null); // no step ran
  assert.equal(JSON.stringify(env.disk), before); // and the file on disk was never rewritten
  // Locked file (EBUSY) is the same, not "no journal".
  env.journalReadError = Object.assign(new Error("busy"), { code: "EBUSY" });
  assert.match(make().journalError(), /EBUSY/);
});

test("a missing journal is fine and a healthy one reports no error", async () => {
  const { env, make } = makeEnv({ gpu: null });
  const gm = make();
  assert.equal(gm.journalError(), null);
  assert.equal(gm.journalFailed(), 0);
  assert.equal((await gm.applyStep(step("gpu"))).ok, true);
  assert.equal(env.disk.entries.length, 1);
});

test("the default journal reader treats only ENOENT as 'no journal'", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const { readJsonStrict } = await import("../paths.mjs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-journal-"));
  try {
    const f = path.join(dir, "journal.json");
    assert.deepEqual(readJsonStrict(f, { entries: [] }), { entries: [] }); // ENOENT -> fallback
    fs.writeFileSync(f, "{ not json");
    assert.throws(() => readJsonStrict(f, { entries: [] })); // corrupt -> throws
    assert.throws(() => readJsonStrict(dir, { entries: [] })); // unreadable (EISDIR) -> throws
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("journal entries keep only the step id and label, never the rest of a client object", async () => {
  const { env, make } = makeEnv({ gpu: null });
  const gm = make();
  await gm.applyStep({ id: "gpu", label: "GPU", before: "x", after: "y", huge: "z".repeat(10_000), nested: { a: 1 } });
  assert.deepEqual(env.disk.entries[0].step, { id: "gpu", label: "GPU" });
});

test("cleanStep: only a string id from the known set gets through; the rest is a 400", () => {
  for (const bad of [null, undefined, {}, { id: 1 }, { id: ["gpu"] }, { id: { toString: () => "gpu" } }, { id: true }, { id: "bogus" }, { id: "__proto__" }, { id: "" }]) {
    assert.throws(() => cleanStep(bad), (e) => e.status === 400, JSON.stringify(bad));
  }
  assert.deepEqual(cleanStep({ id: "gpu", label: "G", before: "a", after: "b", extra: 1 }), { id: "gpu", label: "G", before: "a", after: "b" });
  assert.deepEqual(cleanStep({ id: "poll", label: 5, before: {}, entryId: "e1" }), { id: "poll", label: "poll", entryId: "e1" });
  assert.equal(cleanStep({ id: "power", label: "x".repeat(500) }).label.length, 200);
});

test("trim and memory steps run their cleaners, and a refusal does not stop game mode", async () => {
  const { env, logs, make } = makeEnv();
  const gm = make();
  await gm.applyStep(step("trim"));
  await gm.applyStep(step("memory"));
  assert.deepEqual(
    env.calls.filter((c) => c[0] === "trim" || c[0] === "cleanMemory").map((c) => c[0]),
    ["trim", "cleanMemory"],
  );
  assert.equal(env.disk.entries.find((e) => e.step.id === "memory").undo.freedMb, 900);

  env.cleanFails = new Error("Administrator permission was declined.");
  const again = make();
  await again.restoreStep(step("memory"));
  await again.applyStep(step("memory")); // does not throw
  assert.match(logs.join(" | "), /system memory was not cleaned: Administrator permission was declined/);
  assert.equal(env.disk.entries.find((e) => e.step.id === "memory").undo.unchanged, true);
});

test("priority step raises the game to High and puts the old priority back on undo", async () => {
  const { env, make } = makeEnv();
  const gm = make();
  await gm.applyStep(step("priority"));
  assert.equal(env.priority, "High");
  assert.deepEqual(env.calls.find((c) => c[0] === "setPriority"), ["setPriority", "Overwatch.exe", "High"]);
  await gm.restoreStep(step("priority"));
  assert.equal(env.priority, "Normal");
  assert.equal(env.disk.entries.length, 0);
});

test("priority step waits for the game to start, then raises it", async () => {
  const { env, make } = makeEnv();
  env.running = false;
  env.startAfter = 2; // the game appears after the second wait
  await make().applyStep(step("priority"));
  assert.equal(env.sleeps, 2);
  assert.equal(env.priority, "High");
});

test("priority step leaves the game alone if it never starts", async () => {
  const { env, logs, make } = makeEnv();
  env.running = false;
  const gm = make();
  await gm.applyStep(step("priority")); // does not throw
  assert.equal(env.calls.some((c) => c[0] === "setPriority"), false);
  assert.match(logs.join(" | "), /did not start/);
  await gm.restoreStep(step("priority"));
  assert.equal(env.calls.some((c) => c[0] === "setPriority"), false);
});

test("priority undo does nothing once the game has closed", async () => {
  const { env, make } = makeEnv();
  const gm = make();
  await gm.applyStep(step("priority"));
  env.running = false;
  await gm.restoreStep(step("priority"));
  assert.equal(env.calls.filter((c) => c[0] === "setPriority").length, 1);
  assert.equal(env.disk.entries.length, 0);
});

test("the new steps are known ids, and the ranked profile lists them in order", async () => {
  assert.deepEqual(cleanStep({ id: "priority", label: "x" }), { id: "priority", label: "x" });
  assert.deepEqual(cleanStep({ id: "trim" }), { id: "trim", label: "trim" });
  assert.deepEqual(cleanStep({ id: "memory" }), { id: "memory", label: "memory" });
  const { make } = makeEnv();
  const profiles = await make().describeProfiles();
  assert.deepEqual(profiles[0].steps.map((s) => s.id), ["power", "close", "trim", "memory", "gpu", "poll", "launch", "priority"]);
  assert.deepEqual(profiles[1].steps.map((s) => s.id), ["power", "close", "trim", "poll"]);
});

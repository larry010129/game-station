// Update type 2 (the exe itself): version rules and the check -> download -> install -> restart state machine.
import test from "node:test";
import assert from "node:assert/strict";

import { compareVersions, createExeUpdater, isMajorUpdate, majorOf, needsNewerExe } from "../../src/content/exeUpdate.ts";

test("compareVersions compares numbers, not text", () => {
  assert.equal(compareVersions("1.10", "1.9"), 1);
  assert.equal(compareVersions("0.3.0", "0.3.1"), -1);
  assert.equal(compareVersions("v1.0.0", "1.0"), 0);
  assert.equal(compareVersions("2", "1.99.99"), 1);
  assert.equal(compareVersions("1.0-beta", "1.0"), 0);
  assert.equal(compareVersions("garbage", "0"), 0);
});

test("majorOf and isMajorUpdate: only the first number counts", () => {
  assert.equal(majorOf("2.4.1"), 2);
  assert.equal(majorOf("v10.0"), 10);
  assert.equal(isMajorUpdate("2.0.0", "1.9.9"), true);
  assert.equal(isMajorUpdate("1.9.9", "1.0.0"), false); // minor / patch exe: ignored
  assert.equal(isMajorUpdate("1.0.1", "1.0.0"), false);
  assert.equal(isMajorUpdate("1.0.0", "2.0.0"), false); // never go back
});

test("needsNewerExe: only a higher major blocks content; no minimum means any exe works", () => {
  assert.equal(needsNewerExe(undefined, "1.0.0"), false);
  assert.equal(needsNewerExe("", "1.0.0"), false);
  assert.equal(needsNewerExe("2.0", "1.5.3"), true);
  assert.equal(needsNewerExe("1.9", "1.0.0"), false); // same major: content works
  assert.equal(needsNewerExe("2", "2.0.0"), false);
});

function update(version, { fail = 0, events } = {}) {
  let tries = 0;
  return {
    version,
    async downloadAndInstall(onProgress) {
      tries++;
      if (tries <= fail) throw new Error("network down");
      for (const e of events ?? [
        { event: "Started", data: { contentLength: 200 } },
        { event: "Progress", data: { chunkLength: 100 } },
        { event: "Progress", data: { chunkLength: 100 } },
        { event: "Finished" },
      ])
        onProgress(e);
    },
  };
}

test("a newer minor or patch exe on the host is ignored (no download, no restart)", async () => {
  let relaunched = 0;
  let downloaded = 0;
  const found = { version: "1.4.0", downloadAndInstall: async () => void downloaded++ };
  const u = createExeUpdater({ check: async () => found, relaunch: async () => void relaunched++, currentVersion: "1.0.0" });
  assert.equal((await u.run()).phase, "idle");
  assert.equal(downloaded, 0);
  assert.equal(relaunched, 0);
});

test("current exe: stays idle and does not restart", async () => {
  let relaunched = 0;
  const u = createExeUpdater({ check: async () => null, relaunch: async () => void relaunched++ });
  assert.deepEqual((await u.run()).phase, "idle");
  assert.equal(relaunched, 0);
});

test("newer exe: downloads with progress, installs, then restarts", async () => {
  let relaunched = 0;
  const seen = [];
  const u = createExeUpdater({ check: async () => update("2.0.0"), relaunch: async () => void relaunched++ });
  u.subscribe(() => seen.push(JSON.stringify(u.get())));
  await u.run();
  assert.equal(relaunched, 1);
  assert.ok(seen.some((s) => s.includes('"percent":50')));
  assert.ok(seen.some((s) => s.includes('"percent":100')));
  assert.equal(u.get().phase, "installing");
});

test("a failed download blocks with its version, and Retry finishes it", async () => {
  let relaunched = 0;
  const found = update("2.0.0", { fail: 1 });
  const u = createExeUpdater({ check: async () => found, relaunch: async () => void relaunched++ });
  const first = await u.run();
  assert.equal(first.phase, "failed");
  assert.equal(first.version, "2.0.0"); // version known -> the screen keeps the forced popup
  assert.equal(relaunched, 0);
  await u.retry();
  assert.equal(relaunched, 1);
});

test("a failed check (offline) has no version, so the screen does not block", async () => {
  const u = createExeUpdater({
    check: async () => {
      throw new Error("offline");
    },
    relaunch: async () => {},
  });
  const s = await u.run();
  assert.equal(s.phase, "failed");
  assert.equal(s.version, null);
});

test("run twice at once only downloads once", async () => {
  let checks = 0;
  const u = createExeUpdater({
    check: async () => {
      checks++;
      await new Promise((r) => setTimeout(r, 20));
      return null;
    },
    relaunch: async () => {},
  });
  await Promise.all([u.run(), u.run()]);
  assert.equal(checks, 1);
});

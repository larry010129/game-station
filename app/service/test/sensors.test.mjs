import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createSensors } from "../sensors.mjs";
import { fakeSpawner } from "./fakeChild.mjs";

function mk() {
  const spawn = fakeSpawner();
  const sensors = createSensors({ games: ["Overwatch.exe"], regionHost: "example.invalid" }, () => {}, {
    spawnSafe: spawn,
    run: async () => {
      throw new Error("no tools in tests");
    },
    powershell: async () => "",
    isRunning: async () => false,
    tcpMs: async () => null,
  });
  return { spawn, sensors };
}
const nvidia = (spawn) => spawn.calls.filter((c) => c.file === "nvidia-smi");

test("a dying stream restarts after 5 s, then 10 s, and its timer entry is removed when it fires", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { spawn, sensors } = mk();
    sensors.start();
    assert.equal(nvidia(spawn).length, 1);
    const base = sensors.timerCount();

    nvidia(spawn)[0].child.finish(1);
    assert.equal(sensors.timerCount(), base + 1); // the pending restart
    mock.timers.tick(4999);
    assert.equal(nvidia(spawn).length, 1);
    mock.timers.tick(1);
    assert.equal(nvidia(spawn).length, 2);
    assert.equal(sensors.timerCount(), base); // fired: the entry is gone (no leak per restart)

    nvidia(spawn)[1].child.finish(1);
    mock.timers.tick(9999);
    assert.equal(nvidia(spawn).length, 2);
    mock.timers.tick(1);
    assert.equal(nvidia(spawn).length, 3);
    assert.equal(sensors.timerCount(), base);

    sensors.stop();
    nvidia(spawn)[2].child.finish(1); // after stop nothing is rescheduled
    mock.timers.tick(10 * 60_000);
    assert.equal(nvidia(spawn).length, 3);
  } finally {
    mock.timers.reset();
  }
});

test("a missing executable is reported through the source state and retried only at the slowest backoff", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { spawn, sensors } = mk();
    sensors.start();
    const c = nvidia(spawn)[0].child;
    c.emit("error", Object.assign(new Error("spawn nvidia-smi ENOENT"), { code: "ENOENT" }));
    assert.equal(sensors.state.sources.nvidia.state, "unavailable");
    c.finish(1);
    mock.timers.tick(4 * 60_000);
    assert.equal(nvidia(spawn).length, 1);
    mock.timers.tick(60_000);
    assert.equal(nvidia(spawn).length, 2);
    sensors.stop();
  } finally {
    mock.timers.reset();
  }
});

test("setSlow restarts nvidia-smi with a 3 s interval; setPaused stops it until cleared", () => {
  const { spawn, sensors } = mk();
  sensors.start();
  assert.equal(nvidia(spawn).length, 1);
  assert.deepEqual(nvidia(spawn)[0].args.slice(-2), ["-l", "1"]);

  sensors.setSlow(true);
  assert.equal(nvidia(spawn).length, 2);
  assert.deepEqual(nvidia(spawn)[1].args.slice(-2), ["-l", "3"]);
  assert.equal(nvidia(spawn)[0].child.killed, true);

  sensors.setPaused(true);
  assert.equal(nvidia(spawn).length, 2); // no new child while paused
  assert.equal(nvidia(spawn)[1].child.killed, true);

  sensors.setPaused(false);
  assert.equal(nvidia(spawn).length, 3);
  assert.deepEqual(nvidia(spawn)[2].args.slice(-2), ["-l", "3"]);

  sensors.setSlow(false);
  assert.equal(nvidia(spawn).length, 4);
  assert.deepEqual(nvidia(spawn)[3].args.slice(-2), ["-l", "1"]);
  sensors.stop();
});

test("setClientSlow alone slows the stream without game mode", () => {
  const { spawn, sensors } = mk();
  sensors.start();
  sensors.setClientSlow(true);
  assert.deepEqual(nvidia(spawn).at(-1).args.slice(-2), ["-l", "3"]);
  sensors.setClientSlow(false);
  assert.deepEqual(nvidia(spawn).at(-1).args.slice(-2), ["-l", "1"]);
  sensors.stop();
});

test("a stream that ran healthy for over 30 s restarts after 5 s again; a short run keeps the longer backoff", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const { spawn, sensors } = mk();
    sensors.start();
    // Crash right away: restart after 5 s, and the next delay is 10 s.
    nvidia(spawn)[0].child.finish(1);
    mock.timers.tick(5000);
    assert.equal(nvidia(spawn).length, 2);

    // The second run lives 31 s: a healthy run, so the delay resets to 5 s (not the 10 s it would have been).
    mock.timers.tick(31_000);
    nvidia(spawn)[1].child.finish(1);
    mock.timers.tick(4999);
    assert.equal(nvidia(spawn).length, 2);
    mock.timers.tick(1);
    assert.equal(nvidia(spawn).length, 3);

    // The third run dies after 10 s: not healthy, so no reset; the delay keeps doubling (10 s).
    mock.timers.tick(10_000);
    nvidia(spawn)[2].child.finish(1);
    mock.timers.tick(5000);
    assert.equal(nvidia(spawn).length, 3);
    mock.timers.tick(5000);
    assert.equal(nvidia(spawn).length, 4);
    sensors.stop();
  } finally {
    mock.timers.reset();
  }
});

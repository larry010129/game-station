import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createToasts } from "../toasts.mjs";
import { fakeSpawner, flush } from "./fakeChild.mjs";

const mk = () => {
  const spawn = fakeSpawner();
  const toasts = createToasts(() => {}, { spawnSafe: spawn, platform: "win32" });
  return { spawn, toasts };
};

test("restart delay doubles 4s, 8s, 16s and resets to 4s after a healthy run", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const { spawn, toasts } = mk();
    toasts.start();
    assert.equal(spawn.calls.length, 1);

    spawn.calls[0].child.finish(1); // dies at once: next start in 4 s
    assert.equal(toasts.snapshot().access, "error");
    mock.timers.tick(3999);
    assert.equal(spawn.calls.length, 1);
    mock.timers.tick(1);
    assert.equal(spawn.calls.length, 2);

    spawn.calls[1].child.finish(1); // next in 8 s
    mock.timers.tick(7999);
    assert.equal(spawn.calls.length, 2);
    mock.timers.tick(1);
    assert.equal(spawn.calls.length, 3);

    spawn.calls[2].child.finish(1); // next in 16 s
    mock.timers.tick(15999);
    assert.equal(spawn.calls.length, 3);
    mock.timers.tick(1);
    assert.equal(spawn.calls.length, 4);

    // A helper that lived over 30 s is healthy: the delay goes back to 4 s.
    mock.timers.tick(31_000);
    spawn.calls[3].child.finish(1);
    mock.timers.tick(3999);
    assert.equal(spawn.calls.length, 4);
    mock.timers.tick(1);
    assert.equal(spawn.calls.length, 5);
    toasts.stop();
  } finally {
    mock.timers.reset();
  }
});

test("exit and error from the same helper schedule only one restart", () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const { spawn, toasts } = mk();
    toasts.start();
    const c = spawn.calls[0].child;
    c.emit("error", new Error("x"));
    c.finish(1);
    mock.timers.tick(4000);
    assert.equal(spawn.calls.length, 2);
    mock.timers.tick(60_000);
    assert.equal(spawn.calls.length, 2);
    toasts.stop();
  } finally {
    mock.timers.reset();
  }
});

test("a notification line becomes the snapshot; stop() prevents restarts", async () => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    const { spawn, toasts } = mk();
    toasts.start();
    spawn.calls[0].child.stdout.write(JSON.stringify({ access: "allowed", items: [{ app: "Discord" }] }) + "\n");
    await flush();
    assert.equal(toasts.snapshot().access, "allowed");
    assert.equal(toasts.snapshot().items.length, 1);
    toasts.stop();
    spawn.calls[0].child.finish(0);
    mock.timers.tick(10 * 60_000);
    assert.equal(spawn.calls.length, 1);
  } finally {
    mock.timers.reset();
  }
});

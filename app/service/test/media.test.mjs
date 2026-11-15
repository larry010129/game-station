import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createMedia } from "../media.mjs";
import { fakeSpawner, flush } from "./fakeChild.mjs";

const mk = () => {
  const spawn = fakeSpawner();
  const logs = [];
  const media = createMedia((m) => logs.push(m), { spawnSafe: spawn, writeScript: () => {} });
  return { spawn, logs, media };
};
const line = (o) => JSON.stringify(o) + "\n";

async function timeoutOnce(media) {
  const p = media.status();
  await flush();
  mock.timers.tick(6000);
  return p;
}

test("3 silent commands in a row recycle the helper; the next command starts a fresh one", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { spawn, logs, media } = mk();
    for (let i = 0; i < 3; i++) assert.deepEqual(await timeoutOnce(media), { available: false, error: "no answer" });
    assert.equal(spawn.calls.length, 1);
    assert.equal(spawn.calls[0].child.killed, true);
    assert.ok(logs.some((l) => /3 timeouts in a row/.test(l)));
    const p = media.status();
    await flush();
    assert.equal(spawn.calls.length, 2); // a new helper
    spawn.calls[1].child.stdout.write(line({ available: true, title: "T", status: 4, key: "k" }));
    const r = await p;
    assert.equal(r.title, "T");
    assert.equal(r.playing, true);
  } finally {
    mock.timers.reset();
  }
});

test("late output from a recycled helper never reaches the new helper's waiter", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { spawn, media } = mk();
    for (let i = 0; i < 3; i++) await timeoutOnce(media);
    const old = spawn.calls[0].child;
    const p = media.status();
    await flush();
    const fresh = spawn.calls[1].child;
    let settled = false;
    p.then(() => (settled = true));
    old.stdout.write('{"available":true,"title":"OLD"}\n{"avail'); // a stale answer plus a stale half line
    await flush();
    assert.equal(settled, false);
    fresh.stdout.write(line({ available: true, title: "NEW", status: 4, key: "k" }));
    assert.equal((await p).title, "NEW");
  } finally {
    mock.timers.reset();
  }
});

test("a helper that exits answers every waiting command at once", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { spawn, media } = mk();
    const p = media.status();
    await flush();
    spawn.calls[0].child.finish(1);
    assert.deepEqual(await p, { available: false, error: "no answer" });
  } finally {
    mock.timers.reset();
  }
});

test("an answer resets the timeout streak", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { spawn, media } = mk();
    for (let i = 0; i < 2; i++) await timeoutOnce(media);
    // The two timed-out waiters are still queued, so the helper's next two lines answer them; the third is this command's.
    const p = media.status();
    await flush();
    const out = spawn.calls[0].child.stdout;
    out.write(line({ available: false }));
    out.write(line({ available: false }));
    out.write(line({ available: true, title: "ok", status: 4, key: "k" }));
    assert.equal((await p).title, "ok");
    await timeoutOnce(media);
    assert.equal(spawn.calls.length, 1); // one timeout after a reset is not a recycle
    assert.equal(spawn.calls[0].child.killed, false);
  } finally {
    mock.timers.reset();
  }
});

test("a helper answer that is valid JSON but not an object is 'unreadable', not a crash", async () => {
  const { spawn, media } = mk();
  for (const raw of ["null", "1", "[]", '"text"']) {
    const p = media.status();
    await flush();
    spawn.calls[0].child.stdout.write(raw + "\n");
    assert.deepEqual(await p, { available: false, error: "unreadable" }, raw);
  }
});

test("stop() kills the helper, forgets it, and never starts another", async () => {
  const { spawn, media } = mk();
  const p = media.status();
  await flush();
  const child = spawn.calls[0].child;
  media.stop();
  assert.equal(child.killed, true);
  assert.deepEqual(await p, { available: false, error: "no answer" }); // the waiting command is released
  assert.deepEqual(await media.status(), { available: false, error: "no answer" });
  assert.equal(spawn.calls.length, 1); // stopped: no new helper
});

test("toasts asks the helper for the toast list (force asks for all of it) and returns a plain object", async () => {
  const { spawn, media } = mk();
  const p = media.toasts();
  await flush();
  const child = spawn.calls[0].child;
  child.stdout.write(line({ toasts: true, unchanged: true }));
  assert.deepEqual(await p, { toasts: true, unchanged: true });
  const q = media.toasts(true);
  await flush();
  child.stdout.write("[1]\n"); // not an object: no usable answer
  assert.equal(await q, null);
  const r = media.toasts();
  await flush();
  child.stdout.write("not json\n");
  assert.equal(await r, null);
});

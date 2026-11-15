import test from "node:test";
import assert from "node:assert/strict";
import { createTrim } from "../trim.mjs";

const quiet = () => {};

test("trim: runs the release callbacks, collects garbage, and reports what Windows gave back", async () => {
  const calls = [];
  const trim = createTrim({
    log: quiet,
    release: [() => calls.push("release")],
    collect: () => calls.push("gc"),
    platform: "win32",
    run: async (script) => {
      calls.push("ps");
      assert.match(script, /EmptyWorkingSet/);
      assert.doesNotMatch(script, /\$PID_SELF/);
      return '{"beforeMb":300,"afterMb":120,"processes":4}';
    },
  });
  assert.deepEqual(await trim.run(), { beforeMb: 300, afterMb: 120, freedMb: 180, processes: 4 });
  assert.deepEqual(calls, ["release", "gc", "ps"]);
});

test("trim: a failing release callback does not stop the clean-up", async () => {
  const logs = [];
  const trim = createTrim({
    log: (m) => logs.push(m),
    release: [
      () => {
        throw new Error("boom");
      },
    ],
    collect: () => {},
    platform: "win32",
    run: async () => '{"beforeMb":10,"afterMb":12,"processes":1}',
  });
  const r = await trim.run();
  assert.equal(r.freedMb, 0);
  assert.match(logs[0], /boom/);
});

test("trim: a second press while one is running shares the same run", async () => {
  let runs = 0;
  const trim = createTrim({
    log: quiet,
    collect: () => {},
    platform: "win32",
    run: async () => {
      runs++;
      await new Promise((r) => setTimeout(r, 20));
      return '{"beforeMb":5,"afterMb":4,"processes":1}';
    },
  });
  await Promise.all([trim.run(), trim.run()]);
  assert.equal(runs, 1);
});

test("trim: off Windows it only collects garbage", async () => {
  const trim = createTrim({ log: quiet, collect: () => {}, platform: "linux", run: async () => assert.fail("no PowerShell") });
  assert.equal((await trim.run()).freedMb, 0);
});

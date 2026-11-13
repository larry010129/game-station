import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";

/** A stand-in for a spawned process: piped stdio, "exit"/"close" on demand, kill() recorded. */
export function fakeChild() {
  const c = new EventEmitter();
  c.stdout = new PassThrough();
  c.stderr = new PassThrough();
  c.stdin = new PassThrough();
  c.written = [];
  c.stdin.on("data", (d) => c.written.push(String(d)));
  c.pid = undefined;
  c.exitCode = null;
  c.killed = false;
  c.kill = () => {
    c.killed = true;
  };
  c.finish = (code = 0) => {
    c.exitCode = code;
    c.emit("exit", code);
    c.emit("close", code);
  };
  return c;
}

/** A spawn replacement that records every call and returns a fresh fakeChild. */
export function fakeSpawner() {
  const calls = [];
  const spawn = (file, args) => {
    const child = fakeChild();
    calls.push({ file, args, child });
    return child;
  };
  spawn.calls = calls;
  return spawn;
}

/** Lets pending promise continuations and stream events run. */
export const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};

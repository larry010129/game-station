import readline from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { killTree, spawnSafe } from "./spawn.mjs";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "toasts.ps1");

/** Windows Action Center toasts (Discord, LINE, and any other app), via the user's own listener. */
export function createToasts(log, deps = {}) {
  const spawn = deps.spawnSafe ?? spawnSafe; // tests inject a fake spawner
  const platform = deps.platform ?? process.platform;
  let snapshot = { access: "pending", items: [], error: null };
  let child = null;
  let stopped = false;
  let restart;
  // Restart delay: 4 s doubling to 5 min, back to 4 s once a helper has run healthily for 30 s.
  const MIN_DELAY = 4000;
  const MAX_DELAY = 5 * 60_000;
  const HEALTHY_MS = 30_000;
  let delay = MIN_DELAY;
  const scheduleRestart = () => {
    restart = setTimeout(start, delay);
    delay = Math.min(delay * 2, MAX_DELAY);
  };

  function start() {
    if (stopped) return;
    if (platform !== "win32") {
      snapshot = { access: "unsupported", items: [], error: null };
      return;
    }
    child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
      log,
      "toasts helper",
    );
    if (!child) {
      snapshot = { access: "error", items: [], error: "The notification helper could not start." };
      scheduleRestart();
      return;
    }
    const mine = child;
    const startedAt = Date.now();
    const rl = readline.createInterface({ input: child.stdout });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{")) return;
      try {
        const data = JSON.parse(trimmed);
        const items = Array.isArray(data.items) ? data.items : data.items ? [data.items] : [];
        snapshot = {
          access: typeof data.access === "string" ? data.access : "error",
          items: items.slice(0, 40),
          error: data.error ?? null,
        };
      } catch {
        log("toasts: could not read a notification update");
      }
    });
    child.stderr.on("data", (buf) => {
      const msg = String(buf).replace(/\s+/g, " ").trim().slice(0, 180);
      if (msg) log(`toasts: ${msg}`);
    });
    // "error" (spawn failure) is logged by spawnSafe; "exit" may or may not follow it, so restart from either once.
    let ended = false;
    const onEnd = () => {
      if (ended) return;
      ended = true;
      if (child === mine) child = null;
      // After a spawn "error" the process may still be half alive: make sure it is gone before a new one starts.
      killTree(mine, log);
      if (stopped) return;
      if (Date.now() - startedAt > HEALTHY_MS) delay = MIN_DELAY;
      // Never keep showing the last notifications as if the helper were alive.
      snapshot = { access: "error", items: [], error: "The notification helper stopped. Restarting." };
      scheduleRestart();
    };
    child.on("exit", onEnd);
    child.on("error", onEnd);
  }

  return {
    start,
    stop() {
      stopped = true;
      clearTimeout(restart);
      killTree(child);
      child = null;
    },
    snapshot() {
      return snapshot;
    },
  };
}

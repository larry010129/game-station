// Long-running and detached child processes of the service go through this file (spawnSafe, spawnDetached,
// killTree), so start failures and tree kills are handled in one place. Exempt: one-shot execFile calls with a
// callback (system.mjs, memclean.mjs, the `where` probe in ai.mjs) and the dev launcher live.mjs.
import { execFile, spawn } from "node:child_process";

/**
 * spawn() that cannot crash the service. A child that fails to start (missing
 * executable, access denied) emits an async "error" event; without a listener Node
 * turns that into an uncaught exception. Returns the child, or null if spawn threw.
 */
export function spawnSafe(file, args, options, log, label = file) {
  let child;
  try {
    child = spawn(file, args, options);
  } catch (e) {
    log?.(`${label}: could not start: ${e.message}`);
    return null;
  }
  child.on("error", (e) => log?.(`${label}: ${e.code === "ENOENT" ? "not found" : `failed: ${e.message}`}`));
  return child;
}

/** Fire-and-forget launch of a program that keeps running on its own. Returns true if it was started. */
export function spawnDetached(file, args, options, log, label = file) {
  const child = spawnSafe(file, args, { stdio: "ignore", detached: true, ...options }, log, label);
  if (!child) return false;
  child.unref();
  return true;
}

/** Opens a `steam://rungameid/<appId>` link through the shell's `start`. */
export function launchSteamGame(appId, log) {
  return spawnDetached("cmd.exe", ["/c", "start", "", `steam://rungameid/${appId}`], { windowsHide: true }, log, "steam launch");
}

/**
 * Stops a child and everything it started. A child started with `shell: true` on Windows is a
 * cmd.exe, and child.kill() would end only that shell, leaving the real program running.
 * `log` (optional) hears about a taskkill that failed; exit 128 means the process was already gone, which is fine.
 */
export function killTree(child, log) {
  if (!child || child.exitCode != null || child.killed) return;
  if (process.platform === "win32" && child.pid) {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true }, (err) => {
      if (err && err.code !== 128) log?.(`taskkill failed for pid ${child.pid}: ${err.code ?? err.message}`);
    });
    return;
  }
  try {
    child.kill();
  } catch {
    // already gone
  }
}

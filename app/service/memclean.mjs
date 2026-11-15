import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "memclean.ps1");

let running = null;

function fail(message, status = 500) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Frees RAM natively (same areas as Windows Memory Cleaner's Optimize). The script path
 * and arguments are fixed; the dashboard cannot choose a program. Resolves with
 * { freedMb, freeMb, areas }. One run at a time.
 */
export function cleanMemory() {
  if (process.platform !== "win32") return Promise.reject(fail("Memory cleaning is Windows-only.", 501));
  if (running) return running;
  running = (async () => {
    // The script runs elevated, so run a private copy from a fresh random folder, not the long-lived install path.
    const dir = await mkdtemp(path.join(os.tmpdir(), `command-station-memclean-${randomBytes(4).toString("hex")}-`));
    const script = path.join(dir, "memclean.ps1");
    const out = path.join(dir, "result.json");
    try {
      await copyFile(SCRIPT, script);
      // Generous timeout: a UAC prompt may be waiting on the user. Once elevated, the child cannot be killed from here.
      const err = await new Promise((done) => {
        execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-Out", out], { windowsHide: true, timeout: 120000 }, (e) => done(e));
      });
      try {
        const r = JSON.parse((await readFile(out, "utf8")).trim());
        if (r.error) throw fail(r.error);
        return r;
      } catch (e) {
        if (e.status) throw e;
        throw fail(err?.message || "Memory cleaning did not produce a result.");
      }
    } finally {
      rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

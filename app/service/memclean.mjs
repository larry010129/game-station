import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
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
  const out = path.join(os.tmpdir(), `command-station-memclean-${randomBytes(6).toString("hex")}.json`);
  running = new Promise((resolve, reject) => {
    // Generous timeout: a UAC prompt may be waiting on the user.
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT, "-Out", out],
      { windowsHide: true, timeout: 120000 },
      async (err) => {
        try {
          const text = await readFile(out, "utf8");
          const r = JSON.parse(text.trim());
          if (r.error) reject(fail(r.error));
          else resolve(r);
        } catch {
          reject(fail(err?.message || "Memory cleaning did not produce a result."));
        } finally {
          rm(out, { force: true }).catch(() => {});
        }
      },
    );
  }).finally(() => {
    running = null;
  });
  return running;
}

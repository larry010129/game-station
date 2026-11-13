import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as realSystem from "./system.mjs";
import { JOURNAL_FILE, readJson, writeJson } from "./paths.mjs";

const { BEST_PERFORMANCE, OVERLAYS } = realSystem;
const BETTER_PERFORMANCE = "3af9b8d9-7c97-431d-ad78-34a8bfea439f";

function defaultLaunch(ow) {
  if (ow.appId) {
    spawn("cmd.exe", ["/c", "start", "", `steam://rungameid/${ow.appId}`], {
      windowsHide: true,
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn(ow.exe, [], { windowsHide: false, detached: true, stdio: "ignore" }).unref();
  }
}

/**
 * Game mode with a write-ahead undo journal.
 *
 * Every step follows the same order: snapshot the current value, write a
 * "pending" journal entry to disk, change the system, flip the entry to
 * "applied". A crash at any point leaves an entry that can be undone
 * (undoing a pending entry is best effort, it may restore a value that was
 * never changed). An entry is only removed after its undo succeeded.
 *
 * Optional `deps` (all default to the real thing):
 *   system      overrides for the functions imported from system.mjs
 *   journalFile path of the journal file
 *   readJson / writeJson   journal storage
 *   launch      (overwatch) => void, starts the game
 *   newId       () => string, entry id generator
 *   now         () => number
 */
export function createGameMode(config, sensors, log, deps = {}) {
  const sys = { ...realSystem, ...(deps.system ?? {}) };
  const journalFile = deps.journalFile ?? JOURNAL_FILE;
  const read = deps.readJson ?? readJson;
  const write = deps.writeJson ?? writeJson;
  const launch = deps.launch ?? defaultLaunch;
  const newId = deps.newId ?? randomUUID;
  const now = deps.now ?? Date.now;

  const loaded = read(journalFile, { entries: [] });
  let journal = { entries: Array.isArray(loaded?.entries) ? loaded.entries : [] };
  // Entries from older versions had no id or status: treat them as applied.
  for (const e of journal.entries) {
    e.id ??= newId();
    e.status ??= "applied";
    e.retries ??= 0;
  }
  let overwatch = null;

  async function ensureOverwatch() {
    if (!overwatch) overwatch = await sys.detectOverwatch();
    return overwatch;
  }

  function save() {
    write(journalFile, journal);
  }

  // One apply/restore/recover at a time: they all read and write the same journal.
  let chain = Promise.resolve();
  function locked(fn) {
    const result = chain.then(fn);
    chain = result.catch(() => {});
    return result;
  }

  function journalFailed() {
    return journal.entries.filter((e) => (e.retries ?? 0) > 0).length;
  }

  // ---- undo -------------------------------------------------------------

  async function undoEntry(entry) {
    const u = entry.undo;
    if (!u) return;
    switch (u.kind) {
      case "power":
        // "unchanged": Windows ignored our request, so there is nothing to put back.
        if (u.previous && !u.unchanged) await sys.setPowerOverlay(u.previous);
        break;
      case "gpu":
        // previous === null means there was no value before: delete it.
        if (u.exe) await sys.setGpuPreference(u.exe, u.previous ?? null);
        break;
      case "poll":
        sensors.setSlow(false);
        break;
      case "close":
      case "launch":
      case "obs":
        // Closing and launching are not reversed: we never force-kill the game,
        // and we do not relaunch apps the user may have closed on purpose.
        break;
      default:
        break;
    }
  }

  /** Undo one entry, then drop it. On failure it stays, with a retry count. */
  async function undoAndRemove(entry) {
    try {
      await undoEntry(entry);
    } catch (e) {
      entry.retries = (entry.retries ?? 0) + 1;
      entry.lastError = String(e?.message ?? e);
      try {
        save();
      } catch {
        // Keep going: the in-memory count is still right for this run.
      }
      throw e;
    }
    const idx = journal.entries.indexOf(entry);
    if (idx >= 0) journal.entries.splice(idx, 1);
    save();
  }

  async function recoverIfNeeded() {
    return locked(async () => {
      if (!journal.entries.length) return { restored: 0, failed: 0 };
      log(`restoring ${journal.entries.length} leftover game-mode steps`);
      let restored = 0;
      let failed = 0;
      // Newest first, one at a time; each is removed only after its undo worked.
      for (const entry of [...journal.entries].reverse()) {
        try {
          await undoAndRemove(entry);
          restored++;
        } catch (e) {
          failed++;
          log(`could not undo ${entry.step?.id} (attempt ${entry.retries}): ${e?.message ?? e}`);
        }
      }
      return { restored, failed };
    });
  }

  // ---- profiles ---------------------------------------------------------

  async function describeProfiles() {
    const ow = await ensureOverwatch();
    const [overlay, gpu, closing, running] = await Promise.all([
      sys.getPowerOverlay().catch(() => null),
      ow ? sys.getGpuPreference(ow.exe).catch(() => null) : null,
      sys.findProcesses(config.closeApps),
      ow ? sys.isRunning("Overwatch.exe") : false,
    ]);
    const overlayName = OVERLAYS[overlay] ?? (overlay ? overlay.slice(0, 8) : "Unknown");

    const ranked = {
      id: "ow-ranked",
      name: "Overwatch ranked",
      steps: [
        {
          id: "power",
          label: "Power mode to Best performance",
          before: overlayName,
          after: OVERLAYS[BEST_PERFORMANCE],
        },
        {
          id: "close",
          label: `Close ${config.closeApps.map((n) => n.replace(/\.exe$/i, "")).slice(0, 3).join(", ")}`,
          before: closing.length ? `${closing.length} running` : "None running",
          after: "Closed",
        },
        {
          id: "gpu",
          label: "Run Overwatch on the high-performance GPU",
          before: sys.gpuWord(gpu),
          after: "High performance",
        },
        {
          id: "poll",
          label: "Slow live stats to every 3 s",
          before: "Every 1 s",
          after: "Every 3 s",
        },
        {
          id: "launch",
          label: "Launch Overwatch",
          before: running ? "Running" : ow ? "Not running" : "Not installed",
          after: "Running",
        },
      ],
    };

    const streaming = {
      id: "streaming",
      name: "Streaming",
      steps: [
        ranked.steps[0],
        {
          id: "close",
          label: "Close Spotify and OneDrive",
          before: closing.length ? `${closing.length} running` : "None running",
          after: "Closed",
        },
        {
          id: "obs",
          label: "Switch OBS to the Gaming scene",
          before: "Not linked",
          after: "Not available yet",
        },
        ranked.steps[3],
      ],
    };

    return [ranked, streaming];
  }

  // ---- apply ------------------------------------------------------------

  /** Reads the current value for a step. Changes nothing. Throws for unknown steps. */
  async function snapshot(step) {
    switch (step.id) {
      case "power":
        return { kind: "power", previous: await sys.getPowerOverlay() };
      case "close":
        return { kind: "close", closed: [] };
      case "gpu": {
        const ow = await ensureOverwatch();
        if (!ow) throw new Error("Overwatch was not found on this PC.");
        return { kind: "gpu", exe: ow.exe, previous: (await sys.getGpuPreference(ow.exe)) ?? null };
      }
      case "poll":
        return { kind: "poll" };
      case "launch":
        return { kind: "launch" };
      case "obs":
        return { kind: "obs" };
      default:
        throw new Error(`Unknown game-mode step: ${step.id}`);
    }
  }

  async function perform(step, entry) {
    const u = entry.undo;
    switch (step.id) {
      case "power": {
        const previous = u.previous;
        const targets = [BEST_PERFORMANCE, BETTER_PERFORMANCE].filter((g) => g !== previous);
        let applied = null;
        let lastErr = null;
        for (const guid of targets) {
          try {
            await sys.setPowerOverlay(guid);
            const current = await sys.getPowerOverlay();
            if (current !== previous) {
              applied = current;
              break;
            }
          } catch (e) {
            lastErr = e;
          }
        }
        if (!applied) {
          const label = OVERLAYS[previous] ?? previous;
          log(
            lastErr
              ? `power mode unchanged (${label}): ${lastErr.message}`
              : `power mode unchanged (${label}); Windows ignored the request`,
          );
          // Continue the profile: this laptop's slider often will not move from the CLI.
          u.unchanged = true;
        }
        break;
      }
      case "close": {
        const found = await sys.findProcesses(config.closeApps);
        for (const p of found) {
          const name = `${p.Name.replace(/\.exe$/i, "")}.exe`;
          if (await sys.closePolitely(name)) u.closed.push(name);
        }
        break;
      }
      case "gpu":
        await sys.setGpuPreference(u.exe, "GpuPreference=2;");
        break;
      case "poll":
        sensors.setSlow(true);
        break;
      case "launch": {
        const ow = await ensureOverwatch();
        if (!ow) throw new Error("Overwatch was not found on this PC.");
        if (!(await sys.isRunning("Overwatch.exe"))) launch(ow);
        // Never kill the game on restore.
        break;
      }
      default:
        break;
    }
  }

  async function applyLocked(step) {
    if (!step || typeof step.id !== "string") throw new Error("Missing step");

    // Applying twice must not snapshot the already-changed value as "previous".
    const existing = journal.entries.find((e) => e.step.id === step.id);
    if (existing) {
      if (existing.status === "applied") return { ok: true, entryId: existing.id, already: true };
      await undoAndRemove(existing); // leftover pending entry: put it back first
    }

    const undo = await snapshot(step);
    const entry = { id: newId(), step, undo, status: "pending", at: now(), retries: 0 };
    journal.entries.push(entry);
    try {
      save(); // write-ahead: on disk before anything changes
    } catch (e) {
      journal.entries.pop();
      throw e;
    }

    try {
      await perform(step, entry);
    } catch (e) {
      try {
        await undoAndRemove(entry); // best effort; stays in the journal if it fails
      } catch (undoErr) {
        log(`could not undo failed step ${step.id}: ${undoErr?.message ?? undoErr}`);
      }
      throw e;
    }

    entry.status = "applied";
    save();
    return { ok: true, entryId: entry.id };
  }

  async function restoreLocked(step) {
    const entries = journal.entries;
    let entry;
    if (step?.entryId) entry = entries.find((e) => e.id === step.entryId);
    else if (step?.id) entry = [...entries].reverse().find((e) => e.step.id === step.id);
    // Unknown or already undone: nothing to do.
    if (!entry) return { ok: true, already: true };
    await undoAndRemove(entry);
    return { ok: true, entryId: entry.id };
  }

  return {
    recoverIfNeeded,
    describeProfiles,
    applyStep: (step) => locked(() => applyLocked(step)),
    restoreStep: (step) => locked(() => restoreLocked(step)),
    /** Entries plus how many have failed an undo at least once (journalFailed). */
    journal: () => ({ entries: journal.entries, journalFailed: journalFailed() }),
    journalFailed,
  };
}

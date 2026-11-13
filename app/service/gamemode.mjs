import fs from "node:fs";
import { randomUUID } from "node:crypto";
import * as realSystem from "./system.mjs";
import { JOURNAL_FILE, readJsonStrict, writeJson } from "./paths.mjs";
import { STEP_IDS } from "./settings.mjs";
import { launchSteamGame, spawnDetached } from "./spawn.mjs";

const { BEST_PERFORMANCE, OVERLAYS } = realSystem;
const BETTER_PERFORMANCE = "3af9b8d9-7c97-431d-ad78-34a8bfea439f";

function defaultLaunch(ow, log) {
  if (ow.appId) launchSteamGame(ow.appId, log);
  else spawnDetached(ow.exe, [], { windowsHide: false }, log, "overwatch");
}

/**
 * Validates a step sent by a client and keeps only what we use: id, label, before, after (strings, length-capped)
 * and an optional entryId. Throws an Error with status 400 for a missing, non-string or unknown id.
 */
export function cleanStep(body) {
  const id = body?.id;
  if (typeof id !== "string" || !STEP_IDS.includes(id)) {
    throw Object.assign(new Error(typeof id === "string" ? "Unknown game-mode step" : "Missing step"), { status: 400 });
  }
  const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : undefined);
  const out = { id, label: str(body.label, 200) ?? id };
  const before = str(body.before, 120);
  const after = str(body.after, 120);
  if (before !== undefined) out.before = before;
  if (after !== undefined) out.after = after;
  if (typeof body.entryId === "string") out.entryId = body.entryId.slice(0, 80);
  return out;
}

/** Runs fn; a throw or rejection becomes `fallback`, so one failing read cannot sink a whole response. */
const attempt = (fn, fallback) => Promise.resolve().then(fn).catch(() => fallback);

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
 *   readJson / writeJson   journal storage. readJson must throw for anything but a missing file
 *               (default: readJsonStrict); a throw means "journal unreadable", see below.
 *   keepBad     (file) => void, keeps an unreadable journal as <file>.bad
 *   launch      (overwatch) => void, starts the game
 *   newId       () => string, entry id generator
 *   now         () => number
 */
export function createGameMode(config, sensors, log, deps = {}) {
  const sys = { ...realSystem, ...(deps.system ?? {}) };
  const journalFile = deps.journalFile ?? JOURNAL_FILE;
  const read = deps.readJson ?? readJsonStrict;
  const keepBad =
    deps.keepBad ??
    ((file) => {
      fs.copyFileSync(file, `${file}.bad`);
    });
  const write = deps.writeJson ?? writeJson;
  const launch = deps.launch ?? ((ow) => defaultLaunch(ow, log));
  const newId = deps.newId ?? randomUUID;
  const now = deps.now ?? Date.now;

  // A journal that exists but cannot be read (corrupt, locked) must never be treated as empty: the next save
  // would overwrite the only record of what to undo. Keep a copy, say so loudly, and refuse to start new steps.
  let journalError = null;
  let loaded = { entries: [] };
  try {
    loaded = read(journalFile, { entries: [] });
  } catch (e) {
    journalError = `The game-mode undo journal could not be read (${e?.code ?? e?.message ?? "unknown error"}). Game mode is disabled until it is fixed or deleted.`;
    log(`!! ${journalError} File: ${journalFile}`);
    try {
      keepBad(journalFile);
      log(`!! a copy was kept as ${journalFile}.bad`);
    } catch (copyErr) {
      log(`!! could not keep a copy of the unreadable journal: ${copyErr?.message ?? copyErr}`);
    }
  }
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
    const failedUndos = journal.entries.filter((e) => (e.retries ?? 0) > 0).length;
    return journalError ? failedUndos + 1 : failedUndos;
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
      if (journalError) log(`!! ${journalError}`);
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
      attempt(() => sys.findProcesses(config.closeApps), []),
      ow ? attempt(() => sys.isRunning("Overwatch.exe"), false) : false,
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
        ranked.steps[1],
        ranked.steps[3],
      ],
    };

    const off = new Set(config.disabledSteps ?? []);
    return [ranked, streaming].map((p) => ({ ...p, steps: p.steps.filter((s) => !off.has(s.id)) }));
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
        // Already on Best: never "fall back" to Better, which would be a downgrade.
        if (previous === BEST_PERFORMANCE) {
          log(`power mode unchanged (${OVERLAYS[previous] ?? previous}); already on Best performance`);
          u.unchanged = true;
          break;
        }
        const targets = [BEST_PERFORMANCE, BETTER_PERFORMANCE].filter((g) => g !== previous);
        let applied = null;
        let lastErr = null;
        let unverified = false; // the PC may have changed and we cannot prove otherwise
        for (const guid of targets) {
          try {
            await sys.setPowerOverlay(guid);
          } catch (e) {
            lastErr = e;
            // Only Windows itself saying "refused" (a typed error) proves nothing changed. A timeout or a kill
            // leaves the set call possibly applied: stop here, never stack another target on top of it, and keep
            // the undo so restore puts the previous mode back.
            if (e?.code === "POWER_REFUSED") continue;
            unverified = true;
            break;
          }
          try {
            const current = await sys.getPowerOverlay();
            if (current !== previous) {
              applied = current;
              break;
            }
            // Read-back confirms the value is still the previous one: Windows ignored it; try the next target.
          } catch (e) {
            // The set went through but cannot be confirmed. Never try a lower target on top of it
            // (that could downgrade Best to Better); keep the undo so restore puts the old mode back.
            lastErr = e;
            unverified = true;
            break;
          }
        }
        if (!applied) {
          const label = OVERLAYS[previous] ?? previous;
          if (unverified) {
            log(`power mode may have changed but could not be verified (${lastErr?.message}); it will be restored to ${label} on undo`);
            // u.unchanged stays unset so restore still sets the previous mode.
          } else {
            log(
              lastErr
                ? `power mode unchanged (${label}): ${lastErr.message}`
                : `power mode unchanged (${label}); Windows ignored the request`,
            );
            // Continue the profile: this laptop's slider often will not move from the CLI.
            u.unchanged = true;
          }
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
    if (journalError) throw Object.assign(new Error(journalError), { status: 409 });

    // Applying twice must not snapshot the already-changed value as "previous".
    const existing = journal.entries.find((e) => e.step.id === step.id);
    if (existing) {
      if (existing.status === "applied") return { ok: true, entryId: existing.id, already: true };
      await undoAndRemove(existing); // leftover pending entry: put it back first
    }

    const undo = await snapshot(step);
    // Only the id and label are kept: the step object comes from a client and must not grow the journal.
    const entry = { id: newId(), step: { id: step.id, label: typeof step.label === "string" ? step.label.slice(0, 200) : step.id }, undo, status: "pending", at: now(), retries: 0 };
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
    journal: () => ({ entries: journal.entries, journalFailed: journalFailed(), journalError }),
    /** Why the journal could not be read (null when it is fine). While set, apply refuses. */
    journalError: () => journalError,
    journalFailed,
  };
}

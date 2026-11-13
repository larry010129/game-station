// Crash-counter and shutdown logic for index.mjs, kept free of globals so tests can drive it with a fake
// clock, fake exit and fake cleanup. index.mjs wires the real process into it.

export const MAX_CRASHES = 5;
export const CRASH_WINDOW_MS = 60_000;

export const shortStack = (e) => String(e?.stack ?? e).split("\n").slice(0, 4).join(" | ");

/**
 * - `onUncaught(e)`: counts an uncaught exception; after `maxCrashes` inside `windowMs` it stops everything and
 *   exits 1 (the sidecar supervisor or the user then sees a real failure instead of a zombie).
 * - `shutdown()`: SIGINT/SIGTERM path. Runs once, stops everything, closes the server, exits 0. Uncaught
 *   exceptions that arrive meanwhile are logged and ignored; a signal during a crash exit does nothing.
 * Both exit paths arm a hard cap first, so a stalled cleanup can never keep the process alive.
 */
export function createLifecycle({
  stopAll,
  closeServer = async () => {},
  exit = (code) => process.exit(code),
  log,
  now = Date.now,
  setTimer = setTimeout,
  maxCrashes = MAX_CRASHES,
  windowMs = CRASH_WINDOW_MS,
  shutdownCapMs = 3000,
  crashCapMs = 1500,
}) {
  const crashTimes = [];
  let shuttingDown = false;
  let exiting = false;

  const arm = (ms, code) => {
    const t = setTimer(() => exit(code), ms);
    t?.unref?.();
  };

  return {
    onUncaught(e) {
      // Shutdown already owns the exit (code 0, with its own hard cap): an error thrown while stopping must not
      // start a second exit path with code 1.
      if (shuttingDown) {
        log(`uncaught exception during shutdown (ignored): ${shortStack(e)}`);
        return;
      }
      const t = now();
      crashTimes.push(t);
      while (crashTimes.length && t - crashTimes[0] > windowMs) crashTimes.shift();
      log(`uncaught exception (${crashTimes.length}/${maxCrashes} this minute): ${shortStack(e)}`);
      if (crashTimes.length >= maxCrashes && !exiting) {
        exiting = true;
        log("too many uncaught exceptions; exiting");
        arm(crashCapMs, 1);
        // Do not orphan nvidia-smi, typeperf, toasts or an AI search tree on the way out.
        try {
          stopAll();
        } catch (err) {
          log(`cleanup before exit failed: ${err?.message ?? err}`);
        }
        exit(1);
      }
    },
    async shutdown() {
      if (shuttingDown || exiting) return; // already on the way out (a crash exit is in progress)
      shuttingDown = true;
      log("shutting down");
      // Never hang on exit: force it if cleanup stalls.
      arm(shutdownCapMs, 0);
      try {
        stopAll();
        await closeServer();
      } catch (e) {
        log(`shutdown error: ${e.message}`);
      }
      exit(0);
    },
    isShuttingDown: () => shuttingDown,
    crashCount: () => crashTimes.length,
  };
}

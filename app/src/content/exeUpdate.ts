/**
 * Update type 2: the installed exe itself (screens, logic, fixes). In-game only, and it restarts the app.
 *
 *   start -> ask GitHub Releases for latest.json (Tauri updater) -> newer exe? -> forced popup ->
 *   download + verify signature + install -> relaunch.
 *
 * Only a new MAJOR version (1.x -> 2.x) updates the exe; everything smaller ships as a content release.
 * Type 1 (content releases from the Cloudflare host) lives in updateContent.ts. A release can name the oldest exe
 * it works with (`minAppVersion`); an older exe must update first (see needsNewerExe).
 * The Tauri calls are injected so the state machine is tested without Tauri.
 */

declare const __APP_VERSION__: string;

/** Version of the running exe (package.json, kept equal to tauri.conf.json by scripts/make-latest-json.mjs). */
export const EXE_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "1.0.0";

const parts = (v: string) =>
  String(v)
    .trim()
    .replace(/^v/i, "")
    .split("-")[0]!
    .split(".")
    .map((n) => (Number.isFinite(Number(n)) ? Number(n) : 0));

/** The major number of a version: "2.4.1" -> 2. Update type 2 (the exe) only moves when this changes. */
export const majorOf = (v: string): number => Math.trunc(parts(v)[0] ?? 0);

/** True when `latest` is a newer MAJOR version than `current`. Minor and patch exes are ignored: content releases carry those changes. */
export function isMajorUpdate(latest: string, current: string = EXE_VERSION): boolean {
  return majorOf(latest) > majorOf(current);
}

/** Compare dotted versions numerically: -1, 0 or 1. "1.10" > "1.9". Missing parts count as 0; a suffix after "-" is ignored. */
export function compareVersions(a: string, b: string): number {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** True when a release needs a newer MAJOR exe than the one running. No minimum named = any exe works. */
export function needsNewerExe(minAppVersion: string | undefined, exe: string = EXE_VERSION): boolean {
  return !!minAppVersion && majorOf(exe) < majorOf(minAppVersion);
}

export type ExeUpdateState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "downloading"; version: string; percent: number | null }
  | { phase: "installing"; version: string }
  | { phase: "failed"; version: string | null; error: string };

/** What the Tauri updater plugin gives us, reduced to what the state machine uses. */
export interface FoundUpdate {
  version: string;
  downloadAndInstall(onProgress: (e: { event: string; data?: { contentLength?: number; chunkLength?: number } }) => void): Promise<void>;
}

export interface ExeUpdateDeps {
  /** Ask the update host. Resolves to the update, or null when this exe is current. */
  check(): Promise<FoundUpdate | null>;
  /** Restart the app (after the installer finished). */
  relaunch(): Promise<void>;
  /** The running exe version (tests set it). */
  currentVersion?: string;
}

export function createExeUpdater(deps: ExeUpdateDeps) {
  let state: ExeUpdateState = { phase: "idle" };
  const listeners = new Set<() => void>();
  let running = false;

  const set = (next: ExeUpdateState) => {
    state = next;
    listeners.forEach((f) => f());
  };

  /** Check once and, when there is a newer exe, download, install and restart. Safe to call again after a failure. */
  async function run(): Promise<ExeUpdateState> {
    if (running) return state;
    running = true;
    let version: string | null = null;
    try {
      set({ phase: "checking" });
      const found = await deps.check();
      // Only a new MAJOR exe is installed. A newer minor or patch exe on the host is ignored.
      if (!found || !isMajorUpdate(found.version, deps.currentVersion ?? EXE_VERSION)) {
        set({ phase: "idle" });
        return state;
      }
      version = found.version;
      let total = 0;
      let got = 0;
      set({ phase: "downloading", version, percent: null });
      await found.downloadAndInstall((e) => {
        if (e.event === "Started") total = e.data?.contentLength ?? 0;
        if (e.event === "Progress") {
          got += e.data?.chunkLength ?? 0;
          set({ phase: "downloading", version: found.version, percent: total > 0 ? Math.min(100, Math.round((got / total) * 100)) : null });
        }
        if (e.event === "Finished") set({ phase: "installing", version: found.version });
      });
      set({ phase: "installing", version });
      await deps.relaunch();
      return state;
    } catch (e) {
      set({ phase: "failed", version, error: e instanceof Error ? e.message : String(e) });
      return state;
    } finally {
      running = false;
    }
  }

  return {
    run,
    retry: run,
    get: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/** True inside the Tauri window (the installed exe or `tauri dev`), false in a plain browser. */
export function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** The real updater: GitHub Releases through the Tauri plugin. Imported lazily so a browser run never loads it. */
export const exeUpdater = createExeUpdater({
  async check() {
    if (!inTauri()) return null;
    const { check } = await import("@tauri-apps/plugin-updater");
    return (await check()) as FoundUpdate | null;
  },
  async relaunch() {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  },
});

/** Start-up call. Never throws; a browser run or an offline start leaves the state at idle or failed. */
export function checkExeUpdateAtStart(): void {
  if (!inTauri()) return;
  void exeUpdater.run();
}

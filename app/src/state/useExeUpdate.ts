import { useSyncExternalStore } from "react";
import { exeUpdater, type ExeUpdateState } from "../content/exeUpdate.ts";

/** The exe-update state for the screen. `blocking` = the forced popup is up (an update was found and not finished). */
export function useExeUpdate(): { state: ExeUpdateState; blocking: boolean; retry: () => void } {
  const state = useSyncExternalStore(exeUpdater.subscribe, exeUpdater.get, exeUpdater.get);
  // A failed check (offline, no host) must not lock the app; a failed download of a found update does.
  const blocking = state.phase === "downloading" || state.phase === "installing" || (state.phase === "failed" && state.version != null);
  return { state, blocking, retry: () => void exeUpdater.retry() };
}

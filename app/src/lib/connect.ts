import { liveAvailable, loadMachine, loadProfiles } from "./api";
import type { StationInfo } from "./types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Is the local service answering /api/health? */
export { liveAvailable };

/** The steps after the service answers, in order. */
export type Stage = "machine" | "profiles";

/** Which stage of connectStation failed. */
export class StageError extends Error {
  constructor(readonly stage: Stage) {
    super(`Could not load ${stage}`);
  }
}

/**
 * One attempt at loading the start-up info, once the service answers. Reports each stage as
 * it lands, so the boot screen can tick them off; throws a StageError naming the one that failed.
 */
export async function connectStation(onStage?: (stage: Stage) => void): Promise<StationInfo> {
  const machine = await loadMachine().catch(() => {
    throw new StageError("machine");
  });
  onStage?.("machine");
  const profiles = await loadProfiles().catch(() => {
    throw new StageError("profiles");
  });
  onStage?.("profiles");
  return { machine, profiles };
}

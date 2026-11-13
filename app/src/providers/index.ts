import { liveAvailable, liveProvider, loadMachine, loadProfiles } from "./live";
import type { Provider } from "../lib/types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** Is the local service answering /api/health? */
export { liveAvailable };

/** The steps after the service answers, in order. */
export type Stage = "machine" | "profiles";

/** Which stage of connectProvider failed. */
export class StageError extends Error {
  constructor(readonly stage: Stage) {
    super(`Could not load ${stage}`);
  }
}

/**
 * One attempt at the provider, once the service answers. Reports each stage as
 * it lands, so the boot screen can tick them off; throws a StageError naming the one that failed.
 */
export async function connectProvider(onStage?: (stage: Stage) => void): Promise<Provider> {
  const machine = await loadMachine().catch(() => {
    throw new StageError("machine");
  });
  onStage?.("machine");
  const profiles = await loadProfiles().catch(() => {
    throw new StageError("profiles");
  });
  let provider: Provider;
  try {
    provider = liveProvider(machine, profiles);
  } catch {
    throw new StageError("profiles");
  }
  onStage?.("profiles");
  return provider;
}

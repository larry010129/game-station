/**
 * Contract between the boot logic (useBoot) and the boot screen (BootScreen).
 * The logic owns the facts; the screen only draws them.
 */

/** standby: not started. linking: in flight. online: first data arrived.
 *  offline: source failed or is not set up (optional steps only). deferred: optional step still
 *  loading when the time limit passed. failed: a required step errored. */
export type StepStatus = "standby" | "linking" | "online" | "offline" | "deferred" | "failed";

export interface BootStep {
  id: string;
  /** Checklist row, e.g. "Hardware scan". */
  label: string;
  /** Subtitle while this step is the one in flight, e.g. "Scanning hardware…". */
  detail: string;
  required: boolean;
  status: StepStatus;
}

/** connecting: waiting for the service. booting: service answered, steps running.
 *  ready: reveal now (the screen plays its exit, then calls onExited).
 *  error: no signal after the wait, or a required step failed; retry() is live. */
export type BootPhase = "connecting" | "booting" | "ready" | "error";

export interface BootState {
  phase: BootPhase;
  steps: BootStep[];
  /** 0..1, weighted, never goes backwards. */
  progress: number;
  /** Plain-words line for the error phase; null otherwise. */
  problem: string | null;
  /** Warm restart: play the short version. */
  short: boolean;
  retry: () => void;
}

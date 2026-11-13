/**
 * First results from loaders that do not go through useApi (players, feed, live
 * samples), keyed by endpoint path. The boot screen reads these; nothing else does.
 * "ok": data arrived. "error": the request failed. Once ok, a later error is ignored.
 */
export type Signal = "ok" | "error";

const seen = new Map<string, Signal>();
const fails = new Map<string, number>();
const listeners = new Set<() => void>();

export function signal(path: string, s: Signal) {
  if (seen.get(path) === "ok") return;
  fails.set(path, s === "error" ? (fails.get(path) ?? 0) + 1 : 0);
  seen.set(path, s);
  listeners.forEach((f) => f());
}

export const signalled = (path: string): Signal | null => seen.get(path) ?? null;

/** Failures in a row before the first success. */
export const failCount = (path: string) => fails.get(path) ?? 0;

export function onSignal(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

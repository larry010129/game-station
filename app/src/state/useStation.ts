import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { Provider, Sample } from "../lib/types";
import type { NewEvent } from "./useEvents";

/** The newest reading, and a way to hear about the next one without re-rendering everything. */
export interface StationStore {
  latest(): Sample;
  subscribe(listener: () => void): () => void;
}

interface Options {
  /** Kill switch: nothing is sampled while true. */
  stopped: boolean;
  intervalMs: number;
  /** Told once when readings start failing, and again only after they have worked in between (with a note that they are back). */
  onEvent: (e: NewEvent) => void;
}

/** Failed reads in a row before the readings are shown as lost. */
const STALE_AFTER = 3;

function staleSample(t: number): Sample {
  return { t, gpuTemp: null, cpuLoad: null, gpuLoad: null, pingRegionMs: null, pingRouterMs: null, batteryPct: null, onAc: null, game: null, stale: true };
}

function createStore(first: Sample) {
  let latest = first;
  const listeners = new Set<() => void>();
  return {
    store: {
      latest: () => latest,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    } satisfies StationStore,
    push(next: Sample) {
      latest = next;
      listeners.forEach((f) => f());
    },
  };
}

/**
 * Samples the provider on an interval and publishes each reading to a store. Components pick
 * what they need with `useSample`, so one new reading re-renders only the cards that show it.
 * A read that is still in flight is not started again, and a failing read is reported once.
 */
export function useStation(provider: Provider, { stopped, intervalMs, onEvent }: Options): StationStore {
  const source = useMemo(() => createStore(provider.seed(1, Date.now())[0]), [provider]);
  const failing = useRef(false);
  const misses = useRef(0);

  useEffect(() => {
    if (stopped) {
      // Nothing is sampled now, so the last numbers must not keep passing for live ones.
      failing.current = false;
      misses.current = 0;
      if (!source.store.latest().stale) source.push(staleSample(Date.now()));
      return;
    }
    let alive = true;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const s = await provider.readSample();
        if (!alive) return;
        const recovered = failing.current;
        failing.current = false;
        misses.current = 0;
        source.push(s);
        if (recovered) onEvent({ kind: "info", text: "Sensors restored" });
      } catch {
        if (alive) {
          misses.current++;
          if (!failing.current) {
            failing.current = true;
            onEvent({ kind: "alert", text: "Sensor read failed. Still trying every few seconds." });
          }
          // Old numbers must not pass for live ones: after a few misses the tiles show no signal.
          if (misses.current === STALE_AFTER) source.push(staleSample(Date.now()));
        }
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(() => void tick(), intervalMs);
    void tick();
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provider, source, stopped, intervalMs, onEvent]);

  return source.store;
}

/** One value from the newest reading. The caller re-renders only when that value changes. */
export function useSample<T>(store: StationStore, select: (s: Sample) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.latest()));
}

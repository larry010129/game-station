import { createContext, useContext, useEffect, useState } from "react";
import type { Provider } from "../lib/types";

/** What the cards need beyond their own props: the provider, and whether a match is on (so polling slows down). */
export const StationContext = createContext<{ provider: Provider; quiet: boolean } | null>(null);

export function useStationCtx() {
  const c = useContext(StationContext);
  if (!c) throw new Error("StationContext is missing");
  return c;
}

interface Entry {
  data: unknown;
  error: boolean;
  /** Each reader and the interval it wants (0 = no polling). */
  want: Map<() => void, number>;
  timer: number | undefined;
  ms: number;
}

// One poller per endpoint, shared by every card that reads it.
const entries = new Map<string, Entry>();

/**
 * Reads a service endpoint now and then on an interval. Cards that read the same
 * endpoint share one request at the fastest interval any of them asks for.
 * `ms` of 0 pauses polling for that card (for example during a match).
 */
export function useApi<T>(path: string, ms: number): { data: T | null; error: boolean; reload: () => void } {
  const { provider } = useStationCtx();
  const [, tick] = useState(0);
  const k = `${provider.id}:${path}`;

  useEffect(() => {
    let entry = entries.get(k);
    if (!entry) {
      entry = { data: null, error: false, want: new Map(), timer: undefined, ms: 0 };
      entries.set(k, entry);
    }
    const e = entry;
    const rerender = () => tick((n) => n + 1);
    const notify = () => e.want.forEach((_, f) => f());

    const load = () =>
      provider
        .api<T>(path)
        .then((d) => {
          e.data = d;
          e.error = false;
          notify();
        })
        .catch(() => {
          e.error = true;
          notify();
        });

    const apply = () => {
      const asks = [...e.want.values()].filter((v) => v > 0);
      const eff = asks.length ? Math.min(...asks) : 0;
      if (eff === 0) {
        window.clearInterval(e.timer);
        e.timer = undefined;
        e.ms = 0;
        return;
      }
      if (e.timer == null || e.ms !== eff) {
        const fresh = e.timer == null;
        window.clearInterval(e.timer);
        e.ms = eff;
        e.timer = window.setInterval(load, eff);
        if (fresh) load();
      }
    };

    e.want.set(rerender, ms);
    apply();
    // A card that is paused still gets one reading so it is not blank.
    if (ms === 0 && e.data == null) load();
    rerender();
    return () => {
      e.want.delete(rerender);
      apply();
      if (e.want.size === 0) entries.delete(k);
    };
  }, [k, ms, provider, path]);

  const cur = entries.get(k);
  return {
    data: (cur?.data as T | null) ?? null,
    error: cur?.error ?? false,
    reload: () => {
      provider
        .api<T>(path)
        .then((d) => {
          const e = entries.get(k);
          if (e) {
            e.data = d;
            e.want.forEach((_, f) => f());
          }
        })
        .catch(() => {});
    },
  };
}

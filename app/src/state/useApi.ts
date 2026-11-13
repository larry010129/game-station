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

/** The latest outcome per endpoint path, kept after the cards unmount. Data, once seen, is not undone by a later error. */
export type ApiResult = { ok: true; data: unknown } | { ok: false };
const results = new Map<string, ApiResult>();
const watchers = new Set<() => void>();

function record(path: string, r: ApiResult) {
  const prev = results.get(path);
  if (!r.ok && prev?.ok) return;
  results.set(path, r);
  // Watchers only hear about the first result and a change from failing to working.
  if (!prev || prev.ok !== r.ok) watchers.forEach((f) => f());
}

/** Read-only: what an endpoint has returned so far, or null if nothing yet. */
export const apiResult = (path: string): ApiResult | null => results.get(path) ?? null;

/** Read-only: called after any endpoint returns data or fails. Returns the unsubscribe. */
export function watchApi(f: () => void): () => void {
  watchers.add(f);
  return () => {
    watchers.delete(f);
  };
}

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
      // Seed from the lasting result so a remount (e.g. poll interval change) does not flash empty.
      const prev = results.get(path);
      entry = {
        data: prev?.ok ? prev.data : null,
        error: prev != null && !prev.ok,
        want: new Map(),
        timer: undefined,
        ms: 0,
      };
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
          record(path, { ok: true, data: d });
        })
        .catch(() => {
          e.error = true;
          notify();
          record(path, { ok: false });
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
      // Keep the entry (and its data) when the last reader leaves briefly — React remounts
      // the same card when only the poll interval changes, and deleting here caused a flash.
      if (e.want.size === 0) {
        window.clearInterval(e.timer);
        e.timer = undefined;
        e.ms = 0;
      }
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
          record(path, { ok: true, data: d });
        })
        .catch(() => {});
    },
  };
}

import { useEffect, useRef } from "react";
import type { AiData, AiResult, Provider } from "../lib/types";

const KEY = "cs.leak.seen";
const POLL_MS = 5 * 60_000;

type Fresh = AiResult["items"];

/**
 * Watches the hourly leak check. When a finished check holds leaks that the one before it did not,
 * `onNew` gets them once. The id of the last check you were told about is remembered, so a restart does not repeat it.
 * Never polls during a match.
 */
export function useLeakAlerts(provider: Provider, paused: boolean, onNew: (items: Fresh) => void) {
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    if (paused || provider.id !== "live") return;
    let alive = true;
    const check = () =>
      provider
        .api<AiData>("/api/ai")
        .then((d) => {
          if (!alive) return;
          const latest = d.results.find((r) => r.topic === "leaks");
          if (!latest) return;
          let seen: string | null = null;
          try {
            seen = localStorage.getItem(KEY);
          } catch {
            // no storage: report once per session
          }
          if (seen === latest.id) return;
          try {
            localStorage.setItem(KEY, latest.id);
          } catch {
            // ignore
          }
          if (seen == null) return; // first run on this app: nothing to compare with, stay quiet
          const fresh = latest.items.filter((i) => i.fresh);
          if (fresh.length) onNewRef.current(fresh);
        })
        .catch(() => {});
    check();
    const id = window.setInterval(check, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provider, paused]);
}

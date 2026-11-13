import { useEffect, useRef, useState } from "react";
import type { Provider, Sample } from "../lib/types";
import type { NewEvent } from "./useEvents";

export const HISTORY = 60;

interface Options {
  /** Kill switch: nothing is sampled while true. */
  stopped: boolean;
  intervalMs: number;
  onEvent: (e: NewEvent) => void;
}

/** Samples the provider on an interval and keeps the last 60 readings. */
export function useStation(provider: Provider, { stopped, intervalMs, onEvent }: Options) {
  const [history, setHistory] = useState<Sample[]>(() => provider.seed(HISTORY, Date.now()));
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (stopped) return;
    let alive = true;
    const id = window.setInterval(async () => {
      const s = await provider.readSample();
      if (!alive) return;
      setHistory((prev) => [...prev.slice(prev.length - HISTORY + 1), s]);
    }, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provider, stopped, intervalMs]);

  return { history, latest: history[history.length - 1] };
}

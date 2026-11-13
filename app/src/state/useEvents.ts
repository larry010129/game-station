import { useCallback, useRef, useState } from "react";
import type { StationEvent } from "../lib/types";

export type NewEvent = Omit<StationEvent, "id" | "t"> & { t?: number };

const MAX_EVENTS = 40;

export function useEvents(initial: NewEvent[] = []) {
  const nextId = useRef(1);
  const [events, setEvents] = useState<StationEvent[]>(() =>
    initial
      .map((e) => ({ ...e, id: nextId.current++, t: e.t ?? Date.now() }))
      .sort((a, b) => b.t - a.t),
  );

  const add = useCallback((e: NewEvent) => {
    const event: StationEvent = { ...e, id: nextId.current++, t: e.t ?? Date.now() };
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  return { events, add };
}

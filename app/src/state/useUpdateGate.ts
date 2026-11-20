import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getContentGate, noticeDue, scheduledDue, subscribeContentGate, UPDATE_NOTICE_LEAD_MS } from "../content/updateContent.ts";

export interface UpdateGateView {
  /** Go-live time (ms) of the next scheduled release, once it is 30 minutes or less away. Null otherwise. */
  noticeAt: number | null;
  /** The player must reload. Sticky: the popup stays until the page reloads. */
  mustReload: boolean;
  number: number | null;
}

const MAX_TIMER = 2 ** 31 - 1;

/**
 * Time rule: a scheduled release shows a heads-up chip from 30 minutes before it goes live. At its go-live time (or when
 * it was applied while the app was open) the player must reload.
 */
export function useUpdateGate(): UpdateGateView {
  const gate = useSyncExternalStore(subscribeContentGate, getContentGate, getContentGate);
  const at = gate.scheduled?.at ?? null;
  const [now, setNow] = useState(() => Date.now());
  const [due, setDue] = useState(() => scheduledDue(gate, Date.now()));

  useEffect(() => {
    if (at == null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (at <= t) setDue(true);
    };
    tick();
    const timers: number[] = [];
    const toNotice = at - UPDATE_NOTICE_LEAD_MS - Date.now();
    if (toNotice > 0) timers.push(window.setTimeout(tick, Math.min(toNotice, MAX_TIMER)));
    const toLive = at - Date.now();
    if (toLive > 0) timers.push(window.setTimeout(tick, Math.min(toLive, MAX_TIMER)));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [at]);

  // The schedule clears once the time passes, but the popup still names the release it is for.
  const current = gate.reload?.number ?? gate.scheduled?.number ?? null;
  const last = useRef<number | null>(null);
  if (current != null) last.current = current;

  return {
    noticeAt: at != null && noticeDue(gate, now) ? at : null,
    mustReload: due || !!gate.reload,
    number: current ?? last.current,
  };
}

import { createContext, useContext, useEffect, useRef } from "react";

/**
 * Whether the card around this component is on screen (or just outside it). A card
 * you have to scroll to sees `false`: its polling, timers and live readings stop
 * until it comes back into view. Alerts and notifications run at the app level,
 * not in cards, so they are not affected.
 */
export const OnScreenContext = createContext(true);

export const useOnScreen = () => useContext(OnScreenContext);

/** `setInterval` that only runs while the card is on screen, and runs once more as it returns so it is not stale. */
export function useInterval(fn: () => void, ms: number | null) {
  const on = useOnScreen();
  const saved = useRef(fn);
  saved.current = fn;
  const started = useRef(false);
  useEffect(() => {
    if (!on || !ms) return;
    if (started.current) saved.current();
    started.current = true;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [on, ms]);
}

import { useEffect, useState } from "react";
import { isTauri } from "../providers";

/**
 * The "no hit to your game" rule. When the window is hidden the app polls
 * slowly. Whether it also goes quiet (no background blur, no motion) is decided
 * by `isQuiet` below: a game must be running and the window out of focus.
 */
export function usePerformanceGate() {
  const [hidden, setHidden] = useState(() => document.visibilityState === "hidden");
  const [blurred, setBlurred] = useState(() => !document.hasFocus());

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    const onFocus = () => setBlurred(false);
    const onBlur = () => setBlurred(true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return { hidden, blurred };
}

export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** A per-viewer setting kept in local storage; falls back to memory if storage is blocked. */
export function useStoredFlag(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : raw === "1";
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // ignore
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/**
 * Quiet while a detected game is running and this window is not in front.
 * Without the local service there is no game signal, so the desktop app falls
 * back to plain window focus; a browser tab only goes quiet when hidden.
 */
export function isQuiet(gate: { hidden: boolean; blurred: boolean }, game: string | null | undefined, live: boolean) {
  if (gate.hidden) return true;
  if (live) return gate.blurred && !!game;
  return isTauri && gate.blurred;
}

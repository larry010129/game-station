import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { addCredits } from "./stationCredits";
import {
  addMinutes,
  claim,
  cleanState,
  recordArmed,
  recordCheckin,
  recordOnce,
  rankOf,
  recordSession,
  takeLookPick,
  type OnceEvent,
  type QuestState,
} from "./questEngine";

/** Quest progress, saved on this PC. */
export const QUESTS_KEY = "cs.quests";
const EVENT = "cs-quests";

export const readQuests = (): QuestState => cleanState(readJson<unknown>(QUESTS_KEY, null));

/** Applies one change to the saved state and tells every listener in this window. */
function update(f: (s: QuestState) => QuestState): void {
  const prev = readQuests();
  const next = f(prev);
  if (next === prev) return;
  if (writeJson(QUESTS_KEY, next) && typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

/** Things the rest of the app reports. Safe to call any number of times: each is recorded once per its own rule. */
export const trackQuest = {
  checkin: () => update((s) => recordCheckin(s, new Date())),
  armed: () => update((s) => recordArmed(s, new Date())),
  // Star a theme only counts once Regular is reached (the quest is hidden until then).
  once: (e: OnceEvent) => update((s) => (e === "star" && rankOf(s).id === "recruit" ? s : recordOnce(s, e))),
};

/** Pays a finished quest into the balance. Returns the Credits added, or null when it cannot be claimed. */
export function claimQuest(id: string): number | null {
  const r = claim(readQuests(), id, new Date());
  if (!r) return null;
  if (!writeJson(QUESTS_KEY, r.state)) return null;
  if (r.credits > 0) addCredits(r.credits);
  window.dispatchEvent(new Event(EVENT));
  return r.credits;
}

/** Uses one waiting weekly-look pick. Returns false when none is waiting. */
export function takePick(): boolean {
  const next = takeLookPick(readQuests());
  if (!next) return false;
  if (!writeJson(QUESTS_KEY, next)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** The saved state, refreshed on every change and once a minute (so a reset at midnight shows up). */
export function useQuests(): { state: QuestState; now: Date } {
  const [state, setState] = useState(readQuests);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const sync = () => setState(readQuests());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    const id = window.setInterval(() => {
      setNow(new Date());
      sync();
    }, 30_000);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);
  return { state, now };
}

/**
 * The counted-minute timer. While a watched game is the running session each whole minute is counted and, at the
 * rank rate, turns into Credits; leftover minutes stay banked. A session under 60 seconds adds nothing, and a
 * finished session of 45 minutes or more is a long watch. Also records the daily check-in when the app opens.
 */
export function useQuestTracking(game: string | null | undefined): void {
  const session = useRef<{ game: string; startedAt: number; counted: number } | null>(null);

  useEffect(() => {
    trackQuest.checkin();
    // A new local day while the app stays open is a new check-in.
    const id = window.setInterval(() => trackQuest.checkin(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const credit = useCallback(() => {
    const s = session.current;
    if (!s) return;
    const whole = Math.floor((Date.now() - s.startedAt) / 60_000);
    const due = whole - s.counted;
    if (due <= 0) return;
    s.counted = whole;
    const r = addMinutes(readQuests(), due, new Date());
    if (writeJson(QUESTS_KEY, r.state)) {
      if (r.credits > 0) addCredits(r.credits);
      window.dispatchEvent(new Event(EVENT));
    }
  }, []);

  useEffect(() => {
    if (game && !session.current) session.current = { game, startedAt: Date.now(), counted: 0 };
    if (!game && session.current) {
      credit();
      const seconds = (Date.now() - session.current.startedAt) / 1000;
      session.current = null;
      update((s) => recordSession(s, seconds, new Date()));
    }
  }, [game, credit]);

  useEffect(() => {
    const id = window.setInterval(credit, 15_000);
    return () => window.clearInterval(id);
  }, [credit]);
}

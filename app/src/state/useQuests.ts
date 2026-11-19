import { useCallback, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { addCredits } from "./stationCredits";
import { hourBonus } from "./perks";
import { perkIncomeBonus, readPerkEffects } from "./perkStore";
import {
  addMinutes,
  claim,
  cleanState,
  grantPick as grantPickState,
  recordArmed,
  recordCheckin,
  recordOnce,
  recordSession,
  startPlayClock,
  takeLookPick,
  tickPlayClock,
  type OnceEvent,
  type PlayClock,
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
  once: (e: OnceEvent) => update((s) => recordOnce(s, e)),
};

/** Pays a finished quest into the balance. Returns the Credits added, or null when it cannot be claimed. */
export function claimQuest(id: string): number | null {
  const r = claim(readQuests(), id, new Date());
  if (!r) return null;
  if (!writeJson(QUESTS_KEY, r.state)) return null;
  // Perk tree: percent more Income from quests (and on all Income).
  const paid = r.credits + perkIncomeBonus("quest", r.credits);
  if (paid > 0) addCredits(paid);
  window.dispatchEvent(new Event(EVENT));
  return paid;
}

/** Uses one waiting weekly-look pick. Returns false when none is waiting. */
export function takePick(): boolean {
  const next = takeLookPick(readQuests());
  if (!next) return false;
  if (!writeJson(QUESTS_KEY, next)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** Gacha apply path: +1 looksWaiting, capped at LOOKS_WAITING_CAP. Returns false when at the cap. */
export function grantPick(): boolean {
  const next = grantPickState(readQuests());
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
 * Payroll rate, turns into Income; leftover minutes stay banked. A session under 60 seconds adds nothing, and a
 * finished session of 45 minutes or more is a long watch. Also records the daily check-in when the app opens.
 */
export function useQuestTracking(game: string | null | undefined): void {
  const session = useRef<{ game: string; clock: PlayClock } | null>(null);

  useEffect(() => {
    trackQuest.checkin();
    // A new local day while the app stays open is a new check-in.
    const id = window.setInterval(() => trackQuest.checkin(), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const credit = useCallback(() => {
    const s = session.current;
    if (!s) return;
    // Counted (awake) time, so hours the PC slept with a game open are not paid as play.
    const { clock, due } = tickPlayClock(s.clock, Date.now());
    s.clock = clock;
    if (due <= 0) return;
    const before = readQuests();
    const r = addMinutes(before, due, new Date());
    if (writeJson(QUESTS_KEY, r.state)) {
      // Perk tree: extra Income for each whole counted hour these minutes complete, then percent more on all of it.
      const earned = r.credits + hourBonus(before.minutesTotal, r.state.minutesTotal, readPerkEffects().creditsPerHour);
      const paid = earned + perkIncomeBonus("play", earned);
      if (paid > 0) addCredits(paid);
      window.dispatchEvent(new Event(EVENT));
    }
  }, []);

  useEffect(() => {
    if (game && !session.current) session.current = { game, clock: startPlayClock(Date.now()) };
    if (!game && session.current) {
      credit();
      // Session length for "Long watch" and the 60-second minimum uses the same counted time as the minutes.
      const seconds = session.current.clock.activeMs / 1000;
      session.current = null;
      update((s) => recordSession(s, seconds, new Date()));
    }
  }, [game, credit]);

  useEffect(() => {
    const id = window.setInterval(credit, 15_000);
    return () => window.clearInterval(id);
  }, [credit]);
}

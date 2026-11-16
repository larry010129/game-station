import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { claimBoard, cleanBoard, spendBoardTickets, type BoardState, type TicketKind } from "./checkinBoard";
import { dayKey } from "./questEngine";
import { readQuests } from "./useQuests";

/** The check-in board and Draw Tickets, saved on this PC (a `cs.` key, so factory reset clears it). */
export const BOARD_KEY = "cs.checkinBoard";
const EVENT = "cs-checkin-board";

export const readBoard = (): BoardState => cleanBoard(readJson<unknown>(BOARD_KEY, null));

/** The quest check-in for today: recorded when the station opens and on each new local day. */
export const checkedInToday = (now: Date = new Date()): boolean => readQuests().days[dayKey(now)]?.checkin === true;

function save(next: BoardState): boolean {
  if (!writeJson(BOARD_KEY, next)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** Claims today's box. Returns the day claimed and what it paid, or null when nothing can be claimed. */
export function claimBoardToday(): { day: number; kind: TicketKind; count: number } | null {
  const now = new Date();
  const r = claimBoard(readBoard(), checkedInToday(now), now);
  if (!r || !save(r.state)) return null;
  return { day: r.day, kind: r.kind, count: r.count };
}

/** Spends `n` Draw Tickets of one kind. Returns false when fewer are held. */
export function spendTickets(kind: TicketKind, n: number): boolean {
  const next = spendBoardTickets(readBoard(), kind, n);
  return next != null && save(next);
}

/** The saved board, refreshed on every change and every 30 seconds (so midnight flips it). */
export function useCheckinBoard(): BoardState {
  const [state, setState] = useState(readBoard);
  useEffect(() => {
    const sync = () => setState(readBoard());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    const id = window.setInterval(sync, 30_000);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);
  return state;
}

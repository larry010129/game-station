import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { canClaimBoard, claimBoard, cleanBoard, spendBoardTickets, type BoardState, type CheckinPrize, type TicketKind } from "./checkinBoard";
import { checkinOpen, checkinPrizesOf, getContent } from "./gachaContent";
import { grantItem } from "./items";
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

/**
 * Claims today's box. Returns the day claimed and what it paid, or null when nothing can be claimed. An item prize is
 * granted before the claim is saved, so a store that refuses the item leaves the box unclaimed.
 */
export function claimBoardToday(): { day: number; prize: CheckinPrize } | null {
  const now = new Date();
  const r = claimBoard(readBoard(), checkedInToday(now), now, checkinOpen(now), checkinPrizesOf(getContent()));
  if (!r) return null;
  if (r.prize.kind === "item") {
    for (let i = 0; i < r.prize.count; i++) if (!grantItem(r.prize.id)) return null;
  }
  if (!save(r.state)) return null;
  return { day: r.day, prize: r.prize };
}

/** Adds `n` Draw Tickets of one kind (Season Pass rewards). Returns false when the store refused the write. */
export function grantTickets(kind: TicketKind, n: number): boolean {
  const cur = readBoard();
  const add = Math.max(0, Math.floor(n));
  if (!add) return true;
  return save({ ...cur, tickets: { ...cur.tickets, [kind]: cur.tickets[kind] + add } });
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

/** True while today's box can be claimed (checked in, nothing claimed today, event open). Drives the tab's dot. */
export function useCheckinReady(): boolean {
  const board = useCheckinBoard();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return canClaimBoard(board, checkedInToday(now), now, checkinOpen(now));
}

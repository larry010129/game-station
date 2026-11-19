/**
 * The 7-day check-in board. Pure rules over a plain state object (no storage, React or clock of its own), so every
 * rule is tested by passing a state and a date. `useCheckinBoard.ts` adds storage and the UI hooks.
 *
 * - Each local day the station is opened (the quest check-in) lets the user claim the next box, once that day.
 * - A missed day costs nothing: the board waits on the next box. There is no catch-up for missed days.
 * - Day 7 stays shown as claimed for the rest of that day; the next local day the board starts again at Day 1.
 * - What each box pays is set per day in the CMS (`checkinPrizes`): Regular or Special Draw Tickets, or an item, and
 *   how many. By default every box pays Special Tickets. Tickets are never a gacha prize and never Credits. An item
 *   prize is handed out by the caller (useCheckinBoard); this module only counts tickets.
 * - The CMS can run the board as an event with a start and an end (`checkinEvent`); outside it nothing can be claimed.
 */

import { CHECKIN_DAYS, DEFAULT_CHECKIN_PRIZES, type CheckinPrize, type TicketKind } from "./gachaContent.ts";

export type { CheckinPrize, TicketKind };

/** What Day 1 to Day 7 pay when the release does not say (the CMS sets `checkinPrizes`). */
export const BOARD_PRIZES: readonly CheckinPrize[] = DEFAULT_CHECKIN_PRIZES;
export const BOARD_DAYS = CHECKIN_DAYS;

export type TicketWallet = Record<TicketKind, number>;

export interface BoardState {
  v: 1;
  /** Boxes claimed in the current run, 0 to BOARD_DAYS. */
  claimed: number;
  /** Local day key (YYYY-MM-DD) of the last claim. */
  lastDay: string | null;
  /** Draw Tickets held, by kind. */
  tickets: TicketWallet;
}

export const emptyBoard = (): BoardState => ({ v: 1, claimed: 0, lastDay: null, tickets: { regular: 0, special: 0 } });

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Boxes shown as claimed now. A finished run shows all 7 until the next local day, then starts over. */
export function shownClaimed(s: BoardState, now: Date): number {
  if (s.claimed >= BOARD_DAYS && s.lastDay != null && dayKey(now) > s.lastDay) return 0;
  return Math.min(s.claimed, BOARD_DAYS);
}

/** True once a box was claimed today (or the clock was set back behind the last claim). */
export const claimedToday = (s: BoardState, now: Date): boolean => s.lastDay != null && dayKey(now) <= s.lastDay;

/**
 * The next box can be claimed: the check-in event is open (`open`, default true when there is no event), checked in
 * today, nothing claimed today, and the run is not finished.
 */
export function canClaimBoard(s: BoardState, checkedInToday: boolean, now: Date, open = true): boolean {
  return open && checkedInToday && !claimedToday(s, now) && shownClaimed(s, now) < BOARD_DAYS;
}

/** Claims the next box. Returns the new state and what it paid, or null when nothing can be claimed. */
export function claimBoard(
  s: BoardState,
  checkedInToday: boolean,
  now: Date,
  open = true,
  prizes: readonly CheckinPrize[] = BOARD_PRIZES,
): { state: BoardState; prize: CheckinPrize; kind: CheckinPrize["kind"]; count: number; day: number } | null {
  if (!canClaimBoard(s, checkedInToday, now, open)) return null;
  const base = shownClaimed(s, now);
  const prize = prizes[base] ?? BOARD_PRIZES[base];
  // Tickets are counted here; an item prize leaves the wallet as it is (the caller grants the item).
  const tickets = prize.kind === "item" ? s.tickets : { ...s.tickets, [prize.kind]: s.tickets[prize.kind] + prize.count };
  return { state: { ...s, claimed: base + 1, lastDay: dayKey(now), tickets }, prize, kind: prize.kind, count: prize.count, day: base + 1 };
}

/** Spends `n` tickets of one kind. Returns null when fewer are held. */
export function spendBoardTickets(s: BoardState, kind: TicketKind, n: number): BoardState | null {
  const k = Math.floor(n);
  if (!(k > 0) || s.tickets[kind] < k) return null;
  return { ...s, tickets: { ...s.tickets, [kind]: s.tickets[kind] - k } };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Turns anything read from storage into a valid state; unknown or malformed parts fall back to empty. */
export function cleanBoard(raw: unknown): BoardState {
  const out = emptyBoard();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  if (isCount(r.claimed)) out.claimed = Math.min(BOARD_DAYS, Math.floor(r.claimed));
  if (typeof r.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.lastDay)) out.lastDay = r.lastDay;
  // Before the Regular/Special split, tickets were one count that paid any pack: they become Special Tickets.
  if (isCount(r.tickets)) out.tickets.special = Math.floor(r.tickets);
  else if (typeof r.tickets === "object" && r.tickets !== null) {
    const t = r.tickets as Record<string, unknown>;
    if (isCount(t.regular)) out.tickets.regular = Math.floor(t.regular);
    if (isCount(t.special)) out.tickets.special = Math.floor(t.special);
  }
  return out;
}

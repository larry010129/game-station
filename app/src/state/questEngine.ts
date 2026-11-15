/**
 * Quest rules. Pure functions over a plain state object, with no storage, React or clock of their own,
 * so every rule can be tested by passing a state and a date. `useQuests.ts` adds storage and the UI hooks.
 *
 * Counted minute: a minute while a watched game is the running session (the timer is step 4 of the build order;
 * until it runs, `minutes` stay 0 and the minute-based quests simply show no progress).
 */

export type Period = "daily" | "weekly" | "monthly" | "once";
export type RankId = "recruit" | "regular" | "veteran" | "night";

/** What a quest counts. */
export type Metric =
  | "checkin" // check-in on this many different days in the period
  | "minutes" // counted minutes in the period
  | "armed" // game mode on, on this many different days in the period
  | "longSession" // one finished session of at least LONG_SESSION_MIN this day
  | "event"; // a one-time action, see `event`

export interface QuestDef {
  id: string;
  period: Period;
  title: string;
  /** Plain words for "Completes when". */
  blurb: string;
  credits: number;
  /** The amount `metric` must reach. */
  target: number;
  metric: Metric;
  /** For one-time starters: which tracked action completes it. */
  event?: OnceEvent;
  /** The lowest rank that sees this quest. */
  minRank?: RankId;
}

export type OnceEvent = "look" | "calendar" | "vault" | "star";

export const LONG_SESSION_MIN = 45;

export const QUESTS: readonly QuestDef[] = [
  { id: "checkin", period: "daily", title: "Station check-in", blurb: "Open the station once a day.", credits: 5, target: 1, metric: "checkin" },
  { id: "thirty", period: "daily", title: "Thirty on the clock", blurb: "30 counted minutes today.", credits: 8, target: 30, metric: "minutes" },
  { id: "arm", period: "daily", title: "Arm game mode", blurb: "Turn game mode on today.", credits: 6, target: 1, metric: "armed" },
  { id: "longwatch", period: "daily", title: "Long watch", blurb: "One finished session of 45 minutes or more today.", credits: 12, target: 1, metric: "longSession", minRank: "veteran" },
  { id: "nightwatch", period: "daily", title: "Night watch", blurb: "90 counted minutes today.", credits: 15, target: 90, metric: "minutes", minRank: "night" },

  { id: "weeklook", period: "weekly", title: "Weekly look", blurb: "Check in on 5 different days this week, then pick 1 locked look to unlock free.", credits: 0, target: 5, metric: "checkin" },
  { id: "threehour", period: "weekly", title: "Three-hour week", blurb: "180 counted minutes this week.", credits: 12, target: 180, metric: "minutes" },
  { id: "armed3", period: "weekly", title: "Armed three times", blurb: "Game mode on, on 3 different days this week.", credits: 8, target: 3, metric: "armed" },

  { id: "halfmonth", period: "monthly", title: "Half the month", blurb: "Check in on 12 different days this month.", credits: 20, target: 12, metric: "checkin" },
  { id: "tenhour", period: "monthly", title: "Ten-hour month", blurb: "600 counted minutes this month.", credits: 20, target: 600, metric: "minutes" },
  { id: "armed8", period: "monthly", title: "Eight armed days", blurb: "Game mode on, on 8 different days this month.", credits: 15, target: 8, metric: "armed" },

  { id: "look", period: "once", title: "Apply a look", blurb: "Apply any look.", credits: 15, target: 1, metric: "event", event: "look" },
  { id: "calendar", period: "once", title: "Open Calendar", blurb: "Open the Calendar page.", credits: 10, target: 1, metric: "event", event: "calendar" },
  { id: "vault", period: "once", title: "Open Vault", blurb: "Open the Vault.", credits: 10, target: 1, metric: "event", event: "vault" },
  { id: "star", period: "once", title: "Star a theme", blurb: "Star a theme. Pays Credits; every look stays locked.", credits: 12, target: 1, metric: "event", event: "star", minRank: "regular" },
];

export interface Rank {
  id: RankId;
  name: string;
  /** Counted minutes and claimed tasks needed to reach it. */
  minutes: number;
  tasks: number;
  /** One Credit per this many counted minutes. */
  perCredit: number;
}

export const RANKS: readonly Rank[] = [
  { id: "recruit", name: "Recruit", minutes: 0, tasks: 0, perCredit: 6 },
  { id: "regular", name: "Regular", minutes: 180, tasks: 5, perCredit: 5 },
  { id: "veteran", name: "Veteran", minutes: 600, tasks: 15, perCredit: 3 },
  { id: "night", name: "Night", minutes: 1500, tasks: 40, perCredit: 2 },
];

/** What one local day recorded. Older days are pruned. */
export interface DayLog {
  checkin?: true;
  armed?: true;
  /** Counted minutes that day. */
  minutes: number;
  /** A finished session of LONG_SESSION_MIN or more happened. */
  longSession?: true;
}

export interface QuestState {
  v: 1;
  days: Record<string, DayLog>;
  /** `${questId}:${periodKey}` for every paid claim. */
  claims: Record<string, true>;
  /** One-time actions the user has done. */
  done: Partial<Record<OnceEvent, true>>;
  /** Lifetime counted minutes and paid claims (they set the rank). */
  minutesTotal: number;
  tasksClaimed: number;
  /** Counted minutes not yet turned into a Credit (rank rate). */
  minuteBank: number;
  /** Weekly look unlocks earned but not yet picked (one per qualifying week). */
  looksWaiting: number;
}

export const emptyState = (): QuestState => ({ v: 1, days: {}, claims: {}, done: {}, minutesTotal: 0, tasksClaimed: 0, minuteBank: 0, looksWaiting: 0 });

// ---- local-calendar period keys -------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD in local time. */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** The Monday (local midnight) of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sinceMonday = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - sinceMonday);
  return x;
}
/** Weeks are named by their Monday. */
export const weekKey = (d: Date): string => dayKey(weekStart(d));

export function periodKey(period: Period, d: Date): string {
  switch (period) {
    case "daily":
      return dayKey(d);
    case "weekly":
      return weekKey(d);
    case "monthly":
      return monthKey(d);
    default:
      return "once";
  }
}

/** The local day keys inside the period that contains `d`, up to and including `d`'s day. */
export function daysInPeriod(period: Period, d: Date): string[] {
  const out: string[] = [];
  if (period === "daily") return [dayKey(d)];
  if (period === "weekly") {
    const start = weekStart(d);
    for (let i = 0; i < 7; i++) out.push(dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
    return out;
  }
  if (period === "monthly") {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= last; i++) out.push(dayKey(new Date(d.getFullYear(), d.getMonth(), i)));
  }
  return out;
}

/** When the period that contains `d` ends (the next reset), in local time. */
export function nextReset(period: Period, d: Date): Date | null {
  if (period === "daily") return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  if (period === "weekly") {
    const s = weekStart(d);
    return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
  }
  if (period === "monthly") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return null;
}

// ---- rank -----------------------------------------------------------------------------------

export function rankOf(s: Pick<QuestState, "minutesTotal" | "tasksClaimed">): Rank {
  let best = RANKS[0];
  for (const r of RANKS) if (s.minutesTotal >= r.minutes && s.tasksClaimed >= r.tasks) best = r;
  return best;
}

export function nextRank(rank: Rank): Rank | null {
  const i = RANKS.findIndex((r) => r.id === rank.id);
  return RANKS[i + 1] ?? null;
}

const rankIndex = (id: RankId) => RANKS.findIndex((r) => r.id === id);

/** Quests this rank can see. A rank-gated quest stays hidden until the rank is reached. */
export function visibleQuests(s: QuestState, period?: Period): QuestDef[] {
  const idx = rankIndex(rankOf(s).id);
  return QUESTS.filter((q) => (!period || q.period === period) && (!q.minRank || rankIndex(q.minRank) <= idx));
}

// ---- progress and claims --------------------------------------------------------------------

export function progress(s: QuestState, q: QuestDef, now: Date): number {
  if (q.metric === "event") return q.event && s.done[q.event] ? 1 : 0;
  const days = daysInPeriod(q.period, now).map((k) => s.days[k]).filter((d): d is DayLog => d != null);
  switch (q.metric) {
    case "checkin":
      return days.filter((d) => d.checkin).length;
    case "armed":
      return days.filter((d) => d.armed).length;
    case "longSession":
      return days.some((d) => d.longSession) ? 1 : 0;
    case "minutes":
      return days.reduce((n, d) => n + d.minutes, 0);
    default:
      return 0;
  }
}

const claimKey = (q: QuestDef, now: Date) => `${q.id}:${periodKey(q.period, now)}`;

export const isClaimed = (s: QuestState, q: QuestDef, now: Date): boolean => s.claims[claimKey(q, now)] === true;
export const isComplete = (s: QuestState, q: QuestDef, now: Date): boolean => progress(s, q, now) >= q.target;
export const canClaim = (s: QuestState, q: QuestDef, now: Date): boolean => visibleQuests(s).some((v) => v.id === q.id) && isComplete(s, q, now) && !isClaimed(s, q, now);

/** Marks a claim paid. Returns the new state and the Credits to add (0 for the weekly look, which adds a waiting pick). */
export function claim(s: QuestState, id: string, now: Date): { state: QuestState; credits: number } | null {
  const q = QUESTS.find((x) => x.id === id);
  if (!q || !canClaim(s, q, now)) return null;
  const next: QuestState = { ...s, claims: { ...s.claims, [claimKey(q, now)]: true }, tasksClaimed: s.tasksClaimed + 1 };
  if (q.id === "weeklook") next.looksWaiting = s.looksWaiting + 1;
  return { state: next, credits: q.credits };
}

// ---- recording what the user did ------------------------------------------------------------

const MAX_DAYS = 70;

function withDay(s: QuestState, now: Date, f: (d: DayLog) => DayLog): QuestState {
  const k = dayKey(now);
  const days = { ...s.days, [k]: f(s.days[k] ?? { minutes: 0 }) };
  const keys = Object.keys(days).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_DAYS))) delete days[old];
  return { ...s, days };
}

export const recordCheckin = (s: QuestState, now: Date): QuestState => (s.days[dayKey(now)]?.checkin ? s : withDay(s, now, (d) => ({ ...d, checkin: true })));
export const recordArmed = (s: QuestState, now: Date): QuestState => (s.days[dayKey(now)]?.armed ? s : withDay(s, now, (d) => ({ ...d, armed: true })));
export const recordOnce = (s: QuestState, e: OnceEvent): QuestState => (s.done[e] ? s : { ...s, done: { ...s.done, [e]: true } });

/** A finished game session. Under 60 seconds adds nothing; 45 minutes or more counts as a long watch. */
export function recordSession(s: QuestState, seconds: number, now: Date): QuestState {
  if (!(seconds >= 60)) return s;
  return seconds >= LONG_SESSION_MIN * 60 ? withDay(s, now, (d) => ({ ...d, longSession: true })) : s;
}

/**
 * Adds counted minutes. The rank rate turns banked minutes into Credits: returns the new state and the whole
 * Credits earned (leftover minutes stay banked). The rank used is the one before these minutes are added.
 */
export function addMinutes(s: QuestState, minutes: number, now: Date): { state: QuestState; credits: number } {
  const m = Math.max(0, Math.floor(minutes));
  if (m === 0) return { state: s, credits: 0 };
  const rate = rankOf(s).perCredit;
  const bank = s.minuteBank + m;
  const credits = Math.floor(bank / rate);
  const state = withDay({ ...s, minutesTotal: s.minutesTotal + m, minuteBank: bank - credits * rate }, now, (d) => ({ ...d, minutes: d.minutes + m }));
  return { state, credits };
}

/** Spends one waiting weekly-look pick. */
export function takeLookPick(s: QuestState): QuestState | null {
  return s.looksWaiting > 0 ? { ...s, looksWaiting: s.looksWaiting - 1 } : null;
}

// ---- reading saved state --------------------------------------------------------------------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Turns anything read from storage into a valid state; unknown or malformed parts fall back to empty. */
export function cleanState(raw: unknown): QuestState {
  const out = emptyState();
  if (!isRecord(raw)) return out;
  if (isRecord(raw.days)) {
    for (const [k, v] of Object.entries(raw.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !isRecord(v)) continue;
      out.days[k] = { minutes: isNum(v.minutes) ? Math.floor(v.minutes) : 0, ...(v.checkin === true ? { checkin: true as const } : {}), ...(v.armed === true ? { armed: true as const } : {}), ...(v.longSession === true ? { longSession: true as const } : {}) };
    }
  }
  if (isRecord(raw.claims)) for (const [k, v] of Object.entries(raw.claims)) if (v === true && /^[a-z0-9]+:.+$/.test(k)) out.claims[k] = true;
  if (isRecord(raw.done)) for (const e of ["look", "calendar", "vault", "star"] as const) if (raw.done[e] === true) out.done[e] = true;
  if (isNum(raw.minutesTotal)) out.minutesTotal = Math.floor(raw.minutesTotal);
  if (isNum(raw.tasksClaimed)) out.tasksClaimed = Math.floor(raw.tasksClaimed);
  if (isNum(raw.minuteBank)) out.minuteBank = Math.floor(raw.minuteBank);
  if (isNum(raw.looksWaiting)) out.looksWaiting = Math.floor(raw.looksWaiting);
  return out;
}

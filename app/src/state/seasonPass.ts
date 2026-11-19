/**
 * The Season Pass. Pure rules over a plain state object (no storage, React or clock of its own), so the Node tests
 * can drive every rule with a state and a date.
 *
 * - A season lasts SEASON_DAYS, counted from SEASON_ANCHOR in local time. A new season starts the pass over:
 *   XP, level and claims reset, and rewards not claimed in time are gone.
 * - Pass XP comes from what the quest log already counts: XP_PER_MINUTE for each counted minute of play and
 *   XP_PER_TASK for each quest claimed. The pass only remembers the last totals it saw, so it never double-counts.
 * - At most WEEKLY_CAP XP is earned per local week; anything over the cap that week is not banked. At the cap,
 *   all LEVELS take about 8.6 weeks of a SEASON_DAYS season, with no perks.
 * - The pass stops at BASE_LEVEL_CAP. Levels above it open only with the Extended Season perk (perk tree); XP past
 *   the open cap is not earned.
 * - Every level has a Free reward (Income and Draw Tickets) and a Patreon reward (items, and card skins at levels
 *   30, 45 and 60). Patreon rewards are cosmetic: no Income or Tickets. Levels cannot be bought.
 */
import { weekKey } from "./questEngine.ts";

export const SEASON_DAYS = 91;
/** Season 1 starts at local midnight on Monday 2 November 2026. */
export const SEASON_ANCHOR = { y: 2026, m: 10, d: 2 };
export const LEVELS = 60;
/** Without the Extended Season perk the pass stops here. */
export const BASE_LEVEL_CAP = 45;
export const XP_PER_LEVEL = 500;
export const XP_PER_MINUTE = 10;
export const XP_PER_TASK = 100;
export const WEEKLY_CAP = 3500;
export const MAX_XP = LEVELS * XP_PER_LEVEL;

export type PassRow = "free" | "patron";

export type PassReward =
  | { kind: "credits"; n: number }
  | { kind: "ticket"; ticket: "regular" | "special"; n: number }
  | { kind: "item"; id: string; n: number }
  | { kind: "skin"; id: string };

/** The skin at the top of the Patreon row, shown large beside the track. */
export const FEATURED_SKIN = "aurora-drift";

const pad = (n: number) => String(n).padStart(2, "0");

function freeReward(level: number): PassReward {
  if (level === LEVELS) return { kind: "ticket", ticket: "special", n: 3 };
  if (level === 30 || level === BASE_LEVEL_CAP) return { kind: "ticket", ticket: "special", n: 2 };
  if (level % 5 === 0) return { kind: "ticket", ticket: "special", n: 1 };
  if (level % 2 === 0) return { kind: "ticket", ticket: "regular", n: 1 };
  return { kind: "credits", n: 20 };
}

/** Fixed Patreon rewards; every other level gets a streak freeze or the next wallpaper / alert sound in turn. */
const PATRON_FIXED: Record<number, PassReward> = {
  5: { kind: "item", id: "name-flair-01", n: 1 },
  10: { kind: "item", id: "boot-01", n: 1 },
  15: { kind: "item", id: "layout-slot-01", n: 1 },
  20: { kind: "item", id: "boot-02", n: 1 },
  25: { kind: "item", id: "font-01", n: 1 },
  30: { kind: "skin", id: "starfield" },
  33: { kind: "item", id: "name-flair-02", n: 1 },
  35: { kind: "item", id: "layout-slot-02", n: 1 },
  40: { kind: "item", id: "boot-03", n: 1 },
  45: { kind: "skin", id: "neon-rim" },
  50: { kind: "item", id: "font-02", n: 1 },
  55: { kind: "item", id: "layout-slot-03", n: 1 },
  60: { kind: "skin", id: FEATURED_SKIN },
};

const PATRON: PassReward[] = (() => {
  const out: PassReward[] = [];
  let wallpaper = 0;
  let sound = 0;
  let turn = 0;
  for (let level = 1; level <= LEVELS; level++) {
    const fixed = PATRON_FIXED[level];
    if (fixed) out.push(fixed);
    else if (level % 3 === 0) out.push({ kind: "item", id: "streak-freeze", n: 1 });
    else out.push(turn++ % 2 === 0 ? { kind: "item", id: `wallpaper-${pad(++wallpaper)}`, n: 1 } : { kind: "item", id: `alert-sound-${pad(++sound)}`, n: 1 });
  }
  return out;
})();

/** Level 1 to LEVELS, each with its two rewards. */
export const PASS_LEVELS: readonly { level: number; free: PassReward; patron: PassReward }[] = Array.from({ length: LEVELS }, (_, i) => ({
  level: i + 1,
  free: freeReward(i + 1),
  patron: PATRON[i],
}));

// ---- seasons -----------------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const anchor = () => new Date(SEASON_ANCHOR.y, SEASON_ANCHOR.m, SEASON_ANCHOR.d);
/** Whole local days between two dates, safe across daylight-saving changes. */
const daysBetween = (a: Date, b: Date) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY_MS);

export interface Season {
  /** 1 for the first season; 0 or less before it. */
  number: number;
  start: Date;
  end: Date;
}

export function seasonAt(now: Date): Season {
  const a = anchor();
  const n = Math.floor(daysBetween(a, now) / SEASON_DAYS);
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate() + n * SEASON_DAYS);
  const end = new Date(a.getFullYear(), a.getMonth(), a.getDate() + (n + 1) * SEASON_DAYS);
  return { number: n + 1, start, end };
}

/** "38 d 7 h", "7 h 56 m", "12 m". */
export function timeLeft(now: Date, end: Date): string {
  const m = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m % 60} m`;
  return `${m % 60} m`;
}

// ---- state ---------------------------------------------------------------------------------------

export interface PassTotals {
  minutesTotal: number;
  tasksClaimed: number;
}

export interface PassState {
  v: 1;
  season: number;
  xp: number;
  /** The local week the weekly XP belongs to. */
  week: string;
  weekXp: number;
  /** The quest totals at the last sync; null until the first one (which only records them). */
  last: PassTotals | null;
  claimed: Record<PassRow, number[]>;
  /** The highest level already celebrated, so each level-up is announced once. */
  announced: number;
  /** Levels reached in seasons that have ended. With this season's level it is the lifetime count (Perk Points). */
  banked: number;
}

export const emptyPass = (season: number, week: string): PassState => ({ v: 1, season, xp: 0, week, weekXp: 0, last: null, claimed: { free: [], patron: [] }, announced: 0, banked: 0 });

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
const levels = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= LEVELS))].sort((a, b) => a - b) : []);

export function cleanPass(raw: unknown, now: Date): PassState {
  const fresh = emptyPass(seasonAt(now).number, weekKey(now));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fresh;
  const r = raw as Record<string, unknown>;
  const last = r.last && typeof r.last === "object" ? (r.last as Record<string, unknown>) : null;
  const claimed = r.claimed && typeof r.claimed === "object" ? (r.claimed as Record<string, unknown>) : {};
  return {
    v: 1,
    season: Number.isInteger(r.season) ? (r.season as number) : fresh.season,
    xp: Math.min(num(r.xp), MAX_XP),
    week: typeof r.week === "string" ? r.week : fresh.week,
    weekXp: num(r.weekXp),
    last: last ? { minutesTotal: num(last.minutesTotal), tasksClaimed: num(last.tasksClaimed) } : null,
    claimed: { free: levels(claimed.free), patron: levels(claimed.patron) },
    announced: Math.min(num(r.announced), LEVELS),
    banked: num(r.banked),
  };
}

/** Perk effects on the pass: an XP multiplier, extra weekly cap, and the highest level open (BASE_LEVEL_CAP without the perk). */
export interface PassMods {
  xpMult?: number;
  capBonus?: number;
  levelCap?: number;
}

/** The highest level that can be reached with these mods. */
export const openLevelCap = (mods: PassMods = {}): number => Math.max(1, Math.min(LEVELS, mods.levelCap ?? BASE_LEVEL_CAP));

/** Levels reached over every season, this one included. */
export const lifetimeLevels = (s: PassState): number => s.banked + levelOf(s.xp).level;

/**
 * Brings the pass up to date with the quest totals. A new season starts over from the current totals, keeping the
 * levels reached so far in `banked`. Returns the same object when nothing changes.
 */
export function syncPass(s: PassState, totals: PassTotals, now: Date, mods: PassMods = {}): PassState {
  const season = seasonAt(now).number;
  const week = weekKey(now);
  if (s.season !== season) return { ...emptyPass(season, week), last: { ...totals }, banked: lifetimeLevels(s) };
  if (!s.last) return { ...s, last: { ...totals } };

  const dm = Math.max(0, totals.minutesTotal - s.last.minutesTotal);
  const dt = Math.max(0, totals.tasksClaimed - s.last.tasksClaimed);
  const sameWeek = s.week === week;
  if (!dm && !dt && sameWeek && totals.minutesTotal === s.last.minutesTotal && totals.tasksClaimed === s.last.tasksClaimed) return s;

  const weekXp = sameWeek ? s.weekXp : 0;
  const gain = Math.floor((dm * XP_PER_MINUTE + dt * XP_PER_TASK) * Math.max(1, mods.xpMult ?? 1));
  // XP past the open level cap is not earned: it starts again once the cap is raised.
  const add = Math.max(0, Math.min(gain, WEEKLY_CAP + Math.max(0, mods.capBonus ?? 0) - weekXp, openLevelCap(mods) * XP_PER_LEVEL - s.xp));
  return { ...s, xp: s.xp + add, week, weekXp: weekXp + add, last: { ...totals } };
}

export function levelOf(xp: number): { level: number; into: number; need: number } {
  const level = Math.min(LEVELS, Math.floor(xp / XP_PER_LEVEL));
  return level >= LEVELS ? { level, into: XP_PER_LEVEL, need: XP_PER_LEVEL } : { level, into: xp - level * XP_PER_LEVEL, need: XP_PER_LEVEL };
}

export function canClaim(s: PassState, level: number, row: PassRow, patron: boolean): boolean {
  if (row === "patron" && !patron) return false;
  return level >= 1 && level <= levelOf(s.xp).level && !s.claimed[row].includes(level);
}

/** Every reward that can be claimed now, lowest level first. */
export function claimable(s: PassState, patron: boolean): { level: number; row: PassRow; reward: PassReward }[] {
  const out: { level: number; row: PassRow; reward: PassReward }[] = [];
  for (const l of PASS_LEVELS) {
    if (canClaim(s, l.level, "free", patron)) out.push({ level: l.level, row: "free", reward: l.free });
    if (canClaim(s, l.level, "patron", patron)) out.push({ level: l.level, row: "patron", reward: l.patron });
  }
  return out;
}

export function markClaimed(s: PassState, level: number, row: PassRow): PassState {
  if (s.claimed[row].includes(level)) return s;
  return { ...s, claimed: { ...s.claimed, [row]: [...s.claimed[row], level].sort((a, b) => a - b) } };
}

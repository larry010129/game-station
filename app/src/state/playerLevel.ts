/**
 * Player levels (decided 2026-11-18). Data and plain functions only (no React or storage), so the Node tests can load it.
 *
 * - The time the app is running earns XP: open or minimized counts, sleep does not (a long gap between two ticks is
 *   clamped, the same way the play clock does it). There is no daily cap.
 * - XP needed per level and XP earned per counted hour at each level come from the generated table
 *   (../content/playerLevelData.ts, written by design/perk-tree-sample/build.py from player-level-xp.html).
 * - The saved state is the level and the XP inside it, not lifetime XP: lifetime totals reach about 4e15 and would lose
 *   precision on small additions.
 * - Perk Points are a function of level: the start points, then the per-level bands in the table. Level 250 pays
 *   bands I to V; the last levels pay for the one band VI a player can take, then the points stop.
 * - Season Pass XP boosts from perks do not apply here.
 */
import { PLAYER_LEVELS } from "../content/playerLevelData.ts";
import { MAX_TICK_GAP_MS } from "./questEngine.ts";

export const PLAYER_LEVEL_KEY = "cs.playerLevel";
export const MAX_LEVEL: number = PLAYER_LEVELS.maxLevel;
/** The level where every Perk Point a player can ever take has been earned. */
export const ALL_PAID_LEVEL: number = PLAYER_LEVELS.targetLevel;
/** The last level that gives Perk Points: levels past ALL_PAID_LEVEL pay for band VI, then the points stop. */
export const LAST_POINT_LEVEL: number = PLAYER_LEVELS.lastPointLevel;

export interface PlayerLevelState {
  /** 1 to MAX_LEVEL. */
  level: number;
  /** XP earned inside this level, below the XP needed to leave it (0 at the max level). */
  xp: number;
}

export const emptyLevel = (): PlayerLevelState => ({ level: 1, xp: 0 });

/** XP to go from `level` to the next one; 0 at the max level. */
export const xpToNext = (level: number): number => (level >= MAX_LEVEL ? 0 : (PLAYER_LEVELS.need[Math.max(1, Math.floor(level)) - 1] ?? 0));

/** XP earned per counted hour while at `level`. */
export const xpPerHour = (level: number): number => PLAYER_LEVELS.perHour[Math.min(MAX_LEVEL - 1, Math.max(1, Math.floor(level))) - 1] ?? 0;

/** Counted hours a whole level takes at its earn rate. */
export const hoursForLevel = (level: number): number => (level >= MAX_LEVEL ? 0 : xpToNext(level) / xpPerHour(level));

/** Fraction of the way through the level, 0 to 1 (1 at the max level). */
export function levelProgress(s: PlayerLevelState): number {
  if (s.level >= MAX_LEVEL) return 1;
  const need = xpToNext(s.level);
  return need > 0 ? Math.min(1, s.xp / need) : 0;
}

/** Counted time for the gap between two ticks: awake time, so a sleeping PC is not paid. Never negative. */
export const countedGapMs = (lastTick: number, now: number): number => Math.min(Math.max(0, now - lastTick), MAX_TICK_GAP_MS);

/** Adds counted time. Carries over several levels at once, and stops at the max level. */
export function addCountedMs(s: PlayerLevelState, ms: number): PlayerLevelState {
  if (!(ms > 0) || s.level >= MAX_LEVEL) return s.level >= MAX_LEVEL ? { level: MAX_LEVEL, xp: 0 } : s;
  let { level, xp } = s;
  let hours = ms / 3_600_000;
  while (hours > 0 && level < MAX_LEVEL) {
    const rate = xpPerHour(level);
    const left = xpToNext(level) - xp;
    const toLevel = left / rate;
    if (hours >= toLevel) {
      hours -= toLevel;
      level++;
      xp = 0;
    } else {
      xp += rate * hours;
      hours = 0;
    }
  }
  return level >= MAX_LEVEL ? { level: MAX_LEVEL, xp: 0 } : { level, xp };
}

// ---- Perk Points by level ---------------------------------------------------------------------------------------------

/** Perk Points held at each level: index L-1. */
const POINTS_BY_LEVEL: number[] = (() => {
  const per = new Map<number, number>();
  for (const [from, to, pts] of PLAYER_LEVELS.pointBands) for (let L = from; L <= to; L++) per.set(L, pts);
  const out = [PLAYER_LEVELS.startPoints as number];
  for (let L = 2; L <= MAX_LEVEL; L++) out.push(out[L - 2] + (per.get(L) ?? 0));
  return out;
})();

/** Perk Points earned by `level` (the start points at level 1). No other cap: the bands end where the tree a player can take ends. */
export function pointsAtLevel(level: number): number {
  const L = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number.isFinite(level) ? level : 1)));
  return POINTS_BY_LEVEL[L - 1];
}

/** Perk Points a level up to `level` gives, for the "you get N a level" line: the band that `level` falls in. */
export const pointsPerLevelAt = (level: number): number => pointsAtLevel(level) - pointsAtLevel(level - 1);

// ---- reading saved state ----------------------------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Turns anything read from storage into a valid state. */
export function cleanLevel(raw: unknown): PlayerLevelState {
  if (!isRecord(raw)) return emptyLevel();
  const level = typeof raw.level === "number" && Number.isFinite(raw.level) ? Math.min(MAX_LEVEL, Math.max(1, Math.floor(raw.level))) : 1;
  const xp = typeof raw.xp === "number" && Number.isFinite(raw.xp) && raw.xp > 0 ? raw.xp : 0;
  if (level >= MAX_LEVEL) return { level: MAX_LEVEL, xp: 0 };
  return { level, xp: Math.min(xp, Math.max(0, xpToNext(level) - 1e-6)) };
}

/** A short label for a big XP number: "950", "12.4K", "3.2M", "18.5B", "1.2T", "4.3Q". */
export function xpLabel(n: number): string {
  if (!(n >= 1000)) return String(Math.round(Math.max(0, n)));
  const units = ["K", "M", "B", "T", "Q"];
  let v = n;
  let i = -1;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v)}${units[i]}`;
}

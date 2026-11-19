import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import {
  activeNodes,
  cleanPerks,
  effectsOf,
  incomePct,
  percentBonus,
  PERKS_KEY,
  pointsEarned,
  resetPerks,
  takeNode,
  type IncomeSource,
  type PerkEffects,
  type PerkState,
} from "./perks";
import { cleanLevel, PLAYER_LEVEL_KEY } from "./playerLevel";

/**
 * Perk storage and the effects in force. Reads the player level straight from storage (not through its hook), so the
 * quest timer and the pass watcher can ask for the effects without importing each other.
 */
const EVENT = "cs-perks";
/** Changes that move the points earned: the player level. */
const WATCH = [EVENT, "cs-player-level", "storage"];
/** Fractions of percent bonuses not yet paid, per Income source. */
const CARRY_KEY = "cs.perkCarry";

export interface PerkContext {
  state: PerkState;
  /** Points earned so far, spent or not. */
  earned: number;
  /** The player level the points come from. */
  level: number;
  /** Taken nodes that count now (all of them unless points fell below what was spent). */
  active: string[];
  effects: PerkEffects;
}

export function readPerkContext(): PerkContext {
  const state = cleanPerks(readJson<unknown>(PERKS_KEY, null));
  const level = cleanLevel(readJson<unknown>(PLAYER_LEVEL_KEY, null)).level;
  const earned = pointsEarned(level);
  const active = activeNodes(state, earned);
  return { state, earned, level, active, effects: effectsOf(active) };
}

/** The effects in force now, for the systems that apply them. */
export const readPerkEffects = (): PerkEffects => readPerkContext().effects;

/**
 * Whole bonus Income the perk tree adds to `base` Income from one source. Fractions carry over to the next payment
 * from the same source, so a +3% on a 1-Income play tick still pays in time.
 */
export function perkIncomeBonus(source: IncomeSource, base: number): number {
  const pct = incomePct(readPerkEffects(), source);
  if (base <= 0 || pct <= 0) return 0;
  const raw = readJson<unknown>(CARRY_KEY, null);
  const carries = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const before = typeof carries[source] === "number" && Number.isFinite(carries[source]) ? (carries[source] as number) : 0;
  const r = percentBonus(base, pct, Math.min(1, before));
  writeJson(CARRY_KEY, { ...carries, [source]: r.carry });
  return r.bonus;
}

function save(s: PerkState): boolean {
  if (!writeJson(PERKS_KEY, s)) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

export function usePerks() {
  const [ctx, setCtx] = useState(() => readPerkContext());
  useEffect(() => {
    const sync = () => setCtx(readPerkContext());
    for (const e of WATCH) window.addEventListener(e, sync);
    const id = window.setInterval(sync, 30_000);
    return () => {
      for (const e of WATCH) window.removeEventListener(e, sync);
      window.clearInterval(id);
    };
  }, []);

  /** Takes a node and the path to it. False when it could not (no open path, too few points, or the save failed). */
  const take = useCallback((id: string): boolean => {
    const cur = readPerkContext();
    const next = takeNode(cur.state, id, cur.earned);
    return next !== cur.state && save(next);
  }, []);

  const reset = useCallback((): boolean => {
    const cur = readPerkContext();
    const next = resetPerks(cur.state, new Date());
    return next !== cur.state && save(next);
  }, []);

  return { ...ctx, take, reset };
}

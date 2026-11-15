import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { applyResults, cleanGacha, drawMany, priceOf, type DrawResult, type GachaState } from "./gachaEngine";
import { readCredits, spendCredits } from "./stationCredits";

const KEY = "cs.gacha";
const EVENT = "cs-gacha";

export const readGacha = (): GachaState => cleanGacha(readJson<unknown>(KEY, null));

/** Coupons and draw count, refreshed when they change. */
export function useGacha(): GachaState {
  const [state, setState] = useState(readGacha);
  useEffect(() => {
    const sync = () => setState(readGacha());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

export type BuyResult = { ok: true; results: DrawResult[] } | { ok: false; reason: "short" | "count" };

/**
 * One purchase of 1 or 10 draws, paid in earned Credits. The Credits are taken first; if the balance is short
 * nothing is rolled. Looks won are handed to `unlock`; coupons are counted here.
 */
export function buyDraws(count: number, owned: readonly string[], pool: readonly string[], unlock: (id: string) => void): BuyResult {
  const price = priceOf(count);
  if (price == null) return { ok: false, reason: "count" };
  if (readCredits() < price || spendCredits(price) == null) return { ok: false, reason: "short" };
  const results = drawMany(count, owned, pool, Math.random);
  for (const r of results) if (r.kind === "look") unlock(r.id);
  if (writeJson(KEY, applyResults(readGacha(), results)) && typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
  return { ok: true, results };
}

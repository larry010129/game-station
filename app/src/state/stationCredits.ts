import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";

/** Soft currency for station unlocks and rewards. */
export const CREDITS_KEY = "cs.stationCredits";
export const CREDIT_NAME = "Credits";
export const CREDIT_NAME_SHORT = "Credits";
/** Same-tab listeners (storage events only fire across windows). */
export const CREDITS_EVENT = "cs-station-credits";

/** Seeded once so a fresh install can buy Nightsteel and still have some left. */
export const STARTING_CREDITS = 200;

/** Nightsteel unlock cost in Credits. */
export const NIGHTSTEEL_COST = 120;

/**
 * Buy Me a Coffee tip page. Prefer `VITE_BUY_ME_A_COFFEE_URL` in `app/.env`
 * (see `.env.example`). Placeholder until you set your real page.
 */
export const BUY_ME_A_COFFEE_URL_DEFAULT = "https://buymeacoffee.com/yourname";

/** Resolved support URL for the Buy Credits / Support page. */
export const BUY_ME_A_COFFEE_URL = (() => {
  const fromEnv = String(import.meta.env.VITE_BUY_ME_A_COFFEE_URL ?? "").trim();
  return fromEnv || BUY_ME_A_COFFEE_URL_DEFAULT;
})();

function isCredits(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function notifyCredits(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CREDITS_EVENT));
}

/** Reads the balance; seeds STARTING_CREDITS the first time nothing is stored. */
export function readCredits(): number {
  const raw = readJson<unknown>(CREDITS_KEY, null);
  if (isCredits(raw)) return Math.floor(raw);
  writeJson(CREDITS_KEY, STARTING_CREDITS);
  return STARTING_CREDITS;
}

export function writeCredits(amount: number): boolean {
  const ok = writeJson(CREDITS_KEY, Math.max(0, Math.floor(amount)));
  if (ok) notifyCredits();
  return ok;
}

/** Adds Credits (local grant / rewards). Returns the new balance. */
export function addCredits(amount: number): number {
  const add = Math.max(0, Math.floor(amount));
  const next = readCredits() + add;
  writeCredits(next);
  return next;
}

/** Deducts `cost` when the balance covers it. Returns the new balance, or null if short. */
export function spendCredits(cost: number): number | null {
  const bal = readCredits();
  if (bal < cost) return null;
  const next = bal - cost;
  writeCredits(next);
  return next;
}

export function formatCredits(amount: number): string {
  return `${amount} ${CREDIT_NAME}`;
}

/** Live Credits balance; updates on spend, top-up, and cross-window storage. */
export function useStationCredits(): number {
  const [balance, setBalance] = useState(readCredits);
  useEffect(() => {
    const sync = () => setBalance(readCredits());
    window.addEventListener(CREDITS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CREDITS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return balance;
}

import { useEffect, useState } from "react";
import { readJson, readString, writeJson, writeString } from "../lib/storage.ts";
import { tr } from "../lib/i18n.ts";

/** Vite's env, or undefined when this module runs outside Vite (the service tests import it under plain Node). */
const VITE_ENV: ImportMetaEnv | undefined = typeof import.meta.env === "undefined" ? undefined : import.meta.env;

/** Soft currency for station unlocks and rewards. */
export const CREDITS_KEY = "cs.stationCredits";
/** What the player sees: amounts are Income ("+12 Income"); the system that pays it is Payroll. */
export const CREDIT_NAME = "Income";
export const CREDIT_NAME_SHORT = "Income";
export const ECONOMY_NAME = "Payroll";
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
  const fromEnv = String(VITE_ENV?.VITE_BUY_ME_A_COFFEE_URL ?? "").trim();
  return fromEnv || BUY_ME_A_COFFEE_URL_DEFAULT;
})();

function isCredits(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function notifyCredits(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CREDITS_EVENT));
}

/**
 * Reads the balance; seeds STARTING_CREDITS the first time nothing is stored. A stored value that is not a balance
 * is copied to `cs.stationCredits.bad` before the re-seed, so a damaged save can still be recovered by hand.
 */
export function readCredits(): number {
  const raw = readJson<unknown>(CREDITS_KEY, null);
  if (isCredits(raw)) return Math.floor(raw);
  const stored = readString(CREDITS_KEY);
  if (stored != null && stored !== "") writeString(`${CREDITS_KEY}.bad`, stored);
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

/**
 * Deducts `cost` when the balance covers it. Returns the new balance, or null when it is short or the new balance
 * could not be saved (nothing is spent then). Callers that need to tell the two apart check `readCredits()` first.
 */
export function spendCredits(cost: number): number | null {
  const bal = readCredits();
  if (bal < cost) return null;
  const next = bal - cost;
  return writeCredits(next) ? next : null;
}

/**
 * Dev-server only, never in a shipped build (Vite removes this block): open the app with `?testCredits=10000`
 * to add that many Credits for testing, or call `addTestCredits(n)` from the console. Credits cannot be bought.
 */
if (VITE_ENV !== undefined && import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { addTestCredits: (n: number) => number }).addTestCredits = addCredits;
  const n = Number(new URLSearchParams(window.location.search).get("testCredits"));
  if (Number.isFinite(n) && n > 0) {
    addCredits(Math.min(n, 1_000_000));
    const url = new URL(window.location.href);
    url.searchParams.delete("testCredits");
    window.history.replaceState(null, "", url);
  }
}

export function formatCredits(amount: number): string {
  return tr("income.amount", { n: amount }, `${amount} ${CREDIT_NAME}`);
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

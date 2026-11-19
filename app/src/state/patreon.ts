import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "../lib/api.ts";
import { readJson, writeJson } from "../lib/storage.ts";

/** What the service reports about the Patreon sign-in (see service/patreon.mjs). */
export interface PatreonStatus {
  /** False when this build has no Patreon app set up, so sign-in is off. */
  configured: boolean;
  signedIn: boolean;
  /** Basic: every preset look. Brand: the brand-colour editor. */
  basic: boolean;
  brand: boolean;
  tier: string | null;
  tierName?: string | null;
  name?: string | null;
  /** The last good check is older than the offline grace, so the unlocks are off. */
  stale?: boolean;
  checkedAt?: number | null;
  error?: string | null;
}

/** The unlocks from the last answer, kept so a restart shows them before the service has answered. */
export interface Entitlement {
  basic: boolean;
  brand: boolean;
  tierName: string | null;
  /** When Patreon last confirmed this answer (ms). The saved copy stops counting after ENTITLEMENT_GRACE_MS. */
  checkedAt: number;
}

/** Same as the service's OFFLINE_GRACE_MS (service/patreon.mjs): a copy nobody has refreshed for this long is off. */
export const ENTITLEMENT_GRACE_MS = 14 * 24 * 3600_000;

const KEY = "cs.patreon";
const none = (now: number): Entitlement => ({ basic: false, brand: false, tierName: null, checkedAt: now });
/** A stable "no unlocks" for useSyncExternalStore's server snapshot. */
const SERVER_NONE = none(0);

/**
 * Reads a saved copy. Without a fresh answer from the service it lasts ENTITLEMENT_GRACE_MS, so a canceled pledge
 * cannot keep its unlocks just because the service is not answering. A copy saved before `checkedAt` existed is
 * kept and its grace starts now.
 */
export function cleanEntitlement(raw: unknown, now: number = Date.now()): Entitlement {
  const o = raw as Partial<Entitlement> | null;
  if (!o || typeof o !== "object") return none(now);
  const checkedAt = typeof o.checkedAt === "number" && Number.isFinite(o.checkedAt) ? o.checkedAt : now;
  if (now - checkedAt > ENTITLEMENT_GRACE_MS) return none(now);
  return { basic: o.basic === true, brand: o.brand === true, tierName: typeof o.tierName === "string" ? o.tierName : null, checkedAt };
}

/** Reads the saved copy and, when it had no time or has expired, saves the cleaned copy back. */
export function loadEntitlement(now: number = Date.now()): Entitlement {
  const raw = readJson<unknown>(KEY, null);
  const clean = cleanEntitlement(raw, now);
  const rawAt = (raw as { checkedAt?: unknown } | null)?.checkedAt;
  // An older save gets its grace from now: keep that time, or every launch would start the grace again.
  if (raw != null && rawAt !== clean.checkedAt) writeJson(KEY, clean);
  return clean;
}

let cache: Entitlement = loadEntitlement();
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** Records the service answer. Unlocks come only from Patreon, so nothing earned is ever written here. */
export function setPatreonStatus(s: PatreonStatus): void {
  const checkedAt = typeof s.checkedAt === "number" ? s.checkedAt : Date.now();
  const next: Entitlement = { basic: s.basic === true, brand: s.brand === true, tierName: s.tierName ?? null, checkedAt };
  const same = next.basic === cache.basic && next.brand === cache.brand && next.tierName === cache.tierName;
  cache = next;
  // Save every answer (its time too), so the grace counts from the service's last good check.
  writeJson(KEY, next);
  if (!same) listeners.forEach((f) => f());
}

/** Reads the service Patreon state and mirrors the unlocks. Null when the service does not answer. */
export async function refreshPatreon(): Promise<PatreonStatus | null> {
  try {
    const s = await api<PatreonStatus>("/api/patreon");
    setPatreonStatus(s);
    return s;
  } catch {
    return null;
  }
}

/** Asks Patreon again which tier this account pays. */
export async function checkPatreon(): Promise<PatreonStatus> {
  const s = await api<PatreonStatus>("/api/patreon/check", {});
  setPatreonStatus(s);
  return s;
}

export const patreonLogin = () => api<{ url: string }>("/api/patreon/login", {});

export async function patreonLogout(): Promise<PatreonStatus> {
  const s = await api<PatreonStatus>("/api/patreon/logout", {});
  setPatreonStatus(s);
  return s;
}

/** The unlocks Patreon gives right now (Basic and Brand). Everything else, like earned looks, is separate. */
export function usePatreonEntitlement(): Entitlement {
  return useSyncExternalStore(subscribe, () => cache, () => SERVER_NONE);
}

/**
 * For the Support page: the full status, refreshed every few seconds while it is open (a sign-in finishes in the browser).
 * Null while the first answer is awaited, and "unavailable" when the service does not answer the Patreon route, which is
 * what an older service that has not been restarted since this was added does.
 */
export function usePatreonStatus(): PatreonStatus | "unavailable" | null {
  const [status, setStatus] = useState<PatreonStatus | "unavailable" | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void refreshPatreon().then((s) => {
        if (alive) setStatus(s ?? "unavailable");
      });
    load();
    const id = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  return status;
}

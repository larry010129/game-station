import { useEffect, useState, useSyncExternalStore } from "react";
import { api } from "../lib/api";
import { readJson, writeJson } from "../lib/storage";

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
}

const KEY = "cs.patreon";
const NONE: Entitlement = { basic: false, brand: false, tierName: null };

function clean(raw: unknown): Entitlement {
  const o = raw as Partial<Entitlement> | null;
  if (!o || typeof o !== "object") return NONE;
  return { basic: o.basic === true, brand: o.brand === true, tierName: typeof o.tierName === "string" ? o.tierName : null };
}

let cache: Entitlement = clean(readJson<unknown>(KEY, null));
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};

/** Records the service answer. Unlocks come only from Patreon, so nothing earned is ever written here. */
export function setPatreonStatus(s: PatreonStatus): void {
  const next: Entitlement = { basic: s.basic === true, brand: s.brand === true, tierName: s.tierName ?? null };
  if (next.basic === cache.basic && next.brand === cache.brand && next.tierName === cache.tierName) return;
  cache = next;
  writeJson(KEY, next);
  listeners.forEach((f) => f());
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
  return useSyncExternalStore(subscribe, () => cache, () => NONE);
}

/** For the Support page: the full status, refreshed every few seconds while it is open (a sign-in finishes in the browser). */
export function usePatreonStatus(): PatreonStatus | null {
  const [status, setStatus] = useState<PatreonStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      void refreshPatreon().then((s) => {
        if (alive && s) setStatus(s);
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

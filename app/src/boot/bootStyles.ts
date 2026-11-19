import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { isCreatorUnlocked, useCreatorUnlock } from "../state/creatorAccess";
import { ITEMS_KEY, readItems } from "../state/items";

import { BOOT_STYLES } from "./bootStyleList";

export { BOOT_STYLES };

export type BootStyleId = (typeof BOOT_STYLES)[number]["id"];

export const isBootStyleId = (v: unknown): v is BootStyleId => BOOT_STYLES.some((s) => s.id === v);
export const bootStyleById = (id: string) => BOOT_STYLES.find((s) => s.id === id) ?? null;

/** The boot screen this PC starts with (a `cs.` key: factory reset clears it). */
export const BOOT_STYLE_KEY = "cs.bootStyle";
const EVENT = "cs-boot-style";

/** Boot styles this player may use: the ones they own, or all twelve under the creator unlock. */
export function usableBootStyles(creator = isCreatorUnlocked()): BootStyleId[] {
  if (creator) return BOOT_STYLES.map((s) => s.id);
  const owned = new Set(readItems().owned);
  return BOOT_STYLES.map((s) => s.id).filter((id) => owned.has(id));
}

/** The equipped style, or null for the plain screen. A style no longer usable falls back to the plain screen. */
export function readBootStyle(): BootStyleId | null {
  const raw = readJson<unknown>(BOOT_STYLE_KEY, null);
  const id = raw && typeof raw === "object" ? (raw as { equipped?: unknown }).equipped : null;
  return isBootStyleId(id) && usableBootStyles().includes(id) ? id : null;
}

/** Sets the boot screen for the next start; null for the plain screen. False when the style is not usable or the save failed. */
export function equipBootStyle(id: BootStyleId | null): boolean {
  if (id !== null && !usableBootStyles().includes(id)) return false;
  if (!writeJson(BOOT_STYLE_KEY, { v: 1, equipped: id })) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

/** Equipped and usable styles, refreshed on change here, in other windows, and when a draw adds an item. */
export function useBootStyles(): { equipped: BootStyleId | null; usable: BootStyleId[] } {
  const creator = useCreatorUnlock();
  const read = () => ({ equipped: readBootStyle(), usable: usableBootStyles(creator) });
  const [state, setState] = useState(read);
  useEffect(() => {
    const sync = () => setState(read());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === BOOT_STYLE_KEY || e.key === ITEMS_KEY) sync();
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator]);
  return state;
}

import { useSyncExternalStore } from "react";
import { readString, removeKey, writeString } from "../lib/storage";
import { classifyCreatorCode, type CreatorCodeResult } from "./creatorCodes";

const KEY = "cs.creatorUnlock";

export { CREATOR_RESET_CODE, CREATOR_UNLOCK_CODE, classifyCreatorCode, type CreatorCodeResult } from "./creatorCodes";

let unlocked = readString(KEY) === "1";
const listeners = new Set<() => void>();

function publish(next: boolean): void {
  if (next === unlocked) return;
  unlocked = next;
  if (next) writeString(KEY, "1");
  else removeKey(KEY);
  listeners.forEach((fn) => fn());
}

/**
 * Turns the local creator unlock on. The reset code is only recognised here: wiping the install is a factory reset
 * (see factoryReset.ts), which the caller runs after the person confirms. Nothing is asked of Patreon.
 */
export function applyCreatorCode(raw: string): CreatorCodeResult {
  const result = classifyCreatorCode(raw);
  if (result === "unlock") publish(true);
  return result;
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The creator unlock right now, for code outside React. */
export function isCreatorUnlocked(): boolean {
  return unlocked;
}

/** True while this install's creator unlock is stored locally. */
export function useCreatorUnlock(): boolean {
  return useSyncExternalStore(subscribe, () => unlocked, () => false);
}

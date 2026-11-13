import { useEffect, useRef, useState } from "react";

/**
 * Local storage that never throws. A blocked or full store means a setting is
 * kept until the app closes instead of crashing the page.
 */

/**
 * True while a backup is being restored. Ordinary writes are skipped then, so a live effect cannot put
 * its in-memory value over a restored one before the page reloads. The restore uses the `restore*` writers.
 */
let restoring = false;
export function setRestoring(on: boolean): void {
  restoring = on;
}

/** Writes during a restore (ignores the restoring flag). */
export function restoreWrite(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function restoreRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to forget.
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns false when the value could not be kept (storage blocked or full). */
export function writeString(key: string, value: string): boolean {
  if (restoring) return true;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (restoring) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to forget.
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key);
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  return writeString(key, JSON.stringify(value));
}

/**
 * A value kept in storage and mirrored in state. `legacyKey` is read once when `key` has nothing yet, and
 * removed after the value has been saved under `key`. `validate` rejects a stored value of the wrong shape
 * (a hand-edited or restored one) so the fallback is used instead of crashing the card that reads it.
 */
export function useStoredJson<T>(key: string, fallback: T, legacyKey?: string, validate?: (value: unknown) => value is T) {
  const migrated = useRef(false);
  const [value, setValue] = useState<T>(() => {
    const missing = Symbol();
    const ok = (v: unknown): v is T => v !== missing && (!validate || validate(v));
    // `readJson` answers with the fallback for a missing or unreadable value; the legacy key is the second chance.
    const got = readJson<unknown>(key, missing);
    if (ok(got)) return got;
    if (legacyKey) {
      const old = readJson<unknown>(legacyKey, missing);
      if (ok(old)) {
        migrated.current = true;
        return old;
      }
    }
    return fallback;
  });
  useEffect(() => {
    const saved = writeJson(key, value);
    if (migrated.current && saved && legacyKey) {
      migrated.current = false;
      removeKey(legacyKey);
    }
  }, [key, value, legacyKey]);
  return [value, setValue] as const;
}

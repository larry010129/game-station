/**
 * Saved look unlocks (`cs.themeUnlocks`): a list of theme ids. Junk and repeats are dropped, but never a real id:
 * this list is saved straight back, so any cut here would delete earned looks for good.
 */
export function cleanUnlocks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0)));
}

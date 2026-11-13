import type { CardId } from "./layouts";
import { KEYS } from "../lib/storageKeys";

/** Storage keys that belong to one copy of a card. They go away when that copy is removed. */
export function instanceKeys(id: string, type: CardId): string[] {
  if (type === "notes") return [`${KEYS.checklist}.${id}`, `${KEYS.note}.${id}`];
  if (type === "heroprofile") return [`${KEYS.metaHero}.${id}`];
  return [];
}

/**
 * Keys shared by every copy of a card type, with the ones the first copy used before copies had their own.
 * The meta rank and mode are preferences shared by four cards, so one card resetting does not clear them.
 */
const SHARED: Partial<Record<CardId, string[]>> = {
  notes: [KEYS.checklist, KEYS.note],
  clocks: [KEYS.clocks],
  heroprofile: [KEYS.metaHero],
  mappicks: [KEYS.metaMap],
  discord: [KEYS.discordRead],
  verdict: [KEYS.verdictMetrics],
  season: [KEYS.seasonEnd],
  session: [KEYS.breakHours],
};

/** Everything a card has saved, for the "Reset this card's data" button on a card that failed. */
export function resetKeys(id: string, type: CardId): string[] {
  return [...instanceKeys(id, type), ...(SHARED[type] ?? [])];
}

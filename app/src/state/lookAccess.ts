/**
 * Which looks are free and which are locked, as plain functions (no imports) so the rule can be tested alone.
 *
 * The first 30 looks of the catalogue are free and owned. Every look after those 30 is locked, and so is any gated
 * look that is not in the catalogue (Nightsteel). A locked look is opened by: a weekly unlock, spending 120 Credits,
 * a gacha win, or Patreon Basic. Earned opens (the first three) are remembered; Patreon Basic only counts while it lasts.
 */

export const FREE_LOOK_COUNT = 30;

/** The ids of every locked preset, in catalogue order, then the gated ones that are not in the catalogue. */
export function lockedIdsOf(catalogIds: readonly string[], gatedIds: readonly string[]): string[] {
  const out = catalogIds.slice(FREE_LOOK_COUNT);
  for (const id of gatedIds) if (!out.includes(id) && !catalogIds.slice(0, FREE_LOOK_COUNT).includes(id)) out.push(id);
  return out;
}

/** Whether `id` cannot be used right now: it is a locked preset, not earned, and Patreon Basic is not on. */
export function isLookLocked(id: string, locked: ReadonlySet<string>, earned: readonly string[], basic: boolean): boolean {
  return locked.has(id) && !basic && !earned.includes(id);
}

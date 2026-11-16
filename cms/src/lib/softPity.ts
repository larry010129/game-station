/** Soft pity for one kind of 5-star pity (app: SoftPity in gachaContent.ts). */
export interface SoftPityDraft {
  /** The draw (since the last 5-star) the chance starts to climb. */
  from: number;
  /** Shape of the climb: below 1 climbs fast early, 1 in even steps, above 1 late. */
  curve: number;
}

export const CURVE_MIN = 0.2;
export const CURVE_MAX = 5;

/** The app's rule (gachaContent.fiveStarChanceAt): base, then base + (1 - base) * progress^curve, then 100%. */
export function chanceAt(draw: number, base: number, guaranteedAt: number, soft: SoftPityDraft | null): number {
  if (draw >= guaranteedAt) return 1;
  if (!soft || soft.from >= guaranteedAt || draw < soft.from) return base;
  const progress = (draw - soft.from + 1) / (guaranteedAt - soft.from + 1);
  return base + (1 - base) * Math.pow(progress, soft.curve);
}

/**
 * The gacha rules, as plain functions (no React, storage or imports) so they can be tested on their own.
 * It spends earned Credits only. Credits cannot be bought, a tip adds none and Patreon adds none.
 *
 * A draw awards one preset look the user does not already own, or a coupon. Draws use preset looks only:
 * brand colours are never in the pool. When every preset is owned, a draw is a coupon.
 */

/** One chosen locked look costs this, separate from any draw. */
export const LOOK_COST = 120;
export const DRAW_COST = 100;
export const DRAW_TEN_COST = 900;

/**
 * PROVISIONAL: the plan says drop rates are not set. Until they are, each draw has this chance of being a look
 * (when one the user lacks exists) and is a coupon otherwise. Change it in this one place once the rate is decided.
 */
export const PROVISIONAL_LOOK_CHANCE = 0.25;

export type DrawResult = { kind: "look"; id: string } | { kind: "coupon" };

/**
 * Rolls `count` draws. `owned` is what the user already has, `pool` every preset look a draw can give, and `rand`
 * returns a number in [0, 1). A look won on one draw counts as owned for the next, so a batch never repeats one.
 */
export function drawMany(count: number, owned: readonly string[], pool: readonly string[], rand: () => number, lookChance = PROVISIONAL_LOOK_CHANCE): DrawResult[] {
  const have = new Set(owned);
  const out: DrawResult[] = [];
  for (let i = 0; i < count; i++) {
    const left = pool.filter((id) => !have.has(id));
    if (left.length > 0 && rand() < lookChance) {
      const id = left[Math.min(left.length - 1, Math.floor(rand() * left.length))];
      have.add(id);
      out.push({ kind: "look", id });
    } else out.push({ kind: "coupon" });
  }
  return out;
}

/** The price of one purchase: 1 draw costs 100, 10 draws cost 900 as one purchase. Any other count is not sold. */
export function priceOf(count: number): number | null {
  if (count === 1) return DRAW_COST;
  if (count === 10) return DRAW_TEN_COST;
  return null;
}

export interface GachaState {
  v: 1;
  /** Placeholder coupons. Their value and any redeem shop are not set yet. */
  coupons: number;
  /** Lifetime draws, for display only. */
  draws: number;
}

export const emptyGacha = (): GachaState => ({ v: 1, coupons: 0, draws: 0 });

export function cleanGacha(raw: unknown): GachaState {
  const o = raw as Partial<GachaState> | null;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  if (!o || typeof o !== "object") return emptyGacha();
  return { v: 1, coupons: num(o.coupons), draws: num(o.draws) };
}

export function applyResults(state: GachaState, results: readonly DrawResult[]): GachaState {
  return { v: 1, coupons: state.coupons + results.filter((r) => r.kind === "coupon").length, draws: state.draws + results.length };
}

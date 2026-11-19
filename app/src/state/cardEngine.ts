/**
 * Card Pack rules as plain functions (no React or storage): dashboard card skins at 4 and 5 stars, with items on the
 * other rows. Its pity lives in GachaState.cardPity, so a card draw saves in the same single write as any other draw.
 * The Widget Pack (the dashboard cards themselves) runs on the same rules: pass the pack kind "widgets" to any
 * function here. Its pity lives in GachaState.widgetPity.
 *
 * Order for each draw: the 5-star guarantee, then the 4-star-or-better guarantee, then the table (its 5-star row
 * raised by soft pity). A 5-star resets both counters; a 4-star resets the 4-star counter only.
 */

import {
  cardBuyOf,
  cardPackOf,
  cardPackOn,
  drawableSkins,
  fiveStarChanceAt,
  getContent,
  itemById,
  itemsOfKind,
  oneTimeItemsForPack,
  packTable,
  type CardPackContent,
  type GachaContent,
  type ItemDef,
  widgetPackOf,
} from "./gachaContent.ts";
import { crystalKindFor, crystalValueFor, type DrawResult, type GachaState } from "./gachaEngine.ts";
import { drawableWidgets, widgetPackOn } from "./widgets.ts";

/** Which pack: the Card Pack (skins) or the Widget Pack (dashboard cards). */
export type CardPackKind = "skins" | "widgets";
type PackRules = Omit<CardPackContent, "skins">;

const rulesOf = (kind: CardPackKind, content: GachaContent): PackRules => (kind === "widgets" ? widgetPackOf(content) : cardPackOf(content));
const drawableOf = (kind: CardPackKind, stars: 4 | 5, content: GachaContent): string[] =>
  kind === "widgets" ? drawableWidgets(stars, content) : drawableSkins(stars, content);

export interface CardPity {
  four: number;
  five: number;
}

export interface CardOwned {
  /** Prize ids already owned: skins for the Card Pack, card ids for the Widget Pack. */
  skins: readonly string[];
  /** One-time item ids already owned. */
  items: readonly string[];
}

/** Card Pack price for 1 or 10 draws; null for any other count or while the pack is off. */
export function cardPriceOf(count: number, content: GachaContent = getContent(), kind: CardPackKind = "skins"): number | null {
  const cp = rulesOf(kind, content);
  if (!cp.enabled) return null;
  if (count === 1) return cp.priceOne;
  if (count === 10) return cp.priceTen;
  return null;
}

/** The 5-star chance on the `draw`-th draw since the last 5-star skin. */
export function cardFiveChanceAt(draw: number, cp: PackRules): number {
  return fiveStarChanceAt(draw, cp.weights.five, cp.fivePityAfter + 1, cp.softPity ?? null);
}

function pickFrom(pool: readonly string[], preferFresh: boolean, owned: Set<string>, rand: () => number): { id: string; repeat: boolean } | null {
  if (pool.length === 0) return null;
  const fresh = preferFresh ? pool.filter((id) => !owned.has(id)) : [];
  const from = fresh.length > 0 ? fresh : pool;
  const id = from[Math.min(from.length - 1, Math.floor(rand() * from.length))];
  return { id, repeat: owned.has(id) };
}

function itemResult(item: ItemDef, owned: Set<string>): DrawResult {
  return { kind: "item", id: item.id, repeat: item.stackable ? false : owned.has(item.id) };
}

/** A Better or Common item, with the Regular Pack's inner weights. */
function rollItem(tier: "better" | "common", owned: Set<string>, rand: () => number, content: GachaContent): DrawResult {
  const reg = packTable("regular", content);
  const kinds: { kind: ItemDef["kind"]; w: number }[] =
    tier === "better"
      ? [
          { kind: "wallpaper", w: reg.betterInner.wallpaper },
          { kind: "boot", w: reg.betterInner.boot },
          { kind: "layout-slot", w: reg.betterInner.layout },
        ]
      : [
          { kind: "streak-freeze", w: reg.commonInner.streakFreeze },
          { kind: "alert-sound", w: reg.commonInner.alert },
          { kind: "font", w: reg.commonInner.font },
          { kind: "name-flair", w: reg.commonInner.flair },
        ];
  let x = rand();
  let kind = kinds[kinds.length - 1].kind;
  for (const k of kinds) {
    x -= k.w;
    if (x < 0) {
      kind = k.kind;
      break;
    }
  }
  const pool = itemsOfKind(kind, content);
  const fallback = itemById("streak-freeze", content);
  if (pool.length === 0) return fallback ? itemResult(fallback, owned) : { kind: "item", id: "streak-freeze", repeat: false };
  return itemResult(pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))], owned);
}

/** A prize of `stars`; with none of that tier drawable it tries the other tier, then gives a streak freeze. */
function skinResult(stars: 4 | 5, preferFresh: boolean, have: Set<string>, rand: () => number, content: GachaContent, kind: CardPackKind): DrawResult {
  for (const s of stars === 5 ? ([5, 4] as const) : ([4, 5] as const)) {
    const picked = pickFrom(drawableOf(kind, s, content), preferFresh, have, rand);
    if (picked) return { kind: kind === "widgets" ? "widget" : "card", id: picked.id, stars: s, repeat: picked.repeat };
  }
  return { kind: "item", id: "streak-freeze", repeat: false };
}

/** Move the card pity past one result. */
function stepCardPity(p: CardPity, r: DrawResult): CardPity {
  const prize = r.kind === "card" || r.kind === "widget";
  if (prize && r.stars === 5) return { four: 0, five: 0 };
  if (prize) return { four: 0, five: p.five + 1 };
  return { four: p.four + 1, five: p.five + 1 };
}

/**
 * Rolls `count` Card Pack draws. Pity (with soft pity) carries through the batch. Owned skins stay in the pool and a
 * repeat pays Regular fragments; a guaranteed skin prefers one the player does not own.
 */
export function drawCards(
  count: number,
  owned: CardOwned,
  pity: CardPity,
  rand: () => number,
  content: GachaContent = getContent(),
  kind: CardPackKind = "skins",
): { results: DrawResult[]; pity: CardPity } {
  const cp = rulesOf(kind, content);
  const have = new Set(owned.skins);
  const haveItems = new Set(owned.items);
  let run: CardPity = { four: pity.four, five: pity.five };
  // A tier with nothing drawable (all Hidden) has no guarantee and no row: its share goes to the other rows.
  const hasFive = drawableOf(kind, 5, content).length > 0;
  const hasFour = drawableOf(kind, 4, content).length > 0;
  const results: DrawResult[] = [];
  for (let i = 0; i < count; i++) {
    let r: DrawResult;
    // This draw's 5-star chance: the base, raised by soft pity. Nothing drawable at 5 stars: none.
    const five = hasFive ? cardFiveChanceAt(run.five + 1, cp) : 0;
    if (hasFive && run.five >= cp.fivePityAfter) {
      r = skinResult(5, true, have, rand, content, kind);
    } else if (hasFour && run.four >= cp.fourPityAfter) {
      // The guarantee is "4-star or better": the draw keeps its (soft-pity) 5-star chance, else it is a 4-star.
      r = rand() < five ? skinResult(5, false, have, rand, content, kind) : skinResult(4, true, have, rand, content, kind);
    } else {
      // The 5-star row takes `five`; the other rows share the rest in proportion to their weights, so the table
      // still sums to 1 under soft pity and when a tier has nothing drawable.
      const others: [string, number][] = [
        ["four", hasFour ? cp.weights.four : 0],
        ["better", cp.weights.better],
        ["common", cp.weights.common],
      ];
      const otherSum = others.reduce((s, [, w]) => s + w, 0);
      const k = otherSum > 0 ? (1 - five) / otherSum : 0;
      const rows: [string, number][] = [["five", five], ...others.map(([key, w]): [string, number] => [key, w * k])];
      let x = rand();
      let row = "common";
      for (const [k, w] of rows) {
        x -= w;
        if (x < 0) {
          row = k;
          break;
        }
      }
      r =
        row === "five"
          ? skinResult(5, false, have, rand, content, kind)
          : row === "four"
            ? skinResult(4, false, have, rand, content, kind)
            : rollItem(row === "better" ? "better" : "common", haveItems, rand, content);
    }
    results.push(r);
    run = stepCardPity(run, r);
    if ((r.kind === "card" || r.kind === "widget") && !r.repeat) have.add(r.id);
    if (r.kind === "item" && !r.repeat && !itemById(r.id, content)?.stackable) haveItems.add(r.id);
  }
  return { results, pity: run };
}

/** Apply Card or Widget Pack outcomes into gacha state (pity, crystals, draw count). Prizes and items are the caller's job. */
export function applyCardResults(state: GachaState, results: readonly DrawResult[], pity: CardPity, kind: CardPackKind = "skins"): GachaState {
  const content = getContent();
  let crystals = state.crystals;
  let prisms = state.prisms;
  for (const r of results) {
    const n = crystalValueFor(r, content);
    if (n <= 0) continue;
    if (crystalKindFor(r) === "special") prisms += n;
    else crystals += n;
  }
  const next = { four: pity.four, five: pity.five };
  return { ...state, draws: state.draws + results.length, crystals, prisms, ...(kind === "widgets" ? { widgetPity: next } : { cardPity: next }) };
}

/** True when the pack is off, or every drawable prize and one-time item is already owned. */
export function cardsExhausted(owned: CardOwned, content: GachaContent = getContent(), kind: CardPackKind = "skins"): boolean {
  if (!(kind === "widgets" ? widgetPackOn(content) : cardPackOn(content))) return true;
  const have = new Set(owned.skins);
  const haveI = new Set(owned.items);
  if ([...drawableOf(kind, 4, content), ...drawableOf(kind, 5, content)].some((id) => !have.has(id))) return false;
  return oneTimeItemsForPack("regular", content).every((i) => haveI.has(i.id));
}

/** Published odds per draw, before soft pity. */
export function cardOddsRows(content: GachaContent = getContent(), kind: CardPackKind = "skins"): { key: string; label: string; chance: number; stars?: 4 | 5 }[] {
  const w = rulesOf(kind, content).weights;
  const noun = kind === "widgets" ? "dashboard card" : "card skin";
  const rows = [
    { key: "five", label: "5-star " + noun, chance: w.five * 100, stars: 5 as const },
    { key: "four", label: "4-star " + noun, chance: w.four * 100, stars: 4 as const },
    { key: "better", label: "Better item", chance: w.better * 100 },
    { key: "common", label: "Common item", chance: w.common * 100 },
  ];
  return rows.filter((r) => r.chance > 0).map((r) => ({ ...r, chance: Math.round(r.chance * 100) / 100 }));
}

/**
 * Spends Regular fragments (the Regular theme pick cost) on a 4-star skin, when the CMS allows it (`buy.crystalPick`).
 * 5-star skins are never bought with crystals.
 */
export function spendCrystalsOnSkin(
  state: GachaState,
  id: string,
  ownedSkins: readonly string[],
  content: GachaContent = getContent(),
  kind: CardPackKind = "skins",
): { ok: true; state: GachaState } | { ok: false; reason: "off" | "short" | "not-4-star" | "owned" } {
  const buy = kind === "widgets" ? (widgetPackOf(content).buy ?? cardBuyOf(content)) : cardBuyOf(content);
  if (!buy.crystalPick) return { ok: false, reason: "off" };
  const cost = content.regularCrystalCost;
  if (state.crystals < cost) return { ok: false, reason: "short" };
  if (!drawableOf(kind, 4, content).includes(id)) return { ok: false, reason: "not-4-star" };
  if (ownedSkins.includes(id)) return { ok: false, reason: "owned" };
  return { ok: true, state: { ...state, crystals: state.crystals - cost } };
}

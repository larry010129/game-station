/**
 * Gacha rules as plain functions (no React or storage). Regular, Brand and Region packs, items, pity, crystals.
 * The Region Pack is a fork of the Brand Pack: same rules, its own pity, and a weekly region or country focus.
 * Tables come from gachaContent (bundled default = GACHA REDESIGN.md).
 */

import { COUNTRIES, REGION_KEYS, REGIONS, type RegionKey, type ThemeTags } from "../content/brandTags.ts";
import {
  BUNDLED_CONTENT,
  getContent,
  isCompanyPack,
  itemById,
  itemsOfKind,
  oneTimeItemsForPack,
  packTable,
  fiveStarBase,
  fiveStarChanceAt,
  softPityFor,
  rainbowPityAfter,
  regionPackOn,
  type GachaContent,
  type ItemDef,
  type PackId,
  type PackTable,
} from "./gachaContent.ts";

export type { PackId, GachaContent, PackTable, ItemDef, RegionWeek } from "./gachaContent.ts";
export {
  BUNDLED_CONTENT,
  BRAND_THEME_IDS,
  getContent,
  regionPackOn,
  setContent,
  resetContent,
  validateContent,
  itemById,
  itemsOfKind,
  oneTimeItemsForPack,
  isCompanyPack,
  isRainbowThemeId,
  packTable,
  fiveStarBase,
  fiveStarChanceAt,
  softPityFor,
  rainbowPityAfter,
  rainbowThemeIds,
  RAINBOW_THEME_IDS,
} from "./gachaContent.ts";

export const PACK_REGULAR: PackId = "regular";
export const PACK_BRAND: PackId = "brand";
export const PACK_REGION: PackId = "region";

/** Chosen locked look cost (bundled default). ThemesPage imports this number. */
export const LOOK_COST = BUNDLED_CONTENT.lookCost;

/**
 * A look result. `brand` marks a featured company look (always rainbow). `rainbow` marks a rainbow (5-star) Regular
 * theme; it is left out for standard looks.
 */
export type DrawResult =
  | { kind: "look"; id: string; brand: boolean; repeat: boolean; rainbow?: true }
  | { kind: "pick" }
  | { kind: "item"; id: string; repeat: boolean };

export interface WeeklyPicks {
  week: string | null;
  count: number;
}

export interface GachaState {
  v: 2;
  draws: number;
  lookPity: { regular: number; brand: number; region: number };
  brandPity: number;
  /** Draws since the last company look from the Region Pack (the Region fork of brandPity). */
  regionPity: number;
  /** Regular Pack rainbow pity: draws since its last rainbow Regular theme. (brandPity and regionPity count any rainbow.) */
  rainbowPity: number;
  /** The 50/50 guarantee per company pack: true after a lost 50/50, so the next rainbow there is a featured look. */
  guaranteed: { brand: boolean; region: boolean };
  crystals: number;
  prisms: number;
  weeklyPicks: WeeklyPicks;
  /** One-shot Credits from v1 coupon migration; modal applies then clears. */
  pendingCredits: number;
}

export interface DrawOwned {
  looks: readonly string[];
  items: readonly string[];
  /** Standard (non-rainbow) looks for the Regular theme row, look pity and the ten-draw guarantee. */
  regularPool: readonly string[];
  /** Rainbow (5-star) Regular themes: the rainbow row of the Regular Pack and a lost 50/50 in a company pack. */
  rainbowPool?: readonly string[];
  /** Current quest weekKey (Monday-based). */
  week: string;
  /** This period's company pair: default featuredBrand(now) for Brand; the Region Pack must pass featuredRegion(...).ids. */
  featured?: readonly string[];
  now?: Date;
}

export interface DrawPity {
  look: number;
  /** Rainbow pity of the pack being drawn: Brand/Region pity in a company pack, rainbowPity in the Regular Pack. */
  brand: number;
  /** Company packs: the 50/50 guarantee. Absent means not guaranteed. */
  guaranteed?: boolean;
  weeklyPicks: WeeklyPicks;
}

/** The pity a pack draws with, taken from saved state. */
export function pityFor(state: GachaState, pack: PackId): DrawPity {
  return {
    look: state.lookPity[pack],
    brand: pack === "regular" ? state.rainbowPity : pack === "region" ? state.regionPity : state.brandPity,
    guaranteed: pack === "regular" ? false : state.guaranteed[pack],
    weeklyPicks: state.weeklyPicks,
  };
}

/** True for a rainbow (5-star) result: a featured company look or a rainbow Regular theme. */
export function isRainbowResult(r: DrawResult): boolean {
  return r.kind === "look" && (r.brand || r.rainbow === true);
}

export const emptyGacha = (): GachaState => ({
  v: 2,
  draws: 0,
  lookPity: { regular: 0, brand: 0, region: 0 },
  brandPity: 0,
  regionPity: 0,
  rainbowPity: 0,
  guaranteed: { brand: false, region: false },
  crystals: 0,
  prisms: 0,
  weeklyPicks: { week: null, count: 0 },
  pendingCredits: 0,
});

const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);

/** Migrate raw storage. v1 coupons → pendingCredits at couponCreditValue each. */
export function cleanGacha(raw: unknown): GachaState {
  if (!raw || typeof raw !== "object") return emptyGacha();
  const o = raw as Record<string, unknown>;
  const coupons = num(o.coupons);
  const fromV1 = o.v === 1 || (typeof o.v !== "number" && "coupons" in o);
  const pendingFromCoupons = fromV1 ? coupons * getContent().couponCreditValue : 0;
  const lookPityRaw = o.lookPity as { regular?: unknown; brand?: unknown; region?: unknown } | undefined;
  const wp = o.weeklyPicks as { week?: unknown; count?: unknown } | undefined;
  const g = o.guaranteed as { brand?: unknown; region?: unknown } | undefined;
  return {
    v: 2,
    draws: num(o.draws),
    lookPity: { regular: num(lookPityRaw?.regular), brand: num(lookPityRaw?.brand), region: num(lookPityRaw?.region) },
    brandPity: num(o.brandPity),
    regionPity: num(o.regionPity),
    rainbowPity: num(o.rainbowPity),
    guaranteed: { brand: g?.brand === true, region: g?.region === true },
    crystals: num(o.crystals),
    prisms: num(o.prisms),
    weeklyPicks: {
      week: typeof wp?.week === "string" ? wp.week : null,
      count: num(wp?.count),
    },
    pendingCredits: fromV1 ? pendingFromCoupons : num(o.pendingCredits),
  };
}

/** Pack price for 1 or 10 draws; any other count is not sold, and neither is the Region Pack while the CMS has it off. */
export function priceOf(pack: PackId, count: number): number | null {
  if (pack === "region" && !regionPackOn()) return null;
  const p = packTable(pack);
  if (count === 1) return p.priceOne;
  if (count === 10) return p.priceTen;
  return null;
}

/** Display label for a catalog item id (kind → Title Case). */
export function itemLabel(id: string): string {
  const def = itemById(id);
  if (!def) return id;
  return def.kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(list: readonly T[], seed: number): T[] {
  const out = list.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000;
}

function epochDay(iso: string): number {
  const [y, m, day] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

/**
 * This fortnight's 2 Brand themes via date-seeded shuffle pairs.
 * Deterministic, no storage. CMS schedule can return later.
 */
/**
 * A CMS run from its start Monday (local, YYYY-MM-DD) for `weeks` weeks (default 1): when it started and when it ends
 * (the Monday after its last week), or null when `now` is outside it.
 */
function runSpan(weekOf: string, weeks: number | undefined, now: Date): { start: Date; end: Date } | null {
  const m = weekOf.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * Math.max(1, weeks ?? 1));
  return now >= start && now < end ? { start, end } : null;
}

/**
 * The Brand Pack's featured run covering `now`: a run from the CMS queue, or an older release's single weekly
 * special. Null between runs, when the fortnight rotation is back.
 */
export function activeSpecial(
  now: Date = new Date(),
  content: GachaContent = getContent(),
): { brandIds: readonly [string, string]; start: Date; end: Date } | null {
  const runs = [...(content.specialQueue ?? []), ...(content.weeklySpecial ? [{ ...content.weeklySpecial, weeks: 1 }] : [])];
  for (const r of runs) {
    const span = runSpan(r.weekOf, r.weeks, now);
    if (span && r.brandIds.length === 2) return { brandIds: [r.brandIds[0], r.brandIds[1]], ...span };
  }
  return null;
}

export function featuredBrand(now: Date = new Date(), content: GachaContent = getContent()): readonly [string, string] {
  const special = activeSpecial(now, content);
  if (special) return special.brandIds;
  const ids = content.brandThemeIds;
  const days = content.brandFortnightDays;
  const period = Math.floor((utcDay(now) - epochDay(content.brandEpoch)) / days);
  const safePeriod = period < 0 ? 0 : period;
  // Each cycle shows every pair once (68 ids → 34 fortnights), then reshuffles.
  const pairs = Math.max(1, Math.floor(ids.length / 2));
  const cycle = Math.floor(safePeriod / pairs);
  const slot = safePeriod % pairs;
  const order = seededShuffle(ids, cycle + 1);
  return [order[slot * 2], order[slot * 2 + 1]];
}

const daysUntil = (end: Date, now: Date) =>
  Math.max(1, Math.round((end.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000));

/** Days until the featured Brand pair changes: the end of a running CMS run, else of the current fortnight. */
export function brandDaysLeft(now: Date = new Date(), content: GachaContent = getContent()): number {
  const special = activeSpecial(now, content);
  if (special) return daysUntil(special.end, now);
  const days = content.brandFortnightDays;
  const into = (utcDay(now) - epochDay(content.brandEpoch)) % days;
  const used = ((into % days) + days) % days;
  return days - used;
}

/** A company theme as the Region Pack sees it: its id and its tags. */
export interface RegionMember {
  id: string;
  tags: ThemeTags;
}

export interface RegionFocus {
  kind: "region" | "country";
  /** A RegionKey for a region week, an ISO country code for a country week. */
  value: string;
  /** "East Asia", "Taiwan" and so on. */
  label: string;
  /** True when the CMS set this week; false when the pack picked a region by itself. */
  scheduled: boolean;
  /** This week's two featured company looks (fewer when the week's pool is smaller). */
  ids: string[];
}

function weekIndex(now: Date, content: GachaContent): number {
  return Math.max(0, Math.floor((utcDay(now) - epochDay(content.brandEpoch)) / 7));
}

/**
 * The CMS Region focus while it runs: from its start Monday (local) for `weeks` weeks (default 1). Returns when it
 * started and ends (the Monday after its last week), or null when there is none or `now` is outside it.
 */
export function regionRun(now: Date = new Date(), content: GachaContent = getContent()): { start: Date; end: Date } | null {
  const rw = content.regionWeek;
  return rw ? runSpan(rw.weekOf, rw.weeks, now) : null;
}

function focusLabel(kind: "region" | "country", value: string): string {
  return kind === "region" ? (REGIONS[value as RegionKey]?.name ?? value) : (COUNTRIES[value] ?? value);
}

/**
 * This week's Region Pack focus and its two featured looks. The CMS sets a region week or a country week through
 * `regionWeek`; otherwise the pack rotates through the regions that have at least two looks in `pool`.
 * `pool` is the drawable company looks tagged "region" (Hidden themes are never in it).
 */
export function featuredRegion(pool: readonly RegionMember[], now: Date = new Date(), content: GachaContent = getContent()): RegionFocus {
  const members = pool.filter((m) => m.tags.packs.includes("region"));
  const week = weekIndex(now, content);
  const rw = content.regionWeek;
  const run = regionRun(now, content);
  let kind: "region" | "country";
  let value: string;
  let scheduled = false;
  // The featured pair is drawn once per focus: a CMS focus keeps the same two companies for its whole run.
  let seedWeek = week;
  if (rw && run) {
    kind = rw.kind;
    value = rw.value;
    scheduled = true;
    seedWeek = weekIndex(run.start, content);
  } else {
    const count = (key: RegionKey) => members.filter((m) => m.tags.region === key).length;
    const full = REGION_KEYS.filter((k) => count(k) >= 2);
    const any = REGION_KEYS.filter((k) => count(k) >= 1);
    const keys = full.length ? full : any.length ? any : REGION_KEYS;
    kind = "region";
    value = keys[week % keys.length];
  }
  const inFocus = members
    .filter((m) => (kind === "region" ? m.tags.region === value : m.tags.country === value))
    .map((m) => m.id)
    .sort();
  const ids = seededShuffle(inFocus, seedWeek + 101).slice(0, 2);
  return { kind, value, label: focusLabel(kind, value), scheduled, ids };
}

/** Days until the Region focus changes: the end of a running CMS focus, otherwise the end of this week (Monday). */
export function regionDaysLeft(now: Date = new Date(), content: GachaContent = getContent()): number {
  const run = regionRun(now, content);
  if (run) return daysUntil(run.end, now);
  return 7 - ((now.getDay() + 6) % 7);
}

function pickWeighted<T extends string>(entries: { key: T; w: number }[], r: number): T {
  let x = r;
  for (const e of entries) {
    x -= e.w;
    if (x < 0) return e.key;
  }
  return entries[entries.length - 1].key;
}

function pickId(
  pool: readonly string[],
  preferFresh: boolean,
  owned: Set<string>,
  rand: () => number,
): { id: string; repeat: boolean } | null {
  if (pool.length === 0) return null;
  const fresh = preferFresh ? pool.filter((id) => !owned.has(id)) : [];
  const from = fresh.length > 0 ? fresh : pool;
  const id = from[Math.min(from.length - 1, Math.floor(rand() * from.length))];
  return { id, repeat: owned.has(id) };
}

function itemResult(item: ItemDef, ownedItems: Set<string>): DrawResult {
  if (item.stackable) return { kind: "item", id: item.id, repeat: false };
  return { kind: "item", id: item.id, repeat: ownedItems.has(item.id) };
}

function rollItemOfKinds(
  kinds: { kind: ItemDef["kind"]; w: number }[],
  ownedItems: Set<string>,
  rand: () => number,
  content: GachaContent,
): DrawResult {
  const key = pickWeighted(
    kinds.map((k) => ({ key: k.kind, w: k.w })),
    rand(),
  );
  const pool = itemsOfKind(key, content);
  if (pool.length === 0) return itemResult(itemById("streak-freeze", content)!, ownedItems);
  const item = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  return itemResult(item, ownedItems);
}

function forceRegularLook(owned: DrawOwned, haveLooks: Set<string>, rand: () => number): DrawResult {
  const picked = pickId(owned.regularPool, true, haveLooks, rand);
  if (!picked) return { kind: "item", id: "streak-freeze", repeat: false };
  return { kind: "look", id: picked.id, brand: false, repeat: picked.repeat };
}

/** A featured look from the table row: any of the featured pair, owned or not (a repeat gives Special crystals). */
function forceBrandLookFrom(featured: readonly string[], haveLooks: Set<string>, rand: () => number): DrawResult {
  const picked = pickId(featured, false, haveLooks, rand);
  if (!picked) return { kind: "item", id: "streak-freeze", repeat: false };
  return { kind: "look", id: picked.id, brand: true, repeat: picked.repeat };
}

function forceBrandLook(featured: readonly string[], haveLooks: Set<string>, rand: () => number): DrawResult {
  const picked = pickId(featured, true, haveLooks, rand);
  if (!picked) return { kind: "item", id: "streak-freeze", repeat: false };
  return { kind: "look", id: picked.id, brand: true, repeat: picked.repeat };
}

/** A rainbow Regular theme; with no rainbow pool it falls back to a standard Regular theme. */
function rainbowRegularLook(owned: DrawOwned, haveLooks: Set<string>, preferFresh: boolean, rand: () => number): DrawResult {
  const picked = pickId(owned.rainbowPool ?? [], preferFresh, haveLooks, rand);
  if (!picked) return forceRegularLook(owned, haveLooks, rand);
  return { kind: "look", id: picked.id, brand: false, rainbow: true, repeat: picked.repeat };
}

/**
 * A forced 5-star (the guaranteed draw). Regular Pack: a rainbow Regular theme. Company packs: a featured look or a
 * rainbow Regular theme in the same proportion as their two rows. Forced picks prefer looks the player does not own.
 */
function forcedFiveStar(pack: PackId, owned: DrawOwned, featured: readonly string[], haveLooks: Set<string>, rand: () => number, content: GachaContent): DrawResult {
  if (!isCompanyPack(pack)) return rainbowRegularLook(owned, haveLooks, true, rand);
  const w = packTable(pack, content).weights;
  const f = w.brandTheme;
  const r = (owned.rainbowPool ?? []).length > 0 ? (w.rainbowRegular ?? 0) : 0;
  const featuredLook = featured.length > 0 && (r <= 0 || rand() * (f + r) < f);
  return featuredLook ? forceBrandLook(featured, haveLooks, rand) : rainbowRegularLook(owned, haveLooks, true, rand);
}

/**
 * The table rows for one draw. With `fiveStar` (soft pity), the 5-star rows are scaled up to that total chance and
 * every other row is scaled down to fill the rest, so the rows still sum to 1.
 */
function rowsFor(pack: PackTable, company: boolean, weeklyCapped: boolean, fiveStar?: number): { key: string; w: number }[] {
  const w = pack.weights;
  const rows = [
    { key: "regularTheme", w: w.regularTheme, five: false },
    { key: "brandTheme", w: w.brandTheme, five: true },
    { key: "rainbowRegular", w: company ? (w.rainbowRegular ?? 0) : 0, five: true },
    { key: "pick", w: weeklyCapped ? 0 : w.pick, five: false },
    { key: "customUpload", w: w.customUpload, five: false },
    { key: "better", w: w.better, five: false },
    { key: "common", w: w.common, five: false },
    { key: "streakFreeze", w: weeklyCapped ? w.pick : 0, five: false },
  ];
  const base = rows.filter((r) => r.five).reduce((n, r) => n + r.w, 0);
  if (fiveStar !== undefined && base > 0 && base < 1 && fiveStar > base) {
    const up = fiveStar / base;
    const down = (1 - fiveStar) / (1 - base);
    for (const r of rows) r.w *= r.five ? up : down;
  }
  return rows.filter((r) => r.w > 0).map(({ key, w: weight }) => ({ key, w: weight }));
}

function rollOnce(
  pack: PackId,
  owned: DrawOwned,
  haveLooks: Set<string>,
  haveItems: Set<string>,
  weeklyCapped: boolean,
  featured: readonly string[],
  fiveStar: number | undefined,
  rand: () => number,
  content: GachaContent,
): DrawResult {
  const table = packTable(pack, content);
  const row = pickWeighted(rowsFor(table, isCompanyPack(pack), weeklyCapped, fiveStar), rand());

  if (row === "regularTheme") {
    const picked = pickId(owned.regularPool, false, haveLooks, rand);
    if (!picked) return { kind: "item", id: "streak-freeze", repeat: false };
    return { kind: "look", id: picked.id, brand: false, repeat: picked.repeat };
  }
  if (row === "brandTheme") {
    // Company packs: a featured look (a rainbow Regular theme when there is no featured pair). Regular Pack: a rainbow Regular theme.
    if (isCompanyPack(pack) && featured.length > 0) return forceBrandLookFrom(featured, haveLooks, rand);
    return rainbowRegularLook(owned, haveLooks, false, rand);
  }
  if (row === "rainbowRegular") return rainbowRegularLook(owned, haveLooks, false, rand);
  if (row === "pick") return { kind: "pick" };
  if (row === "customUpload") return itemResult(itemById("custom-upload", content)!, haveItems);
  if (row === "streakFreeze") return { kind: "item", id: "streak-freeze", repeat: false };
  if (row === "better") {
    const bi = table.betterInner;
    return rollItemOfKinds(
      [
        { kind: "wallpaper", w: bi.wallpaper },
        { kind: "boot", w: bi.boot },
        { kind: "layout-slot", w: bi.layout },
      ],
      haveItems,
      rand,
      content,
    );
  }
  const ci = table.commonInner;
  return rollItemOfKinds(
    [
      { kind: "streak-freeze", w: ci.streakFreeze },
      { kind: "alert-sound", w: ci.alert },
      { kind: "font", w: ci.font },
      { kind: "name-flair", w: ci.flair },
    ],
    haveItems,
    rand,
    content,
  );
}

interface PityRun {
  look: number;
  rainbow: number;
  picks: number;
  have: Set<string>;
}

/**
 * Rainbow pity holds (does not count) while every rainbow the pack could force is already owned: both featured looks
 * in a company pack, every rainbow Regular theme in the Regular Pack.
 */
function rainbowHold(company: boolean, featured: readonly string[], owned: DrawOwned, have: Set<string>): boolean {
  if (company) return featured.length > 0 && featured.every((id) => have.has(id));
  return (owned.rainbowPool ?? []).every((id) => have.has(id));
}

/** Move the pity counters past one result. */
function stepPity(run: PityRun, r: DrawResult, company: boolean, featured: readonly string[], owned: DrawOwned): void {
  const hold = rainbowHold(company, featured, owned, run.have);
  if (r.kind === "look") {
    run.look = 0;
    if (!r.repeat) run.have.add(r.id);
  } else {
    run.look += 1;
    if (r.kind === "pick") run.picks += 1;
  }
  if (isRainbowResult(r)) {
    run.rainbow = 0;
  } else if (!hold) {
    run.rainbow += 1;
  }
}

/**
 * Rolls `count` draws for one pack. Pity (with soft pity) and the weekly pick cap carry through the batch.
 * Order: the guaranteed 5-star, then look pity, then the table (its 5-star rows raised by soft pity). Ten-draw guarantee: at least one Regular theme (a featured
 * company look does not count); the slot it rewrites gets a standard theme, never a rainbow one.
 */
export function drawMany(
  pack: PackId,
  count: number,
  owned: DrawOwned,
  pity: DrawPity,
  rand: () => number,
): { results: DrawResult[]; pity: DrawPity } {
  const content = getContent();
  const featured = owned.featured ?? (pack === "brand" ? [...featuredBrand(owned.now ?? new Date(), content)] : []);
  const company = isCompanyPack(pack);
  const haveItems = new Set(owned.items);
  const rainbowAt = rainbowPityAfter(pack, content);
  const fiveBase = fiveStarBase(pack, content);
  const soft = softPityFor(pack, content);
  const weekPicks = pity.weeklyPicks.week === owned.week ? pity.weeklyPicks.count : 0;
  const fresh = (): PityRun => ({
    look: pity.look,
    rainbow: pity.brand,
    picks: weekPicks,
    have: new Set(owned.looks),
  });
  const run = fresh();

  const results: DrawResult[] = [];

  for (let i = 0; i < count; i++) {
    const hold = rainbowHold(company, featured, owned, run.have);
    const weeklyCapped = run.picks >= content.weeklyPickCap;
    let result: DrawResult;

    if (!hold && run.rainbow >= rainbowAt) {
      result = forcedFiveStar(pack, owned, featured, run.have, rand, content);
    } else if (run.look >= content.lookPityAfter) {
      result = forceRegularLook(owned, run.have, rand);
    } else {
      // Soft pity: the 5-star chance of this draw (the run.rainbow + 1-th since the last 5-star). Held pity: base.
      const fiveStar = hold ? undefined : fiveStarChanceAt(run.rainbow + 1, fiveBase, rainbowAt + 1, soft);
      result = rollOnce(pack, owned, run.have, haveItems, weeklyCapped, featured, fiveStar, rand, content);
    }

    if (result.kind === "pick" && run.picks >= content.weeklyPickCap) {
      result = { kind: "item", id: "streak-freeze", repeat: false };
    }

    results.push(result);
    stepPity(run, result, company, featured, owned);
    if (result.kind === "item" && !result.repeat && !itemById(result.id, content)?.stackable) haveItems.add(result.id);
  }

  let final = run;
  // Ten-draw guarantee: rewrite the last slot that is not a look, then recount pity from the final results.
  if (count === 10 && !results.some((r) => r.kind === "look" && !r.brand)) {
    let slot = -1;
    for (let i = results.length - 1; i >= 0 && slot < 0; i--) if (results[i].kind !== "look") slot = i;
    if (slot >= 0) {
      results[slot] = forceRegularLook(owned, new Set(owned.looks), rand);
      final = fresh();
      for (const r of results) stepPity(final, r, company, featured, owned);
    }
  }

  return {
    results,
    pity: {
      look: final.look,
      brand: final.rainbow,
      guaranteed: false,
      weeklyPicks: { week: owned.week, count: Math.min(final.picks, content.weeklyPickCap) },
    },
  };
}

export function crystalValueFor(result: DrawResult, content: GachaContent = getContent()): number {
  if (result.kind === "pick") return 0;
  if (result.kind === "look") {
    if (!result.repeat) return 0;
    const cv = content.crystalValues;
    return result.brand ? cv.brandTheme : result.rainbow ? (cv.rainbowTheme ?? cv.regularTheme) : cv.regularTheme;
  }
  if (!result.repeat) return 0;
  const item = itemById(result.id, content);
  if (!item) return 0;
  if (item.kind === "custom-upload") return content.crystalValues.customUpload;
  if (item.tier === "better") return content.crystalValues.better;
  return content.crystalValues.common;
}

/**
 * Which crystal a repeat pays, by what repeated (not by pack): a featured theme pays Special crystals (saved as
 * `prisms`); every other repeat (Regular themes 4- and 5-star, the custom upload, items) pays Regular crystals.
 */
export function crystalKindFor(result: DrawResult): "regular" | "special" {
  return result.kind === "look" && result.brand ? "special" : "regular";
}

/** Apply draw outcomes into gacha state (pity, crystals, draws). Inventory is the caller's job. */
export function applyResults(
  state: GachaState,
  pack: PackId,
  results: readonly DrawResult[],
  pity: DrawPity,
): GachaState {
  const content = getContent();
  let crystals = state.crystals;
  let prisms = state.prisms;
  for (const r of results) {
    const n = crystalValueFor(r, content);
    if (n <= 0) continue;
    if (crystalKindFor(r) === "special") prisms += n;
    else crystals += n;
  }
  return {
    ...state,
    v: 2,
    draws: state.draws + results.length,
    lookPity: {
      regular: pack === "regular" ? pity.look : state.lookPity.regular,
      brand: pack === "brand" ? pity.look : state.lookPity.brand,
      region: pack === "region" ? pity.look : state.lookPity.region,
    },
    brandPity: pack === "brand" ? pity.brand : state.brandPity,
    regionPity: pack === "region" ? pity.brand : state.regionPity,
    rainbowPity: pack === "regular" ? pity.brand : state.rainbowPity,
    guaranteed: {
      brand: pack === "brand" ? pity.guaranteed === true : state.guaranteed.brand,
      region: pack === "region" ? pity.guaranteed === true : state.guaranteed.region,
    },
    crystals,
    prisms,
    weeklyPicks: pity.weeklyPicks,
  };
}

export function spendRegularCrystals(
  state: GachaState,
  id: string,
  ownedLooks: readonly string[],
  regularPool: readonly string[],
): { ok: true; state: GachaState } | { ok: false; reason: string } {
  const cost = getContent().regularCrystalCost;
  if (state.crystals < cost) return { ok: false, reason: "short" };
  if (!regularPool.includes(id)) return { ok: false, reason: "not-regular" };
  if (ownedLooks.includes(id)) return { ok: false, reason: "owned" };
  return { ok: true, state: { ...state, crystals: state.crystals - cost } };
}

export function spendBrandPrisms(
  state: GachaState,
  id: string,
  ownedLooks: readonly string[],
  featured: readonly string[] = featuredBrand(),
): { ok: true; state: GachaState } | { ok: false; reason: string } {
  const cost = getContent().brandPrismCost;
  if (state.prisms < cost) return { ok: false, reason: "short" };
  if (!featured.includes(id)) return { ok: false, reason: "not-featured" };
  if (ownedLooks.includes(id)) return { ok: false, reason: "owned" };
  return { ok: true, state: { ...state, prisms: state.prisms - cost } };
}

/** True when every look and one-time item in the pack is already owned. */
export function packExhausted(
  pack: PackId,
  ownedLooks: readonly string[],
  ownedItems: readonly string[],
  regularPool: readonly string[],
  featured: readonly string[] = pack === "brand" ? featuredBrand() : [],
  rainbowPool: readonly string[] = [],
): boolean {
  const haveL = new Set(ownedLooks);
  const haveI = new Set(ownedItems);
  const looks = isCompanyPack(pack) ? [...regularPool, ...rainbowPool, ...featured] : [...regularPool, ...rainbowPool];
  if (looks.some((id) => !haveL.has(id))) return false;
  return oneTimeItemsForPack(pack).every((i) => haveI.has(i.id));
}

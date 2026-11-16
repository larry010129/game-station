import { idsTagged, isRegionKey } from "../content/brandTags.ts";

/**
 * Bundled gacha tables, items and prices (Phase 1). Data only — no React, storage or draws.
 * Equals GACHA REDESIGN.md; Brand Pack Common is 57% (not the sheet's buggy 56.5%).
 */

/** Regular, Brand, and the Region Pack (a fork of Brand that features a region or a country each week). */
export type PackId = "regular" | "brand" | "region";

/** The two Draw Tickets. Each pack takes one kind; the CMS chooses which (`packTickets`). */
export type TicketKind = "regular" | "special";
export const TICKET_KINDS: readonly TicketKind[] = ["regular", "special"];
export const TICKET_NAME: Record<TicketKind, string> = { regular: "Regular Ticket", special: "Special Ticket" };

/** Which ticket each pack takes when a release does not say: Regular for the Regular Pack, Special for the rest. */
export const DEFAULT_PACK_TICKETS: Record<PackId, TicketKind> = { regular: "regular", brand: "special", region: "special" };

/** True for the packs that give company (Brand-group) looks. */
export const isCompanyPack = (pack: PackId): boolean => pack !== "regular";

export type ItemTier = "common" | "better" | "brand";
export type ItemKind =
  | "streak-freeze"
  | "alert-sound"
  | "font"
  | "name-flair"
  | "wallpaper"
  | "boot"
  | "layout-slot"
  | "custom-upload";

export interface ItemDef {
  id: string;
  kind: ItemKind;
  /** Stackables never "repeat"; one-time owned wins become crystals/prisms. */
  stackable: boolean;
  tier: ItemTier;
}

export interface PackWeights {
  /** Standard Regular themes (rainbow Regular themes are not in this row). */
  regularTheme: number;
  /**
   * The first 5-star row. Regular Pack: a rainbow Regular theme. Brand and Region Packs: a featured company look.
   * The key keeps its old name so older releases still load.
   */
  brandTheme: number;
  /** Brand and Region Packs: the second 5-star row, a rainbow Regular theme. Absent: 0. */
  rainbowRegular?: number;
  pick: number;
  customUpload: number;
  better: number;
  common: number;
}

/**
 * Soft pity for one kind of rainbow pity. From draw `from` (counted since the last 5-star) the 5-star chance climbs
 * from its base to 100% at the guaranteed draw: base + (1 - base) * progress^curve. A curve below 1 climbs fast
 * early; 1 climbs in even steps; above 1 stays low, then climbs late.
 */
export interface SoftPity {
  /** The draw (since the last 5-star) the chance starts to climb, from 1. At or past the guaranteed draw: no climb. */
  from: number;
  /** The shape of the climb, SOFT_CURVE_MIN to SOFT_CURVE_MAX. */
  curve: number;
}

export const SOFT_CURVE_MIN = 0.2;
export const SOFT_CURVE_MAX = 6;

export interface PackTable {
  id: PackId;
  priceOne: number;
  priceTen: number;
  weights: PackWeights;
  /** Older releases only (a per-pack 50/50, now removed). Ignored. */
  promotedChance?: number;
  /** Inner weights among Better-item kinds (sum 1). */
  betterInner: { wallpaper: number; boot: number; layout: number };
  /** Inner weights among Common-item kinds (sum 1). */
  commonInner: { streakFreeze: number; alert: number; font: number; flair: number };
}

/** What a repeat pays: Special crystals for a featured theme, Regular crystals for everything else (any pack). */
export interface CrystalValues {
  common: number;
  better: number;
  regularTheme: number;
  /** A rainbow Regular theme (5-star). Absent: the `regularTheme` value. */
  rainbowTheme?: number;
  brandTheme: number;
  customUpload: number;
}

export interface GachaContent {
  lookCost: number;
  lookPityAfter: number;
  /** Brand and Region Pack rainbow pity: a 5-star is forced after this many draws without one. */
  brandPityAfter: number;
  /** Regular Pack rainbow pity: a rainbow Regular theme is forced after this many draws without one. Absent: 89. */
  rainbowPityAfter?: number;
  /** Older releases only (the 50/50, now removed). Ignored. */
  promotedChance?: number;
  /** Soft pity for the Regular Pack and for the Brand and Region Packs. Absent: no climb before the guaranteed draw. */
  softPity?: { regular?: SoftPity; company?: SoftPity };
  /**
   * Rainbow (5-star) Regular themes: draw-only, never sold for Credits, weekly unlocks or Regular crystals. A release
   * without the list has no rainbow tier, so it plays exactly as before (the bundled content carries the eight).
   */
  rainbowThemeIds?: readonly string[];
  weeklyPickCap: number;
  regularCrystalCost: number;
  brandPrismCost: number;
  couponCreditValue: number;
  crystalValues: CrystalValues;
  /** UTC date string YYYY-MM-DD; Brand rotation epoch. */
  brandEpoch: string;
  brandFortnightDays: number;
  /** `region` is optional in releases: a release without it uses the Brand table. */
  packs: { regular: PackTable; brand: PackTable; region?: PackTable };
  items: readonly ItemDef[];
  /** Brand Pack rotation list: the ids tagged "brand" (68 bundled). The CMS builds it from tags on publish. */
  brandThemeIds: readonly string[];
  /** Older releases' single weekly special: the 2 Brand themes for the week starting `weekOf` (a Monday, local). */
  weeklySpecial?: { weekOf: string; brandIds: readonly string[] } | null;
  /**
   * CMS featured queue for the Brand Pack: runs that each feature 2 Brand themes from a start Monday for `weeks`
   * weeks. The run covering today replaces the fortnight rotation; between runs the rotation is back. Runs never overlap.
   */
  specialQueue?: readonly SpecialRun[];
  /** CMS Region Pack switch. `false` hides the Region Pack; absent (older releases) means the pack is on. */
  regionPackEnabled?: boolean;
  /**
   * CMS Region Pack focus for the week starting `weekOf` (a Monday, local): a region week (`kind: "region"`, a
   * RegionKey such as "eu-west") or a country week (`kind: "country"`, an ISO code such as "TW"). Without one for
   * the current week the pack rotates through regions by itself.
   */
  regionWeek?: RegionWeek | null;
  /** CMS: which Draw Ticket each pack takes. A pack left out uses DEFAULT_PACK_TICKETS. */
  packTickets?: Partial<Record<PackId, TicketKind>>;
  /**
   * CMS: theme ids added back into the Regular pool (for example a Brand look after its rotation). They drop from the
   * Regular theme row in every pack and can be picked with Regular crystals. They stay out of Credit purchases.
   */
  regularExtraIds?: readonly string[];
}

/** One run in the Brand Pack's featured queue. */
export interface SpecialRun {
  /** The Monday (local) the run starts. */
  weekOf: string;
  /** How many weeks it runs (1 to REGION_WEEKS_MAX). Absent: 1. */
  weeks?: number;
  /** The 2 featured Brand themes. */
  brandIds: readonly string[];
}

/** Days from 1970-01-01 to a YYYY-MM-DD date (for comparing runs; time zones do not matter here). */
const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** True when the runs are each well formed and no two of them share a day. */
export function validSpecialQueue(queue: readonly SpecialRun[], brandThemeIds: readonly string[]): boolean {
  const spans: [number, number][] = [];
  for (const s of queue) {
    if (typeof s?.weekOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.weekOf)) return false;
    if (s.weeks !== undefined && !(Number.isInteger(s.weeks) && s.weeks >= 1 && s.weeks <= REGION_WEEKS_MAX)) return false;
    if (!Array.isArray(s.brandIds) || s.brandIds.length !== 2 || s.brandIds[0] === s.brandIds[1]) return false;
    if (!s.brandIds.every((id) => brandThemeIds.includes(id))) return false;
    const start = dayNumber(s.weekOf);
    spans.push([start, start + 7 * (s.weeks ?? 1)]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  return spans.every((s, i) => i === 0 || s[0] >= spans[i - 1][1]);
}

export interface RegionWeek {
  /** The Monday (local) the focus starts. */
  weekOf: string;
  kind: "region" | "country";
  value: string;
  /** How many weeks the focus runs from `weekOf` (1 to REGION_WEEKS_MAX). Absent: 1. */
  weeks?: number;
}

/** The longest a CMS Region focus can run, in weeks. */
export const REGION_WEEKS_MAX = 8;

const many = (kind: ItemKind, tier: ItemTier, count: number, stackable = false): ItemDef[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${kind}-${String(i + 1).padStart(2, "0")}`,
    kind,
    stackable,
    tier,
  }));

const ITEMS: ItemDef[] = [
  { id: "streak-freeze", kind: "streak-freeze", stackable: true, tier: "common" },
  ...many("alert-sound", "common", 20),
  ...many("font", "common", 2),
  ...many("name-flair", "common", 2),
  ...many("wallpaper", "better", 25),
  ...many("boot", "better", 12),
  ...many("layout-slot", "better", 3),
  { id: "custom-upload", kind: "custom-upload", stackable: false, tier: "brand" },
];

/** The eight rainbow (5-star) Regular themes (GACHA ODDS v4/v5, Rainbow themes sheet). */
export const RAINBOW_THEME_IDS: readonly string[] = [
  "retro-arcade",
  "neon-magenta",
  "purple-rain",
  "claymorphism",
  "pine-terminal",
  "emerald-dark",
  "rose-pine",
  "aj-cybernetics",
];

/** Brand Pack rotation seed list: every theme whose tags include "brand" (content/brandTags.ts), in table order. */
export const BRAND_THEME_IDS: readonly string[] = idsTagged("brand");

export const BUNDLED_CONTENT: GachaContent = {
  lookCost: 120,
  lookPityAfter: 9,
  brandPityAfter: 69,
  rainbowPityAfter: 89,
  softPity: { regular: { from: 74, curve: 1 }, company: { from: 58, curve: 1 } },
  rainbowThemeIds: RAINBOW_THEME_IDS,
  weeklyPickCap: 2,
  regularCrystalCost: 10,
  brandPrismCost: 5,
  couponCreditValue: 15,
  crystalValues: { common: 1, better: 2, regularTheme: 3, brandTheme: 5, customUpload: 5 },
  brandEpoch: "2024-01-01",
  brandFortnightDays: 14,
  packs: {
    regular: {
      id: "regular",
      priceOne: 100,
      priceTen: 900,
      weights: { regularTheme: 0.14, brandTheme: 0.01, pick: 0.03, customUpload: 0, better: 0.25, common: 0.57 },
      betterInner: { wallpaper: 0.7, boot: 0.2, layout: 0.1 },
      commonInner: { streakFreeze: 0.3, alert: 0.5, font: 0.1, flair: 0.1 },
    },
    brand: {
      id: "brand",
      priceOne: 150,
      priceTen: 1350,
      weights: { regularTheme: 0.13, brandTheme: 0.01, rainbowRegular: 0.005, pick: 0.03, customUpload: 0.005, better: 0.25, common: 0.57 },
      betterInner: { wallpaper: 0.55, boot: 0.3, layout: 0.15 },
      commonInner: { streakFreeze: 0.3, alert: 0.5, font: 0.1, flair: 0.1 },
    },
    region: {
      id: "region",
      priceOne: 150,
      priceTen: 1350,
      weights: { regularTheme: 0.13, brandTheme: 0.015, pick: 0.03, customUpload: 0.005, better: 0.25, common: 0.57 },
      betterInner: { wallpaper: 0.55, boot: 0.3, layout: 0.15 },
      commonInner: { streakFreeze: 0.3, alert: 0.5, font: 0.1, flair: 0.1 },
    },
  },
  items: ITEMS,
  brandThemeIds: BRAND_THEME_IDS,
};

const WEIGHT_KEYS = ["regularTheme", "brandTheme", "rainbowRegular", "pick", "customUpload", "better", "common"] as const;

function nearly(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

/** True when packs total 100%, prices > 0, every referenced item exists, and the Brand list has 2+ unique ids. */
export function validateContent(raw: unknown): raw is GachaContent {
  if (!raw || typeof raw !== "object") return false;
  const c = raw as GachaContent;
  if (!(c.lookCost > 0) || !(c.lookPityAfter >= 0) || !(c.brandPityAfter >= 0)) return false;
  if (!(c.weeklyPickCap >= 0) || !(c.regularCrystalCost > 0) || !(c.brandPrismCost > 0)) return false;
  if (!c.packs?.regular || !c.packs?.brand || !Array.isArray(c.items) || !Array.isArray(c.brandThemeIds)) return false;
  if (c.brandThemeIds.length < 2 || new Set(c.brandThemeIds).size !== c.brandThemeIds.length) return false;
  if (c.regionPackEnabled !== undefined && typeof c.regionPackEnabled !== "boolean") return false;
  const rw = c.regionWeek;
  if (rw) {
    if (typeof rw.weekOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(rw.weekOf)) return false;
    if (rw.kind === "region" ? !isRegionKey(rw.value) : rw.kind !== "country" || !/^[A-Z]{2}$/.test(rw.value)) return false;
    if (rw.weeks !== undefined && !(Number.isInteger(rw.weeks) && rw.weeks >= 1 && rw.weeks <= REGION_WEEKS_MAX)) return false;
  }
  const ws = c.weeklySpecial;
  if (ws) {
    const ok = typeof ws.weekOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ws.weekOf) && Array.isArray(ws.brandIds) && ws.brandIds.length === 2;
    if (!ok || ws.brandIds[0] === ws.brandIds[1] || !ws.brandIds.every((id) => c.brandThemeIds.includes(id))) return false;
  }
  if (c.specialQueue !== undefined && (!Array.isArray(c.specialQueue) || !validSpecialQueue(c.specialQueue, c.brandThemeIds))) return false;
  if (c.packTickets !== undefined) {
    if (!c.packTickets || typeof c.packTickets !== "object" || Array.isArray(c.packTickets)) return false;
    for (const [k, v] of Object.entries(c.packTickets)) if (!(k in DEFAULT_PACK_TICKETS) || !TICKET_KINDS.includes(v as TicketKind)) return false;
  }
  if (c.rainbowPityAfter !== undefined && !(typeof c.rainbowPityAfter === "number" && c.rainbowPityAfter >= 0)) return false;
  const cv = c.crystalValues;
  if (!cv || typeof cv !== "object") return false;
  for (const k of ["common", "better", "regularTheme", "brandTheme", "customUpload"] as const) if (!(typeof cv[k] === "number" && cv[k] >= 0)) return false;
  if (cv.rainbowTheme !== undefined && !(typeof cv.rainbowTheme === "number" && cv.rainbowTheme >= 0)) return false;
  if (c.softPity !== undefined) {
    if (!c.softPity || typeof c.softPity !== "object") return false;
    for (const sp of [c.softPity.regular, c.softPity.company]) {
      if (sp === undefined) continue;
      if (!(Number.isInteger(sp.from) && sp.from >= 1)) return false;
      if (!(typeof sp.curve === "number" && sp.curve >= SOFT_CURVE_MIN && sp.curve <= SOFT_CURVE_MAX)) return false;
    }
  }
  if (c.rainbowThemeIds !== undefined) {
    const x = c.rainbowThemeIds;
    if (!Array.isArray(x) || !x.every((id) => typeof id === "string" && id.length > 0) || new Set(x).size !== x.length) return false;
    if (x.some((id) => c.brandThemeIds.includes(id))) return false;
  }
  if (c.regularExtraIds !== undefined) {
    const x = c.regularExtraIds;
    if (!Array.isArray(x) || !x.every((id) => typeof id === "string" && id.length > 0) || new Set(x).size !== x.length) return false;
  }
  const ids = new Set(c.items.map((i) => i.id));
  if (!ids.has("streak-freeze") || !ids.has("custom-upload")) return false;
  for (const pack of [c.packs.regular, c.packs.brand, ...(c.packs.region ? [c.packs.region] : [])]) {
    if (!(pack.priceOne > 0) || !(pack.priceTen > 0)) return false;
    if (pack.weights.rainbowRegular !== undefined && !(pack.weights.rainbowRegular >= 0)) return false;
    const sum = WEIGHT_KEYS.reduce((s, k) => s + (pack.weights[k] ?? 0), 0);
    if (!nearly(sum, 1)) return false;
    const bi = pack.betterInner;
    if (!nearly(bi.wallpaper + bi.boot + bi.layout, 1)) return false;
    const ci = pack.commonInner;
    if (!nearly(ci.streakFreeze + ci.alert + ci.font + ci.flair, 1)) return false;
  }
  return true;
}

let active: GachaContent = BUNDLED_CONTENT;

/** True unless the CMS switched the Region Pack off (`regionPackEnabled: false`). */
export function regionPackOn(content: GachaContent = active): boolean {
  return content.regionPackEnabled !== false;
}

/** Active content (bundled until a valid release replaces it). */
export function getContent(): GachaContent {
  return active;
}

/** Apply a release; invalid input keeps the current content and returns false. A release without a Region table borrows the Brand one. */
export function setContent(raw: unknown): boolean {
  if (!validateContent(raw)) return false;
  active = raw.packs.region ? raw : { ...raw, packs: { ...raw.packs, region: { ...raw.packs.brand, id: "region" } } };
  return true;
}

/** The Draw Ticket a pack takes. */
export function ticketFor(pack: PackId, content = active): TicketKind {
  return content.packTickets?.[pack] ?? DEFAULT_PACK_TICKETS[pack];
}

/** Theme ids the CMS added back into the Regular pool. */
export function regularExtraIds(content = active): readonly string[] {
  return content.regularExtraIds ?? [];
}

/** Rainbow (5-star) Regular theme ids. A release without the list has none (no rainbow tier). */
export function rainbowThemeIds(content = active): readonly string[] {
  return content.rainbowThemeIds ?? [];
}

export function isRainbowThemeId(id: string, content = active): boolean {
  return rainbowThemeIds(content).includes(id);
}


/** Draws without a rainbow before the next one is forced: Regular Pack `rainbowPityAfter`, company packs `brandPityAfter`. */
export function rainbowPityAfter(pack: PackId, content = active): number {
  return isCompanyPack(pack) ? content.brandPityAfter : (content.rainbowPityAfter ?? 89);
}

/** A pack's base 5-star chance per draw: featured plus rainbow Regular (company packs) or the rainbow row (Regular). */
export function fiveStarBase(pack: PackId, content = active): number {
  const w = packTable(pack, content).weights;
  return w.brandTheme + (isCompanyPack(pack) ? (w.rainbowRegular ?? 0) : 0);
}

/** The soft pity of a pack's rainbow pity, or null when it has none. */
export function softPityFor(pack: PackId, content = active): SoftPity | null {
  return (isCompanyPack(pack) ? content.softPity?.company : content.softPity?.regular) ?? null;
}

/**
 * The 5-star chance on the `draw`-th draw since the last 5-star (1 is the first). Base until soft pity starts, then
 * base + (1 - base) * progress^curve, and 1 at the guaranteed draw (pity after + 1).
 */
export function fiveStarChanceAt(draw: number, base: number, guaranteedAt: number, soft: SoftPity | null): number {
  if (draw >= guaranteedAt) return 1;
  if (!soft || soft.from >= guaranteedAt || draw < soft.from) return base;
  const progress = (draw - soft.from + 1) / (guaranteedAt - soft.from + 1);
  return base + (1 - base) * Math.pow(progress, soft.curve);
}

/** The price and odds table for a pack (Region falls back to Brand). */
export function packTable(pack: PackId, content = active): PackTable {
  return pack === "region" ? (content.packs.region ?? { ...content.packs.brand, id: "region" }) : content.packs[pack];
}

/** Reset to the bundled default (tests). */
export function resetContent(): void {
  active = BUNDLED_CONTENT;
}

export function itemById(id: string, content = active): ItemDef | undefined {
  return content.items.find((i) => i.id === id);
}

export function itemsOfKind(kind: ItemKind, content = active): ItemDef[] {
  return content.items.filter((i) => i.kind === kind);
}

export function oneTimeItemsForPack(pack: PackId, content = active): ItemDef[] {
  return content.items.filter((i) => !i.stackable && (isCompanyPack(pack) || i.tier !== "brand"));
}

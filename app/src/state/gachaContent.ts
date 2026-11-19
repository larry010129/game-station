import { idsTagged, isRegionKey } from "../content/brandTags.ts";
import { CARD_SKINS, isCardSkinId } from "./cardSkins.ts";

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
export const DEFAULT_PACK_TICKETS: Record<PackId, TicketKind> = { regular: "special", brand: "special", region: "special" };

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
  /** CMS: prize ids (themes, card skins, items) kept off the Draw Wiki so they are not spoiled. Absent: none. */
  wikiHiddenIds?: readonly string[];
  /** CMS: a single Credits gain above this amount shows the cash bundle in place of the coins. Absent: 100. */
  creditBigAmount?: number;
  /** CMS Card Pack (dashboard card skins). Absent (older releases): the bundled BUNDLED_CARD_PACK. */
  cardPack?: CardPackContent;
  /**
   * CMS Widget Pack: the dashboard cards themselves as prizes. Same rules as the Card Pack. A card it does not list is
   * Free. Absent (older releases): BUNDLED_WIDGET_PACK, which lists none, so every card is Free.
   */
  widgetPack?: WidgetPackContent;
  /**
   * CMS check-in event: the daily check-in board can be claimed only from `start` until `end` (local times,
   * "YYYY-MM-DDTHH:mm"). Absent or null: the board is always on.
   */
  checkinEvent?: CheckinEvent | null;
  /**
   * CMS: what each check-in day pays, Day 1 to Day 7: a Draw Ticket (Regular or Special) or an item from `items`, and
   * how many. Absent: DEFAULT_CHECKIN_PRIZES.
   */
  checkinPrizes?: readonly CheckinPrize[];
}

/** One check-in box: tickets of a kind, or an item from the catalog. One-time items pay 1. */
export type CheckinPrize = { kind: TicketKind; count: number } | { kind: "item"; id: string; count: number };

/** The check-in board has seven boxes. */
export const CHECKIN_DAYS = 7;
/** The most of one thing a box can pay. */
export const CHECKIN_MAX_COUNT = 99;

/** Default board: Special Tickets every day, 2 on Day 3 and 3 on Day 7. */
export const DEFAULT_CHECKIN_PRIZES: readonly CheckinPrize[] = [
  { kind: "special", count: 1 },
  { kind: "special", count: 1 },
  { kind: "special", count: 2 },
  { kind: "special", count: 1 },
  { kind: "special", count: 1 },
  { kind: "special", count: 1 },
  { kind: "special", count: 3 },
];

/** True for seven well formed boxes; an item must be in `items`, and a one-time item pays exactly 1. */
export function validCheckinPrizes(raw: unknown, items: readonly ItemDef[]): raw is CheckinPrize[] {
  if (!Array.isArray(raw) || raw.length !== CHECKIN_DAYS) return false;
  return raw.every((p) => {
    if (!p || typeof p !== "object") return false;
    const { kind, count, id } = p as Record<string, unknown>;
    if (!(Number.isInteger(count) && (count as number) >= 1 && (count as number) <= CHECKIN_MAX_COUNT)) return false;
    if (kind === "regular" || kind === "special") return true;
    if (kind !== "item" || typeof id !== "string") return false;
    const item = items.find((i) => i.id === id);
    return !!item && (item.stackable || count === 1);
  });
}

/** What each check-in day pays in this release. */
export function checkinPrizesOf(content: GachaContent = active): readonly CheckinPrize[] {
  return content.checkinPrizes ?? DEFAULT_CHECKIN_PRIZES;
}

/** When the check-in board runs, as local date-times "YYYY-MM-DDTHH:mm" (start inclusive, end exclusive). */
export interface CheckinEvent {
  start: string;
  end: string;
}

export type CardSkinStatus = "Hidden" | "Available" | "Archived";

/** A skin as one release runs it: its stars there and whether it can be drawn (Available), only kept (Archived) or not shown (Hidden). */
export interface CardPackSkin {
  id: string;
  stars: 4 | 5;
  status: CardSkinStatus;
  /** CMS only: the row is locked against edits there. The app ignores it. */
  locked?: boolean;
}

/**
 * Buying a skin outright instead of drawing it. A price of null means that tier is draw-only. `crystalPick` lets
 * Regular crystals (the Regular theme pick cost) buy a 4-star skin too.
 */
export interface CardBuy {
  fourPrice: number | null;
  fivePrice: number | null;
  crystalPick: boolean;
}

/** A dashboard card as one release runs it. Free: anyone can add it. The rest are locked until owned. */
export type WidgetStatus = "Free" | CardSkinStatus;

export interface WidgetPackCard {
  id: string;
  stars: 4 | 5;
  status: WidgetStatus;
  /** CMS only: the row is locked against edits there. The app ignores it. */
  locked?: boolean;
}

/** The Widget Pack: the Card Pack's rules, drawing dashboard cards (`widgets`) instead of skins. */
export interface WidgetPackContent extends Omit<CardPackContent, "skins"> {
  widgets: readonly WidgetPackCard[];
}

export const DEFAULT_CARD_BUY: CardBuy = { fourPrice: 300, fivePrice: null, crystalPick: true };

/**
 * The Card Pack: dashboard card skins at 4 and 5 stars, with items filling the other rows. It has its own price,
 * ticket, odds and two pity counters (a 4-star-or-better guarantee and a 5-star guarantee with soft pity).
 */
export interface CardPackContent {
  enabled: boolean;
  /** The Draw Ticket the pack takes. */
  ticket: TicketKind;
  priceOne: number;
  priceTen: number;
  /** Row chances per draw (sum 1). Better and Common item rows use the Regular Pack's inner item weights. */
  weights: { five: number; four: number; better: number; common: number };
  /** A 4-star-or-better skin is forced after this many draws without one (9: by the 10th draw). */
  fourPityAfter: number;
  /** A 5-star skin is forced after this many draws without one (69: by the 70th draw). */
  fivePityAfter: number;
  /** Soft pity for the 5-star chance. Absent: no climb before the guaranteed draw. */
  softPity?: SoftPity;
  /** Regular crystals a repeat skin pays. */
  crystalValues: { four: number; five: number };
  /** The skins this release runs. Ids the app does not know are ignored. */
  skins: readonly CardPackSkin[];
  /** Buying skins outright. Absent: DEFAULT_CARD_BUY. */
  buy?: CardBuy;
}

/** Card Pack default (GACHA REDESIGN.md, Card Pack): every bundled skin Available at its own stars. */
export const BUNDLED_CARD_PACK: CardPackContent = {
  enabled: true,
  ticket: "special",
  priceOne: 120,
  priceTen: 1080,
  weights: { five: 0.01, four: 0.1, better: 0.25, common: 0.64 },
  fourPityAfter: 9,
  fivePityAfter: 69,
  softPity: { from: 60, curve: 1 },
  crystalValues: { four: 2, five: 5 },
  buy: DEFAULT_CARD_BUY,
  skins: CARD_SKINS.map((s) => ({ id: s.id, stars: s.stars, status: "Available" as const })),
};

/** Widget Pack default: the Card Pack's numbers and no cards listed, so every card is Free until a release locks some. */
export const BUNDLED_WIDGET_PACK: WidgetPackContent = (() => {
  const { skins: _skins, ...rules } = BUNDLED_CARD_PACK;
  return { ...rules, widgets: [] };
})();

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** True for a well formed check-in window whose end is after its start. */
export function validCheckinEvent(e: unknown): e is CheckinEvent {
  if (!e || typeof e !== "object") return false;
  const { start, end } = e as Record<string, unknown>;
  return typeof start === "string" && typeof end === "string" && LOCAL_DATETIME.test(start) && LOCAL_DATETIME.test(end) && start < end;
}

/** True for a well formed Card Pack table (`kind: "widgets"`: a Widget Pack, listing `widgets` that may be Free). */
export function validCardPack(raw: unknown, kind: "skins" | "widgets" = "skins"): raw is CardPackContent {
  if (!raw || typeof raw !== "object") return false;
  const c = raw as CardPackContent;
  if (typeof c.enabled !== "boolean" || !TICKET_KINDS.includes(c.ticket)) return false;
  if (!(c.priceOne > 0) || !(c.priceTen > 0)) return false;
  const w = c.weights;
  if (!w || typeof w !== "object") return false;
  for (const k of ["five", "four", "better", "common"] as const) if (!(typeof w[k] === "number" && w[k] >= 0)) return false;
  if (Math.abs(w.five + w.four + w.better + w.common - 1) > 1e-9) return false;
  if (!(Number.isInteger(c.fourPityAfter) && c.fourPityAfter >= 0)) return false;
  if (!(Number.isInteger(c.fivePityAfter) && c.fivePityAfter >= 0)) return false;
  if (c.softPity !== undefined) {
    const sp = c.softPity;
    if (!sp || !(Number.isInteger(sp.from) && sp.from >= 1)) return false;
    if (!(typeof sp.curve === "number" && sp.curve >= SOFT_CURVE_MIN && sp.curve <= SOFT_CURVE_MAX)) return false;
  }
  const cv = c.crystalValues;
  if (!cv || !(Number.isInteger(cv.four) && cv.four >= 0) || !(Number.isInteger(cv.five) && cv.five >= 0)) return false;
  const list = kind === "widgets" ? (c as unknown as WidgetPackContent).widgets : c.skins;
  if (!Array.isArray(list)) return false;
  const seen = new Set<string>();
  for (const s of list as readonly WidgetPackCard[]) {
    if (!s || typeof s.id !== "string" || !s.id || seen.has(s.id)) return false;
    if (s.stars !== 4 && s.stars !== 5) return false;
    if (s.status !== "Hidden" && s.status !== "Available" && s.status !== "Archived" && !(kind === "widgets" && s.status === "Free")) return false;
    if (s.locked !== undefined && typeof s.locked !== "boolean") return false;
    seen.add(s.id);
  }
  if (c.buy !== undefined) {
    const b = c.buy;
    const price = (v: unknown) => v === null || (typeof v === "number" && Number.isInteger(v) && v > 0);
    if (!b || typeof b !== "object" || !price(b.fourPrice) || !price(b.fivePrice) || typeof b.crystalPick !== "boolean") return false;
  }
  return true;
}

/** How skins can be bought in this release. */
export function cardBuyOf(content: GachaContent = active): CardBuy {
  return cardPackOf(content).buy ?? DEFAULT_CARD_BUY;
}

/** Credits to buy a skin now, or null when it cannot be bought (draw-only tier, or not Available). */
export function skinPrice(id: string, content: GachaContent = active): number | null {
  const s = cardPackSkins(content).find((x) => x.id === id);
  if (!s || s.status !== "Available") return null;
  const b = cardBuyOf(content);
  return s.stars === 5 ? b.fivePrice : b.fourPrice;
}

/** The Card Pack of a release (the bundled one when the release has none). */
export function cardPackOf(content: GachaContent = active): CardPackContent {
  return content.cardPack ?? BUNDLED_CARD_PACK;
}

/** The Widget Pack of a release (the bundled one, listing no cards, when the release has none). */
export function widgetPackOf(content: GachaContent = active): WidgetPackContent {
  return content.widgetPack ?? BUNDLED_WIDGET_PACK;
}

/** A card's status in this release: Free when the Widget Pack does not list it. */
export function widgetStatus(id: string, content: GachaContent = active): WidgetStatus {
  return widgetPackOf(content).widgets.find((w) => w.id === id)?.status ?? "Free";
}

/** True when the Card Pack is on. */
export const cardPackOn = (content: GachaContent = active): boolean => cardPackOf(content).enabled;

/** Skins of the release the app knows (unknown ids dropped), with their stars and status. */
export function cardPackSkins(content: GachaContent = active): CardPackSkin[] {
  return cardPackOf(content).skins.filter((s) => isCardSkinId(s.id));
}

/** Skins that can be drawn now (Available), by stars. */
export function drawableSkins(stars: 4 | 5, content: GachaContent = active): string[] {
  return cardPackSkins(content)
    .filter((s) => s.status === "Available" && s.stars === stars)
    .map((s) => s.id);
}

/** The stars a skin has in this release (its bundled stars when the release does not list it). */
export function skinStars(id: string, content: GachaContent = active): 4 | 5 {
  return cardPackSkins(content).find((s) => s.id === id)?.stars ?? CARD_SKINS.find((s) => s.id === id)?.stars ?? 4;
}

/** True when the check-in window is open at `now` (no window: always). */
export function checkinOpen(now: Date, content: GachaContent = active): boolean {
  const e = content.checkinEvent;
  if (!e) return true;
  const at = localStamp(now);
  return at >= e.start && at < e.end;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** A Date as a local "YYYY-MM-DDTHH:mm" stamp, comparable as a string with the check-in window. */
export function localStamp(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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

/** Used when a release does not set `creditBigAmount`. Quests and the season pass pay 5 to 20 today, well under it. */
export const CREDIT_BIG_AMOUNT_DEFAULT = 100;

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
  creditBigAmount: CREDIT_BIG_AMOUNT_DEFAULT,
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
  if (c.creditBigAmount !== undefined && !(typeof c.creditBigAmount === "number" && Number.isFinite(c.creditBigAmount) && c.creditBigAmount >= 0)) return false;
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
  if (c.cardPack !== undefined && !validCardPack(c.cardPack)) return false;
  if (c.widgetPack !== undefined && !validCardPack(c.widgetPack, "widgets")) return false;
  if (c.checkinEvent !== undefined && c.checkinEvent !== null && !validCheckinEvent(c.checkinEvent)) return false;
  if (c.checkinPrizes !== undefined && !validCheckinPrizes(c.checkinPrizes, Array.isArray(c.items) ? c.items : [])) return false;
  if (c.regularExtraIds !== undefined) {
    const x = c.regularExtraIds;
    if (!Array.isArray(x) || !x.every((id) => typeof id === "string" && id.length > 0) || new Set(x).size !== x.length) return false;
  }
  if (c.wikiHiddenIds !== undefined && !(Array.isArray(c.wikiHiddenIds) && c.wikiHiddenIds.every((id) => typeof id === "string" && id.length > 0))) return false;
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

/** A single Credits gain above this amount is a big one. Read at use time, so a new release takes effect at once. */
export function creditBigAmount(content = active): number {
  return content.creditBigAmount ?? CREDIT_BIG_AMOUNT_DEFAULT;
}

/** True when one gain of `amount` Credits is above the CMS amount. A gain of exactly that amount is not big. */
export function isBigCreditGain(amount: number, content = active): boolean {
  return amount > creditBigAmount(content);
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

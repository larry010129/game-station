/** CMS draft shape — mirrors app gachaContent + themeCatalog for editors. */

export type ThemeStatus = "Hidden" | "Available" | "Archived";
export type ThemeGroup = "Regular" | "Brand";
export type PackId = "regular" | "brand" | "region";

/** Which packs a company theme belongs to. Mirrors app/src/content/brandTags.ts. */
export type PackTag = "brand" | "region";

export interface ThemeTags {
  packs: PackTag[];
  /** ISO 3166-1 alpha-2, upper case. */
  country: string;
  region: string;
}

/** Region keys: continents, with Europe and Asia split in four. Mirrors app/src/content/brandTags.ts. */
/** `short` is the region code a theme's tag shows next to its country. */
export const REGIONS: { key: string; name: string; short: string; continent: string }[] = [
  { key: "na", name: "North America", short: "NA", continent: "North America" },
  { key: "latam", name: "South America", short: "SA", continent: "South America" },
  { key: "eu-west", name: "West Europe", short: "EUW", continent: "Europe" },
  { key: "eu-central", name: "Central Europe", short: "EUC", continent: "Europe" },
  { key: "eu-east", name: "East Europe", short: "EUE", continent: "Europe" },
  { key: "eu-south", name: "South Europe", short: "EUS", continent: "Europe" },
  { key: "asia-east", name: "East Asia", short: "EA", continent: "Asia" },
  { key: "asia-southeast", name: "Southeast Asia", short: "SEA", continent: "Asia" },
  { key: "asia-south", name: "South Asia", short: "SAS", continent: "Asia" },
  { key: "asia-west", name: "West Asia (Middle East)", short: "ME", continent: "Asia" },
  { key: "africa", name: "Africa", short: "AF", continent: "Africa" },
  { key: "oceania", name: "Oceania", short: "OCE", continent: "Oceania" },
];

export const COUNTRIES: Record<string, string> = {
  AE: "United Arab Emirates", AR: "Argentina", AT: "Austria", AU: "Australia", BR: "Brazil", CA: "Canada", CH: "Switzerland",
  CN: "China", CO: "Colombia", CZ: "Czechia", DE: "Germany", DK: "Denmark", ES: "Spain", ET: "Ethiopia", FI: "Finland",
  FR: "France", GB: "United Kingdom", ID: "Indonesia", IN: "India", IT: "Italy", JP: "Japan", KR: "South Korea", MX: "Mexico",
  MY: "Malaysia", NG: "Nigeria", PL: "Poland", PT: "Portugal", QA: "Qatar", RO: "Romania", RU: "Russia", SE: "Sweden",
  SG: "Singapore", TR: "Türkiye", TW: "Taiwan", UA: "Ukraine", US: "United States",
};

export function regionName(key: string): string {
  return REGIONS.find((r) => r.key === key)?.name ?? key;
}

export function regionShort(key: string): string {
  return REGIONS.find((r) => r.key === key)?.short ?? key;
}

export type ItemKind =
  | "streak-freeze"
  | "alert-sound"
  | "font"
  | "name-flair"
  | "wallpaper"
  | "boot"
  | "layout-slot"
  | "custom-upload";

export type ItemTier = "common" | "better" | "brand";

export interface ThemePalette {
  bg: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  caution: string;
  alert: string;
  border: string;
  radius: string;
  shadow?: string;
  font?: string;
  mono?: boolean;
}

export interface CmsTheme {
  id: string;
  name: string;
  group: ThemeGroup;
  status: ThemeStatus;
  palette: ThemePalette | null;
  /** Company (Brand-group) themes: packs, country and region. Ticking "brand" puts it in the Brand Pack rotation. */
  tags?: ThemeTags;
}

export interface CmsItem {
  id: string;
  name: string;
  kind: ItemKind;
  stackable: boolean;
  tier: ItemTier;
  /** Optional asset path/URL (e.g. alert-sound preview). Publish convert strips extras. */
  assetPath?: string;
}

/** Row chances stored as percentages (must sum to 100). */
export interface PackWeightsPct {
  regularTheme: number;
  /** Regular Pack: rainbow Regular 5-star. Brand and Region packs: featured 5-star. */
  brandTheme: number;
  /** Brand and Region packs: rainbow Regular 5-star. Absent: 0. */
  rainbowRegular?: number;
  pick: number;
  customUpload: number;
  better: number;
  common: number;
}

/** Soft pity for one kind of 5-star pity (app: SoftPity in gachaContent.ts). */
export interface SoftPityValue {
  from: number;
  curve: number;
}

export interface PackDraft {
  id: PackId;
  priceOne: number;
  priceTen: number;
  weights: PackWeightsPct;
  /** Older drafts only (a per-pack 50/50, now removed). Ignored. */
  promotedChance?: number;
  betterInner: { wallpaper: number; boot: number; layout: number };
  commonInner: { streakFreeze: number; alert: number; font: number; flair: number };
}

export interface EconomyDraft {
  lookCost: number;
  lookPityAfter: number;
  /** Brand and Region Pack rainbow pity: a rainbow (the 50/50) is forced after this many draws without one. */
  brandPityAfter: number;
  /** Regular Pack rainbow pity: a rainbow Regular theme is forced after this many draws without one. Absent: 89. */
  rainbowPityAfter?: number;
  /** A single Credits gain above this shows the cash bundle in the app, not the coins. Absent: 100. */
  creditBigAmount?: number;
  /** The 50/50 in percent: how often a Brand or Region Pack rainbow is a featured look when not guaranteed. Absent: 50. */
  promotedChance?: number;
  /** Soft pity: the 5-star chance climbs from draw `from` to 100% at the guaranteed draw, shaped by `curve`. */
  softPity?: { regular?: SoftPityValue; company?: SoftPityValue };
  weeklyPickCap: number;
  regularCrystalCost: number;
  brandPrismCost: number;
  /** What a repeat pays: Special crystals for a featured theme, Regular crystals for everything else (any pack). */
  crystalValues: {
    common: number;
    better: number;
    regularTheme: number;
    /** A rainbow Regular theme (5-star). Absent: the `regularTheme` value. */
    rainbowTheme?: number;
    brandTheme: number;
    customUpload: number;
  };
  brandEpoch: string;
  brandFortnightDays: number;
}

export const HONEST_ODDS_DISCLAIMER =
  "Same odds as the pack. Featured items are the ones available now.";

export interface CmsBanner {
  id: string;
  title: string;
  subtitle: string;
  pack: PackId;
  start: string;
  end: string;
  featuredIds: string[];
  priority: number;
  body: string;
  /**
   * Banner art URL served by the CMS (e.g. `/uploads/banners/….webp`).
   * Aliases `imageUrl` / `assetPath` are accepted on read for older drafts.
   */
  art?: string;
  imageUrl?: string;
  assetPath?: string;
}

export interface ReleaseMeta {
  number: number;
  publishedAt: string;
  /** When the release goes live (ISO). Older releases: the publish time. */
  effectiveAt?: string | null;
  notes: string;
  file?: string;
}

export interface CmsDraft {
  version: number;
  updatedAt: string;
  releaseNotes: string;
  economy: EconomyDraft;
  /** `region` is created from the Brand table the first time the Region Pack is edited. */
  packs: { regular: PackDraft; brand: PackDraft; region?: PackDraft };
  themes: CmsTheme[];
  items: CmsItem[];
  /** Brand Pack rotation order. Membership comes from theme tags; this list only keeps the order (see brandPoolOf). */
  brandThemeIds: string[];
  /** Region Pack on/off. False hides the pack in the app; absent means on. The week and odds are kept while off. */
  regionPackEnabled?: boolean;
  /** Which check-in Draw Ticket each pack takes. A pack left out: Regular for the Regular Pack, Special for the rest. */
  packTickets?: Partial<Record<PackId, TicketKind>>;
  /** Themes added back into the Regular pool (for example a Brand look after its rotation). Absent: none. */
  regularExtraIds?: string[];
  /** Prizes kept off the app's Draw Wiki (theme, card skin or item ids), so a new one is not spoiled. Absent: none. */
  wikiHiddenIds?: string[];
  /** Rainbow (5-star) Regular themes: draw-only. Absent: the app's bundled eight. */
  rainbowThemeIds?: string[];
  /** Region Pack focus for one week: a region week or a country week. Null/absent: the pack rotates by itself. */
  regionWeek?: RegionWeekDraft | null;
  /** Before the queue: one weekly special. Read through specialQueueOf; edits move it into `specialQueue`. */
  weeklySpecial?: { weekOf: string; brandIds: string[] } | null;
  /** The Brand Pack's featured queue: runs of 2 Brand themes, each from a start Monday for 1 to 8 weeks. */
  specialQueue?: SpecialRunDraft[];
  /**
   * Brand theme ids previously used in weekly specials (CMS-only; not published).
   * Random fill excludes these; manual pick may still choose them. Remove an id to allow it in random again.
   */
  brandFeaturedPast?: string[];
  banners: CmsBanner[];
  releases: ReleaseMeta[];
  /** The Card Pack (dashboard card skins). Absent: the app's bundled pack (see cardPackOf). */
  cardPack?: CardPackDraft;
  /** The Widget Pack (dashboard cards themselves). Absent: not published, so every card stays Free (see widgetPackOf). */
  widgetPack?: WidgetPackDraft;
  /** The daily check-in board runs only inside this window (local times). Null/absent: always on. */
  checkinEvent?: CheckinEventDraft | null;
  /** What each check-in day pays, Day 1 to Day 7. Absent: the app default (see checkinPrizesOf). */
  checkinPrizes?: CheckinPrizeDraft[];
}

/** One check-in box: Draw Tickets of a kind, or an item from the catalog. Mirrors app CheckinPrize. */
export type CheckinPrizeDraft = { kind: TicketKind; count: number } | { kind: "item"; id: string; count: number };

export const CHECKIN_DAYS = 7;
export const CHECKIN_MAX_COUNT = 99;

/** The app's default board: Special Tickets every day, 2 on Day 3 and 3 on Day 7. */
export const DEFAULT_CHECKIN_PRIZES: CheckinPrizeDraft[] = [
  { kind: "special", count: 1 },
  { kind: "special", count: 1 },
  { kind: "special", count: 2 },
  { kind: "special", count: 1 },
  { kind: "special", count: 1 },
  { kind: "special", count: 1 },
  { kind: "special", count: 3 },
];

/** The draft's check-in prizes, or the app default until they are edited. */
/** Hides a prize from the app's Draw Wiki, or shows it again (`wikiHiddenIds`). */
export function withWikiHidden(d: CmsDraft, id: string, hidden: boolean): CmsDraft {
  const now = (d.wikiHiddenIds ?? []).filter((x) => x !== id);
  const next = hidden ? [...now, id] : now;
  return { ...d, wikiHiddenIds: next.length ? next : undefined };
}

export function checkinPrizesOf(draft: CmsDraft): CheckinPrizeDraft[] {
  return draft.checkinPrizes ?? DEFAULT_CHECKIN_PRIZES;
}

/** Publish blocks for the per-day check-in prizes. */
export function checkinPrizeErrors(draft: CmsDraft): string[] {
  if (!draft.checkinPrizes) return [];
  const errors: string[] = [];
  const list = draft.checkinPrizes;
  if (list.length !== CHECKIN_DAYS) errors.push(`Check-in prizes: there must be exactly ${CHECKIN_DAYS} days (has ${list.length})`);
  list.forEach((p, i) => {
    const at = `Check-in Day ${i + 1}`;
    if (!(Number.isInteger(p.count) && p.count >= 1 && p.count <= CHECKIN_MAX_COUNT)) errors.push(`${at}: the amount must be a whole number from 1 to ${CHECKIN_MAX_COUNT}`);
    if (p.kind === "item") {
      const item = draft.items.find((x) => x.id === p.id);
      if (!item) errors.push(`${at}: pick an item`);
      else if (!item.stackable && p.count !== 1) errors.push(`${at}: ${item.name} is a one-time item, so the amount must be 1`);
    } else if (p.kind !== "regular" && p.kind !== "special") errors.push(`${at}: pick a ticket or an item`);
  });
  return errors;
}

export type CardSkinStatus = "Hidden" | "Available" | "Archived";

export interface CardPackSkinDraft {
  id: string;
  stars: 4 | 5;
  status: CardSkinStatus;
  /** Locked in the CMS: its stars and status cannot be changed until unlocked (guards against a wrong edit). */
  locked?: boolean;
}

/** Buying skins outright. A null price makes that tier draw-only. Mirrors app CardBuy. */
export interface CardBuyDraft {
  fourPrice: number | null;
  fivePrice: number | null;
  crystalPick: boolean;
}

export const DEFAULT_CARD_BUY: CardBuyDraft = { fourPrice: 300, fivePrice: null, crystalPick: true };

/** Card Pack table. Row chances are percentages (sum 100), like the theme packs. Mirrors app CardPackContent. */
export interface CardPackDraft {
  enabled: boolean;
  ticket: TicketKind;
  priceOne: number;
  priceTen: number;
  weights: { five: number; four: number; better: number; common: number };
  /** A 4-star-or-better skin is forced after this many draws without one. */
  fourPityAfter: number;
  /** A 5-star skin is forced after this many draws without one. */
  fivePityAfter: number;
  softPity?: SoftPityValue;
  crystalValues: { four: number; five: number };
  skins: CardPackSkinDraft[];
  /** Absent: DEFAULT_CARD_BUY. */
  buy?: CardBuyDraft;
}

/** Check-in event window: local date-times "YYYY-MM-DDTHH:mm" (start inclusive, end exclusive). */
export interface CheckinEventDraft {
  start: string;
  end: string;
}

/**
 * The card skins the app ships (their art is CSS in the app, so the list is fixed there). Mirrors
 * app/src/state/cardSkins.ts; `tint` only colours the CMS preview chip.
 */
export const CARD_SKIN_CATALOG: { id: string; name: string; stars: 4 | 5; tint: string }[] = [
  { id: "carbon-weave", name: "Carbon Weave", stars: 4, tint: "#3a3d44" },
  { id: "brushed-steel", name: "Brushed Steel", stars: 4, tint: "#8d98a5" },
  { id: "blueprint", name: "Blueprint", stars: 4, tint: "#3d7bd9" },
  { id: "velvet-night", name: "Velvet Night", stars: 4, tint: "#5b3a9c" },
  { id: "circuit-trace", name: "Circuit Trace", stars: 4, tint: "#2fa37a" },
  { id: "frosted-glass", name: "Frosted Glass", stars: 4, tint: "#c9d6e3" },
  { id: "scanline", name: "Scanline", stars: 4, tint: "#4a7a5a" },
  { id: "gilded-edge", name: "Gilded Edge", stars: 4, tint: "#e3b13a" },
  { id: "topo-lines", name: "Topo Lines", stars: 4, tint: "#7d8a6a" },
  { id: "hex-mesh", name: "Hex Mesh", stars: 4, tint: "#4aa3c8" },
  { id: "paper-grain", name: "Paper Grain", stars: 4, tint: "#d8ccb0" },
  { id: "neon-rim", name: "Neon Rim", stars: 4, tint: "#ff4fd8" },
  { id: "holo-foil", name: "Holo Foil", stars: 5, tint: "linear-gradient(120deg,#ff5caa,#ffd65c,#5cffaa,#5caaff,#c45cff)" },
  { id: "aurora-drift", name: "Aurora Drift", stars: 5, tint: "linear-gradient(120deg,#40e0b2,#608cff,#b460ff)" },
  { id: "solar-flare", name: "Solar Flare", stars: 5, tint: "linear-gradient(120deg,#ff7828,#ffb347,#fff1c9)" },
  { id: "prism-glass", name: "Prism Glass", stars: 5, tint: "linear-gradient(120deg,#ff5a5a,#ffdc5a,#5aa0ff,#c85aff)" },
  { id: "molten-core", name: "Molten Core", stars: 5, tint: "linear-gradient(0deg,#ff6a1f,#3a1408)" },
  { id: "starfield", name: "Starfield", stars: 5, tint: "radial-gradient(circle at 30% 30%,#fff 0 1px,transparent 2px),#0b1030" },
];

/** The app's bundled Card Pack (GACHA REDESIGN.md, Card Pack), as percentages. */
export const DEFAULT_CARD_PACK: CardPackDraft = {
  enabled: true,
  ticket: "special",
  priceOne: 120,
  priceTen: 1080,
  weights: { five: 1, four: 10, better: 25, common: 64 },
  fourPityAfter: 9,
  fivePityAfter: 69,
  softPity: { from: 60, curve: 1 },
  crystalValues: { four: 2, five: 5 },
  buy: DEFAULT_CARD_BUY,
  skins: CARD_SKIN_CATALOG.map((s) => ({ id: s.id, stars: s.stars, status: "Available" as const })),
};

/**
 * Card Pack odds must total exactly 100% (within rounding): the release check and the app allow no slack, so the
 * editor allows none either. (The theme packs keep their own ±0.05% check.)
 */
export function cardOddsTotal100(sum: number): boolean {
  return Math.abs(sum - 100) <= 1e-7;
}

/** The draft's Card Pack, or the bundled one until it is edited. Catalog skins missing from it are added Hidden. */
export function cardPackOf(draft: CmsDraft): CardPackDraft {
  const cp = draft.cardPack ?? DEFAULT_CARD_PACK;
  const missing = CARD_SKIN_CATALOG.filter((c) => !cp.skins.some((s) => s.id === c.id));
  if (!draft.cardPack || missing.length === 0) return cp;
  return { ...cp, skins: [...cp.skins, ...missing.map((c) => ({ id: c.id, stars: c.stars, status: "Hidden" as const }))] };
}

/**
 * Free: every player has it, no draw needed. Available: drawable in the Widget Pack (locked until won).
 * Hidden: not shown at all. Archived: out of the pack, owners keep it.
 */
export type WidgetStatus = "Free" | "Available" | "Hidden" | "Archived";

export interface WidgetPackWidgetDraft {
  id: string;
  stars: 4 | 5;
  status: WidgetStatus;
  /** Locked in the CMS: its stars and status cannot be changed until unlocked (guards against a wrong edit). */
  locked?: boolean;
}

/** Widget Pack table: same numbers as the Card Pack, but it hands out dashboard cards. A card not listed is Free. */
export interface WidgetPackDraft extends Omit<CardPackDraft, "skins"> {
  widgets: WidgetPackWidgetDraft[];
}

/** The pack settings the Card Pack and Widget Pack share (everything but their prize list). */
export type PackSettingsDraft = Omit<CardPackDraft, "skins">;

/**
 * The app's dashboard cards (their code ships in the app, so the list is fixed there). Mirrors CARDS in
 * app/src/layout/layouts.ts.
 */
export const WIDGET_CATALOG: { id: string; name: string; group: string }[] = [
  { id: "gpu", name: "GPU", group: "This PC" },
  { id: "load", name: "Load", group: "This PC" },
  { id: "uplink", name: "Uplink", group: "Connection" },
  { id: "chart", name: "Players online", group: "Overwatch" },
  { id: "alerts", name: "Alerts and events", group: "This PC" },
  { id: "gamemode", name: "Game mode", group: "Game" },
  { id: "feed", name: "Overwatch feed", group: "Overwatch" },
  { id: "media", name: "Now playing", group: "Media" },
  { id: "calendar", name: "Calendar", group: "Tools" },
  { id: "spotify", name: "Spotify control", group: "Media" },
  { id: "wavelink", name: "Wave Link", group: "Media" },
  { id: "memory", name: "Memory", group: "This PC" },
  { id: "power", name: "Power and battery", group: "This PC" },
  { id: "regionping", name: "Ping by region", group: "Connection" },
  { id: "jitter", name: "Jitter and packet loss", group: "Connection" },
  { id: "wifi", name: "Wi-Fi signal", group: "Connection" },
  { id: "verdict", name: "Connection verdict", group: "Connection" },
  { id: "trend", name: "Player trend", group: "Overwatch" },
  { id: "patch", name: "Patch summary", group: "Overwatch" },
  { id: "season", name: "Season countdown", group: "Overwatch" },
  { id: "steam", name: "Steam news", group: "Overwatch" },
  { id: "queue", name: "Best time to play", group: "Overwatch" },
  { id: "airesearch", name: "Leak feed", group: "Overwatch" },
  { id: "tierlist", name: "Hero tier list", group: "Meta" },
  { id: "mappicks", name: "Map hero picks", group: "Meta" },
  { id: "bestpicks", name: "Best pick per role", group: "Meta" },
  { id: "heroprofile", name: "Hero profile", group: "Meta" },
  { id: "session", name: "Session timer", group: "Game" },
  { id: "playhistory", name: "Play history", group: "Game" },
  { id: "report", name: "Session report", group: "Game" },
  { id: "gmhistory", name: "Game mode history", group: "Game" },
  { id: "clocks", name: "World clock", group: "Tools" },
  { id: "cost", name: "App cost", group: "This PC" },
  { id: "library", name: "Game library", group: "Game" },
  { id: "discord", name: "Discord", group: "Media" },
  { id: "notes", name: "Pre-game checklist", group: "Tools" },
];

/** 5-star widgets: the resource-hungry cards (the ones the app's poll limiter has to hold back). */
export const WIDGET_FIVE_STAR_IDS: readonly string[] = ["spotify", "discord", "wavelink", "media", "chart", "airesearch", "heroprofile"];

export const defaultWidgetStars = (id: string): 4 | 5 => (WIDGET_FIVE_STAR_IDS.includes(id) ? 5 : 4);

/** A new Widget Pack: the Card Pack's numbers, every catalog card listed and Free. */
export const DEFAULT_WIDGET_PACK: WidgetPackDraft = {
  enabled: DEFAULT_CARD_PACK.enabled,
  ticket: DEFAULT_CARD_PACK.ticket,
  priceOne: DEFAULT_CARD_PACK.priceOne,
  priceTen: DEFAULT_CARD_PACK.priceTen,
  weights: { ...DEFAULT_CARD_PACK.weights },
  fourPityAfter: DEFAULT_CARD_PACK.fourPityAfter,
  fivePityAfter: DEFAULT_CARD_PACK.fivePityAfter,
  ...(DEFAULT_CARD_PACK.softPity ? { softPity: { ...DEFAULT_CARD_PACK.softPity } } : {}),
  crystalValues: { ...DEFAULT_CARD_PACK.crystalValues },
  buy: { ...DEFAULT_CARD_BUY },
  widgets: WIDGET_CATALOG.map((w) => ({ id: w.id, stars: defaultWidgetStars(w.id), status: "Free" as const })),
};

/**
 * A widget's key in `wikiHiddenIds`. Prefixed because card ids can clash with theme ids ("discord" is both); the
 * app's Wiki reads cards as `widget:<id>` (app/src/state/wikiData.ts).
 */
export const widgetWikiKey = (id: string) => `widget:${id}`;

/** The draft's Widget Pack, or the default until it is edited. Unlike the Card Pack, an unlisted card is Free. */
export function widgetPackOf(draft: CmsDraft): WidgetPackDraft {
  return draft.widgetPack ?? DEFAULT_WIDGET_PACK;
}

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Publish blocks for a pack's settings (odds, prices, pity, repeat crystals, buy prices), shared by both card packs. */
export function packSettingsErrors(label: string, cp: PackSettingsDraft): string[] {
  const errors: string[] = [];
  const w = cp.weights;
  const sum = w.five + w.four + w.better + w.common;
  if (!cardOddsTotal100(sum)) errors.push(`${label} row chances sum to ${sum.toFixed(4).replace(/\.?0+$/, "")}% (need exactly 100%)`);
  if ([w.five, w.four, w.better, w.common].some((v) => !(v >= 0))) errors.push(`${label}: row chances cannot be negative`);
  if (!(cp.priceOne > 0) || !(cp.priceTen > 0)) errors.push(`${label} prices must be positive`);
  if (!(Number.isInteger(cp.fourPityAfter) && cp.fourPityAfter >= 0)) errors.push(`${label}: the 4-star guarantee must be a whole number from 0`);
  if (!(Number.isInteger(cp.fivePityAfter) && cp.fivePityAfter >= 0)) errors.push(`${label}: the 5-star guarantee must be a whole number from 0`);
  const sp = cp.softPity;
  if (sp) {
    if (!(Number.isInteger(sp.from) && sp.from >= 1)) errors.push(`${label}: soft pity must start at draw 1 or later`);
    else if (sp.from > cp.fivePityAfter) errors.push(`${label}: soft pity must start before the guaranteed draw ${cp.fivePityAfter + 1}`);
    if (!(sp.curve >= 0.2 && sp.curve <= 5)) errors.push(`${label}: the soft pity curve must be 0.2 to 5`);
  }
  for (const k of ["four", "five"] as const) {
    if (!(Number.isInteger(cp.crystalValues[k]) && cp.crystalValues[k] >= 0)) errors.push(`${label}: a repeat ${k}-star must pay a whole number of crystals`);
  }
  const buy = cp.buy ?? DEFAULT_CARD_BUY;
  for (const [k, tier] of [["fourPrice", "4-star"], ["fivePrice", "5-star"]] as const) {
    const v = buy[k];
    if (v !== null && !(Number.isInteger(v) && v > 0)) errors.push(`${label}: the ${tier} buy price must be a whole number above 0, or draw-only`);
  }
  return errors;
}

/** Publish blocks for the Widget Pack (only when the draft has one). Mirrors cms/server/validate.mjs. */
export function widgetPackErrors(draft: CmsDraft): string[] {
  const wp = draft.widgetPack;
  if (!wp) return [];
  const errors = packSettingsErrors("Widget Pack", wp);
  const seen = new Set<string>();
  for (const w of wp.widgets) {
    if (!w.id) errors.push("Widget Pack: every card needs an id");
    else if (seen.has(w.id)) errors.push(`Widget Pack: ${w.id} is listed twice`);
    seen.add(w.id);
  }
  const drawable = wp.widgets.filter((w) => w.status === "Available");
  if (!wp.enabled && drawable.length) {
    errors.push(`Widget Pack is off but ${drawable.length} ${drawable.length === 1 ? "card is" : "cards are"} Drawable (no one could win ${drawable.length === 1 ? "it" : "them"})`);
  }
  return errors;
}

/** Publish blocks for the Card Pack and the check-in window. */
export function cardAndCheckinErrors(draft: CmsDraft): string[] {
  const cp = cardPackOf(draft);
  const errors = packSettingsErrors("Card Pack", cp);
  if (cp.enabled && !cp.skins.some((s) => s.status === "Available")) errors.push("Card Pack is on but no skin is Available");
  const e = draft.checkinEvent;
  if (e) {
    if (!LOCAL_DATETIME.test(e.start) || !LOCAL_DATETIME.test(e.end)) errors.push("Check-in event: set both a start and an end date and time");
    else if (e.start >= e.end) errors.push("Check-in event: the end must be after the start");
  }
  return errors;
}

/** One run in the Brand Pack's featured queue. */
export interface SpecialRunDraft {
  /** The Monday the run starts. */
  weekOf: string;
  /** How many weeks it runs (1 to 8). Absent: 1. */
  weeks?: number;
  /** The 2 featured Brand themes (0 to 2 while being picked). */
  brandIds: string[];
}

/** The featured queue, reading a draft from before the queue (one `weeklySpecial`) as a one-week run. */
export function specialQueueOf(draft: CmsDraft): SpecialRunDraft[] {
  if (draft.specialQueue) return draft.specialQueue;
  return draft.weeklySpecial ? [{ weekOf: draft.weeklySpecial.weekOf, weeks: 1, brandIds: [...draft.weeklySpecial.brandIds] }] : [];
}

const dayNum = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** The day after a run ends (its start plus its weeks), as YYYY-MM-DD: the Monday the next run can start. */
export function runEndIso(run: Pick<SpecialRunDraft, "weekOf" | "weeks">): string {
  return new Date((dayNum(run.weekOf) + 7 * (run.weeks ?? 1)) * 86_400_000).toISOString().slice(0, 10);
}

export interface RegionWeekDraft {
  /** The Monday the focus starts. */
  weekOf: string;
  kind: "region" | "country";
  value: string;
  /** How many weeks it runs (1 to 8). Absent: 1. */
  weeks?: number;
}

/** The Region Pack table, falling back to a copy of the Brand table until it is edited. */
export function regionPackOf(draft: CmsDraft): PackDraft {
  return draft.packs.region ?? { ...draft.packs.brand, id: "region" };
}

/**
 * Brand Pack rotation list: every Brand theme tagged "brand", in the saved order first, then the rest in theme
 * order. A draft with no tags at all (older drafts) keeps its saved list.
 */
export function brandPoolOf(draft: CmsDraft): string[] {
  const brand = draft.themes.filter((t) => t.group === "Brand");
  if (!brand.some((t) => t.tags)) return draft.brandThemeIds;
  const tagged = brand.filter((t) => t.tags?.packs.includes("brand")).map((t) => t.id);
  const set = new Set(tagged);
  const saved = draft.brandThemeIds.filter((id) => set.has(id));
  return [...saved, ...tagged.filter((id) => !saved.includes(id))];
}

export const WEIGHT_KEYS: (keyof PackWeightsPct)[] = [
  "regularTheme",
  "brandTheme",
  "rainbowRegular",
  "pick",
  "customUpload",
  "better",
  "common",
];

export const WEIGHT_LABELS: Record<keyof PackWeightsPct, string> = {
  regularTheme: "Regular theme (standard)",
  brandTheme: "Featured 5-star",
  rainbowRegular: "Rainbow Regular 5-star",
  pick: "Weekly unlock pick",
  customUpload: "Custom upload",
  better: "Better item",
  common: "Common item",
};

export function packWeightSum(w: PackWeightsPct): number {
  return WEIGHT_KEYS.reduce((s, k) => s + (Number(w[k]) || 0), 0);
}

export function nearly100(sum: number, eps = 0.05): boolean {
  return Math.abs(sum - 100) <= eps;
}

export function validateDraftForPublish(draft: CmsDraft): string[] {
  const errors: string[] = [];
  for (const pack of [draft.packs.regular, draft.packs.brand, regionPackOf(draft)]) {
    const sum = packWeightSum(pack.weights);
    if (!nearly100(sum)) {
      errors.push(
        `${pack.id} pack row chances sum to ${sum.toFixed(2)}% (need 100%)`,
      );
    }
    if (pack.id === "regular" && Number(pack.weights.rainbowRegular) > 0) {
      errors.push("Regular pack: the rainbow Regular 5-star is its Rainbow row; clear the second row");
    }
    if (!(pack.priceOne > 0) || !(pack.priceTen > 0)) {
      errors.push(`${pack.id} pack prices must be positive`);
    }
    const bi = pack.betterInner;
    if (Math.abs(bi.wallpaper + bi.boot + bi.layout - 100) > 0.05) {
      errors.push(`${pack.id} Better-item inner weights must sum to 100%`);
    }
    const ci = pack.commonInner;
    if (Math.abs(ci.streakFreeze + ci.alert + ci.font + ci.flair - 100) > 0.05) {
      errors.push(`${pack.id} Common-item inner weights must sum to 100%`);
    }
  }
  errors.push(...cardAndCheckinErrors(draft));
  errors.push(...checkinPrizeErrors(draft));
  if (!(draft.economy.lookCost > 0)) errors.push("Theme cost must be positive");
  const bigCredits = draft.economy.creditBigAmount;
  if (bigCredits !== undefined && !(Number.isFinite(bigCredits) && bigCredits >= 0)) errors.push("Big Income amount must be 0 or more");
  const pool = brandPoolOf(draft);
  if (pool.length < 2) errors.push(`The Brand Pack needs at least 2 themes tagged Brand (has ${pool.length})`);
  for (const t of draft.themes) {
    if (t.group !== "Brand" || !t.tags) continue;
    if (!/^[A-Z]{2}$/.test(t.tags.country)) errors.push(`${t.name}: country must be a 2-letter code like TW`);
    if (!REGIONS.some((r) => r.key === t.tags!.region)) errors.push(`${t.name}: pick a region`);
  }
  const rw = draft.regionWeek;
  if (rw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rw.weekOf)) errors.push("Region week: the week must be a date");
    if (rw.kind === "region" && !REGIONS.some((r) => r.key === rw.value)) errors.push("Region week: pick a region");
    if (rw.kind === "country" && !/^[A-Z]{2}$/.test(rw.value)) errors.push("Country week: pick a country");
  }
  const queue = specialQueueOf(draft);
  queue.forEach((s, i) => {
    const at = `Featured run ${i + 1} (${s.weekOf})`;
    if (s.brandIds.length !== 2 || s.brandIds[0] === s.brandIds[1]) errors.push(`${at} needs 2 different Brand themes`);
    for (const id of s.brandIds) {
      const t = draft.themes.find((x) => x.id === id);
      if (!t || t.group !== "Brand") errors.push(`${at}: ${id} must be a Brand theme`);
    }
  });
  const sorted = [...queue].sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].weekOf < runEndIso(sorted[i - 1])) errors.push(`Featured runs starting ${sorted[i - 1].weekOf} and ${sorted[i].weekOf} overlap`);
  }
  for (const [k, v] of Object.entries(draft.economy.crystalValues)) {
    if (v !== undefined && !(Number.isInteger(v) && v >= 0)) errors.push(`Repeat rewards: ${k} must be a whole number from 0`);
  }
  if (!(draft.economy.regularCrystalCost >= 1) || !(draft.economy.brandPrismCost >= 1)) errors.push("Repeat rewards: a pick must cost at least 1");
  for (const [key, label, after] of [
    ["regular", "Regular Pack", draft.economy.rainbowPityAfter ?? 89],
    ["company", "Brand and Region packs", draft.economy.brandPityAfter],
  ] as const) {
    const sp = draft.economy.softPity?.[key];
    if (!sp) continue;
    if (!(Number.isInteger(sp.from) && sp.from >= 1)) errors.push(`${label}: soft pity must start at draw 1 or later`);
    else if (sp.from > after) errors.push(`${label}: soft pity must start before the guaranteed draw ${after + 1}`);
    if (!(sp.curve >= 0.2 && sp.curve <= 5)) errors.push(`${label}: the soft pity curve must be 0.2 to 5`);
  }
  return errors;
}

/** The two check-in Draw Tickets (app: `TicketKind` in gachaContent.ts). */
export type TicketKind = "regular" | "special";
export const DEFAULT_PACK_TICKETS: Record<PackId, TicketKind> = { regular: "special", brand: "special", region: "special" };

/** The ticket a pack takes in this draft. */
export function ticketOf(draft: CmsDraft, pack: PackId): TicketKind {
  return draft.packTickets?.[pack] ?? DEFAULT_PACK_TICKETS[pack];
}

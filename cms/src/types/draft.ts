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
  if (!(draft.economy.lookCost > 0)) errors.push("Look cost must be positive");
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
export const DEFAULT_PACK_TICKETS: Record<PackId, TicketKind> = { regular: "regular", brand: "special", region: "special" };

/** The ticket a pack takes in this draft. */
export function ticketOf(draft: CmsDraft, pack: PackId): TicketKind {
  return draft.packTickets?.[pack] ?? DEFAULT_PACK_TICKETS[pack];
}

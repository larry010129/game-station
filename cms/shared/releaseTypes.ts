/**
 * Shared content-release types for CMS + app (dev host at localhost:1430/releases).
 * App agent: copy or import; trust the CMS test public key in dev only.
 */

/** One content-addressed file in a release. */
export interface ReleaseFileEntry {
  /** Logical path inside the release (e.g. "content.json", "assets/wallpaper-01.webp"). */
  path: string;
  /** SHA-256 hex of file bytes. */
  hash: string;
  size: number;
}

/** Unsigned manifest body (this object is what gets signed). */
export interface ContentReleaseManifest {
  number: number;
  publishedAt: string;
  notes: string;
  /** SHA-256 of content.json (also listed in files). */
  contentHash: string;
  files: ReleaseFileEntry[];
  /**
   * When the release goes live (ISO time). Apps keep their current content until then and switch at that moment.
   * Absent (older releases): live as soon as published.
   */
  effectiveAt?: string;
  /** Older apps skip content they cannot use. */
  minAppVersion?: string;
}

/** Manifest plus Ed25519 signature (base64) over canonical JSON of `manifest`. */
export interface SignedManifest {
  manifest: ContentReleaseManifest;
  /** base64 Ed25519 signature of utf8(canonicalJson(manifest)). */
  signature: string;
  /** Algorithm id so the app can reject unknowns. */
  alg: "ed25519";
}

/** Pointer the app polls at start-up. */
export interface CurrentReleaseInfo {
  number: number;
  /** Go-live time of this (the newest) release; it may still be in the future. */
  effectiveAt?: string | null;
  publishedAt: string | null;
  /** Path relative to release host root, e.g. "/releases/1/manifest.json". */
  manifestPath: string | null;
}

/**
 * Publishable content bundle (draft → content.json blob).
 * Built from CmsDraft on publish; `gacha` mirrors app `GachaContent` (fraction weights).
 */
export interface ContentBundle {
  notes: string;
  gacha: GachaContentLike;
  themes?: unknown[];
  banners?: unknown[];
  cmsDraftVersion?: number;
  /** Extra asset paths relative to cms/data/assets (optional). */
  assetPaths?: string[];
}

/** Minimal structural mirror of app/src/state/gachaContent.ts — keep fields in sync. */
export interface GachaContentLike {
  lookCost: number;
  lookPityAfter: number;
  brandPityAfter: number;
  rainbowPityAfter?: number;
  /** A single Credits gain above this shows the cash bundle in the app, not the coins. Absent: 100. */
  creditBigAmount?: number;
  /** 0..1 */
  promotedChance?: number;
  rainbowThemeIds?: readonly string[];
  weeklyPickCap: number;
  regularCrystalCost: number;
  brandPrismCost: number;
  couponCreditValue: number;
  crystalValues: {
    common: number;
    better: number;
    regularTheme: number;
    brandTheme: number;
    customUpload: number;
  };
  brandEpoch: string;
  brandFortnightDays: number;
  packs: {
    regular: PackTableLike;
    brand: PackTableLike;
    /** Region Pack table; absent in older releases (the app then uses the Brand table). */
    region?: PackTableLike;
  };
  items: readonly ItemDefLike[];
  brandThemeIds: readonly string[];
  /** CMS weekly special: the 2 Brand themes drawable for the week starting `weekOf` (a Monday), else null. */
  weeklySpecial?: { weekOf: string; brandIds: readonly string[] } | null;
  /** False hides the Region Pack in the app. Absent (older releases) means the pack is on. */
  regionPackEnabled?: boolean;
  /** Which check-in Draw Ticket each pack takes. Absent entries: Regular for the Regular Pack, Special for the rest. */
  packTickets?: Partial<Record<"regular" | "brand" | "region", "regular" | "special">>;
  /** Theme ids added back into the Regular pool. Absent: none. */
  regularExtraIds?: readonly string[];
  /** Region Pack focus for the week starting `weekOf`: a region key (kind "region") or an ISO country (kind "country"). */
  regionWeek?: { weekOf: string; kind: "region" | "country"; value: string; weeks?: number } | null;
  /** The Brand Pack's featured queue: runs of 2 Brand themes from a start Monday for `weeks` weeks (default 1). */
  specialQueue?: { weekOf: string; weeks?: number; brandIds: readonly string[] }[];
}

export interface PackTableLike {
  id: "regular" | "brand" | "region";
  priceOne: number;
  priceTen: number;
  weights: {
    regularTheme: number;
    brandTheme: number;
    pick: number;
    customUpload: number;
    better: number;
    common: number;
  };
  betterInner: { wallpaper: number; boot: number; layout: number };
  commonInner: { streakFreeze: number; alert: number; font: number; flair: number };
}

export interface ItemDefLike {
  id: string;
  kind: string;
  stackable: boolean;
  tier: string;
}

export interface ValidateResult {
  ok: boolean;
  errors: string[];
}

export interface PublishResult {
  ok: boolean;
  number?: number;
  errors?: string[];
  manifestPath?: string;
}

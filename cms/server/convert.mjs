/**
 * CmsDraft (UI, weights as %) ↔ content bundle (app, weights as 0–1 fractions).
 */

const WEIGHT_KEYS = ["regularTheme", "brandTheme", "rainbowRegular", "pick", "customUpload", "better", "common"];

function pctMap(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = Number(obj?.[k] || 0) / 100;
  return out;
}

function packToGacha(pack) {
  return {
    id: pack.id,
    priceOne: pack.priceOne,
    priceTen: pack.priceTen,
    // Regular Pack: one 5-star row (brandTheme). Company packs: featured (brandTheme) and rainbow Regular.
    weights: pctMap(pack.weights, pack.id === "regular" ? WEIGHT_KEYS.filter((k) => k !== "rainbowRegular") : WEIGHT_KEYS),
    betterInner: pctMap(pack.betterInner, ["wallpaper", "boot", "layout"]),
    commonInner: pctMap(pack.commonInner, ["streakFreeze", "alert", "font", "flair"]),
  };
}

export const REGION_KEYS = [
  "na", "latam", "eu-west", "eu-central", "eu-east", "eu-south",
  "asia-east", "asia-southeast", "asia-south", "asia-west", "africa", "oceania",
];

/**
 * Brand Pack rotation list from theme tags: Brand themes tagged "brand", saved order first, then theme order.
 * A draft with no tags at all keeps its saved list. Mirrors cms/src/types/draft.ts brandPoolOf.
 */
export function brandPoolOf(draft) {
  const themes = Array.isArray(draft.themes) ? draft.themes : [];
  const saved = Array.isArray(draft.brandThemeIds) ? draft.brandThemeIds : [];
  const brand = themes.filter((t) => t?.group === "Brand");
  if (!brand.some((t) => t.tags)) return saved;
  const tagged = brand.filter((t) => Array.isArray(t.tags?.packs) && t.tags.packs.includes("brand")).map((t) => t.id);
  const set = new Set(tagged);
  const kept = saved.filter((id) => set.has(id));
  return [...kept, ...tagged.filter((id) => !kept.includes(id))];
}

/** Region Pack table: the draft's own, or a copy of the Brand table. */
/**
 * The Brand Pack's featured queue: `specialQueue`, or a draft from before the queue, whose single `weeklySpecial`
 * becomes a one-week run. Mirrors cms/src/types/draft.ts specialQueueOf.
 */
export function specialQueueOf(draft) {
  if (Array.isArray(draft.specialQueue)) return draft.specialQueue;
  return draft.weeklySpecial ? [{ weekOf: draft.weeklySpecial.weekOf, weeks: 1, brandIds: draft.weeklySpecial.brandIds }] : [];
}

export function regionPackOf(draft) {
  return draft.packs?.region ?? { ...draft.packs.brand, id: "region" };
}

/**
 * Card Pack → app shape (row chances as fractions). Absent in the draft: omitted, so the app keeps its bundled pack.
 * Mirrors app CardPackContent (gachaContent.ts).
 */
export function cardPackToGacha(cp) {
  if (!cp || typeof cp !== "object") return undefined;
  const w = cp.weights || {};
  return {
    enabled: cp.enabled !== false,
    ticket: cp.ticket === "regular" ? "regular" : "special",
    priceOne: cp.priceOne,
    priceTen: cp.priceTen,
    weights: { five: (Number(w.five) || 0) / 100, four: (Number(w.four) || 0) / 100, better: (Number(w.better) || 0) / 100, common: (Number(w.common) || 0) / 100 },
    fourPityAfter: cp.fourPityAfter,
    fivePityAfter: cp.fivePityAfter,
    ...(cp.softPity ? { softPity: { from: cp.softPity.from, curve: cp.softPity.curve } } : {}),
    crystalValues: { four: cp.crystalValues?.four ?? 0, five: cp.crystalValues?.five ?? 0 },
    skins: (Array.isArray(cp.skins) ? cp.skins : []).map((s) => ({ id: s.id, stars: s.stars, status: s.status })),
    ...(cp.buy
      ? { buy: { fourPrice: cp.buy.fourPrice ?? null, fivePrice: cp.buy.fivePrice ?? null, crystalPick: cp.buy.crystalPick !== false } }
      : {}),
  };
}

/**
 * Widget Pack → app shape: the Card Pack's settings (row chances as fractions) plus `widgets: {id, stars, status}`.
 * A card the release does not list is Free in the app. Absent in the draft: omitted.
 */
export function widgetPackToGacha(wp) {
  if (!wp || typeof wp !== "object") return undefined;
  const { skins: _skins, ...settings } = cardPackToGacha({ ...wp, skins: [] });
  return {
    ...settings,
    widgets: (Array.isArray(wp.widgets) ? wp.widgets : []).map((w) => ({ id: w.id, stars: w.stars, status: w.status })),
  };
}

/** Collect on-disk draft assets (banner art under data/uploads/…). */
function collectAssetPaths(draft) {
  const out = [];
  const seen = new Set();
  const push = (rel) => {
    if (!rel || seen.has(rel)) return;
    seen.add(rel);
    out.push(rel);
  };

  if (Array.isArray(draft.assetPaths)) {
    for (const p of draft.assetPaths) {
      if (typeof p === "string") push(p.replace(/\\/g, "/").replace(/^\//, ""));
    }
  }

  for (const b of draft.banners || []) {
    const art = b?.art || b?.imageUrl || b?.assetPath;
    if (typeof art !== "string" || !art) continue;
    const rel = art.replace(/\\/g, "/").replace(/^\//, "");
    if (rel.startsWith("uploads/")) push(rel);
  }

  return out;
}

/**
 * Turn editor CmsDraft into the signed release payload the app downloads.
 * @param {Record<string, any>} draft
 */
export function draftToContentBundle(draft) {
  const econ = draft.economy || {};
  const assetPaths = collectAssetPaths(draft);
  return {
    notes: typeof draft.releaseNotes === "string" ? draft.releaseNotes : "",
    gacha: {
      lookCost: econ.lookCost,
      lookPityAfter: econ.lookPityAfter,
      brandPityAfter: econ.brandPityAfter,
      rainbowPityAfter: typeof econ.rainbowPityAfter === "number" ? econ.rainbowPityAfter : 89,
      creditBigAmount: typeof econ.creditBigAmount === "number" ? econ.creditBigAmount : 100,
      ...(econ.softPity ? { softPity: econ.softPity } : {}),
      ...(Array.isArray(draft.rainbowThemeIds) ? { rainbowThemeIds: [...new Set(draft.rainbowThemeIds)] } : {}),
      weeklyPickCap: econ.weeklyPickCap,
      regularCrystalCost: econ.regularCrystalCost,
      brandPrismCost: econ.brandPrismCost,
      couponCreditValue: 15,
      crystalValues: { ...econ.crystalValues },
      brandEpoch: econ.brandEpoch,
      brandFortnightDays: econ.brandFortnightDays,
      packs: {
        regular: packToGacha(draft.packs.regular),
        brand: packToGacha(draft.packs.brand),
        region: packToGacha(regionPackOf(draft)),
      },
      items: (draft.items || []).map((i) => ({
        id: i.id,
        kind: i.kind,
        stackable: !!i.stackable,
        tier: i.tier,
      })),
      brandThemeIds: brandPoolOf(draft),
      // The queue replaces the single weekly special; older apps read neither and keep the fortnight rotation.
      weeklySpecial: null,
      specialQueue: specialQueueOf(draft).map((s) => ({
        weekOf: s.weekOf,
        ...(s.weeks > 1 ? { weeks: s.weeks } : {}),
        brandIds: [...(s.brandIds || [])],
      })),
      regionPackEnabled: draft.regionPackEnabled !== false,
      ...(draft.cardPack ? { cardPack: cardPackToGacha(draft.cardPack) } : {}),
      ...(draft.widgetPack ? { widgetPack: widgetPackToGacha(draft.widgetPack) } : {}),
      checkinEvent: draft.checkinEvent && draft.checkinEvent.start && draft.checkinEvent.end ? { start: draft.checkinEvent.start, end: draft.checkinEvent.end } : null,
      // Per-day check-in prizes; absent in the draft: omitted, so the app keeps its default board.
      ...(Array.isArray(draft.checkinPrizes)
        ? {
            checkinPrizes: draft.checkinPrizes.map((p) =>
              p.kind === "item" ? { kind: "item", id: p.id, count: p.count } : { kind: p.kind, count: p.count },
            ),
          }
        : {}),
      ...(draft.packTickets && Object.keys(draft.packTickets).length ? { packTickets: { ...draft.packTickets } } : {}),
      ...(Array.isArray(draft.regularExtraIds) && draft.regularExtraIds.length ? { regularExtraIds: [...new Set(draft.regularExtraIds)] } : {}),
      // Kept off the app's Draw Wiki so new prizes are not spoiled; older apps ignore it.
      ...(Array.isArray(draft.wikiHiddenIds) && draft.wikiHiddenIds.length ? { wikiHiddenIds: [...new Set(draft.wikiHiddenIds)] } : {}),
      regionWeek: draft.regionWeek
        ? {
            weekOf: draft.regionWeek.weekOf,
            kind: draft.regionWeek.kind,
            value: draft.regionWeek.value,
            ...(draft.regionWeek.weeks > 1 ? { weeks: draft.regionWeek.weeks } : {}),
          }
        : null,
    },
    themes: draft.themes || [],
    // Pass banner fields through (including art / imageUrl / assetPath).
    banners: draft.banners || [],
    cmsDraftVersion: draft.version ?? 1,
    ...(assetPaths.length ? { assetPaths } : {}),
  };
}

/** Detect UI CmsDraft (percent weights + economy) vs already-converted bundle. */
export function isCmsDraft(raw) {
  return !!(raw && typeof raw === "object" && raw.economy && raw.packs?.regular?.weights);
}

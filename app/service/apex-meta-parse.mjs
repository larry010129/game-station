/**
 * Pure parsers for Apex Legends Status HTML. No I/O — unit-testable against saved samples.
 */

/** Official legend class (role). Unknown scrape names fall back to Unknown. */
export const LEGEND_CLASS = {
  ash: "Assault",
  "mad-maggie": "Assault",
  bangalore: "Assault",
  fuse: "Assault",
  revenant: "Assault",
  ballistic: "Assault",
  alter: "Skirmisher",
  horizon: "Skirmisher",
  octane: "Skirmisher",
  pathfinder: "Skirmisher",
  valkyrie: "Skirmisher",
  wraith: "Skirmisher",
  bloodhound: "Recon",
  crypto: "Recon",
  seer: "Recon",
  sparrow: "Recon",
  vantage: "Recon",
  conduit: "Support",
  gibraltar: "Support",
  lifeline: "Support",
  loba: "Support",
  mirage: "Support",
  newcastle: "Support",
  axle: "Controller",
  catalyst: "Controller",
  caustic: "Controller",
  rampart: "Controller",
  wattson: "Controller",
};

export const CLASS_COLOR = {
  Assault: "#e74c3c",
  Skirmisher: "#f1c40f",
  Recon: "#3498db",
  Support: "#2ecc71",
  Controller: "#9b59b6",
  Unknown: "#e67e22",
};

export function slugifyLegend(name) {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ALS percentage points (`12.9` or `12.9%`) → rate 0–1. Always ÷100 (0.8% must not become 0.8). */
export function pctToRate(raw) {
  const n = Number(String(raw ?? "").replace(/%/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return n / 100;
}

/**
 * Legend popularity banner on https://apexlegendsstatus.com/game-stats/legends-pick-rates/
 * Yields pick rate, 7-day relative change, and average rank/level when present.
 */
export function parseAlsPickRates(html) {
  const text = String(html ?? "");
  const sampleLabel = /based on\s+([\d.]+\s*[kKmMbB]?)\s*players/i.exec(text)?.[1]?.trim() ?? null;
  const re =
    /([A-Za-z][A-Za-z0-9 '-]{1,24})<br\s*\/?>\s*<span style="font-size: 36px;">([\d.]+)%<\/span>/g;
  const legends = [];
  let m;
  while ((m = re.exec(text))) {
    const name = m[1].trim();
    const chunk = text.slice(m.index, m.index + 700);
    const dirColor = /color:\s*(green|red)/i.exec(chunk)?.[1]?.toLowerCase() ?? null;
    const deltaPct = /[▲▼]<\/span>([\d.]+)%/.exec(chunk)?.[1] ?? null;
    const avgRank = /Avg rank\s*<span[^>]*>([^<]+)/i.exec(chunk)?.[1]?.trim() ?? null;
    const avgLevelRaw = /level\s*<span[^>]*>(\d+)/i.exec(chunk)?.[1] ?? null;
    const slug = slugifyLegend(name);
    if (!slug) continue;
    legends.push({
      name,
      slug,
      role: LEGEND_CLASS[slug] ?? "Unknown",
      pickRate: pctToRate(m[2]),
      pickDelta: pctToRate(deltaPct),
      pickDeltaDir: dirColor === "green" ? "up" : dirColor === "red" ? "down" : null,
      avgRank,
      avgLevel: avgLevelRaw != null ? Number(avgLevelRaw) : null,
    });
  }
  return { legends, sampleLabel, url: "https://apexlegendsstatus.com/game-stats/legends-pick-rates/" };
}

/**
 * BR floor / care-package arsenal keyed by ALS weaponsmeta.json `weapon` ids.
 * imgSlug = Tracker CDN `/weapons/{slug}.png` when it 200s; otherwise a stable slug that
 * `/api/img` serves from ALS DGS SVG icons (Tracker is missing r99/nemesis/kraber/rampage/re45/30-30).
 */
export const WEAPON_CATALOG = {
  "30-30": { name: "30-30 Repeater", role: "Marksman", slug: "30-30", imgSlug: "repeater" },
  Alternator: { name: "Alternator SMG", role: "SMG", slug: "alternator", imgSlug: "alternator" },
  Bocek: { name: "Bocek Compound Bow", role: "Marksman", slug: "bocek", imgSlug: "bow" },
  "C.A.R.": { name: "CAR SMG", role: "SMG", slug: "car", imgSlug: "car" },
  ChargeRifle: { name: "Charge Rifle", role: "Sniper", slug: "charge-rifle", imgSlug: "charge_rifle" },
  Devotion: { name: "Devotion LMG", role: "LMG", slug: "devotion", imgSlug: "devotion" },
  "EVA-8": { name: "EVA-8 Auto", role: "Shotgun", slug: "eva-8", imgSlug: "eva8" },
  Flatline: { name: "Flatline", role: "AR", slug: "flatline", imgSlug: "flatline" },
  G7Scout: { name: "G7 Scout", role: "Marksman", slug: "g7-scout", imgSlug: "g7" },
  HAVOC: { name: "Havoc Rifle", role: "AR", slug: "havoc", imgSlug: "energy_ar" },
  Hemlok: { name: "Hemlok Burst AR", role: "AR", slug: "hemlok", imgSlug: "hemlock" },
  Kraber: { name: "Kraber .50-Cal", role: "Sniper", slug: "kraber", imgSlug: "kraber" },
  "L-STAR": { name: "L-STAR EMG", role: "LMG", slug: "l-star", imgSlug: "lstar" },
  Longbow: { name: "Longbow DMR", role: "Sniper", slug: "longbow", imgSlug: "longbow" },
  Mastiff: { name: "Mastiff", role: "Shotgun", slug: "mastiff", imgSlug: "mastiff" },
  Mozambique: { name: "Mozambique", role: "Shotgun", slug: "mozambique", imgSlug: "mozambique" },
  Nemesis: { name: "Nemesis Burst AR", role: "AR", slug: "nemesis", imgSlug: "nemesis" },
  P2020: { name: "P2020", role: "Pistol", slug: "p2020", imgSlug: "p2020" },
  Peacekeeper: { name: "Peacekeeper", role: "Shotgun", slug: "peacekeeper", imgSlug: "peacekeeper" },
  Prowler: { name: "Prowler", role: "SMG", slug: "prowler", imgSlug: "prowler" },
  "R-301": { name: "R-301 Carbine", role: "AR", slug: "r-301", imgSlug: "r301" },
  "R-99": { name: "R-99 SMG", role: "SMG", slug: "r-99", imgSlug: "r99" },
  Rampage: { name: "Rampage LMG", role: "LMG", slug: "rampage", imgSlug: "rampage" },
  "RE-45": { name: "RE-45 Auto", role: "Pistol", slug: "re-45", imgSlug: "re45" },
  Sentinel: { name: "Sentinel", role: "Sniper", slug: "sentinel", imgSlug: "sentinel" },
  Spitfire: { name: "M600 Spitfire", role: "LMG", slug: "spitfire", imgSlug: "spitfire" },
  TripleTake: { name: "Triple Take", role: "Marksman", slug: "triple-take", imgSlug: "triple_take" },
  Volt: { name: "Volt SMG", role: "SMG", slug: "volt", imgSlug: "volt" },
  Wingman: { name: "Wingman", role: "Pistol", slug: "wingman", imgSlug: "wingman" },
};

/** Tracker CDN is missing these; `/api/img` serves ALS DGS SVGs instead. */
export const WEAPON_ALS_ICONS = {
  r99: "R-99_SMG_Icon.svg",
  nemesis: "Nemesis_Burst_AR_Icon.svg",
  kraber: "Kraber_.50-Cal_Sniper_Icon.svg",
  rampage: "Rampage_LMG_Icon.svg",
  re45: "RE-45_Auto_Icon.svg",
  repeater: "30-30_Repeater_Icon.svg",
};

/**
 * Parse ALS `/algs/weaponsmeta.json` into gun rows.
 * Always emits the full WEAPON_CATALOG roster; ALS usage/encounter WR overlay when present.
 * pickRate = usage share within the patch; winRate = encounter win rate (ALGS, not pub BR).
 */
export function parseAlsWeaponsMeta(json) {
  const root = json?.data ?? json;
  const builds = Array.isArray(root?.builds) ? root.builds : [];
  if (!builds.length) return { guns: [], patchLabel: null, gameCount: 0, season: null };

  const build = builds[0];
  const raw = Array.isArray(build?.weapons) ? build.weapons : [];
  const byKey = new Map();
  for (const w of raw) {
    if (!w?.weapon || w.weapon === "Melee" || !WEAPON_CATALOG[w.weapon]) continue;
    byKey.set(w.weapon, w);
  }
  const sumUsage = [...byKey.values()].reduce((n, w) => n + (Number(w.usage_count) || 0), 0);

  const guns = Object.entries(WEAPON_CATALOG).map(([alsKey, cat], i) => {
    const w = byKey.get(alsKey);
    const usage = w ? Number(w.usage_count) || 0 : 0;
    const ewr = w != null ? Number(w.encounter_win_rate) : NaN;
    return {
      id: 101 + i,
      name: cat.name,
      role: cat.role,
      slug: cat.slug,
      imgSlug: cat.imgSlug,
      alsKey,
      pickRate: w && sumUsage > 0 ? usage / sumUsage : w ? 0 : null,
      winRate: Number.isFinite(ewr) ? ewr / 100 : null,
      matches: usage,
      usageCount: usage,
      kills: w ? Number(w.total_kills) || 0 : 0,
      damage: w ? Number(w.total_damage) || 0 : 0,
      downShare: w && Number.isFinite(Number(w.down_share)) ? Number(w.down_share) / 100 : null,
    };
  });

  // Rank by usage so tier S–C follows meta presence; catalog-only (null pick) sink to the end.
  guns.sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1));
  guns.forEach((g, i) => {
    g.id = 101 + i;
  });

  const parsed = build?.parsed ?? null;
  const patchLabel = parsed
    ? `ALGS S${parsed.season} · ${parsed.build}`
    : build?.build_id
      ? String(build.build_id)
      : "ALGS weapons";
  const season = parsed?.season != null ? Number(parsed.season) : null;
  return {
    guns,
    patchLabel,
    gameCount: Number(build?.game_count) || 0,
    season,
    buildDate: parsed?.build_date ? String(parsed.build_date).replace(/_/g, "-") : null,
  };
}

/** Full BR roster with no invented rates — used until/unless weaponsmeta scrape succeeds. */
export function catalogGunsFallback() {
  return Object.entries(WEAPON_CATALOG).map(([alsKey, cat], i) => ({
    id: 101 + i,
    name: cat.name,
    role: cat.role,
    slug: cat.slug,
    imgSlug: cat.imgSlug,
    alsKey,
    pickRate: null,
    winRate: null,
    matches: 0,
    usageCount: 0,
    kills: 0,
    damage: 0,
    downShare: null,
  }));
}


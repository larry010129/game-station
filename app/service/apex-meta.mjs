/**
 * Apex Legends meta pack shaped like Counterwatch's MetaData so the same cards can swap.
 * Legend pick rates are scraped live from Apex Legends Status. Weapon tiers come from ALS
 * ALGS weaponsmeta.json (usage share + encounter WR) — competitive ALGS, not pub BR ranked.
 * Portraits: Tracker CDN via /api/img, with ALS DGS SVG fallback for guns Tracker doesn't host.
 * Combat K/D, counters, and per-map WR are not published on ALS's public pick-rate page.
 * Playstyle axes use temporary class heuristics (POKE / DIVE / SUSTAIN) — not ALS stats.
 */

import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";
import {
  CLASS_COLOR,
  LEGEND_CLASS,
  catalogGunsFallback,
  parseAlsPickRates,
  parseAlsWeaponsMeta,
  slugifyLegend,
} from "./apex-meta-parse.mjs";

const SITE = "https://apexlegendsstatus.com";
const LEGENDS_URL = `${SITE}/game-stats/legends-pick-rates/`;
const WEAPONS_URL = `${SITE}/algs/weapons-meta`;
const WEAPONS_JSON = `${SITE}/algs/weaponsmeta.json`;
const TRACKER = "https://tracker.gg/apex";
const CACHE_FILE = path.join(DATA_DIR, "apex-meta-cache.json");
const UA = "CommandStation/0.2 (personal dashboard; Windows)";

/** Relative service paths — Portrait fetches them and paints blob: URLs (survives Tauri img-src). */
const LEGEND_IMG = (slug) => `/api/img?kind=legend&slug=${encodeURIComponent(slug)}`;
const GUN_IMG = (slug) => `/api/img?kind=weapon&slug=${encodeURIComponent(slug)}`;

const now = () => Date.now();

function withGunImg(row) {
  return { ...row, img: GUN_IMG(row.imgSlug || row.slug) };
}

/** Real map names only — no invented per-map win rates or legend shortlists. */
const MAP_NAMES = [
  { name: "World's Edge", slug: "worlds-edge", mode: "BR" },
  { name: "Olympus", slug: "olympus", mode: "BR" },
  { name: "Storm Point", slug: "storm-point", mode: "BR" },
  { name: "Broken Moon", slug: "broken-moon", mode: "BR" },
  { name: "E-District", slug: "e-district", mode: "BR" },
];

function emptyCombat() {
  return { kills: null, deaths: null, assists: null, damage: null };
}

/**
 * Temporary kit playstyle stubs by legend class (not ALS data).
 * Axes: POKE / DIVE / SUSTAIN — squad seats (IGL/Fragger/Anchor) stay off the radar.
 */
const CLASS_ARCHETYPE = {
  Assault: { POKE: 0.55, SUSTAIN: 0.35, DIVE: 0.75 },
  Skirmisher: { POKE: 0.4, SUSTAIN: 0.3, DIVE: 0.85 },
  Recon: { POKE: 0.8, SUSTAIN: 0.35, DIVE: 0.4 },
  Support: { POKE: 0.35, SUSTAIN: 0.85, DIVE: 0.3 },
  Controller: { POKE: 0.6, SUSTAIN: 0.8, DIVE: 0.25 },
  Unknown: { POKE: 0.45, SUSTAIN: 0.45, DIVE: 0.45 },
};

function archetypeForClass(role) {
  const scores = CLASS_ARCHETYPE[role] ?? CLASS_ARCHETYPE.Unknown;
  const lean = /** @type {"POKE"|"SUSTAIN"|"DIVE"} */ (
    Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "POKE"
  );
  return {
    archetype: { ...scores },
    lean,
    leanBlurb: `${role} kits often lean ${lean.toLowerCase()} (class heuristic — ALS does not publish poke/dive/sustain comps).`,
  };
}

function tiersFrom(list, by = "pickRate") {
  const sorted = [...list].sort((a, b) => (b[by] ?? 0) - (a[by] ?? 0));
  if (!sorted.length) return [];
  const s = Math.max(1, Math.ceil(sorted.length * 0.25));
  const a = Math.max(1, Math.ceil(sorted.length * 0.25));
  const b = Math.max(1, Math.ceil(sorted.length * 0.25));
  return [
    { tier: "S", heroes: sorted.slice(0, s) },
    { tier: "A", heroes: sorted.slice(s, s + a) },
    { tier: "B", heroes: sorted.slice(s + a, s + a + b) },
    { tier: "C", heroes: sorted.slice(s + a + b) },
  ].filter((t) => t.heroes.length);
}

function picksFromGuns(guns) {
  const by = new Map();
  for (const g of guns) {
    const list = by.get(g.role) ?? [];
    list.push(g);
    by.set(g.role, list);
  }
  return [...by.entries()].map(([role, list]) => {
    const sorted = [...list].sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0));
    return { role, top: sorted[0] ?? null, others: sorted.slice(1, 4) };
  });
}

function toHero(row, id, tierLetter) {
  return {
    id,
    name: row.name,
    role: row.role,
    slug: row.slug,
    winRate: null,
    pickRate: row.pickRate,
    matches: 0,
    img: LEGEND_IMG(row.slug),
    tier: tierLetter ?? null,
  };
}

function buildLegends(rows) {
  const ranked = [...rows].sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0));
  const withIds = ranked.map((row, i) => ({ ...row, id: i + 1, popularityRank: i + 1 }));
  const heroes = withIds.map((row) => toHero(row, row.id));
  const tierRows = tiersFrom(heroes, "pickRate");
  const tierOf = new Map(tierRows.flatMap((t) => t.heroes.map((h) => [h.slug, t.tier])));
  return {
    rows: withIds.map((r) => ({ ...r, tier: tierOf.get(r.slug) ?? null })),
    heroes: heroes.map((h) => ({ ...h, tier: tierOf.get(h.slug) ?? null })),
    tiers: tierRows.map((t) => ({
      ...t,
      heroes: t.heroes.map((h) => ({ ...h, tier: t.tier })),
    })),
  };
}

function emptyMaps() {
  return MAP_NAMES.map((m) => ({
    ...m,
    share: null,
    matches: 0,
    mostPlayed: [],
    best: [],
  }));
}

function legendDetail(row, allRows, mode, meta) {
  const peers = allRows
    .filter((h) => h.role === row.role && h.slug !== row.slug)
    .sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0))
    .map((h) => toHero(h, h.id, h.tier));
  const classAvg =
    peers.length || row.pickRate != null
      ? (() => {
          const same = allRows.filter((h) => h.role === row.role);
          const sum = same.reduce((n, h) => n + (h.pickRate ?? 0), 0);
          return same.length ? sum / same.length : null;
        })()
      : null;
  const sample = meta?.sampleLabel ? `ALS · ${meta.sampleLabel} players` : "ALS pick rates";
  const play = archetypeForClass(row.role);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    role: row.role,
    roleColor: CLASS_COLOR[row.role] ?? CLASS_COLOR.Unknown,
    img: LEGEND_IMG(row.slug),
    mode,
    tier: row.tier ?? null,
    winRate: null,
    matches: 0,
    pickRate: row.pickRate,
    pickDelta: row.pickDelta,
    pickDeltaDir: row.pickDeltaDir,
    avgRank: row.avgRank,
    avgLevel: row.avgLevel,
    popularityRank: row.popularityRank,
    classPickAvg: classAvg,
    classPeers: peers,
    confidence: { label: sample, dots: meta?.live ? 4 : 2 },
    stats: emptyCombat(),
    roleAvg: { ...emptyCombat(), heroCount: allRows.filter((h) => h.role === row.role).length },
    roleMax: emptyCombat(),
    archetype: play.archetype,
    lean: play.lean,
    leanBlurb: play.leanBlurb,
    mention: {
      label: "Apex Legends Status",
      why: "Community pick-rate tables",
      detail: LEGENDS_URL,
    },
    counters: {
      losesTo: [],
      beats: [],
      byRole: {
        Assault: { losesTo: [], beats: [] },
        Skirmisher: { losesTo: [], beats: [] },
        Recon: { losesTo: [], beats: [] },
        Support: { losesTo: [], beats: [] },
        Controller: { losesTo: [], beats: [] },
      },
    },
    topMaps: [],
    bestMaps: [],
    worstMaps: [],
    modes: [
      { mode: "Battle Royale", winRate: null, matches: 0 },
      { mode: "Mixtape", winRate: null, matches: 0 },
    ],
    fetchedAt: meta?.fetchedAt ?? now(),
    url: `${LEGENDS_URL}${encodeURIComponent(row.name)}`,
    sources: [
      { label: "ALS pick rates", href: LEGENDS_URL },
      { label: "Tracker.gg Apex", href: TRACKER },
    ],
    error: null,
  };
}

function unknownDetail(slug, mode, meta) {
  const s = slugifyLegend(slug) || "pathfinder";
  const name = s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return legendDetail(
    {
      id: 0,
      name,
      slug: s,
      role: LEGEND_CLASS[s] ?? "Unknown",
      pickRate: null,
      pickDelta: null,
      pickDeltaDir: null,
      avgRank: null,
      avgLevel: null,
      popularityRank: null,
      tier: null,
    },
    [],
    mode,
    meta,
  );
}

/**
 * Same surface as createCounterwatch for the routes that cards already call.
 */
export function createApexMeta(log, deps = {}) {
  const doFetch = deps.fetch ?? ((...a) => fetch(...a));
  const cacheFile = deps.file ?? CACHE_FILE;
  let cache = readJson(cacheFile, null);
  let busy = null;
  let error = null;

  log?.("apex-meta: ALS legend pick rates + ALGS weaponsmeta + Tracker/ALS portraits");

  function gunsList() {
    const rows = cache?.guns?.length ? cache.guns : catalogGunsFallback();
    return rows.map(withGunImg);
  }

  function state() {
    const rows = cache?.rows ?? [];
    const built = rows.length ? buildLegends(rows) : { rows: [], heroes: [], tiers: [] };
    return {
      fetchedAt: cache?.fetchedAt ?? null,
      live: Boolean(cache?.live),
      sampleLabel: cache?.sampleLabel ?? null,
      weaponsLive: Boolean(cache?.weaponsLive),
      weaponsPatch: cache?.weaponsPatch ?? null,
      weaponsGames: cache?.weaponsGames ?? 0,
      error: error ?? cache?.error ?? null,
      rows: built.rows,
      heroes: built.heroes,
      tiers: built.tiers,
    };
  }

  function snapshot(mode) {
    const m = mode === "mixtape" ? "mixtape" : "br";
    const st = state();
    const meta = {
      fetchedAt: st.fetchedAt,
      live: st.live,
      sampleLabel: st.sampleLabel,
    };
    const guns = gunsList();
    const weaponsNote = st.weaponsLive
      ? `Guns: ALGS usage share + encounter WR from ALS weaponsmeta (${st.weaponsPatch ?? "latest"}${st.weaponsGames ? `, ${st.weaponsGames} games` : ""}) — competitive ALGS, not pub BR.`
      : "Guns: full BR roster catalog; waiting for ALS weaponsmeta scrape (rates omitted — not invented).";
    return {
      fetchedAt: st.fetchedAt,
      source: "Apex Legends Status",
      url: LEGENDS_URL,
      weaponsUrl: WEAPONS_URL,
      error: st.error,
      updating: Boolean(busy),
      mode: m,
      patch: { name: st.weaponsPatch ?? "Latest balance", since: cache?.weaponsBuildDate ?? null },
      season: null,
      timeline: [],
      tiers: st.tiers,
      gunTiers: tiersFrom(guns, "pickRate"),
      maps: emptyMaps(),
      picks: picksFromGuns(guns),
      guns,
      heroes: Object.fromEntries(st.rows.map((r) => [r.slug, legendDetail(r, st.rows, m, meta)])),
      note: st.live
        ? `Legend pick rates from ALS. ${weaponsNote} Counters/combat/maps are not fabricated.`
        : `Waiting for first ALS pick-rate scrape (or last scrape failed). ${weaponsNote}`,
    };
  }

  async function pullLegends() {
    const res = await doFetch(LEGENDS_URL, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`ALS pick rates → ${res.status}`);
    const html = await res.text();
    const parsed = parseAlsPickRates(html);
    if (!parsed.legends.length) throw new Error("ALS pick rates: no legends found in HTML");
    return parsed;
  }

  async function pullWeapons() {
    const res = await doFetch(WEAPONS_JSON, {
      headers: { "User-Agent": UA, Accept: "application/json,*/*" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`ALS weaponsmeta → ${res.status}`);
    const json = await res.json();
    const parsed = parseAlsWeaponsMeta(json);
    if (!parsed.guns.length) throw new Error("ALS weaponsmeta: no catalogued weapons");
    return parsed;
  }

  async function pull() {
    const legendP = pullLegends();
    const weaponP = pullWeapons().catch((e) => {
      log?.(`apex-meta: weapons scrape failed: ${e.message}`);
      return null;
    });
    const [legends, weapons] = await Promise.all([legendP, weaponP]);

    cache = {
      fetchedAt: now(),
      live: true,
      sampleLabel: legends.sampleLabel,
      error: null,
      rows: legends.legends,
      url: LEGENDS_URL,
      guns: weapons?.guns ?? cache?.guns ?? null,
      weaponsLive: Boolean(weapons?.guns?.length),
      weaponsPatch: weapons?.patchLabel ?? cache?.weaponsPatch ?? null,
      weaponsGames: weapons?.gameCount ?? cache?.weaponsGames ?? 0,
      weaponsBuildDate: weapons?.buildDate ?? cache?.weaponsBuildDate ?? null,
    };
    error = null;
    writeJson(cacheFile, cache);
    log?.(
      `apex-meta: ${legends.legends.length} legends` +
        (weapons ? `, ${weapons.guns.length} guns (${weapons.patchLabel})` : ", guns unchanged/fallback"),
    );
    return snapshot("br");
  }

  async function refresh() {
    if (busy) return busy;
    busy = pull()
      .catch((e) => {
        error = e.message;
        if (cache) cache = { ...cache, error: e.message };
        log?.(`apex-meta: scrape failed: ${e.message}`);
        return snapshot("br");
      })
      .finally(() => {
        busy = null;
      });
    return busy;
  }

  // Kick a first scrape so cards are not stuck on empty forever.
  void refresh();

  return {
    snapshot,
    start() {},
    stop() {},
    refresh,
    async heroDetail(slug, { mode } = {}) {
      const m = mode === "mixtape" ? "mixtape" : "br";
      const st = state();
      if (!st.rows.length && !busy) void refresh();
      const row = st.rows.find((h) => h.slug === slug) ?? st.rows[0];
      if (!row) return unknownDetail(slug || "pathfinder", m, { fetchedAt: st.fetchedAt, live: false, sampleLabel: null });
      return legendDetail(row, st.rows, m, {
        fetchedAt: st.fetchedAt,
        live: st.live,
        sampleLabel: st.sampleLabel,
      });
    },
    async mapHeroes() {
      return { heroes: [] };
    },
    async rank(rankName, { mode } = {}) {
      const data = snapshot(mode);
      // ALS public pick-rate page is not split by ranked division.
      return {
        rank: rankName || "All",
        label: rankName && rankName !== "All" ? rankName : "All ranks",
        mode: data.mode,
        empty: !data.tiers.length,
        fetchedAt: data.fetchedAt,
        error: data.error,
        tiers: data.tiers,
        maps: data.maps.map((m) => ({ ...m, heroes: [] })),
      };
    },
  };
}

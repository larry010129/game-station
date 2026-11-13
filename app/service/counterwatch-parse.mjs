// Pure helpers for counterwatch.mjs: turning the site's embedded page data and CDN rows into the shapes the
// dashboard reads. No network, no disk, no timers: everything here is a function of its input.
// counterwatch.mjs re-exports all of it, so `import { parseTierList } from "./counterwatch.mjs"` keeps working.

const rnd = (n, d = 4) => (typeof n === "number" ? Math.round(n * 10 ** d) / 10 ** d : null);

/** Joins the page's streamed `self.__next_f.push([1,"..."])` chunks back into one text. */
export function rscText(html) {
  let out = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      out += JSON.parse(`"${m[1]}"`);
    } catch {
      // a chunk we cannot decode is skipped
    }
  }
  return out;
}

/** Pulls the JSON value that follows `"key":` out of the text, matching brackets and skipping strings. */
export function extractJson(text, key, from = 0) {
  const at = text.indexOf(`"${key}":`, from);
  if (at < 0) return undefined;
  let i = at + key.length + 3;
  const open = text[i];
  if (open !== "[" && open !== "{") return undefined;
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (c === "\\") j++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      try {
        return JSON.parse(text.slice(i, j + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const hero = (h) => ({
  id: h.heroId ?? h.hero_id,
  name: h.displayName,
  role: h.roleName ?? h.role_name,
  winRate: rnd(h.shrunkWinRate ?? h.shrunk_win_rate),
  rawWinRate: rnd(h.winRate ?? h.win_rate),
  pickRate: rnd(h.pickrate ?? h.map_share),
  matches: Math.round(h.totalMatches ?? h.total_matches ?? 0),
  img: h.imageUrl ?? h.image ?? null,
});

export function parseTierList(text) {
  const tiers = extractJson(text, "canonicalTiers");
  if (!Array.isArray(tiers) || !tiers.length) throw new Error("tier list not found on the page");
  const windows = extractJson(text, "windows") ?? [];
  const current = windows.find((w) => w.kind === "patch") ?? windows[0] ?? null;
  const season = windows.find((w) => w.kind === "season") ?? null;
  return {
    tiers: tiers.map((t) => ({
      tier: t.tier,
      heroes: (t.heroes ?? []).map((h) => ({ ...hero(h), slug: (h.heroHref ?? "").split("/").pop() || null, kd: rnd(h.deaths ? h.kills / h.deaths : null, 2) })),
    })),
    patch: current && { name: current.name, since: current.startsOn },
    season: season && { name: season.name, number: season.seasonNumber, since: season.startsOn, until: season.endsOn || null },
  };
}

export function parseMaps(text) {
  const rows = extractJson(text, "rows");
  if (!Array.isArray(rows) || !rows.length) throw new Error("map stats not found on the page");
  return rows.map((r) => ({
    name: r.cleanedMapName ?? r.mapName,
    slug: r.mapSlug,
    mode: r.gameModeName,
    share: rnd((parseFloat(r.sharePct) || 0) / 100),
    matches: Math.round(r.totalMatches ?? 0),
    mostPlayed: (r.topHeroes?.mostPlayed ?? []).map(hero),
    best: (r.topHeroes?.bestPerforming ?? []).map(hero),
  }));
}

/** Every hero on one map page, so a role tab is not limited to the three headline picks. */
export function parseMapHeroes(text) {
  const heroes = extractJson(text, "heroes");
  if (!Array.isArray(heroes) || !heroes.length) throw new Error("map heroes not found");
  const picks = heroes.reduce((n, h) => n + (Number(h.pickMatches) || 0), 0);
  return heroes.map((h) => ({
    id: h.heroId,
    name: titleCase(String(h.heroRawName ?? "").replace(/_/g, " ")),
    role: h.roleName,
    winRate: rnd(h.shrunkWinRate ?? h.winRate),
    pickRate: picks ? rnd((Number(h.pickMatches) || 0) / picks) : null,
    matches: Math.round(h.totalMatches ?? 0),
    img: null,
  }));
}

export function parsePicks(text) {
  const picks = extractJson(text, "canonicalPicks");
  if (!Array.isArray(picks) || !picks.length) throw new Error("best picks not found on the page");
  return picks.map((p) => ({
    role: p.role,
    top: p.top?.hero ? { ...hero(p.top.hero), why: p.top.why ?? [] } : null,
    others: (p.mentions ?? []).map((m) => hero(m.hero ?? m)).slice(0, 3),
  }));
}

const titleCase = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/(^|[\s_-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/_/g, " ");

// Names the rank control on counterwatch.gg actually offers for Overwatch.
export const META_RANKS = [
  { value: "All", label: "All ranks", divisions: [] },
  { value: "Bronze", label: "Bronze", divisions: ["Bronze"] },
  { value: "Silver", label: "Silver", divisions: ["Silver"] },
  { value: "Gold", label: "Gold", divisions: ["Gold"] },
  { value: "Platinum", label: "Platinum", divisions: ["Platinum"] },
  { value: "Emerald", label: "Emerald", divisions: ["Emerald"] },
  { value: "Diamond", label: "Diamond", divisions: ["Diamond"] },
  { value: "Master", label: "Master", divisions: ["Master"] },
  { value: "Grandmaster+", label: "Grandmaster+", divisions: ["Grandmaster", "Champion"] },
];

export function rankChoice(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return META_RANKS.find((r) => r.value.toLowerCase() === v) ?? null;
}

/** Queue modes Counterwatch publishes for Overwatch community stats. */
export const META_MODES = [
  { value: "5v5", label: "5v5", category: "5V5", path: "" },
  { value: "6v6", label: "6v6", category: "6V6", path: "/6v6" },
];

export function modeChoice(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (!v) return META_MODES[0];
  return META_MODES.find((m) => m.value === v || m.category.toLowerCase() === v) ?? null;
}

/** Strip the "6V6: " / "5V5: " prefix the CDN puts on game_mode_name in non-5V5 slices. */
export function cleanGameMode(mode) {
  return String(mode ?? "").replace(/^(?:5V5|6V6|Stadium):\s*/i, "").trim();
}

// Same cuts the site uses on shrunk win rate: S at 53%, then 51.5, 50, 48.5, 47.
export function tierLetter(shrunk) {
  if (shrunk >= 0.53) return "S";
  if (shrunk >= 0.515) return "A";
  if (shrunk >= 0.5) return "B";
  if (shrunk >= 0.485) return "C";
  if (shrunk >= 0.47) return "D";
  return "F";
}

const shrinkWin = (win, matches) => (win * matches + 200) / (matches + 400);
const EXCLUDED_MAPS = new Set(["Practice Range", "Practice Range (Stadium)", "Tutorial", "Times Square", "Workshop Chamber", "Workshop Expanse", "Workshop Expanse (Night)", "Workshop Green Screen", "Workshop Island", "Workshop Island (Night)"]);
const BAD_MODE = /Deathmatch|Story|Bounty|Resource rumble|Classic/;
const STADIUM_MAP = /\s*\((?:Stadium|Arena)\)\s*$/;
const HERO_SLUGS = { WRECKINGBALL: "wrecking-ball", JUNKERQUEEN: "junker-queen" };

function heroSlug(raw) {
  const key = String(raw ?? "").toUpperCase().trim();
  if (HERO_SLUGS[key]) return HERO_SLUGS[key];
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function mapSlug(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Rank/CDN rows the site keeps for a mode. Drops workshops, stadium, and unnamed heroes. */
export function displayableRankRow(row) {
  const name = row?.map_name;
  const mode = row?.game_mode_name ?? "";
  if (!name || name === "Unknown map" || EXCLUDED_MAPS.has(name) || BAD_MODE.test(cleanGameMode(mode))) return false;
  if (!row.hero_raw_name || row.hero_raw_name === "UNKNOWN" || row.role_name === "UNKNOWN") return false;
  return !(mode.startsWith("Stadium:") || STADIUM_MAP.test(name));
}

function foldHero(into, row) {
  const id = row.hero_id;
  let h = into.get(id);
  if (!h) {
    h = {
      heroId: id,
      heroRawName: row.hero_raw_name,
      roleName: row.role_name,
      totalMatches: 0,
      pickMatches: 0,
      weighted: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      damage: 0,
      healing: 0,
      mitigation: 0,
    };
    into.set(id, h);
  }
  const n = Number(row.total_matches) || 0;
  h.totalMatches += n;
  h.pickMatches += row.pick_matches == null ? n : Number(row.pick_matches) || 0;
  h.weighted += (Number(row.win_rate) || 0) * n;
  h.kills += (Number(row.avg_kills_per_10) || 0) * n;
  h.deaths += (Number(row.avg_deaths_per_10) || 0) * n;
  h.assists += (Number(row.avg_assists_per_10) || 0) * n;
  h.damage += (Number(row.avg_damage_per_10) || 0) * n;
  h.healing += (Number(row.avg_healing_per_10) || 0) * n;
  h.mitigation += (Number(row.avg_mitigation_per_10) || 0) * n;
}

function combatFromFold(h) {
  const n = h.totalMatches || 0;
  if (!n) return { kills: null, deaths: null, assists: null, damage: null, healing: null, mitigation: null };
  return {
    kills: rnd(h.kills / n, 1),
    deaths: rnd(h.deaths / n, 1),
    assists: rnd(h.assists / n, 1),
    damage: rnd(h.damage / n, 0),
    healing: rnd(h.healing / n, 0),
    mitigation: rnd(h.mitigation / n, 0),
  };
}

function asHero(h, pickRate, known) {
  const win = h.totalMatches ? h.weighted / h.totalMatches : 0;
  const shrunk = shrinkWin(win, h.totalMatches);
  const named = known.get(h.heroId);
  return {
    id: h.heroId,
    name: named?.name ?? titleCase(String(h.heroRawName ?? "").replace(/_/g, " ")),
    role: h.roleName,
    winRate: rnd(shrunk),
    rawWinRate: rnd(win),
    pickRate: rnd(pickRate),
    matches: Math.round(h.totalMatches),
    img: named?.img ?? null,
    slug: named?.slug ?? heroSlug(h.heroRawName),
    letter: tierLetter(shrunk),
    sort: shrunk,
  };
}

/**
 * Turns one rank's map rows into a tier list and per-map heroes.
 * An empty list stays empty so the card does not reuse the all-ranks numbers.
 */
export function buildRankView(rows, known = new Map()) {
  const usable = (rows ?? []).filter(displayableRankRow);
  if (!usable.length) return { empty: true, tiers: [], maps: [] };
  const byHero = new Map();
  for (const row of usable) foldHero(byHero, row);
  const qualified = [...byHero.values()].filter((h) => h.totalMatches >= 10);
  const slots = qualified.reduce((n, h) => n + h.totalMatches, 0) / 10;
  const overall = qualified
    .map((h) => asHero(h, slots > 0 ? h.pickMatches / (2 * slots) : null, known))
    .sort((a, b) => b.sort - a.sort);
  const tiers = ["S", "A", "B", "C", "D", "F"]
    .map((tier) => ({
      tier,
      heroes: overall.filter((h) => h.letter === tier).map(({ letter, sort, ...rest }) => rest),
    }))
    .filter((t) => t.heroes.length);

  const byMap = new Map();
  for (const row of usable) {
    const name = String(row.map_name).replace(/\s*\([^)]*\)\s*$/, "").trim();
    let map = byMap.get(name);
    if (!map) {
      map = { name, mode: cleanGameMode(row.game_mode_name), matches: 0, heroes: new Map() };
      byMap.set(name, map);
    }
    map.matches += Number(row.total_matches) || 0;
    foldHero(map.heroes, row);
  }
  const allMatches = [...byMap.values()].reduce((n, m) => n + m.matches, 0);
  const maps = [...byMap.values()].map((map) => {
    const list = [...map.heroes.values()].filter((h) => h.totalMatches > 0);
    const picks = list.reduce((n, h) => n + h.pickMatches, 0);
    const heroes = list
      .map((h) => asHero(h, picks ? h.pickMatches / picks : null, known))
      .map(({ letter, sort, ...rest }) => rest)
      .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
    return {
      name: map.name,
      slug: mapSlug(map.name),
      mode: map.mode,
      share: rnd(allMatches ? map.matches / allMatches : null),
      matches: Math.round(map.matches),
      best: heroes.slice(0, 5),
      mostPlayed: [...heroes].sort((a, b) => (b.pickRate ?? 0) - (a.pickRate ?? 0)).slice(0, 5),
      heroes,
    };
  });
  return { empty: false, tiers, maps };
}

/**
 * Builds a hero profile from a mode's CDN All-ranks rows (used for 6V6 — hero HTML SSR is 5V5-only).
 * Combat and maps come from the slice; counters / archetype lean are not in that file, so they stay empty.
 */
export function buildHeroFromRankRows(rows, slug, known = new Map()) {
  const key = String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  if (!key) throw new Error("Missing hero slug");
  const usable = (rows ?? []).filter(displayableRankRow);
  const byHero = new Map();
  for (const row of usable) foldHero(byHero, row);
  const match = [...byHero.values()].find((h) => {
    const named = known.get(h.heroId);
    const s = named?.slug ?? heroSlug(h.heroRawName);
    return s === key || String(h.heroId) === key;
  });
  if (!match) throw new Error(`hero stats not found for ${key}`);
  const named = known.get(match.heroId);
  const role = canonRole(match.roleName);
  const win = match.totalMatches ? match.weighted / match.totalMatches : 0;
  const shrunk = shrinkWin(win, match.totalMatches);
  const stats = combatFromFold(match);
  const roleMates = [...byHero.values()].filter((h) => canonRole(h.roleName) === role && h.totalMatches > 0);
  const roleAvgFold = {
    totalMatches: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    damage: 0,
    healing: 0,
    mitigation: 0,
  };
  const roleMax = { kills: 0, deaths: 0, assists: 0, damage: 0, healing: 0, mitigation: 0 };
  for (const h of roleMates) {
    const c = combatFromFold(h);
    roleAvgFold.totalMatches += h.totalMatches;
    roleAvgFold.kills += (c.kills ?? 0) * h.totalMatches;
    roleAvgFold.deaths += (c.deaths ?? 0) * h.totalMatches;
    roleAvgFold.assists += (c.assists ?? 0) * h.totalMatches;
    roleAvgFold.damage += (c.damage ?? 0) * h.totalMatches;
    roleAvgFold.healing += (c.healing ?? 0) * h.totalMatches;
    roleAvgFold.mitigation += (c.mitigation ?? 0) * h.totalMatches;
    for (const k of Object.keys(roleMax)) roleMax[k] = Math.max(roleMax[k], c[k] ?? 0);
  }
  const roleAvg = {
    ...combatFromFold(roleAvgFold),
    heroCount: roleMates.length || null,
  };
  const byMap = new Map();
  for (const row of usable) {
    if (row.hero_id !== match.heroId) continue;
    const name = String(row.map_name).replace(/\s*\([^)]*\)\s*$/, "").trim();
    const slugMap = mapSlug(name);
    const n = Number(row.total_matches) || 0;
    let m = byMap.get(slugMap);
    if (!m) {
      m = { name, slug: slugMap, mode: cleanGameMode(row.game_mode_name), matches: 0, weighted: 0 };
      byMap.set(slugMap, m);
    }
    m.matches += n;
    m.weighted += (Number(row.win_rate) || 0) * n;
  }
  const topMaps = [...byMap.values()]
    .map((m) => ({
      name: m.name,
      slug: m.slug,
      mode: m.mode,
      winRate: rnd(m.matches ? shrinkWin(m.weighted / m.matches, m.matches) : null),
      matches: Math.round(m.matches),
    }))
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
  const name = named?.name ?? titleCase(String(match.heroRawName ?? "").replace(/_/g, " "));
  const emptyCounters = { losesTo: [], beats: [] };
  return {
    id: match.heroId,
    slug: key,
    name,
    role,
    roleColor: null,
    img: named?.img ?? null,
    tier: named?.letter ? undefined : null,
    winRate: rnd(shrunk),
    rawWinRate: rnd(win),
    matches: Math.round(match.totalMatches),
    confidence: confidenceFromMatches(match.totalMatches),
    stats,
    roleAvg,
    roleMax: {
      kills: rnd(roleMax.kills, 1),
      deaths: rnd(roleMax.deaths, 1),
      assists: rnd(roleMax.assists, 1),
      damage: rnd(roleMax.damage, 0),
      healing: rnd(roleMax.healing, 0),
      mitigation: rnd(roleMax.mitigation, 0),
    },
    archetype: { POKE: 0, RUSH: 0, DIVE: 0 },
    lean: "POKE",
    leanBlurb: "Playstyle lean isn't in Counterwatch's 6v6 public slice yet.",
    counters: {
      ...emptyCounters,
      byRole: { Tank: { ...emptyCounters }, Damage: { ...emptyCounters }, Support: { ...emptyCounters } },
    },
    topMaps,
    mention: null,
    bestMaps: topMaps.slice(0, 5).map(({ name: n, slug: s, winRate, matches }) => ({ name: n, slug: s, winRate, matches })),
    worstMaps: [...topMaps].reverse().slice(0, 3).map(({ name: n, slug: s, winRate, matches }) => ({ name: n, slug: s, winRate, matches })),
    modes: [],
  };
}

const combat = (o) =>
  o && {
    kills: rnd(o.kills, 1),
    deaths: rnd(o.deaths, 1),
    assists: rnd(o.assists, 1),
    damage: rnd(o.damage, 0),
    healing: rnd(o.healing, 0),
    mitigation: rnd(o.mitigation, 0),
  };

/** Confidence word Counterwatch shows next to the win rate (from match volume). */
export function confidenceFromMatches(matches) {
  const n = Math.round(matches ?? 0);
  if (n >= 50_000) return { label: "Very high", dots: 4 };
  if (n >= 20_000) return { label: "High", dots: 3 };
  if (n >= 5_000) return { label: "Good", dots: 2 };
  if (n >= 1_000) return { label: "Fair", dots: 1 };
  return { label: "Low", dots: 0 };
}

/** Map Counterwatch role labels onto our Tank / Damage / Support tabs (DPS → Damage, etc.). */
export function canonRole(role) {
  if (role == null || role === "") return null;
  const key = String(role).trim().toLowerCase();
  if (key === "tank") return "Tank";
  if (key === "damage" || key === "dps" || key === "dmg") return "Damage";
  if (key === "support" || key === "sup" || key === "healer") return "Support";
  if (role === "Tank" || role === "Damage" || role === "Support") return role;
  return String(role);
}

/** True when cached hero counters include full lists + byRole buckets (not the old ~4+4 truncate). */
export function heroCountersReady(cached) {
  const c = cached?.counters;
  if (!c?.byRole?.Tank || !c?.byRole?.Damage || !c?.byRole?.Support) return false;
  // Live hero pages embed ~50 threats/targets; pre-byRole caches kept only ~4 overall.
  return (c.losesTo?.length ?? 0) >= 10 || (c.beats?.length ?? 0) >= 10;
}

/** Hero detail page: combat vs role avg, poke/dive/rush fit, maps, honourable mention. */
export function parseHeroPage(text, slug) {
  const h = extractJson(text, "hero");
  if (!h?.heroId && !h?.heroRawName) throw new Error(`hero stats not found for ${slug}`);
  const roleAvg = extractJson(text, "roleAvg") ?? {};
  const roleMax = extractJson(text, "roleMax") ?? {};
  const archetype = extractJson(text, "archetypeScore") ?? {};
  const otp = extractJson(text, "otpStatus");
  const bestMaps = extractJson(text, "bestMaps");
  const worstMaps = extractJson(text, "worstMaps");
  const modeStats = extractJson(text, "modeStats");
  const heroMeta = extractJson(text, "heroMeta");
  const meta = heroMeta?.[h.heroId] ?? null;
  const img =
    (text.match(/"heroImageUrl":"([^"]+)"/) || [])[1] ??
    meta?.image ??
    null;
  const roleColor = (text.match(/"roleColor":"([^"]+)"/) || [])[1] ?? null;
  const name = meta?.name || titleCase(h.heroRawName?.replace(/_/g, " ") || "") || "Hero";
  // Counter matchups: one embedded `counterScoreData` holds every hero (often 50+), each with roleName.
  // The site's Tank/Damage/Support tabs filter that list client-side — there is no separate role JSON.
  // We keep the full overall lists plus per-role buckets so the card can show top 5 per role.
  const counterData = extractJson(text, "counterScoreData") ?? {};
  const matchups = (list) =>
    (Array.isArray(list) ? [...list] : [])
      .sort((a, b) => (b.counterScore ?? 0) - (a.counterScore ?? 0))
      .map((c) => {
        const hm = heroMeta?.[c.heroId] ?? heroMeta?.[String(c.heroId)];
        return {
          id: c.heroId,
          name: hm?.name || titleCase(String(c.heroRawName ?? "").replace(/_/g, " ").toLowerCase()) || "Hero",
          img: hm?.image ?? null,
          role: canonRole(c.roleName ?? hm?.role),
          score: rnd(c.counterScore, 1),
          type: c.counterType ?? null,
        };
      });
  const losesTo = matchups(counterData.threats);
  const beats = matchups(counterData.targets);
  const roleBucket = (role) => ({
    losesTo: losesTo.filter((c) => c.role === role),
    beats: beats.filter((c) => c.role === role),
  });
  // Map performance: every map the site lists for this hero, best win rate first.
  const splits = extractJson(text, "splitsByMode") ?? {};
  const seenMaps = new Map();
  for (const mode of Object.keys(splits)) {
    for (const m of [...(splits[mode]?.bestMaps ?? []), ...(splits[mode]?.worstMaps ?? [])]) {
      if (m?.mapSlug && !seenMaps.has(m.mapSlug)) {
        seenMaps.set(m.mapSlug, { name: m.mapName, slug: m.mapSlug, mode, winRate: rnd(m.shrunkWinRate ?? m.winRate), matches: Math.round(m.totalMatches ?? 0) });
      }
    }
  }
  const topMaps = [...seenMaps.values()].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
  const styles = ["POKE", "RUSH", "DIVE"];
  const scores = Object.fromEntries(styles.map((k) => [k, rnd(archetype[k] ?? 0, 2) ?? 0]));
  const lean = styles.reduce((a, b) => (scores[b] > scores[a] ? b : a), "POKE");
  const leanBlurbs = [...text.matchAll(/"children":"([^"]{0,80}leans [^"]{3,200})"/gi)].map((m) => m[1]);
  const leanBlurb =
    leanBlurbs.sort((a, b) => b.length - a.length)[0] ?? `${name} leans ${lean.toLowerCase()}.`;
  const matches = Math.round(h.totalMatches ?? 0);
  return {
    id: h.heroId,
    slug,
    name,
    role: canonRole(h.roleName ?? meta?.role),
    roleColor,
    img,
    winRate: rnd(h.shrunkWinRate ?? h.winRate),
    rawWinRate: rnd(h.winRate),
    matches,
    confidence: confidenceFromMatches(matches),
    stats: combat(h),
    roleAvg: {
      ...combat(roleAvg),
      heroCount: Math.round(roleAvg.heroCount ?? 0) || null,
    },
    roleMax: combat(roleMax),
    archetype: scores,
    lean,
    leanBlurb,
    counters: {
      losesTo,
      beats,
      byRole: {
        Tank: roleBucket("Tank"),
        Damage: roleBucket("Damage"),
        Support: roleBucket("Support"),
      },
    },
    topMaps,
    mention:
      otp?.kind === "mention"
        ? {
            label: "Honourable mention",
            why: otp.mention?.contextLabel ?? null,
            detail: otp.mention?.contextDetail ?? null,
          }
        : null,
    bestMaps: Array.isArray(bestMaps)
      ? bestMaps.slice(0, 5).map((m) => ({
          name: m.mapName,
          slug: m.mapSlug,
          winRate: rnd(m.shrunkWinRate ?? m.winRate),
          matches: Math.round(m.totalMatches ?? 0),
        }))
      : [],
    worstMaps: Array.isArray(worstMaps)
      ? worstMaps.slice(0, 3).map((m) => ({
          name: m.mapName,
          slug: m.mapSlug,
          winRate: rnd(m.shrunkWinRate ?? m.winRate),
          matches: Math.round(m.totalMatches ?? 0),
        }))
      : [],
    modes: Array.isArray(modeStats)
      ? modeStats.map((m) => ({
          mode: m.mode,
          winRate: rnd(m.shrunkWinRate ?? m.winRate),
          matches: Math.round(m.totalMatches ?? 0),
        }))
      : [],
  };
}

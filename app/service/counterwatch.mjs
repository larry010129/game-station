import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";

// Overwatch hero stats from counterwatch.gg: tier list, per-map hero picks and the best pick per role.
// The site is a Next.js app that embeds each page's data in the HTML, so there is no private API to call:
// we read the same public pages a browser would, once per day, at startup, and when asked.
// robots.txt allows these pages. The site says its numbers refresh daily around 07:00 UTC.

const FILE = path.join(DATA_DIR, "counterwatch.json");
const BASE = "https://www.counterwatch.gg/stats/overwatch";
const DAY = 24 * 3600_000;
const CHECK_MS = 60 * 60_000;
const PAUSE_MS = 1500;
const MIN_MANUAL_GAP_MS = 60_000;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
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
    season: season && { name: season.name, number: season.seasonNumber, since: season.startsOn },
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
    role: h.roleName ?? meta?.role ?? null,
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

async function page(url, log) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CommandStation/0.2 (personal Overwatch stats viewer; one refresh a day)", Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const html = await res.text();
  const text = rscText(html);
  if (!text) log?.(`counterwatch: no embedded data in ${url}`);
  return text;
}

/**
 * Keeps the Counterwatch numbers on disk. `snapshot()` is what the dashboard reads;
 * a failed refresh keeps the last good data and says what went wrong.
 */
export function createCounterwatch(config, log) {
  let data = readJson(FILE, null);
  let error = null;
  let busy = null;
  let lastTry = 0;
  let timer = null;
  const heroBusy = new Map();

  async function run() {
    const next = { fetchedAt: Date.now(), source: "counterwatch.gg", url: BASE, heroes: data?.heroes ?? {} };
    const tier = parseTierList(await page(`${BASE}/tier-list`, log));
    await pause(PAUSE_MS);
    next.tiers = tier.tiers;
    next.patch = tier.patch;
    next.season = tier.season;
    next.maps = parseMaps(await page(`${BASE}/maps`, log));
    await pause(PAUSE_MS);
    next.picks = parsePicks(await page(`${BASE}/best-onetricks`, log));
    // The picks page names heroes only by id; the tier list knows their display names and portraits.
    const known = new Map(next.tiers.flatMap((t) => t.heroes).map((h) => [h.id, h]));
    const fill = (h) => (h && !h.name ? { ...h, name: known.get(h.id)?.name ?? null, img: known.get(h.id)?.img ?? null } : h);
    next.picks = next.picks.map((p) => ({ ...p, top: fill(p.top), others: p.others.map(fill).filter((h) => h.name) }));
    // Stamp each cached hero detail with the tier letter from the fresh list.
    const tierOf = new Map(next.tiers.flatMap((t) => t.heroes.map((h) => [h.id, t.tier])));
    next.heroes = Object.fromEntries(
      Object.entries(next.heroes).map(([slug, h]) => [slug, { ...h, tier: tierOf.get(h.id) ?? h.tier ?? null }]),
    );
    data = next;
    error = null;
    writeJson(FILE, data);
    log(`counterwatch: updated (${next.tiers.reduce((n, t) => n + t.heroes.length, 0)} heroes, ${next.maps.length} maps)`);
  }

  /** One refresh at a time. `force` skips the 1 minute gap between manual tries. */
  function refresh({ force = false } = {}) {
    if (busy) return busy;
    if (!force && Date.now() - lastTry < MIN_MANUAL_GAP_MS) return Promise.resolve(snapshot());
    lastTry = Date.now();
    busy = run()
      .catch((e) => {
        error = e.message;
        log(`counterwatch: could not update: ${e.message}`);
      })
      .then(() => {
        busy = null;
        return snapshot();
      });
    return busy;
  }

  function snapshot() {
    return {
      ...(data ?? { fetchedAt: null, tiers: [], maps: [], picks: [], heroes: {}, source: "counterwatch.gg", url: BASE }),
      heroes: data?.heroes ?? {},
      error,
      updating: busy != null,
    };
  }

  function tierFor(id) {
    for (const t of data?.tiers ?? []) {
      if (t.heroes.some((h) => h.id === id)) return t.tier;
    }
    return null;
  }

  /**
   * Loads one hero detail page (combat, archetype, maps). Cached on disk until the
   * daily refresh window, or until `force`. Safe to call from the dashboard card.
   */
  function heroDetail(slug, { force = false } = {}) {
    const key = String(slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!key) {
      const err = new Error("Missing hero slug");
      err.status = 400;
      return Promise.reject(err);
    }
    const cached = data?.heroes?.[key];
    if (!force && cached && data?.fetchedAt && Date.now() - (cached.fetchedAt ?? 0) < DAY) {
      return Promise.resolve({ ...cached, tier: tierFor(cached.id) ?? cached.tier, error: null });
    }
    if (heroBusy.has(key)) return heroBusy.get(key);
    const job = page(`${BASE}/heroes/${key}`, log)
      .then((text) => {
        const parsed = parseHeroPage(text, key);
        parsed.tier = tierFor(parsed.id);
        parsed.fetchedAt = Date.now();
        parsed.url = `${BASE}/heroes/${key}`;
        data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), heroes: { ...(data?.heroes ?? {}), [key]: parsed } };
        writeJson(FILE, data);
        log(`counterwatch: hero ${key} updated`);
        return { ...parsed, error: null };
      })
      .catch((e) => {
        log(`counterwatch: hero ${key} failed: ${e.message}`);
        if (cached) return { ...cached, tier: tierFor(cached.id) ?? cached.tier, error: e.message };
        const err = new Error(e.message);
        err.status = 502;
        throw err;
      })
      .finally(() => heroBusy.delete(key));
    heroBusy.set(key, job);
    return job;
  }

  return {
    start() {
      // Every launch, then hourly in case the app stays open past the next daily update.
      refresh({ force: true });
      timer = setInterval(() => {
        if (!data || Date.now() - data.fetchedAt > DAY) refresh({ force: true });
      }, CHECK_MS);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
    },
    refresh,
    snapshot,
    heroDetail,
  };
}

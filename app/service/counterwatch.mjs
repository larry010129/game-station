import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";
import { META_MODES, buildHeroFromRankRows, buildRankView, heroCountersReady, modeChoice, parseHeroPage, parseMapHeroes, parseMaps, parsePicks, parseTierList, rankChoice, rscText } from "./counterwatch-parse.mjs";

// The pure parsing and view-building helpers live in counterwatch-parse.mjs; re-exported so existing imports keep working.
export * from "./counterwatch-parse.mjs";

// Overwatch hero stats from counterwatch.gg: tier list, per-map hero picks and the best pick per role.
// The site is a Next.js app that embeds each page's data in the HTML, so there is no private API to call:
// we read the same public pages a browser would, once per day, at startup, and when asked.
// Mode: Counterwatch publishes 5V5 and 6V6 separately. Tier list and best-one-tricks have HTML at
// `/tier-list` (5V5) and `/tier-list/6v6` (and the same for best-onetricks). Maps and hero pages
// SSR as 5V5; their 6V6 views load the public CDN slice (statCategory "6V6"), same as rank filters.
// A rank other than All is not in the HTML. The site's rank dropdown loads a public stats slice
// (5V5 or 6V6, all game types) from its CDN. Grandmaster+ is Grandmaster and Champion together.
// robots.txt allows these pages. The site says its numbers refresh daily around 07:00 UTC.

const FILE = path.join(DATA_DIR, "counterwatch.json");
const BASE = "https://www.counterwatch.gg/stats/overwatch";
const DAY = 24 * 3600_000;
const CHECK_MS = 60 * 60_000;
const PAUSE_MS = 1500;
const MIN_MANUAL_GAP_MS = 60_000;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Where the site's rank dropdown loads the current mode slices. Rediscovered from the page if this prefix 404s.
const ARTIFACT = {
  base: "https://d1mq7b321rqlzy.cloudfront.net",
  prefix: "a/b8200ceb531a2b9103f4f9b08bb96a96",
  headerName: "x-cw-client",
  headerValue: "cw-stats-v1",
};

function saneArtifact(ep) {
  if (!ep?.base?.startsWith("https://") || !/^a\/[a-f0-9]+$/.test(ep.prefix ?? "")) return null;
  if (!/^[\w-]+$/.test(ep.headerName ?? "") || !ep.headerValue) return null;
  return { base: ep.base.replace(/\/$/, ""), prefix: ep.prefix, headerName: ep.headerName, headerValue: ep.headerValue };
}

async function discoverArtifact(fetchFn = (...a) => fetch(...a)) {
  const res = await fetchFn(`${BASE}/tier-list`, {
    headers: { "User-Agent": "CommandStation/0.2 (personal Overwatch stats viewer; one refresh a day)", Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`tier list answered ${res.status}`);
  const html = await res.text();
  const srcs = [...new Set([...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]))];
  const chunks = await Promise.all(
    srcs.map(async (src) => {
      try {
        const js = await fetchFn(`https://www.counterwatch.gg${src}`, {
          headers: { "User-Agent": "CommandStation/0.2 (personal Overwatch stats viewer; one refresh a day)", Accept: "*/*" },
          signal: AbortSignal.timeout(20_000),
        });
        return js.ok ? js.text() : "";
      } catch {
        return "";
      }
    }),
  );
  for (const js of chunks) {
    const prefix = js.match(/STATS_ARTIFACT_PREFIX",0,"([^"]+)"/);
    if (!prefix) continue;
    const base = js.match(/STATS_ARTIFACT_BASE_URL",0,"(https:[^"]+)"/);
    const header = js.match(/STATS_ARTIFACT_CLIENT_HEADER",0,\{name:"([^"]+)",value:"([^"]+)"\}/);
    const ep = saneArtifact({
      base: base?.[1] ?? ARTIFACT.base,
      prefix: prefix[1],
      headerName: header?.[1] ?? ARTIFACT.headerName,
      headerValue: header?.[2] ?? ARTIFACT.headerValue,
    });
    if (ep) return ep;
  }
  throw new Error("rank stats source not found");
}

async function page(url, log, fetchFn = (...a) => fetch(...a)) {
  const res = await fetchFn(url, {
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
 *
 * Optional `deps` (all default to the real thing, as in createGameMode):
 *   file        path of the cache file
 *   fetch       fetch-compatible function for every network call
 *   pause       (ms) => Promise, the polite gap between page loads
 *   readJson / writeJson   cache storage
 */
export function createCounterwatch(config, log, deps = {}) {
  const file = deps.file ?? FILE;
  const doFetch = deps.fetch ?? ((...a) => fetch(...a));
  const wait = deps.pause ?? pause;
  const read = deps.readJson ?? readJson;
  const write = deps.writeJson ?? writeJson;
  const getPage = (url) => page(url, log, doFetch);
  let data = read(file, null);
  let error = null;
  let busy = null;
  let lastTry = 0;
  let timer = null;
  /** In-memory All-ranks CDN rows per mode (too large for the daily JSON file). */
  const modeSliceMem = new Map();
  const heroBusy = new Map();
  const mapBusy = new Map();
  const rankBusy = new Map();

  function fillPicks(picks, known) {
    const fill = (h) => (h && !h.name ? { ...h, name: known.get(h.id)?.name ?? null, img: known.get(h.id)?.img ?? null } : h);
    return picks.map((p) => ({ ...p, top: fill(p.top), others: p.others.map(fill).filter((h) => h.name) }));
  }

  /** Publish the in-progress scrape so cards/boot can use what we have while `busy` stays set. */
  function publish(partial) {
    data = partial;
    error = null;
    write(file, data);
  }

  async function run() {
    const next = {
      fetchedAt: Date.now(),
      source: "counterwatch.gg",
      url: BASE,
    };
    const tier = parseTierList(await getPage(`${BASE}/tier-list`));
    await wait(PAUSE_MS);
    next.tiers = tier.tiers;
    next.patch = tier.patch;
    next.season = tier.season;
    next.timeline = tier.timeline;
    next.maps = parseMaps(await getPage(`${BASE}/maps`));
    await wait(PAUSE_MS);
    next.picks = parsePicks(await getPage(`${BASE}/best-onetricks`));
    // The picks page names heroes only by id; the tier list knows their display names and portraits.
    const known5 = new Map(next.tiers.flatMap((t) => t.heroes).map((h) => [h.id, h]));
    next.picks = fillPicks(next.picks, known5);
    // 5v5 is enough for the default cards. Publish now so boot/cards are not held for 6v6.
    publish({
      ...next,
      modes: {
        "5v5": { tiers: next.tiers, maps: next.maps, picks: next.picks },
        "6v6": data?.modes?.["6v6"] ?? { tiers: [], maps: [], picks: [] },
      },
      heroes: data?.heroes ?? {},
      mapPages: data?.mapPages ?? {},
      ranks: data?.ranks ?? {},
      artifact: data?.artifact ?? null,
    });
    log(`counterwatch: 5v5 ready (${next.tiers.reduce((n, t) => n + t.heroes.length, 0)} heroes, ${next.maps.length} maps); fetching 6v6…`);
    await wait(PAUSE_MS);
    const tier6 = parseTierList(await getPage(`${BASE}/tier-list/6v6`));
    await wait(PAUSE_MS);
    let picks6 = parsePicks(await getPage(`${BASE}/best-onetricks/6v6`));
    const known6 = new Map(tier6.tiers.flatMap((t) => t.heroes).map((h) => [h.id, h]));
    picks6 = fillPicks(picks6, known6);
    // Maps HTML is 5V5-only; 6V6 map lists come from the public All-ranks CDN slice.
    let maps6 = [];
    try {
      const rows6 = await loadDivisionRows("6V6", ["All"]);
      modeSliceMem.set("6v6", { fetchedAt: Date.now(), rows: rows6 });
      maps6 = buildRankView(rows6, known6).maps;
    } catch (e) {
      log(`counterwatch: 6v6 maps slice failed: ${e.message}`);
      maps6 = data?.modes?.["6v6"]?.maps ?? [];
    }
    next.modes = {
      "5v5": { tiers: next.tiers, maps: next.maps, picks: next.picks },
      "6v6": { tiers: tier6.tiers, maps: maps6, picks: picks6 },
    };
    // The scrape takes a minute. Hero, map and rank pages (and the rank source) can be cached by
    // other requests meanwhile, so the per-page caches are taken from `data` as it is right now,
    // not as it was when this refresh began, or those writes would be lost.
    const tierOf5 = new Map(next.tiers.flatMap((t) => t.heroes.map((h) => [h.id, t.tier])));
    const tierOf6 = new Map(tier6.tiers.flatMap((t) => t.heroes.map((h) => [h.id, t.tier])));
    next.heroes = Object.fromEntries(
      Object.entries(data?.heroes ?? {}).map(([k, h]) => {
        const mode = String(k).startsWith("6v6:") ? "6v6" : "5v5";
        const tierOf = mode === "6v6" ? tierOf6 : tierOf5;
        // Stamp each cached hero detail with the tier letter from the fresh list for its mode.
        return [k, { ...h, tier: tierOf.get(h.id) ?? h.tier ?? null }];
      }),
    );
    next.mapPages = data?.mapPages ?? {};
    next.ranks = data?.ranks ?? {};
    next.artifact = data?.artifact ?? null;
    publish(next);
    log(
      `counterwatch: updated 5v5 (${next.tiers.reduce((n, t) => n + t.heroes.length, 0)} heroes, ${next.maps.length} maps) · 6v6 (${tier6.tiers.reduce((n, t) => n + t.heroes.length, 0)} heroes, ${maps6.length} maps)`,
    );
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

  /** Resolves when the startup refresh (or a manual one) has finished grabbing pages. */
  function settle() {
    return busy ?? Promise.resolve();
  }

  function modePack(mode) {
    const choice = modeChoice(mode) ?? META_MODES[0];
    const packed = data?.modes?.[choice.value];
    if (packed) return { mode: choice.value, ...packed };
    // Older on-disk cache before modes existed: treat top-level fields as 5v5.
    if (choice.value === "5v5") {
      return { mode: "5v5", tiers: data?.tiers ?? [], maps: data?.maps ?? [], picks: data?.picks ?? [] };
    }
    return { mode: choice.value, tiers: [], maps: [], picks: [] };
  }

  function snapshot(mode) {
    const pack = modePack(mode);
    const { mapPages: _pages, ranks: _ranks, artifact: _artifact, modes: _modes, heroes: allHeroes, ...rest } =
      data ?? { fetchedAt: null, tiers: [], maps: [], picks: [], heroes: {}, source: "counterwatch.gg", url: BASE };
    return {
      fetchedAt: rest.fetchedAt ?? null,
      source: rest.source ?? "counterwatch.gg",
      url: rest.url ?? BASE,
      patch: rest.patch ?? null,
      season: rest.season ?? null,
      timeline: rest.timeline ?? [],
      mode: pack.mode,
      tiers: pack.tiers ?? [],
      maps: pack.maps ?? [],
      picks: pack.picks ?? [],
      heroes: allHeroes ?? {},
      error,
      updating: busy != null,
    };
  }

  function tierFor(id, mode = "5v5") {
    const pack = modePack(mode);
    for (const t of pack.tiers ?? []) {
      if (t.heroes.some((h) => h.id === id)) return t.tier;
    }
    return null;
  }

  function knownFor(mode) {
    return new Map((modePack(mode).tiers ?? []).flatMap((t) => t.heroes).map((h) => [h.id, h]));
  }

  function heroCacheKey(mode, slug) {
    return mode === "5v5" ? slug : `${mode}:${slug}`;
  }

  function mapCacheKey(mode, slug) {
    return mode === "5v5" ? slug : `${mode}:${slug}`;
  }

  function rankCacheKey(mode, rank) {
    return mode === "5v5" ? rank : `${mode}:${rank}`;
  }

  function artifactHeaders(ep) {
    return { [ep.headerName]: ep.headerValue, Accept: "application/json" };
  }

  async function loadManifest(ep) {
    const res = await doFetch(`${ep.base}/${ep.prefix}/manifest.v2.json`, {
      headers: artifactHeaders(ep),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`rank manifest answered ${res.status}`);
    return res.json();
  }

  async function endpoint() {
    const saved = saneArtifact(data?.artifact);
    const first = saved ?? ARTIFACT;
    const man = await loadManifest(first);
    if (man) return { ep: first, manifest: man };
    const found = await discoverArtifact(doFetch);
    data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), artifact: found };
    write(file, data);
    const retry = await loadManifest(found);
    if (!retry) throw new Error("rank manifest not found");
    log?.(`counterwatch: rank source refreshed`);
    return { ep: found, manifest: retry };
  }

  async function loadDivisionRows(statCategory, divisions) {
    const { ep, manifest } = await endpoint();
    const list = manifest?.stats?.slices;
    if (!Array.isArray(list)) throw new Error("rank manifest was not readable");
    const slices = divisions
      .map((division) => list.find((s) => s.game === "Overwatch" && s.statCategory === statCategory && s.division === division))
      .filter(Boolean);
    if (!slices.length) return [];
    const bodies = await Promise.all(
      slices.map(async (slice) => {
        const url = String(slice.path).startsWith("http") ? slice.path : `${ep.base}/${slice.path}`;
        const res = await doFetch(url, { headers: artifactHeaders(ep), signal: AbortSignal.timeout(25_000) });
        if (!res.ok) throw new Error(`rank slice answered ${res.status}`);
        return res.json();
      }),
    );
    return bodies.flatMap((body) => (Array.isArray(body?.current) ? body.current : []));
  }

  async function ensureModeSlice(modeValue) {
    const choice = modeChoice(modeValue) ?? META_MODES[0];
    const cached = modeSliceMem.get(choice.value);
    if (cached?.rows?.length && Date.now() - (cached.fetchedAt ?? 0) < DAY) return cached.rows;
    const rows = await loadDivisionRows(choice.category, ["All"]);
    modeSliceMem.set(choice.value, { fetchedAt: Date.now(), rows });
    return rows;
  }

  /**
   * Loads one hero detail. 5V5 uses the HTML hero page; 6V6 uses the public CDN All slice
   * (hero HTML SSR is 5V5-only). Cached on disk until the daily refresh window, or until `force`.
   */
  function heroDetail(slug, { force = false, mode } = {}) {
    const modeVal = (modeChoice(mode) ?? META_MODES[0]).value;
    const key = String(slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!key) {
      const err = new Error("Missing hero slug");
      err.status = 400;
      return Promise.reject(err);
    }
    const cacheKey = heroCacheKey(modeVal, key);
    const cached = data?.heroes?.[cacheKey] ?? (modeVal === "5v5" ? data?.heroes?.[key] : null);
    const busyKey = `${modeVal}:${key}`;
    if (modeVal === "5v5") {
      // Old caches truncated overall matchups to ~4 and/or lack byRole — role tabs looked empty. Refetch those.
      if (!force && heroCountersReady(cached) && data?.fetchedAt && Date.now() - (cached.fetchedAt ?? 0) < DAY) {
        return Promise.resolve({ ...cached, mode: modeVal, tier: tierFor(cached.id, modeVal) ?? cached.tier, error: null });
      }
      if (heroBusy.has(busyKey)) return heroBusy.get(busyKey);
      const job = getPage(`${BASE}/heroes/${key}`)
        .then((text) => {
          const parsed = parseHeroPage(text, key);
          parsed.tier = tierFor(parsed.id, modeVal);
          parsed.mode = modeVal;
          parsed.fetchedAt = Date.now();
          parsed.url = `${BASE}/heroes/${key}`;
          data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), heroes: { ...(data?.heroes ?? {}), [cacheKey]: parsed } };
          write(file, data);
          log(`counterwatch: hero ${key} (5v5) updated`);
          return { ...parsed, error: null };
        })
        .catch((e) => {
          log(`counterwatch: hero ${key} (5v5) failed: ${e.message}`);
          if (cached) return { ...cached, mode: modeVal, tier: tierFor(cached.id, modeVal) ?? cached.tier, error: e.message };
          const err = new Error(e.message);
          err.status = 502;
          throw err;
        })
        .finally(() => heroBusy.delete(busyKey));
      heroBusy.set(busyKey, job);
      return job;
    }
    // 6v6: public slice — counters/archetype are not embedded there.
    if (!force && cached && Date.now() - (cached.fetchedAt ?? 0) < DAY) {
      return Promise.resolve({ ...cached, mode: modeVal, tier: tierFor(cached.id, modeVal) ?? cached.tier, error: null });
    }
    if (heroBusy.has(busyKey)) return heroBusy.get(busyKey);
    const job = ensureModeSlice(modeVal)
      .then((rows) => {
        const parsed = buildHeroFromRankRows(rows, key, knownFor(modeVal));
        parsed.tier = tierFor(parsed.id, modeVal);
        parsed.mode = modeVal;
        parsed.fetchedAt = Date.now();
        parsed.url = `${BASE}/heroes/${key}`;
        data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), heroes: { ...(data?.heroes ?? {}), [cacheKey]: parsed } };
        write(file, data);
        log(`counterwatch: hero ${key} (6v6) updated`);
        return { ...parsed, error: null };
      })
      .catch((e) => {
        log(`counterwatch: hero ${key} (6v6) failed: ${e.message}`);
        if (cached) return { ...cached, mode: modeVal, tier: tierFor(cached.id, modeVal) ?? cached.tier, error: e.message };
        const err = new Error(e.message);
        err.status = 502;
        throw err;
      })
      .finally(() => heroBusy.delete(busyKey));
    heroBusy.set(busyKey, job);
    return job;
  }

  /** Full hero list for one map. 5V5 uses the map HTML page; 6V6 uses the CDN All slice. */
  function mapHeroes(slug, { force = false, mode } = {}) {
    const modeVal = (modeChoice(mode) ?? META_MODES[0]).value;
    const key = String(slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!key) {
      const err = new Error("Missing map slug");
      err.status = 400;
      return Promise.reject(err);
    }
    const cacheKey = mapCacheKey(modeVal, key);
    const cached = data?.mapPages?.[cacheKey] ?? (modeVal === "5v5" ? data?.mapPages?.[key] : null);
    const known = knownFor(modeVal);
    const decorate = (list) =>
      list.map((h) => {
        const k = known.get(h.id);
        return k ? { ...h, name: k.name ?? h.name, img: k.img ?? null, slug: k.slug ?? null } : h;
      });
    const busyKey = `${modeVal}:${key}`;
    if (modeVal === "6v6") {
      const fromPack = (modePack("6v6").maps ?? []).find((m) => m.slug === key);
      if (!force && fromPack?.heroes?.length) {
        return Promise.resolve({ slug: key, mode: modeVal, heroes: decorate(fromPack.heroes), error: null });
      }
      if (!force && cached && Date.now() - (cached.fetchedAt ?? 0) < DAY) {
        return Promise.resolve({ slug: key, mode: modeVal, heroes: decorate(cached.heroes), error: null });
      }
      if (mapBusy.has(busyKey)) return mapBusy.get(busyKey);
      const job = ensureModeSlice("6v6")
        .then((rows) => {
          const view = buildRankView(rows, known);
          const map = view.maps.find((m) => m.slug === key);
          const heroes = decorate(map?.heroes ?? []);
          const pageData = { fetchedAt: Date.now(), heroes };
          data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), mapPages: { ...(data?.mapPages ?? {}), [cacheKey]: pageData } };
          write(file, data);
          log(`counterwatch: map ${key} (6v6) updated (${heroes.length} heroes)`);
          return { slug: key, mode: modeVal, heroes, error: null };
        })
        .catch((e) => {
          log(`counterwatch: map ${key} (6v6) failed: ${e.message}`);
          if (cached) return { slug: key, mode: modeVal, heroes: decorate(cached.heroes), error: e.message };
          const err = new Error(e.message);
          err.status = 502;
          throw err;
        })
        .finally(() => mapBusy.delete(busyKey));
      mapBusy.set(busyKey, job);
      return job;
    }
    if (!force && cached && Date.now() - (cached.fetchedAt ?? 0) < DAY) {
      return Promise.resolve({ slug: key, mode: modeVal, heroes: decorate(cached.heroes), error: null });
    }
    if (mapBusy.has(busyKey)) return mapBusy.get(busyKey);
    const job = getPage(`${BASE}/maps/${key}`)
      .then((text) => {
        const heroes = decorate(parseMapHeroes(text));
        const pageData = { fetchedAt: Date.now(), heroes };
        data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), mapPages: { ...(data?.mapPages ?? {}), [cacheKey]: pageData } };
        write(file, data);
        log(`counterwatch: map ${key} (5v5) updated (${heroes.length} heroes)`);
        return { slug: key, mode: modeVal, heroes, error: null };
      })
      .catch((e) => {
        log(`counterwatch: map ${key} (5v5) failed: ${e.message}`);
        if (cached) return { slug: key, mode: modeVal, heroes: decorate(cached.heroes), error: e.message };
        const err = new Error(e.message);
        err.status = 502;
        throw err;
      })
      .finally(() => mapBusy.delete(busyKey));
    mapBusy.set(busyKey, job);
    return job;
  }

  /**
   * Tier list and map heroes for one rank. All stays on the daily snapshot for that mode.
   * Any other rank is the site's CDN slice for the mode's statCategory, cached for a day.
   * A rank with no rows comes back empty instead of the all-ranks list.
   */
  function rank(name, { force = false, mode } = {}) {
    const modeChoiceResolved = modeChoice(mode) ?? META_MODES[0];
    const modeVal = modeChoiceResolved.value;
    const choice = rankChoice(name);
    if (!choice) {
      const err = new Error("Unknown rank");
      err.status = 400;
      return Promise.reject(err);
    }
    const pack = (view, fetchedAt, err = null) => ({
      rank: choice.value,
      label: choice.label,
      mode: modeVal,
      empty: view.empty,
      fetchedAt,
      error: err,
      tiers: view.tiers,
      maps: view.maps,
    });
    if (choice.value === "All") {
      const m = modePack(modeVal);
      const tiers = m.tiers ?? [];
      return Promise.resolve(
        pack({ empty: tiers.length === 0, tiers, maps: (m.maps ?? []).map((x) => ({ ...x, heroes: x.heroes ?? [] })) }, data?.fetchedAt ?? null),
      );
    }
    const key = rankCacheKey(modeVal, choice.value);
    const cached = data?.ranks?.[key] ?? (modeVal === "5v5" ? data?.ranks?.[choice.value] : null);
    const busyKey = key;
    if (!force && cached && Date.now() - (cached.fetchedAt ?? 0) < DAY) {
      return Promise.resolve(pack(cached, cached.fetchedAt));
    }
    if (rankBusy.has(busyKey)) return rankBusy.get(busyKey);
    const job = (async () => {
      const rows = await loadDivisionRows(modeChoiceResolved.category, choice.divisions);
      if (!rows.length) return { empty: true, tiers: [], maps: [] };
      return buildRankView(rows, knownFor(modeVal));
    })()
      .then((view) => {
        const pageData = { fetchedAt: Date.now(), empty: view.empty, tiers: view.tiers, maps: view.maps };
        data = { ...(data ?? { tiers: [], maps: [], picks: [], source: "counterwatch.gg", url: BASE }), ranks: { ...(data?.ranks ?? {}), [key]: pageData } };
        write(file, data);
        log(`counterwatch: rank ${choice.value} (${modeVal}) updated (${view.tiers.reduce((n, t) => n + t.heroes.length, 0)} heroes)`);
        return pack(pageData, pageData.fetchedAt);
      })
      .catch((e) => {
        log(`counterwatch: rank ${choice.value} (${modeVal}) failed: ${e.message}`);
        if (cached) return pack(cached, cached.fetchedAt, e.message);
        const err = new Error(e.message);
        err.status = 502;
        throw err;
      })
      .finally(() => rankBusy.delete(busyKey));
    rankBusy.set(busyKey, job);
    return job;
  }

  return {
    start() {
      // Only when the cache is missing or a day old (the site updates once a day); then hourly in case
      // the app stays open past the next update. The reload button forces one at any time.
      const stale = () => !data?.fetchedAt || Date.now() - data.fetchedAt > DAY;
      if (stale()) refresh({ force: true });
      timer = setInterval(() => {
        if (stale()) refresh({ force: true });
      }, CHECK_MS);
      timer.unref?.();
    },
    stop() {
      if (timer) clearInterval(timer);
    },
    refresh,
    settle,
    snapshot,
    heroDetail,
    mapHeroes,
    rank,
  };
}

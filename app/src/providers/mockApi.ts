import type { AiData, MetaData, GameModeRun, MediaStatus, NetData, SessionsData, SteamData, SystemData } from "../lib/types";

const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const HOUR = 3600_000;

let mediaStart = Date.now();
let mediaPlaying = true;

/** Demo answers for the sample-data provider, so every card can be previewed without the service. */
export function mockApi(path: string, body?: unknown): unknown {
  if (path.startsWith("/api/meta/hero")) {
    const slug = new URL(path, "http://x").searchParams.get("slug") || "tracer";
    const name = slug.replace(/(^|-)([a-z])/g, (_, _a, b: string) => b.toUpperCase());
    return {
      id: 3,
      slug,
      name: slug === "tracer" ? "Tracer" : name,
      role: "Damage",
      roleColor: "#e25050",
      img: null,
      tier: "B",
      winRate: 0.506,
      rawWinRate: 0.506,
      matches: 99534,
      confidence: { label: "Very high", dots: 4 },
      stats: { kills: 16.0, deaths: 7.2, assists: 0.0, damage: 6044, healing: 57, mitigation: 78 },
      roleAvg: { kills: 16.1, deaths: 7.7, assists: 1.5, damage: 8055, healing: 295, mitigation: 458, heroCount: 23 },
      roleMax: { kills: 17.7, deaths: 9.6, assists: 5.6, damage: 9592, healing: 1513, mitigation: 3552 },
      archetype: { POKE: 0.6, RUSH: 0.6, DIVE: 1 },
      lean: "DIVE",
      leanBlurb: "Tracer leans dive, and can flex into poke comps when the team shape calls for it.",
      mention: { label: "Honourable mention", why: "Counters the meta", detail: "50.8% against the current S-tier pick." },
      bestMaps: [
        { name: "Aatlis", slug: "aatlis", winRate: 0.531, matches: 2866 },
        { name: "Samoa", slug: "samoa", winRate: 0.523, matches: 2500 },
      ],
      worstMaps: [{ name: "Dorado", slug: "dorado", winRate: 0.473, matches: 2400 }],
      modes: [
        { mode: "Push", winRate: 0.516, matches: 15850 },
        { mode: "Control", winRate: 0.512, matches: 28153 },
      ],
      fetchedAt: Date.now() - HOUR,
      url: `https://www.counterwatch.gg/stats/overwatch/heroes/${slug}`,
      error: null,
    };
  }
  switch (path) {
    case "/api/ai":
    case "/api/ai/ask": {
      const data: AiData = {
        job: null,
        demo: true,
        engines: { claude: "Claude", gemini: "Gemini" },
        topics: { leaks: "Leaks and datamines", update: "Latest update and patch", hero: "Ask about a hero or topic" },
        auto: { enabled: true, engine: "claude", nextAt: Date.now() + 40 * 60_000, lastAt: 0, error: null },
        results: [
        ],
      };
      return data;
    }
    case "/api/meta":
    case "/api/meta/refresh": {
      const h = (id: number, name: string, role: string, winRate: number, pickRate: number, slug?: string): MetaData["tiers"][0]["heroes"][0] => ({ id, name, role, winRate, pickRate, matches: 50000, img: null, slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
      const data: MetaData = {
        fetchedAt: Date.now() - 3 * HOUR,
        source: "Sample data",
        url: "https://www.counterwatch.gg/stats/overwatch",
        error: null,
        updating: false,
        demo: true,
        patch: { name: "Sample patch", since: "2026-11-06" },
        season: { name: "Sample season", number: 5, since: "2026-10-07" },
        tiers: [
          { tier: "S", heroes: [h(6, "Torbjörn", "Damage", 0.565, 0.06, "torbjorn"), h(7, "Reinhardt", "Tank", 0.537, 0.08), h(32, "Zenyatta", "Support", 0.538, 0.05)] },
          { tier: "A", heroes: [h(4, "Mercy", "Support", 0.52, 0.05), h(9, "Winston", "Tank", 0.515, 0.04), h(3, "Tracer", "Damage", 0.511, 0.05)] },
          { tier: "B", heroes: [h(315, "Ana", "Support", 0.49, 0.05), h(66, "Cassidy", "Damage", 0.485, 0.04)] },
          { tier: "C", heroes: [h(418, "Moira", "Support", 0.47, 0.06)] },
        ],
        maps: [
          { name: "King's Row", slug: "kings-row", mode: "Hybrid", share: 0.057, matches: 373000, mostPlayed: [h(4, "Mercy", "Support", 0.52, 0.06), h(7, "Reinhardt", "Tank", 0.54, 0.05), h(3, "Tracer", "Damage", 0.51, 0.05)], best: [h(6, "Torbjörn", "Damage", 0.57, 0.02, "torbjorn"), h(32, "Zenyatta", "Support", 0.55, 0.02), h(9, "Winston", "Tank", 0.54, 0.02)] },
          { name: "Rialto", slug: "rialto", mode: "Escort", share: 0.046, matches: 303000, mostPlayed: [h(315, "Ana", "Support", 0.49, 0.06), h(66, "Cassidy", "Damage", 0.485, 0.05), h(7, "Reinhardt", "Tank", 0.53, 0.04)], best: [h(32, "Zenyatta", "Support", 0.56, 0.02), h(6, "Torbjörn", "Damage", 0.55, 0.02, "torbjorn"), h(9, "Winston", "Tank", 0.53, 0.02)] },
        ],
        picks: [
          { role: "Tank", top: { ...h(7, "Reinhardt", "Tank", 0.537, 0.08), why: ["53.7% win rate", "consistent across maps"] }, others: [h(9, "Winston", "Tank", 0.515, 0.04)] },
          { role: "Damage", top: { ...h(6, "Torbjörn", "Damage", 0.565, 0.06, "torbjorn"), why: ["56.5% win rate"] }, others: [h(3, "Tracer", "Damage", 0.511, 0.05)] },
          { role: "Support", top: { ...h(32, "Zenyatta", "Support", 0.538, 0.05), why: ["53.8% win rate"] }, others: [h(4, "Mercy", "Support", 0.52, 0.05)] },
        ],
        heroes: {},
      };
      return data;
    }
    case "/api/net": {
      const samples = Array.from({ length: 60 }, (_, i) => (i === 41 ? null : Math.round(rnd(32, 40) + (i % 17 === 0 ? 14 : 0))));
      const got = samples.filter((v): v is number => v != null);
      const data: NetData = {
        host: "battle.net",
        regions: [
          { id: "americas", name: "Americas", ms: Math.round(rnd(38, 44)) },
          { id: "europe", name: "Europe", ms: Math.round(rnd(110, 126)) },
          { id: "asia", name: "Asia", ms: Math.round(rnd(170, 190)) },
        ],
        jitter: { avg: Math.round(got.reduce((a, b) => a + b, 0) / got.length), jitter: 3.4, lossPct: 1.7, samples },
        wifi: { connected: true, state: "connected", ssid: "Home Wi-Fi", signal: 82, radio: "802.11ax", band: "5 GHz", channel: 44, rateMbps: 866 },
      };
      return data;
    }
    case "/api/system": {
      const data: SystemData = {
        mem: {
          totalMb: 32768,
          usedMb: 19200,
          top: [
            { n: "chrome", mb: 4100 },
            { n: "Overwatch", mb: 3600 },
            { n: "Spotify", mb: 900 },
            { n: "Discord", mb: 700 },
          ],
        },
        battery: { pct: 81, status: 2, minutes: null, chargeMw: 0, dischargeMw: 0, online: true, charging: false, discharging: false },
      };
      return data;
    }
    case "/api/steam": {
      const data: SteamData = {
        news: [
          { id: "1", title: "Sample: Season update notes", url: "https://store.steampowered.com/", date: Date.now() - 2 * HOUR, source: "Steam" },
          { id: "2", title: "Sample: Weekend sale", url: "https://store.steampowered.com/", date: Date.now() - 30 * HOUR, source: "Steam" },
        ],
        error: null,
      };
      return data;
    }
    case "/api/sessions": {
      const now = Date.now();
      const history = Array.from({ length: 9 }, (_, i) => {
        const end = now - (i * 20 + 3) * HOUR;
        const len = (1 + ((i * 7) % 4)) * HOUR;
        return { game: "Overwatch.exe", start: end - len, end, avgPing: 39 + (i % 3), avgGpuTemp: 71 + (i % 4), avgGpuLoad: 90, avgCpuLoad: 55, maxGpuTemp: 78, maxPing: 71 };
      }).reverse();
      const data: SessionsData = { current: { game: "Overwatch.exe", start: now - 47 * 60_000 }, history };
      return data;
    }
    case "/api/gamemode/history": {
      const t = Date.now();
      const runs: GameModeRun[] = [
        { t: t - 3 * HOUR, action: "apply", id: "power", label: "Power mode to Best performance", before: "Best power efficiency", after: "Best performance", ok: true, error: null },
        { t: t - 3 * HOUR, action: "apply", id: "close", label: "Close Spotify, OneDrive", before: "9 running", after: "closed", ok: true, error: null },
        { t: t - 1 * HOUR, action: "restore", id: "power", label: "Power mode to Best performance", before: "Best performance", after: "Best power efficiency", ok: true, error: null },
      ];
      return { runs };
    }
    case "/api/media": {
      const dur = 214_000;
      const pos = (Date.now() - mediaStart) % dur;
      const data: MediaStatus = { available: true, app: "Spotify", title: "Sample track", artist: "Sample artist", album: "Sample album", playing: mediaPlaying, positionMs: pos, durationMs: dur, artId: 0 };
      return data;
    }
    case "/api/media/art":
      return { art: null };
    case "/api/media/control": {
      const a = (body as { action?: string } | undefined)?.action;
      if (a === "playpause") mediaPlaying = !mediaPlaying;
      if (a === "next" || a === "previous") mediaStart = Date.now();
      return mockApi("/api/media");
    }
    default:
      throw new Error(`No sample data for ${path}`);
  }
}

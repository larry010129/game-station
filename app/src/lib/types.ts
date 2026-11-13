export interface Machine {
  name: string;
  cpu: string;
  gpu: string;
}

/** One reading of the PC, taken once per polling interval. */
export interface Sample {
  t: number;
  fps: number | null;
  frameTimeMs: number | null;
  gpuTemp: number | null;
  cpuLoad: number | null;
  gpuLoad: number | null;
  cpuClockGhz: number | null;
  gpuPowerW: number | null;
  pingRegionMs: number | null;
  pingRouterMs: number | null;
  batteryPct: number | null;
  onAc: boolean | null;
  game: string | null;
  /** Why a sensor is missing, keyed by field name (fps, gpuTemp, …). */
  notes?: Partial<Record<string, string>>;
}

export type FeedKind = "patch" | "official" | "leak" | "video" | "community";

export type FeedPlatform = "blizzard" | "reddit" | "youtube" | "x";

export interface FeedItem {
  id: string;
  /** Where the post lives. Older cached items may lack it; the id prefix says. */
  platform?: FeedPlatform;
  kind: FeedKind;
  title: string;
  source: string;
  publishedAt: number;
  summary: string;
  isNew?: boolean;
  url?: string;
  /** Patch posts only: heroes changed, with a guess at buff or nerf from the wording. */
  heroChanges?: { name: string; up: number; down: number }[];
}

export interface PlayersData {
  source: string;
  latest: { t: number; count: number } | null;
  error: string | null;
  /** Hourly average of players online, oldest first. */
  hours: { t: number; count: number }[];
  /** Share of the player base per region. Not measured: estimated. */
  regions: { id: string; name: string; share: number }[];
  regionsEstimated: boolean;
  demo?: boolean;
}

export interface GameModeStep {
  id: string;
  label: string;
  /** What the setting is now, shown before the step runs. */
  before: string;
  after: string;
}

export interface Profile {
  id: string;
  name: string;
  steps: GameModeStep[];
}

export interface StationEvent {
  id: number;
  t: number;
  kind: "alert" | "info";
  text: string;
  /** When set, the event is also drawn on the 60 second chart with this label. */
  marker?: string;
}

/**
 * Everything the dashboard reads or changes goes through a provider, so the
 * sample data and the real Windows sensors are interchangeable.
 */
export interface Provider {
  id: string;
  label: string;
  machine: Machine;
  seed(count: number, endT: number): Sample[];
  readSample(): Promise<Sample>;
  readFeed(): Promise<FeedItem[]>;
  /** Asks the service to look for new stories right now. */
  refreshFeed(): Promise<FeedItem[]>;
  readPlayers(): Promise<PlayersData>;
  /** Any other service endpoint (network, memory, media, sessions...). The sample provider answers with demo data. */
  api<T>(path: string, body?: unknown): Promise<T>;
  profiles: Profile[];
  applyStep(step: GameModeStep): Promise<void>;
  restoreStep(step: GameModeStep): Promise<void>;
}

export interface MediaStatus {
  available: boolean;
  app?: string;
  title?: string;
  artist?: string;
  album?: string;
  playing?: boolean;
  positionMs?: number;
  durationMs?: number;
  /** Changes when the picture changes; fetch /api/media/art only then. */
  artId?: number;
}

export interface NetData {
  host: string;
  regions: { id: string; name: string; ms: number | null }[];
  jitter: { avg: number | null; jitter: number | null; lossPct: number | null; samples: (number | null)[] };
  wifi: { connected: boolean; state: string; ssid: string | null; signal: number | null; radio: string | null; band: string | null; channel: number | null; rateMbps: number | null } | null;
}

export interface SystemData {
  mem: { totalMb: number; usedMb: number; top: { n: string; mb: number }[] };
  battery: { pct: number; status: number; minutes: number | null; chargeMw: number | null; dischargeMw: number | null; online: boolean | null; charging: boolean | null; discharging: boolean | null } | null;
}

export interface SessionRecord {
  game: string;
  start: number;
  end: number;
  avgPing: number | null;
  avgGpuTemp: number | null;
  avgGpuLoad: number | null;
  avgCpuLoad: number | null;
  maxGpuTemp: number | null;
  maxPing: number | null;
}

export interface SessionsData {
  current: { game: string; start: number } | null;
  history: SessionRecord[];
}

export interface GameModeRun {
  t: number;
  action: "apply" | "restore";
  id: string;
  label: string;
  before: string | null;
  after: string | null;
  ok: boolean;
  error: string | null;
}

export interface SteamData {
  news: { id: string; title: string; url: string; date: number; source: string }[];
  error: string | null;
}

/** Hero stats read from counterwatch.gg by the local service. Win rates are 0 to 1. */
export interface MetaHero {
  id: number;
  name: string | null;
  role: "Tank" | "Damage" | "Support" | string;
  winRate: number | null;
  rawWinRate?: number | null;
  pickRate: number | null;
  matches: number;
  img: string | null;
  slug?: string | null;
  kd?: number | null;
  why?: string[];
}

export interface MetaMap {
  name: string;
  slug: string;
  mode: string;
  share: number | null;
  matches: number;
  mostPlayed: MetaHero[];
  best: MetaHero[];
}

/** Per-10 combat block (hero, role average, or role max) from a Counterwatch hero page. */
export interface MetaCombat {
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  damage: number | null;
  healing?: number | null;
  mitigation?: number | null;
}

/** Full hero profile from /stats/overwatch/heroes/{slug}. */
export interface MetaHeroDetail {
  id: number;
  slug: string;
  name: string;
  role: string | null;
  roleColor: string | null;
  img: string | null;
  tier?: string | null;
  winRate: number | null;
  rawWinRate?: number | null;
  matches: number;
  confidence: { label: string; dots: number };
  stats: MetaCombat;
  roleAvg: MetaCombat & { heroCount: number | null };
  roleMax: MetaCombat;
  archetype: { POKE: number; RUSH: number; DIVE: number };
  lean: "POKE" | "RUSH" | "DIVE" | string;
  leanBlurb: string;
  mention: { label: string; why: string | null; detail: string | null } | null;
  bestMaps: { name: string; slug: string; winRate: number | null; matches: number }[];
  worstMaps: { name: string; slug: string; winRate: number | null; matches: number }[];
  modes: { mode: string; winRate: number | null; matches: number }[];
  fetchedAt?: number;
  url?: string;
  error?: string | null;
}

export interface MetaData {
  fetchedAt: number | null;
  source: string;
  url: string;
  error: string | null;
  updating: boolean;
  demo?: boolean;
  patch?: { name: string; since: string } | null;
  season?: { name: string; number: number; since: string } | null;
  tiers: { tier: string; heroes: MetaHero[] }[];
  maps: MetaMap[];
  picks: { role: string; top: MetaHero | null; others: MetaHero[] }[];
  heroes?: Record<string, MetaHeroDetail>;
}

/** One AI research answer about Overwatch updates and leaks. */
export interface AiResult {
  id: string;
  engine: string;
  topic: string;
  question?: string;
  at: number;
  tookMs: number;
  summary: string;
  /** True when the hourly check made it, false when someone pressed the button. */
  auto?: boolean;
  /** How many items the previous hourly check did not have. */
  newCount?: number;
  items: { title: string; status: "confirmed" | "leak" | "rumor"; summary: string; source: string; url: string; date: string; fresh?: boolean }[];
}

export interface AiData {
  job: { id: string; state: "running" | "done" | "error"; engine?: string; topic?: string; startedAt?: number; error?: string } | null;
  /** The hourly leak check: on or off, which AI, when it last ran and when it runs next. */
  auto?: { enabled: boolean; engine: string; nextAt: number; lastAt: number; error: string | null };
  engines: Record<string, string>;
  topics: Record<string, string>;
  results: AiResult[];
  demo?: boolean;
}

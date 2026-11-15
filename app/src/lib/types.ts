export interface Machine {
  name: string;
  cpu: string;
  gpu: string;
}

/** One reading of the PC, taken once per polling interval. */
export interface Sample {
  t: number;
  gpuTemp: number | null;
  cpuLoad: number | null;
  gpuLoad: number | null;
  pingRegionMs: number | null;
  pingRouterMs: number | null;
  batteryPct: number | null;
  onAc: boolean | null;
  game: string | null;
  /** Set by the app when several reads in a row failed: every number above is empty on purpose. */
  stale?: boolean;
}

export type FeedKind = "patch" | "official" | "leak" | "news" | "video" | "community";

export type FeedPlatform = "blizzard" | "reddit" | "youtube" | "x" | "news";

export interface FeedItem {
  id: string;
  /** Set when the source is on the user's trusted list: the note to show. */
  trusted?: string;
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
  /** Post or page this event came from, when one was found. */
  url?: string;
}

/**
 * Everything the dashboard reads or changes goes through a provider, so the
 * real Windows sensors reach it one way.
 */
export interface Provider {
  id: string;
  label: string;
  machine: Machine;
  seed(count: number, endT: number): Sample[];
  readSample(): Promise<Sample>;
  /** `game` selects Overwatch vs Apex sources on the local service. */
  readFeed(game?: string): Promise<FeedItem[]>;
  /** Asks the service to look for new stories right now. */
  refreshFeed(game?: string): Promise<FeedItem[]>;
  readPlayers(game?: string): Promise<PlayersData>;
  /** Any other service endpoint (network, memory, media, sessions...). */
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

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  tracks: number;
  art: string | null;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

/** `setup` needs a Client ID, `login` needs the sign-in, `idle` has no device playing, `ready` is playing or paused. */
export interface SpotifyStatus {
  state: "setup" | "login" | "idle" | "ready" | "error";
  redirectUri: string;
  message?: string;
  title?: string;
  artist?: string;
  album?: string;
  art?: string | null;
  playing?: boolean;
  positionMs?: number;
  durationMs?: number;
  shuffle?: boolean;
  repeat?: "off" | "context" | "track";
  device?: { id: string; name: string; type: string; volume: number | null; canVolume: boolean } | null;
  devices?: SpotifyDevice[];
}

/** Elgato Wave Link 3, as the local service reports it. Levels are 0 to 1. */
export interface WaveLinkData {
  state: "ready" | "offline" | "unsupported";
  version: string;
  mixes: { id: string; name: string; level: number; isMuted: boolean }[];
  channels: { id: string; name: string; type: string; level: number; isMuted: boolean; mixes: { id: string; level: number; isMuted: boolean }[] }[];
  inputs: { id: string; name: string; isWaveDevice: boolean; inputs: { id: string; name: string; isMuted: boolean }[] }[];
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
export interface MetaMatchup {
  id: number;
  name: string;
  img: string | null;
  role: string | null;
  score: number | null;
  type: string | null;
}

export interface MetaHeroDetail {
  id: number;
  slug: string;
  name: string;
  role: string | null;
  roleColor: string | null;
  img: string | null;
  /** Queue mode this detail was built for (`5v5` from HTML, `6v6` from the CDN slice). */
  mode?: "5v5" | "6v6" | string;
  tier?: string | null;
  winRate: number | null;
  rawWinRate?: number | null;
  matches: number;
  confidence: { label: string; dots: number };
  stats: MetaCombat;
  roleAvg: MetaCombat & { heroCount: number | null };
  roleMax: MetaCombat;
  /**
   * Playstyle triangle scores 0–1.
   * Overwatch: POKE / RUSH / DIVE. Apex: POKE / SUSTAIN / DIVE (kit axes — not squad seats).
   */
  archetype: { POKE: number; DIVE: number; RUSH?: number; SUSTAIN?: number };
  lean: "POKE" | "RUSH" | "DIVE" | "SUSTAIN" | string;
  leanBlurb: string;
  mention: { label: string; why: string | null; detail: string | null } | null;
  counters?: {
    losesTo: MetaMatchup[];
    beats: MetaMatchup[];
    /** Full role-filtered lists from Counterwatch's embedded matchups (not a slice of overall top-N). */
    byRole?: {
      Tank: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
      Damage: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
      Support: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
      /** Apex legend classes (same shape as OW roles). */
      Assault?: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
      Skirmisher?: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
      Recon?: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
      Controller?: { losesTo: MetaMatchup[]; beats: MetaMatchup[] };
    };
  };
  topMaps?: { name: string; slug: string; mode: string; winRate: number | null; matches: number }[];
  bestMaps: { name: string; slug: string; winRate: number | null; matches: number }[];
  worstMaps: { name: string; slug: string; winRate: number | null; matches: number }[];
  modes: { mode: string; winRate: number | null; matches: number }[];
  fetchedAt?: number;
  url?: string;
  error?: string | null;
  /** Apex (ALS): legend popularity rate 0–1. */
  pickRate?: number | null;
  /** Apex (ALS): relative 7-day pick-rate change 0–1 (e.g. 0.0938 = 9.38%). */
  pickDelta?: number | null;
  pickDeltaDir?: "up" | "down" | null;
  avgRank?: string | null;
  avgLevel?: number | null;
  /** 1 = most picked on ALS table. */
  popularityRank?: number | null;
  /** Mean pick rate among legends sharing this class. */
  classPickAvg?: number | null;
  classPeers?: MetaHero[];
  sources?: { label: string; href: string }[];
}

export interface MetaData {
  fetchedAt: number | null;
  source: string;
  url: string;
  error: string | null;
  updating: boolean;
  /** Queue mode this payload was built for (`5v5` | `6v6`). */
  mode?: "5v5" | "6v6" | string;
  patch?: { name: string; since: string } | null;
  season?: { name: string; number: number; since: string; until?: string | null } | null;
  /** Every patch and season window with its dates (yyyy-mm-dd), newest first. */
  timeline?: { kind: "patch" | "season"; name: string; number: number | null; startsOn: string; endsOn: string | null }[];
  tiers: { tier: string; heroes: MetaHero[] }[];
  /** Apex only: weapon S–C tiers (same shape as `tiers`). */
  gunTiers?: { tier: string; heroes: MetaHero[] }[];
  maps: MetaMap[];
  picks: { role: string; top: MetaHero | null; others: MetaHero[] }[];
  heroes?: Record<string, MetaHeroDetail>;
  /** Apex weapons meta page, when different from `url`. */
  weaponsUrl?: string;
}

/** One Counterwatch rank: tiers and map heroes for that division, or empty when the slice has no rows. */
export interface MetaRank {
  rank: string;
  label: string;
  mode?: "5v5" | "6v6" | string;
  empty: boolean;
  fetchedAt: number | null;
  error: string | null;
  tiers: { tier: string; heroes: MetaHero[] }[];
  maps: (MetaMap & { heroes: MetaHero[] })[];
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
  items: { title: string; status: "confirmed" | "leak" | "rumor"; summary: string; source: string; url: string; date: string; fresh?: boolean; upcoming?: boolean; also?: { source: string; url: string }[]; trusted?: string }[];
}

export interface AiData {
  job: { id: string; state: "running" | "done" | "error"; engine?: string; topic?: string; startedAt?: number; error?: string } | null;
  /** The hourly leak check: on or off, which AI, when it last ran and when it runs next. */
  auto?: { enabled: boolean; engine: string; nextAt: number; lastAt: number; error: string | null };
  engines: Record<string, string>;
  topics: Record<string, string>;
  results: AiResult[];
}

export interface CostData {
  at: number;
  service: { cpuPct: number | null; mb: number };
  /** The desktop shell and its web view. Null when the app is run in a browser. */
  shell: { cpuPct: number | null; mb: number; processes: number } | null;
  budget: { cpuPct: number; mb: number };
}

export interface LibraryGame {
  id: string;
  source: "steam";
  appId: string;
  name: string;
  lastPlayed: number;
  sizeBytes: number;
}

export interface LibraryData {
  steam: boolean;
  battlenet: boolean;
  games: LibraryGame[];
  total: number;
}

export type DiscordStatus =
  | { state: "setup" }
  | { state: "closed" }
  | { state: "login" }
  | {
      state: "ready";
      mute: boolean;
      deaf: boolean;
      channel: { name: string; members: { name: string; mute: boolean; deaf: boolean }[] } | null;
    };

export interface SettingsData {
  /** config.json did not parse: the service runs on defaults and refuses to save settings (HTTP 409). */
  corrupt: boolean;
  closeApps: string[];
  games: string[];
  disabledSteps: string[];
  steps: string[];
  /** Sources the user tracks for leaks. Absent from an older service or backup. */
  tracked?: TrackedSource[];
  /** The always-trusted sources from the defaults. Read only. */
  builtin?: { name: string; note?: string }[];
  /** Built-in X accounts with their Official / Leak / News role. Read only. */
  builtinX?: { handle: string; kind: string; trusted?: boolean; note?: string }[];
  /** Built-in YouTube channels (Video or Leak). Read only. */
  builtinYoutube?: { name: string; kind: string; match?: string[]; trusted?: boolean; note?: string }[];
  /** Built-in subreddits (Community or Leak). Read only. */
  builtinReddit?: { sub: string; kind: string }[];
}

export type TrackedPlatform = "x" | "youtube" | "reddit" | "website";

/** Role for a tracked X / YouTube / Reddit source. Websites are Trusted-only. */
export type TrackedKind = "official" | "leak" | "news" | "video" | "community";

export interface TrackedSource {
  platform: TrackedPlatform;
  /** X handle without @, YouTube @handle or channel id, subreddit name, or domain. */
  value: string;
  note: string;
  /** Official / Leak / News (X), Leak / Video (YouTube), Community / Leak (Reddit). */
  kind?: TrackedKind;
}

/** GET /api/health. `journalFailed` counts game-mode undo steps that failed at least once and are still pending. */
export interface Health {
  ok: boolean;
  service: string;
  version: string;
  journal: number;
  journalFailed: number;
}

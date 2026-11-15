import { CARD_IDS, type CardId } from "../layout/layouts";

/** One endpoint a step waits on, and the cards that read it. No cards: always waited on. */
export interface StepSource {
  path: string;
  cards?: readonly CardId[];
  /** Answered, but the source is not set up (e.g. Spotify not connected). Counts as offline. */
  unset?: (data: unknown) => boolean;
}

export interface StepDef {
  id: string;
  label: string;
  detail: string;
  required: boolean;
  /** Share of the progress bar. Required steps count more. */
  weight: number;
  sources: readonly StepSource[];
}

// The service, then the provider (machine, profiles), then the first sample.
// Their sources are only for reference: useBoot drives these four itself.
export const CORE = "core";
export const HARDWARE = "hardware";
export const PROFILES = "profiles";
export const TELEMETRY = "telemetry";

const field = (data: unknown, key: string): unknown => (data && typeof data === "object" ? (data as Record<string, unknown>)[key] : undefined);

export const STEPS: readonly StepDef[] = [
  { id: CORE, label: "Core service", detail: "Reaching the local service…", required: true, weight: 3, sources: [{ path: "/api/health" }] },
  { id: HARDWARE, label: "Hardware scan", detail: "Scanning hardware…", required: true, weight: 3, sources: [{ path: "/api/machine" }] },
  { id: PROFILES, label: "Profiles", detail: "Loading game mode profiles…", required: true, weight: 2, sources: [{ path: "/api/profiles" }] },
  { id: TELEMETRY, label: "Live telemetry", detail: "Linking telemetry…", required: true, weight: 3, sources: [{ path: "/api/sample" }] },
  {
    id: "net",
    label: "Network uplink",
    detail: "Measuring the network…",
    required: false,
    weight: 1,
    sources: [{ path: "/api/net", cards: ["regionping", "jitter", "wifi", "verdict"] }],
  },
  {
    id: "players",
    label: "Players online",
    detail: "Counting players online…",
    required: false,
    weight: 1,
    sources: [{ path: "/api/players", cards: ["chart", "trend", "queue"] }],
  },
  {
    id: "feed",
    label: "Intel feed",
    detail: "Pulling the intel feed…",
    required: false,
    weight: 1,
    sources: [{ path: "/api/feed", cards: ["feed", "patch", "airesearch"] }],
  },
  {
    id: "meta",
    label: "Overwatch meta",
    detail: "Reading the Overwatch meta…",
    required: false,
    // Snapshot is cache-first; Counterwatch scrape continues in the background (hero/map/rank fill in later).
    weight: 2,
    sources: [{ path: "/api/meta", cards: ["tierlist", "mappicks", "bestpicks", "heroprofile", "season"] }],
  },
  {
    id: "media",
    label: "Media",
    detail: "Connecting media…",
    required: false,
    weight: 1,
    sources: [
      { path: "/api/media", cards: ["media"] },
      { path: "/api/spotify", cards: ["spotify"], unset: (d) => ["setup", "login", "error"].includes(String(field(d, "state"))) },
    ],
  },
  {
    id: "extras",
    label: "System extras",
    detail: "Reading system extras…",
    required: false,
    weight: 1,
    sources: [
      { path: "/api/system", cards: ["memory", "power"] },
      { path: "/api/cost", cards: ["cost"] },
    ],
  },
  {
    id: "stories",
    label: "Steam news",
    detail: "Pulling Steam news…",
    required: false,
    weight: 1,
    sources: [{ path: "/api/steam", cards: ["steam"] }],
  },
  {
    id: "library",
    label: "Games and sessions",
    detail: "Reading the library, sessions and Discord…",
    required: false,
    weight: 1,
    sources: [
      { path: "/api/library", cards: ["library"] },
      { path: "/api/sessions", cards: ["session", "playhistory", "report"] },
      { path: "/api/gamemode/history", cards: ["gmhistory"] },
      { path: "/api/discord", cards: ["discord"] },
    ],
  },
];

/**
 * The steps for the cards on the current tab: every required step, plus each
 * optional step with only the sources whose cards are shown. `cards` null: not
 * known yet, so assume Home's full catalog (what Home shows on a fresh start).
 */
export function stepsFor(cards: readonly CardId[] | null): StepDef[] {
  const on = new Set<CardId>(cards ?? CARD_IDS);
  const out: StepDef[] = [];
  for (const def of STEPS) {
    if (def.required) {
      out.push(def);
      continue;
    }
    const sources = def.sources.filter((s) => !s.cards || s.cards.some((c) => on.has(c)));
    if (sources.length) out.push({ ...def, sources });
  }
  return out;
}

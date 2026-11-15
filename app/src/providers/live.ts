import type { FeedItem, GameModeStep, PlayersData, Profile, Provider, Sample } from "../lib/types";

// ?svc=8799 points the page at a service on another port (for testing); the app itself always uses 8787.
const PORT = /^\d{2,5}$/.test(new URLSearchParams(location.search).get("svc") ?? "") ? new URLSearchParams(location.search).get("svc") : "8787";
const BASE = `http://127.0.0.1:${PORT}`;

/** Absolute origin of the local service — portraits and other media resolve against this. */
export const apiBase = BASE;

/** Throws the server's `{error}` text when it sent one, else "<path> → <status>". Shared by get and post. */
async function failure(path: string, res: Response): Promise<Error> {
  let msg = `${path} → ${res.status}`;
  try {
    const err = (await res.json()) as { error?: string };
    if (err.error) msg = err.error;
  } catch {
    // keep status message
  }
  return new Error(msg);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw await failure(path, res);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await failure(path, res);
  return res.json() as Promise<T>;
}

export async function liveAvailable(timeoutMs = 600): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

/** The hardware this PC reports. */
export const loadMachine = () => get<Provider["machine"]>("/api/machine");

/** The saved game mode profiles. */
export const loadProfiles = () => get<{ profiles: Profile[] }>("/api/profiles").then((r) => r.profiles);

/** The provider, once the machine and profiles are in hand. */
export function liveProvider(machine: Provider["machine"], profiles: Profile[]): Provider {
  return {
    id: "live",
    label: "This PC",
    machine,
    profiles: profiles.length ? profiles : [],
    seed(count, endT) {
      return Array.from({ length: count }, (_, i) => emptySample(endT - (count - 1 - i) * 1000));
    },
    readSample: () => get<Sample>("/api/sample"),
    readFeed: (game = "overwatch") => get<FeedItem[]>(`/api/feed?game=${encodeURIComponent(game)}`),
    refreshFeed: (game = "overwatch") => post<FeedItem[]>(`/api/feed/refresh?game=${encodeURIComponent(game)}`, {}),
    readPlayers: (game = "overwatch") => get<PlayersData>(`/api/players?game=${encodeURIComponent(game)}`),
    // GET when no body is given, POST when there is one. A POST route must be called with an explicit body
    // (use `{}` for "none"): passing `undefined` would silently turn it into a GET and a 404.
    api: <T,>(path: string, body?: unknown) => (body === undefined ? get<T>(path) : post<T>(path, body)),
    applyStep: (step: GameModeStep) => post("/api/step/apply", step).then(() => undefined),
    restoreStep: (step: GameModeStep) => post("/api/step/restore", step).then(() => undefined),
  };
}

function emptySample(t: number): Sample {
  return {
    t,
    gpuTemp: null,
    cpuLoad: null,
    gpuLoad: null,
    pingRegionMs: null,
    pingRouterMs: null,
    batteryPct: null,
    onAc: null,
    game: null,
  };
}

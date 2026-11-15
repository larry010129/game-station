import type { FeedItem, GameModeStep, Machine, PlayersData, Profile, Sample } from "./types";

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

/** Any service endpoint. GET when no body is given, POST when there is one. A POST route must be called with an
 *  explicit body (use `{}` for "none"): passing `undefined` would silently turn it into a GET and a 404. */
export const api = <T,>(path: string, body?: unknown): Promise<T> => (body === undefined ? get<T>(path) : post<T>(path, body));

export const readSample = () => get<Sample>("/api/sample");
export const readFeed = (game = "overwatch") => get<FeedItem[]>(`/api/feed?game=${encodeURIComponent(game)}`);
/** Asks the service to look for new stories right now. */
export const refreshFeed = (game = "overwatch") => post<FeedItem[]>(`/api/feed/refresh?game=${encodeURIComponent(game)}`, {});
export const readPlayers = (game = "overwatch") => get<PlayersData>(`/api/players?game=${encodeURIComponent(game)}`);
export const applyStep = (step: GameModeStep) => post("/api/step/apply", step).then(() => undefined);
export const restoreStep = (step: GameModeStep) => post("/api/step/restore", step).then(() => undefined);

/** The hardware this PC reports. */
export const loadMachine = () => get<Machine>("/api/machine");

/** The saved game mode profiles. */
export const loadProfiles = () => get<{ profiles: Profile[] }>("/api/profiles").then((r) => r.profiles);

/** A reading with nothing in it yet, the starting point before the first sample arrives. */
export function emptySample(t: number): Sample {
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

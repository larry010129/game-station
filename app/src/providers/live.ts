import type { FeedItem, GameModeStep, PlayersData, Profile, Provider, Sample } from "../lib/types";

// ?svc=8799 points the page at a service on another port (for testing); the app itself always uses 8787.
const PORT = /^\d{2,5}$/.test(new URLSearchParams(location.search).get("svc") ?? "") ? new URLSearchParams(location.search).get("svc") : "8787";
const BASE = `http://127.0.0.1:${PORT}`;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${path} → ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) msg = err.error;
    } catch {
      // keep status message
    }
    throw new Error(msg);
  }
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

/** Talks to the local Node service on this PC only. */
export async function createLiveProvider(): Promise<Provider> {
  const machine = await get<Provider["machine"]>("/api/machine");
  const { profiles } = await get<{ profiles: Profile[] }>("/api/profiles");

  return {
    id: "live",
    label: "This PC",
    machine,
    profiles: profiles.length ? profiles : [],
    seed(count, endT) {
      return Array.from({ length: count }, (_, i) => emptySample(endT - (count - 1 - i) * 1000));
    },
    readSample: () => get<Sample>("/api/sample"),
    readFeed: () => get<FeedItem[]>("/api/feed"),
    refreshFeed: () => post<FeedItem[]>("/api/feed/refresh", {}),
    readPlayers: () => get<PlayersData>("/api/players"),
    api: <T,>(path: string, body?: unknown) => (body === undefined ? get<T>(path) : post<T>(path, body)),
    applyStep: (step: GameModeStep) => post("/api/step/apply", step).then(() => undefined),
    restoreStep: (step: GameModeStep) => post("/api/step/restore", step).then(() => undefined),
  };
}

function emptySample(t: number): Sample {
  return {
    t,
    fps: null,
    frameTimeMs: null,
    gpuTemp: null,
    cpuLoad: null,
    gpuLoad: null,
    cpuClockGhz: null,
    gpuPowerW: null,
    pingRegionMs: null,
    pingRouterMs: null,
    batteryPct: null,
    onAc: null,
    game: null,
    notes: { fps: "Waiting for the first reading from this PC." },
  };
}

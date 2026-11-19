import type { ContentBundle, CurrentReleaseInfo, SignedManifest } from "./releaseTypes.ts";

const FETCH_MS = 4_000;

async function getBody<T>(url: string, read: (res: Response) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await read(res);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

const getText = (url: string, signal?: AbortSignal) => getBody(url, (res) => res.text(), signal);

/** Raw bytes: release files are hashed byte for byte, and a banner image is not text. */
const getBytes = (url: string, signal?: AbortSignal) => getBody(url, async (res) => new Uint8Array(await res.arrayBuffer()), signal);

function joinUrl(base: string, ...parts: string[]): string {
  const root = base.replace(/\/+$/, "");
  return [root, ...parts.map((p) => p.replace(/^\/+/, ""))].join("/");
}

/** Ask the release host for the latest release number. */
export async function fetchCurrentNumber(base: string, signal?: AbortSignal): Promise<number> {
  const text = await getText(joinUrl(base, "current"), signal);
  const data = JSON.parse(text) as CurrentReleaseInfo;
  if (typeof data?.number !== "number" || !Number.isFinite(data.number)) {
    throw new Error("Invalid current release response");
  }
  return data.number;
}

/** Download the signed manifest for a release number. */
export async function fetchSignedManifest(base: string, number: number, signal?: AbortSignal): Promise<SignedManifest> {
  const text = await getText(joinUrl(base, String(number), "manifest.json"), signal);
  const data = JSON.parse(text) as SignedManifest;
  if (!data?.manifest || typeof data.signature !== "string" || data.alg !== "ed25519") {
    throw new Error("Invalid signed manifest");
  }
  return data;
}

/**
 * Download file bodies whose hash changed.
 * Prefers content-addressed blobs (`/releases/blobs/{hash}`); falls back to
 * `/releases/{n}/content.json` for the content.json path.
 */
export async function fetchChangedFiles(
  base: string,
  number: number,
  files: readonly { path: string; hash: string }[],
  known: ReadonlyMap<string, string> = new Map(),
  signal?: AbortSignal,
): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  for (const f of files) {
    const want = f.hash.toLowerCase();
    if (known.get(f.path) === want) continue;
    let body: Uint8Array;
    try {
      body = await getBytes(joinUrl(base, "blobs", want), signal);
    } catch {
      if (f.path === "content.json") {
        body = await getBytes(joinUrl(base, String(number), "content.json"), signal);
      } else {
        throw new Error(`Could not download ${f.path}`);
      }
    }
    out.set(f.path, body);
  }
  return out;
}

export function parseContentBundle(raw: string): ContentBundle {
  const data = JSON.parse(raw) as ContentBundle;
  if (!data || typeof data !== "object" || !("gacha" in data)) {
    throw new Error("content.json is not a ContentBundle");
  }
  return data;
}

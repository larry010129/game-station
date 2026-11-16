/**
 * CMS → app content release contract (aligned with `cms/shared/releaseTypes.ts`).
 *
 * Dev host (localhost:1430):
 *   GET /releases/current            → CurrentReleaseInfo
 *   GET /releases/{n}/manifest.json  → SignedManifest
 *   GET /releases/{n}/content.json   → ContentBundle bytes
 *   GET /releases/blobs/{sha256}     → file bytes by content hash
 *   GET /releases/public-key         → PEM (dev)
 *
 * Signature: Ed25519 over utf8(canonicalJson(manifest)) where canonicalJson
 * sorts object keys recursively and uses no whitespace.
 *
 * Production host and signing key are TBD.
 */

export interface ReleaseFileEntry {
  path: string;
  /** SHA-256 hex of file bytes. */
  hash: string;
  size: number;
}

/** Unsigned manifest body (this object is what gets signed). */
export interface ContentReleaseManifest {
  number: number;
  publishedAt: string;
  notes: string;
  /** SHA-256 of content.json (also listed in files). */
  contentHash: string;
  files: ReleaseFileEntry[];
  /**
   * When the release goes live (ISO time). Apps keep their current content until then and switch at that moment.
   * Absent (older releases): live as soon as published.
   */
  effectiveAt?: string;
  minAppVersion?: string;
}

export interface SignedManifest {
  manifest: ContentReleaseManifest;
  /** base64 Ed25519 signature of utf8(canonicalJson(manifest)). */
  signature: string;
  alg: "ed25519";
}

export interface CurrentReleaseInfo {
  number: number;
  /** Go-live time of this (the newest) release; it may still be in the future. */
  effectiveAt?: string | null;
  publishedAt?: string | null;
  manifestPath?: string | null;
}

/** Published content.json shape. */
export interface ContentBundle {
  notes: string;
  gacha: unknown;
  themes?: unknown[];
  banners?: unknown[];
  cmsDraftVersion?: number;
  assetPaths?: string[];
}

/** Stable JSON for signing / verifying (sorted keys, no whitespace). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

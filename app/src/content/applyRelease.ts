import { setContent, validateContent, type GachaContent } from "../state/gachaContent.ts";
import { parseReleaseTheme, setReleaseThemes } from "../state/themeCatalog.ts";
import { writeAppliedRelease, type AppliedRelease } from "./contentStore.ts";
import { parseContentBundle } from "./fetchRelease.ts";
import type { ContentBundle, SignedManifest } from "./releaseTypes.ts";
import { sha256Hex, verifySignedManifest } from "./verifyRelease.ts";

const CONTENT_PATH = "content.json";

export type ApplyResult =
  | { ok: true; applied: AppliedRelease }
  | { ok: false; reason: string };

function normalizeThemes(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (const row of raw) {
    const parsed = parseReleaseTheme(row);
    if (parsed) out.push(row);
  }
  return out;
}

function changelogFromBundle(bundle: ContentBundle, notes: string): AppliedRelease["changelog"] {
  const themes = Array.isArray(bundle.themes)
    ? bundle.themes
        .map((t) => (t && typeof t === "object" && "name" in t ? String((t as { name: unknown }).name) : null))
        .filter((x): x is string => !!x)
        .slice(0, 20)
    : [];
  const banners = Array.isArray(bundle.banners)
    ? bundle.banners
        .map((b) => (b && typeof b === "object" && "title" in b ? String((b as { title: unknown }).title) : null))
        .filter((x): x is string => !!x)
        .slice(0, 20)
    : [];
  return {
    notes: bundle.notes || notes || "",
    themes,
    items: [],
    odds: [],
    banners,
  };
}

/**
 * Verify signature + hashes, validate gacha content, then apply atomically.
 * On any failure the previous content is left untouched.
 */
export async function applySignedRelease(
  signed: SignedManifest,
  bodies: ReadonlyMap<string, string | Uint8Array>,
  knownHashes: ReadonlyMap<string, string> = new Map(),
): Promise<ApplyResult> {
  if (!(await verifySignedManifest(signed))) {
    return { ok: false, reason: "bad signature" };
  }

  const { manifest } = signed;
  for (const f of manifest.files) {
    const want = f.hash.toLowerCase();
    const body = bodies.get(f.path);
    if (body != null) {
      if ((await sha256Hex(body)) !== want) return { ok: false, reason: `hash mismatch for ${f.path}` };
      continue;
    }
    if (knownHashes.get(f.path) === want) continue;
    return { ok: false, reason: `missing file ${f.path}` };
  }

  if (manifest.contentHash && !manifest.files.some((f) => f.hash.toLowerCase() === manifest.contentHash.toLowerCase())) {
    return { ok: false, reason: "contentHash not listed in files" };
  }

  const contentRaw = bodies.get(CONTENT_PATH);
  let bundle: ContentBundle;
  let content: GachaContent;

  if (contentRaw != null) {
    try {
      const text = typeof contentRaw === "string" ? contentRaw : new TextDecoder().decode(contentRaw);
      bundle = parseContentBundle(text);
    } catch {
      return { ok: false, reason: "content.json is not JSON" };
    }
    if (!validateContent(bundle.gacha)) return { ok: false, reason: "content validation failed" };
    content = bundle.gacha as GachaContent;
  } else {
    return { ok: false, reason: "content.json not downloaded" };
  }

  const themes = normalizeThemes(bundle.themes);
  const applied: AppliedRelease = {
    number: manifest.number,
    content,
    themes,
    files: manifest.files.map((f) => ({ path: f.path, hash: f.hash.toLowerCase(), size: f.size })),
    changelog: changelogFromBundle(bundle, manifest.notes),
    notes: manifest.notes ?? "",
    appliedAt: new Date().toISOString(),
  };

  if (!writeAppliedRelease(applied)) return { ok: false, reason: "could not persist release" };
  if (!setContent(content)) return { ok: false, reason: "setContent rejected" };
  // Merge after setContent succeeds so a rejected gacha apply never leaves a half-applied catalog.
  setReleaseThemes(themes);
  return { ok: true, applied };
}

/**
 * Content API adapter — talks to same-origin routes from server/http.mjs.
 *
 *   GET  /api/draft
 *   PUT  /api/draft
 *   POST /api/publish   ← { notes?: string } → { ok, number?, errors?, manifestPath? }
 *   GET  /api/releases  → { current, releases }
 *
 * Fallback: localStorage when /api/* is unavailable (static preview).
 */
import type { CmsDraft, ReleaseMeta } from "../types/draft";

const LS_KEY = "gs.cms.draft";
const LS_RELEASES = "gs.cms.releases";

export type PersistMode = "api" | "localStorage";

let mode: PersistMode = "api";

export function getPersistMode(): PersistMode {
  return mode;
}

async function tryFetch(input: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(input, init);
  } catch {
    return null;
  }
}

export async function loadDraft(): Promise<CmsDraft> {
  const res = await tryFetch("/api/draft");
  if (res?.ok) {
    mode = "api";
    return (await res.json()) as CmsDraft;
  }
  mode = "localStorage";
  const raw = localStorage.getItem(LS_KEY);
  if (raw) return JSON.parse(raw) as CmsDraft;
  throw new Error(
    "Could not load draft. Start with `npm run dev` (cms/data/draft.json) or run `npm run seed`.",
  );
}

/**
 * Upload banner art to the local CMS server.
 * POST /api/upload?folder=banners with raw image bytes + X-Filename.
 * Returns a same-origin URL like `/uploads/banners/….webp`.
 */
export async function uploadBannerArt(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const res = await tryFetch("/api/upload?folder=banners", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Filename": file.name,
    },
    body: file,
  });
  if (!res) {
    return { ok: false, error: "Upload API unreachable — start the CMS with npm run dev" };
  }
  let data: { ok?: boolean; url?: string; errors?: string[] } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, error: `Upload failed (${res.status})` };
  }
  if (!res.ok || !data.ok || !data.url) {
    return { ok: false, error: data.errors?.[0] ?? `Upload failed (${res.status})` };
  }
  return { ok: true, url: data.url };
}

export async function saveDraft(draft: CmsDraft): Promise<{ mode: PersistMode }> {
  const body = JSON.stringify({ ...draft, updatedAt: new Date().toISOString() });
  const res = await tryFetch("/api/draft", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (res?.ok) {
    mode = "api";
    return { mode };
  }
  mode = "localStorage";
  localStorage.setItem(LS_KEY, body);
  return { mode };
}

/** Publishes the draft as a numbered release that goes live at `effectiveAt` (ISO; required by the API). */
export async function publishDraft(notes?: string, effectiveAt?: string): Promise<{
  ok: boolean;
  number?: number;
  mode: PersistMode;
  note?: string;
  errors?: string[];
  manifestPath?: string;
}> {
  const res = await tryFetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes, effectiveAt }),
  });
  if (res) {
    mode = "api";
    const data = (await res.json()) as {
      ok: boolean;
      number?: number;
      errors?: string[];
      manifestPath?: string;
      note?: string;
    };
    if (!data.ok) {
      return { ok: false, mode, errors: data.errors ?? ["Publish failed"] };
    }
    return {
      ok: true,
      number: data.number,
      mode,
      note: data.note,
      manifestPath: data.manifestPath,
    };
  }
  mode = "localStorage";
  const draft = await loadDraft();
  const list = loadLocalReleases();
  const number = (list[0]?.number ?? 0) + 1;
  const entry: ReleaseMeta = {
    number,
    publishedAt: new Date().toISOString(),
    effectiveAt: effectiveAt ?? new Date().toISOString(),
    notes: notes ?? draft.releaseNotes ?? "",
  };
  localStorage.setItem(LS_RELEASES, JSON.stringify([entry, ...list]));
  return {
    ok: true,
    number,
    mode,
    note: "Published to localStorage only — API not reachable",
  };
}

export async function listReleases(): Promise<ReleaseMeta[]> {
  const res = await tryFetch("/api/releases");
  if (res?.ok) {
    const data = (await res.json()) as {
      releases: Array<{
        number: number;
        publishedAt?: string;
        effectiveAt?: string | null;
        notes?: string;
        file?: string;
        manifestPath?: string;
      }>;
    };
    return (data.releases ?? []).map((r) => ({
      number: r.number,
      publishedAt: r.publishedAt ?? "",
      effectiveAt: r.effectiveAt ?? r.publishedAt ?? null,
      notes: r.notes ?? "",
      file: r.file ?? r.manifestPath,
    }));
  }
  return loadLocalReleases();
}

function loadLocalReleases(): ReleaseMeta[] {
  try {
    return JSON.parse(localStorage.getItem(LS_RELEASES) || "[]") as ReleaseMeta[];
  } catch {
    return [];
  }
}

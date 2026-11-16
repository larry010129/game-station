import { readJson, removeKey, writeJson } from "../lib/storage.ts";
import { resetContent, setContent, type GachaContent, validateContent } from "../state/gachaContent.ts";
import { clearReleaseThemes, setReleaseThemes } from "../state/themeCatalog.ts";
import type { ReleaseFileEntry } from "./releaseTypes.ts";

const STORE_KEY = "cs.content.release";

export interface ReleaseChangelog {
  notes: string;
  themes?: string[];
  items?: string[];
  odds?: string[];
  banners?: string[];
}

export interface AppliedRelease {
  number: number;
  content: GachaContent;
  /** Parsed CMS themes from content.json (status/group/palette/name/id). */
  themes?: unknown[];
  files: ReleaseFileEntry[];
  changelog: ReleaseChangelog;
  notes: string;
  appliedAt: string;
}

function isAppliedRelease(v: unknown): v is AppliedRelease {
  if (!v || typeof v !== "object") return false;
  const a = v as AppliedRelease;
  return typeof a.number === "number" && a.number >= 0 && validateContent(a.content) && !!a.changelog;
}

/** Bundled baseline number — any CMS release must be strictly greater. */
export const BUNDLED_RELEASE_NUMBER = 0;

/** Last successfully applied release from storage, or null. */
export function readAppliedRelease(): AppliedRelease | null {
  const raw = readJson<unknown>(STORE_KEY, null);
  return isAppliedRelease(raw) ? raw : null;
}

export function writeAppliedRelease(release: AppliedRelease): boolean {
  return writeJson(STORE_KEY, release);
}

export function clearAppliedRelease(): void {
  removeKey(STORE_KEY);
  clearReleaseThemes();
}

/**
 * Restore persisted content into the gacha engine (or keep bundled).
 * Safe to call at start-up; invalid storage is ignored.
 * Also applies stored `themes` into the live theme catalog (or clears the overlay).
 */
export function hydrateContentFromStore(): { number: number; fromStore: boolean } {
  const applied = readAppliedRelease();
  if (applied && setContent(applied.content)) {
    setReleaseThemes(Array.isArray(applied.themes) ? applied.themes : null);
    return { number: applied.number, fromStore: true };
  }
  resetContent();
  clearReleaseThemes();
  return { number: BUNDLED_RELEASE_NUMBER, fromStore: false };
}

export function currentReleaseNumber(): number {
  return readAppliedRelease()?.number ?? BUNDLED_RELEASE_NUMBER;
}

/** What's-new rows for the Themes panel (from the last applied CMS release). */
export function getWhatsNewEntries(): { id: string; title: string; body: string }[] {
  const applied = readAppliedRelease();
  if (!applied) return [];
  const { number, changelog, notes } = applied;
  const entries: { id: string; title: string; body: string }[] = [];
  const bodyNotes = changelog.notes || notes;
  if (bodyNotes) {
    entries.push({ id: `release-${number}-notes`, title: `Release ${number}`, body: bodyNotes });
  }
  const pushList = (kind: string, items: string[] | undefined) => {
    if (!items?.length) return;
    entries.push({
      id: `release-${number}-${kind}`,
      title: kind[0]!.toUpperCase() + kind.slice(1),
      body: items.join("; "),
    });
  };
  pushList("themes", changelog.themes);
  pushList("items", changelog.items);
  pushList("odds", changelog.odds);
  pushList("banners", changelog.banners);
  return entries;
}

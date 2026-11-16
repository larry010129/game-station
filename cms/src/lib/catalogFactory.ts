/** Factory helpers for CMS “Add …” rows — pure, no React. */

import type {
  CmsBanner,
  CmsItem,
  CmsTheme,
  ItemKind,
  ItemTier,
  PackId,
  ThemeGroup,
  ThemePalette,
} from "../types/draft";
import { HONEST_ODDS_DISCLAIMER } from "../types/draft";

export const ITEM_KINDS: ItemKind[] = [
  "wallpaper",
  "boot",
  "alert-sound",
  "font",
  "name-flair",
  "streak-freeze",
  "layout-slot",
  "custom-upload",
];

/** Singular catalog rows required by publish validation — do not delete. */
export const PROTECTED_ITEM_IDS = new Set(["streak-freeze", "custom-upload"]);

export function defaultPalette(): ThemePalette {
  return {
    bg: "#111111",
    card: "#1a1a1a",
    text: "#ffffff",
    muted: "#888888",
    accent: "#5b8def",
    caution: "#f0b429",
    alert: "#e5484d",
    border: "#333333",
    radius: "0.5rem",
  };
}

export function slugifyThemeId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "theme";
}

export function uniqueThemeId(name: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const base = slugifyThemeId(name);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function stackableForKind(kind: ItemKind): boolean {
  return kind === "streak-freeze";
}

export function tierForKind(kind: ItemKind): ItemTier {
  if (kind === "custom-upload") return "brand";
  if (
    kind === "wallpaper" ||
    kind === "boot" ||
    kind === "layout-slot"
  ) {
    return "better";
  }
  return "common";
}

/** Next id like wallpaper-26, alert-sound-21; singular kinds stay bare unless taken. */
export function nextItemId(kind: ItemKind, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (kind === "streak-freeze" || kind === "custom-upload") {
    if (!taken.has(kind)) return kind;
  }
  let n = 1;
  while (true) {
    const id = `${kind}-${String(n).padStart(2, "0")}`;
    if (!taken.has(id)) return id;
    n += 1;
  }
}

export function defaultItemName(kind: ItemKind, id: string): string {
  const labels: Record<ItemKind, string> = {
    wallpaper: "Wallpaper",
    boot: "Boot screen",
    "alert-sound": "Alert sound",
    font: "Font unlock",
    "name-flair": "Name flair",
    "streak-freeze": "Streak freeze",
    "layout-slot": "Layout slot",
    "custom-upload": "Custom upload unlock",
  };
  const m = id.match(/-(\d+)$/);
  if (m && kind !== "streak-freeze" && kind !== "custom-upload") {
    return `${labels[kind]} ${Number(m[1])}`;
  }
  return labels[kind];
}

export function createTheme(
  existingIds: Iterable<string>,
  opts?: { name?: string; group?: ThemeGroup },
): CmsTheme {
  const name = opts?.name?.trim() || "New theme";
  return {
    id: uniqueThemeId(name, existingIds),
    name,
    group: opts?.group ?? "Regular",
    status: "Hidden",
    palette: defaultPalette(),
  };
}

export function duplicateTheme(
  source: CmsTheme,
  existingIds: Iterable<string>,
): CmsTheme {
  const name = `${source.name} copy`;
  return {
    ...source,
    id: uniqueThemeId(name, existingIds),
    name,
    status: "Hidden",
    palette: source.palette ? { ...source.palette } : defaultPalette(),
  };
}

export function createItem(
  kind: ItemKind,
  existingIds: Iterable<string>,
): CmsItem {
  const id = nextItemId(kind, existingIds);
  return {
    id,
    name: defaultItemName(kind, id),
    kind,
    stackable: stackableForKind(kind),
    tier: tierForKind(kind),
    assetPath: "",
  };
}

export function duplicateItem(
  source: CmsItem,
  existingIds: Iterable<string>,
): CmsItem {
  const id = nextItemId(source.kind, existingIds);
  return {
    ...source,
    id,
    name: `${source.name} copy`,
    assetPath: source.assetPath ?? "",
  };
}

export function createBanner(opts?: { pack?: PackId }): CmsBanner {
  return {
    id: `banner-${Date.now().toString(36)}`,
    title: "New banner",
    subtitle: "",
    pack: opts?.pack ?? "regular",
    start: new Date().toISOString().slice(0, 10),
    end: "",
    featuredIds: [],
    priority: 1,
    body: "",
    art: "",
  };
}

export function duplicateBanner(source: CmsBanner): CmsBanner {
  return {
    ...source,
    id: `banner-${Date.now().toString(36)}`,
    title: `${source.title} copy`,
  };
}

/** Fixed disclaimer always shown with banners (not editable). */
export { HONEST_ODDS_DISCLAIMER };

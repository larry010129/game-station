import { usePatreonEntitlement } from "./patreon";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { readJson, readString, removeKey, writeJson, writeString } from "../lib/storage";
import { deletePicture, loadPicture, savePicture } from "./imageStore";
import { applyPalette, parseThemeModule, type Palette, type ThemeDef } from "./palette";
import { applyTweaks, cleanTweaks, type Tweaks } from "./tweaks";
import { useCreatorUnlock } from "./creatorAccess";
import { isLookLocked } from "./lookAccess";
import {
  CHARCOAL,
  getCatalog,
  getExtraUnlockables,
  getLockedIds,
  getThemeCatalogVersion,
  subscribeThemeCatalog,
  themeStatus,
} from "./themeCatalog";
import { trackQuest } from "./useQuests";

const KEY = "cs.theme";
/** Before the wallpaper moved to IndexedDB, the whole picture lived here. */
const LEGACY_IMG_KEY = "cs.bg";
/** Small marker that a wallpaper is stored in IndexedDB under BG_ID. */
export const IMG_REF_KEY = "cs.bg.ref";
export const BG_ID = "wallpaper";
const MODULES_KEY = "cs.themeModules";
/** Theme ids unlocked via quest or pay (e.g. Nightsteel). */
export const UNLOCK_KEY = "cs.themeUnlocks";

interface Saved {
  id?: string;
  tint?: string | null;
  dim?: number;
  tweaks?: unknown;
  /** Theme ids the user starred, newest first. */
  favs?: unknown;
  /** Theme ids picked lately, newest first. */
  recent?: unknown;
  /** Whether hovering a theme tile previews it. */
  hover?: boolean;
}

const MAX_RECENT = 8;

/** A saved list of theme ids, without anything that is not a non-empty string or that repeats. */
function idList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0))).slice(0, max);
}

const DEFAULT_DIM = 35;

const read = readJson;
const write = writeJson;

function isHeic(file: File) {
  return /\.heic$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

function isPicture(file: File) {
  if (isHeic(file)) return false;
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name);
}

function mimeFor(file: File) {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  if (ext === "avif") return "image/avif";
  return "image/jpeg";
}

function shrinkToJpeg(source: CanvasImageSource, width: number, height: number, maxEdge: number): string {
  const k = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * k));
  const h = Math.max(1, Math.round(height * k));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("Could not prepare that picture.");
  ctx.drawImage(source, 0, 0, w, h);
  return cv.toDataURL("image/jpeg", 0.82);
}

function decodeViaBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image element could not decode the file"));
    };
    img.src = url;
  });
}

async function asTypedBlob(file: File): Promise<Blob> {
  const type = mimeFor(file);
  if (file.type === type) return file;
  return new Blob([await file.arrayBuffer()], { type });
}

/** Shrinks a picked picture so it stays light to store and does not weigh down the window. */
export async function prepareImage(file: File, maxEdge = 1920): Promise<string> {
  if (!isPicture(file)) {
    throw new Error(isHeic(file) ? "HEIC photos are not supported. Save as JPEG or PNG first." : "That file is not a picture.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("That picture is over 25 MB. Pick a smaller one.");
  if (file.size === 0) throw new Error("That file is empty. Pick another picture.");

  const blob = await asTypedBlob(file);
  const errors: string[] = [];

  try {
    const bitmap = await createImageBitmap(blob);
    try {
      return shrinkToJpeg(bitmap, bitmap.width, bitmap.height, maxEdge);
    } finally {
      bitmap.close();
    }
  } catch (e) {
    errors.push(`bitmap: ${e instanceof Error ? e.message : "failed"}`);
  }

  try {
    const img = await decodeViaBlob(blob);
    return shrinkToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge);
  } catch (e) {
    errors.push(`blob: ${e instanceof Error ? e.message : "failed"}`);
  }

  throw new Error(`Could not read that picture. Try a JPEG or PNG. (${errors.join("; ")})`);
}

/** Turns the old single tint into a full look so a saved colour is not dropped. */
function fromLegacyTint(hex: string): ThemeDef {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0x5b7db1;
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const base = [28, 28, 30];
  const mix = (t: number) => base.map((b, i) => Math.round(b + (c[i] - b) * t));
  const card = mix(0.34);
  return {
    id: "yours-saved-colour",
    name: "Saved colour",
    author: "You",
    group: "Yours",
    source: "yours",
    palette: {
      bg: "#0a0a0b",
      card: `rgb(${card[0]}, ${card[1]}, ${card[2]})`,
      text: "#efefef",
      muted: "#9a9a9e",
      accent: `#${m ? m[1] : "5b7db1"}`,
      caution: "#f0893a",
      alert: "#e5484d",
      border: `#${m ? m[1] : "5b7db1"}`,
      radius: "16px",
    },
  };
}

function loadModules(legacy: ThemeDef | null): ThemeDef[] {
  const raw = read<unknown>(MODULES_KEY, []);
  const saved = Array.isArray(raw) ? (raw as ThemeDef[]) : [];
  const text = (v: unknown) => typeof v === "string" && v.length > 0;
  const usable = (t: ThemeDef) =>
    t != null && t.source === "yours" && text(t.id) && t.palette != null && ["bg", "card", "text", "muted", "accent", "caution", "alert", "border", "radius"].every((k) => text((t.palette as unknown as Record<string, unknown>)[k]));
  const yours = saved.filter(usable);
  if (legacy && !yours.some((t) => t.id === legacy.id)) yours.unshift(legacy);
  return yours;
}

function readSaved(): { saved: Saved; legacy: ThemeDef | null } {
  const raw = read<unknown>(KEY, {});
  const got: Saved = raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Saved) : {};
  return { saved: got, legacy: got.id == null && got.tint ? fromLegacyTint(got.tint) : null };
}

/** Paints the saved look onto the document when App/useTheme never mounted (error screen, `?errorPreview=1`). */
export function applySavedTheme() {
  const { saved, legacy } = readSaved();
  const id = saved.id ?? legacy?.id ?? CHARCOAL.id;
  const modules = loadModules(legacy);
  const active = [...getCatalog(), ...modules].find((t) => t.id === id) ?? CHARCOAL;
  applyPalette(active.palette);
  applyTweaks(cleanTweaks(saved.tweaks));
  const dim = typeof saved.dim === "number" ? saved.dim : DEFAULT_DIM;
  document.documentElement.style.setProperty("--bg-dim", String(dim / 100));
}

export function useTheme() {
  // Saved settings are read once, not on every render.
  const [{ saved, legacy }] = useState(() => readSaved());
  const [id, setId] = useState(() => saved.id ?? legacy?.id ?? CHARCOAL.id);
  const [dim, setDimState] = useState(() => (typeof saved.dim === "number" ? saved.dim : DEFAULT_DIM));
  const [modules, setModules] = useState<ThemeDef[]>(() => loadModules(legacy));
  const [tweaks, setTweaks] = useState<Tweaks>(() => cleanTweaks(saved.tweaks));
  const [favs, setFavs] = useState<string[]>(() => idList(saved.favs, 200));
  const [recent, setRecent] = useState<string[]>(() => idList(saved.recent, MAX_RECENT));
  const [hover, setHover] = useState<boolean>(() => saved.hover === true);
  const [unlocks, setUnlocks] = useState<string[]>(() => idList(readJson<unknown>(UNLOCK_KEY, []), 50));
  /** A theme being previewed under the cursor; nothing is saved for it. */
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [image, setImageState] = useState<string | null>(null);
  const [imageSaved, setImageSaved] = useState(true);
  /** Set once the user picks or clears a wallpaper, so a slow load of the saved one cannot overwrite it. */
  const picked = useRef(false);

  // The wallpaper is kept in IndexedDB; only a small reference stays in local storage.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const old = read<string | null>(LEGACY_IMG_KEY, null);
      if (typeof old === "string" && old) {
        if (alive && !picked.current) setImageState(old);
        try {
          await savePicture(BG_ID, old);
          writeString(IMG_REF_KEY, BG_ID);
          removeKey(LEGACY_IMG_KEY);
        } catch {
          if (alive) setImageSaved(false);
        }
        return;
      }
      if (readString(IMG_REF_KEY) !== BG_ID) return;
      try {
        const data = await loadPicture(BG_ID);
        if (alive && !picked.current && data) setImageState(data);
      } catch {
        // The picture could not be read back; the theme still works without it.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Patreon Basic and the local creator unlock open every preset look without writing to the earned unlocks,
  // so turning either off never takes an earned look away.
  const { basic } = usePatreonEntitlement();
  const creator = useCreatorUnlock();
  const catalogEpoch = useSyncExternalStore(subscribeThemeCatalog, getThemeCatalogVersion, getThemeCatalogVersion);
  const lockedIds = getLockedIds();
  // Only looks that are free, earned, opened by Patreon Basic, or opened by the creator unlock can be worn.
  const lockRef = useRef({ unlocks, basic, creator, lockedIds });
  lockRef.current = { unlocks, basic, creator, lockedIds };
  const isLocked = useCallback(
    (themeId: string) => isLookLocked(themeId, lockedIds, unlocks, basic, creator),
    [unlocks, basic, creator, lockedIds, catalogEpoch],
  );
  // Hidden looks stay invisible even under Patreon Basic / creator unlock, unless already earned. Owned Archived stay wearable.
  const all = useMemo(
    () =>
      [...getCatalog(), ...getExtraUnlockables(), ...modules].filter((t) => {
        if (t.source !== "yours" && themeStatus(t) === "Hidden" && !unlocks.includes(t.id)) return false;
        return !isLookLocked(t.id, lockedIds, unlocks, basic, creator);
      }),
    [unlocks, basic, creator, modules, lockedIds, catalogEpoch],
  );
  const active = all.find((t) => t.id === id) ?? CHARCOAL;

  // Painted before the browser draws, so a light theme never flashes dark first.
  const shown = (previewId && all.find((t) => t.id === previewId)) || active;
  useLayoutEffect(() => {
    applyPalette(shown.palette);
    // The tweaks go on after the palette, which repaints everything the theme owns.
    applyTweaks(tweaks);
  }, [shown, tweaks]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--bg-dim", String(dim / 100));
  }, [dim]);

  useEffect(() => {
    write(KEY, { id: active.id, dim, tweaks, favs, recent, hover });
  }, [active, dim, tweaks, favs, recent, hover]);

  useEffect(() => {
    write(MODULES_KEY, modules);
  }, [modules]);

  useEffect(() => {
    write(UNLOCK_KEY, unlocks);
  }, [unlocks]);

  const select = useCallback((next: string) => {
    const { unlocks: earned, basic: bas, creator: cre, lockedIds: locked } = lockRef.current;
    if (isLookLocked(next, locked, earned, bas, cre)) return;
    const hit = [...getCatalog(), ...getExtraUnlockables()].find((t) => t.id === next);
    // Hidden stays off-limits under Basic/creator unless already earned.
    if (hit && themeStatus(hit) === "Hidden" && !earned.includes(next)) return;
    setPreviewId(null);
    setId(next);
    setRecent((list) => [next, ...list.filter((x) => x !== next)].slice(0, MAX_RECENT));
    trackQuest.once("look");
  }, []);

  /** Marks a gated theme as unlocked for this install (persists in `cs.themeUnlocks`). */
  const unlock = useCallback((themeId: string, opts?: { select?: boolean }) => {
    setUnlocks((list) => (list.includes(themeId) ? list : [...list, themeId]));
    // Unlock and wear it in one step: `select` would still see the old unlocks and refuse.
    if (opts?.select) {
      setPreviewId(null);
      setId(themeId);
      setRecent((list) => [themeId, ...list.filter((x) => x !== themeId)].slice(0, MAX_RECENT));
      trackQuest.once("look");
    }
  }, []);

  /** Changes some tweaks; a field set to `undefined` goes back to the theme's own value. */
  const tweak = useCallback((patch: Partial<Tweaks>) => {
    setTweaks((t) => {
      const next: Record<string, unknown> = { ...t, ...patch };
      for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
      return cleanTweaks(next);
    });
  }, []);
  const clearTweaks = useCallback(() => setTweaks({}), []);
  const toggleFav = useCallback(
    (themeId: string) => {
      if (!favs.includes(themeId)) trackQuest.once("star");
      setFavs((l) => (l.includes(themeId) ? l.filter((x) => x !== themeId) : [themeId, ...l]));
    },
    [favs],
  );
  const preview = useCallback((themeId: string | null) => setPreviewId(themeId), []);
  const setDim = useCallback((next: number) => setDimState(next), []);

  const setImage = useCallback((data: string | null) => {
    picked.current = true;
    setImageState(data);
    removeKey(LEGACY_IMG_KEY);
    void (async () => {
      try {
        if (data) {
          await savePicture(BG_ID, data);
          writeString(IMG_REF_KEY, BG_ID);
        } else {
          removeKey(IMG_REF_KEY);
          await deletePicture(BG_ID);
        }
        setImageSaved(true);
      } catch {
        // The picture still shows until the app closes.
        setImageSaved(data == null);
      }
    })();
  }, []);

  const create = useCallback((name: string, palette: Palette) => {
    const theme: ThemeDef = {
      id: `yours-${Date.now().toString(36)}`,
      name: name.trim().slice(0, 40) || "Untitled",
      author: "You",
      group: "Yours",
      source: "yours",
      palette,
    };
    setModules((list) => [...list, theme]);
    setId(theme.id);
    return theme.id;
  }, []);

  const remove = useCallback((themeId: string) => {
    setModules((list) => list.filter((t) => t.id !== themeId));
    setId((current) => (current === themeId ? CHARCOAL.id : current));
  }, []);

  const importModules = useCallback((text: string, fileName?: string) => {
    const themes = parseThemeModule(text, fileName);
    setModules((list) => [...list, ...themes]);
    if (themes[0]) setId(themes[0].id);
    return themes.length;
  }, []);

  /** Puts on a theme that came with a shared layout: its module if it brought one, else the catalogue theme of that id. */
  const applyShared = useCallback(
    (t: { id: string; tweaks: Tweaks; module?: string }) => {
      if (t.module) {
        try {
          importModules(t.module, "shared.json");
        } catch {
          // A module that cannot be read leaves the theme as it is.
        }
      } else if (getCatalog().some((c) => c.id === t.id)) select(t.id);
      setTweaks(cleanTweaks(t.tweaks));
    },
    [importModules, select],
  );

  const reset = useCallback(() => {
    setId(CHARCOAL.id);
    setDimState(DEFAULT_DIM);
    setTweaks({});
    setImage(null);
  }, [setImage]);

  return { active, dim, modules, image, imageSaved, tweaks, favs, recent, hover, unlocks, isLocked, select, unlock, applyShared, tweak, clearTweaks, toggleFav, setHover, preview, setDim, setImage, create, remove, importModules, reset };
}

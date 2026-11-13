import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { readJson, readString, removeKey, writeJson, writeString } from "../lib/storage";
import { deletePicture, loadPicture, savePicture } from "./imageStore";
import { applyPalette, parseThemeModule, type Palette, type ThemeDef } from "./palette";
import { CATALOG, CHARCOAL } from "./themeCatalog";

const KEY = "cs.theme";
/** Before the wallpaper moved to IndexedDB, the whole picture lived here. */
const LEGACY_IMG_KEY = "cs.bg";
/** Small marker that a wallpaper is stored in IndexedDB under BG_ID. */
export const IMG_REF_KEY = "cs.bg.ref";
export const BG_ID = "wallpaper";
const MODULES_KEY = "cs.themeModules";

interface Saved {
  id?: string;
  tint?: string | null;
  dim?: number;
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

export function useTheme() {
  // Saved settings are read once, not on every render.
  const [{ saved, legacy }] = useState(() => {
    const raw = read<unknown>(KEY, {});
    const got: Saved = raw != null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Saved) : {};
    return { saved: got, legacy: got.id == null && got.tint ? fromLegacyTint(got.tint) : null };
  });
  const [id, setId] = useState(() => saved.id ?? legacy?.id ?? CHARCOAL.id);
  const [dim, setDimState] = useState(() => (typeof saved.dim === "number" ? saved.dim : DEFAULT_DIM));
  const [modules, setModules] = useState<ThemeDef[]>(() => loadModules(legacy));
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

  const all = useMemo(() => [...CATALOG, ...modules], [modules]);
  const active = all.find((t) => t.id === id) ?? CHARCOAL;

  // Painted before the browser draws, so a light theme never flashes dark first.
  useLayoutEffect(() => {
    applyPalette(active.palette);
  }, [active]);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--bg-dim", String(dim / 100));
  }, [dim]);

  useEffect(() => {
    write(KEY, { id: active.id, dim });
  }, [active, dim]);

  useEffect(() => {
    write(MODULES_KEY, modules);
  }, [modules]);

  const select = useCallback((next: string) => setId(next), []);
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

  const reset = useCallback(() => {
    setId(CHARCOAL.id);
    setDimState(DEFAULT_DIM);
    setImage(null);
  }, [setImage]);

  return { active, dim, modules, image, imageSaved, select, setDim, setImage, create, remove, importModules, reset };
}

import { useCallback, useEffect, useState } from "react";

/** Card colours the user can pick. `null` is the built-in charcoal. The card style stays the same; only its colour changes. */
export const TINTS: { id: string; name: string; hex: string | null }[] = [
  { id: "charcoal", name: "Charcoal", hex: null },
  { id: "slate", name: "Slate blue", hex: "#5b7db1" },
  { id: "teal", name: "Teal", hex: "#3a9aa6" },
  { id: "forest", name: "Forest", hex: "#4f8a63" },
  { id: "amber", name: "Amber", hex: "#c98a3a" },
  { id: "crimson", name: "Crimson", hex: "#c0475a" },
  { id: "rose", name: "Rose", hex: "#c46fa0" },
  { id: "violet", name: "Violet", hex: "#8b6bd1" },
];

const KEY = "cs.theme";
const IMG_KEY = "cs.bg";
const BASE = [28, 28, 30] as const;

export interface Theme {
  tint: string | null;
  /** How much the background image is darkened, 0 to 80 percent. */
  dim: number;
}

const DEFAULT: Theme = { tint: null, dim: 35 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // blocked or full: the setting just will not survive a restart
  }
}

const parse = (hex: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (c: readonly number[], t: number) => BASE.map((b, i) => Math.round(b + (c[i] - b) * t));

/** Sets the card colour variables on the page. Style, blur and borders are untouched. */
function applyTint(hex: string | null) {
  const root = document.documentElement.style;
  const c = hex ? parse(hex) : null;
  if (!c) {
    for (const v of ["--glass", "--glass-solid", "--glass-hi", "--edge", "--edge-2", "--sel"]) root.removeProperty(v);
    return;
  }
  const [r, g, b] = mix(c, 0.34);
  const [r2, g2, b2] = mix(c, 0.3);
  root.setProperty("--glass", `rgba(${r}, ${g}, ${b}, 0.66)`);
  root.setProperty("--glass-solid", `rgba(${r2}, ${g2}, ${b2}, 0.97)`);
  root.setProperty("--glass-hi", `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.14)`);
  root.setProperty("--edge", `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.26)`);
  root.setProperty("--edge-2", `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.5)`);
  root.setProperty(
    "--sel",
    `linear-gradient(150deg, rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.45), rgba(${r}, ${g}, ${b}, 0.4) 55%, rgba(${r}, ${g}, ${b}, 0.66))`,
  );
}

function isHeic(file: File) {
  return /\.heic$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

function isPicture(file: File) {
  // Windows often leaves type empty; HEIC is image/* but WebView2 cannot decode it.
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

/** Decode via blob: URL (short) — avoids WebView2 data-URL length limits on large photos. */
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

/** Shrinks a picked picture so it fits in local storage and does not weigh down the window. */
export async function prepareImage(file: File, maxEdge = 1920): Promise<string> {
  if (!isPicture(file)) {
    throw new Error(isHeic(file) ? "HEIC photos are not supported. Save as JPEG or PNG first." : "That file is not a picture.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("That picture is over 25 MB. Pick a smaller one.");
  if (file.size === 0) throw new Error("That file is empty. Pick another picture.");

  const blob = await asTypedBlob(file);
  const errors: string[] = [];

  // Prefer createImageBitmap: decodes the Blob directly, no URL / CSP path involved.
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

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => ({ ...DEFAULT, ...read<Partial<Theme>>(KEY, {}) }));
  const [image, setImageState] = useState<string | null>(() => read<string | null>(IMG_KEY, null));
  const [imageSaved, setImageSaved] = useState(true);

  useEffect(() => {
    applyTint(theme.tint);
    write(KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-dim", String(theme.dim / 100));
  }, [theme.dim]);

  const setTint = useCallback((tint: string | null) => setTheme((t) => ({ ...t, tint })), []);
  const setDim = useCallback((dim: number) => setTheme((t) => ({ ...t, dim })), []);

  const setImage = useCallback((data: string | null) => {
    setImageState(data);
    try {
      if (data) localStorage.setItem(IMG_KEY, JSON.stringify(data));
      else localStorage.removeItem(IMG_KEY);
      setImageSaved(true);
    } catch {
      setImageSaved(false); // shows for this session only
    }
  }, []);

  const reset = useCallback(() => {
    setTheme(DEFAULT);
    setImage(null);
  }, [setImage]);

  return { theme, image, imageSaved, setTint, setDim, setImage, reset };
}

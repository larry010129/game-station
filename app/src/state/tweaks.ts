import { FONTS, type FontKey } from "./palette";

/**
 * Personal adjustments laid on top of whichever theme is active. Every field is optional:
 * a field left out means "the theme's own value", so switching themes still changes it.
 */
export interface Tweaks {
  /** Card corner radius, px. */
  radius?: number;
  /** Glass blur behind cards, px. */
  blur?: number;
  /** How much of the card colour shows, percent. */
  opacity?: number;
  /** Card shadow strength, 0 to 100. */
  shadow?: number;
  /** A colour that replaces the theme's accent. */
  accent?: string;
  /** A face that replaces the theme's own; "" never stored (that is the same as leaving it out). */
  font?: FontKey;
  /** Whole-page text size, percent. */
  size?: number;
  /** Card padding. */
  density?: Density;
}

export type Density = "compact" | "normal" | "roomy";

export const DENSITY_SCALE: Record<Density, number> = { compact: 0.72, normal: 1, roomy: 1.3 };

/** Slider limits, shared by the controls and by the cleaning of saved values. */
export const LIMITS = {
  radius: [0, 32],
  blur: [0, 30],
  opacity: [35, 100],
  shadow: [0, 100],
  size: [90, 125],
} as const;

const clamp = (v: unknown, [lo, hi]: readonly [number, number]) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : undefined);

const HEX = /^#[0-9a-f]{6}$/i;

/** Reads saved tweaks, dropping anything that is not a usable value. */
export function cleanTweaks(raw: unknown): Tweaks {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: Tweaks = {};
  const radius = clamp(o.radius, LIMITS.radius);
  const blur = clamp(o.blur, LIMITS.blur);
  const opacity = clamp(o.opacity, LIMITS.opacity);
  const shadow = clamp(o.shadow, LIMITS.shadow);
  const size = clamp(o.size, LIMITS.size);
  if (radius !== undefined) out.radius = radius;
  if (blur !== undefined) out.blur = blur;
  if (opacity !== undefined) out.opacity = opacity;
  if (shadow !== undefined) out.shadow = shadow;
  if (size !== undefined) out.size = size;
  if (typeof o.accent === "string" && HEX.test(o.accent)) out.accent = o.accent.toLowerCase();
  if (typeof o.font === "string" && FONTS.some((f) => f.key && f.key === o.font)) out.font = o.font as FontKey;
  if (o.density === "compact" || o.density === "roomy") out.density = o.density;
  return out;
}

export const hasTweaks = (t: Tweaks) => Object.keys(t).length > 0;

/**
 * Paints the tweaks. Call it right after `applyPalette` every time either changes: that call
 * repaints every property the theme owns, so a tweak always lands on top of a fresh theme value
 * and clearing one hands the property back to the theme. Only `--blur`, `--pad` and `zoom` are
 * ours alone, so those are cleared here.
 */
export function applyTweaks(t: Tweaks) {
  const style = document.documentElement.style;
  for (const p of ["--blur", "--pad", "zoom"] as const) style.removeProperty(p);

  if (t.radius !== undefined) style.setProperty("--r", `${t.radius}px`);
  if (t.blur !== undefined) style.setProperty("--blur", `${t.blur}px`);
  if (t.opacity !== undefined) style.setProperty("--glass", `color-mix(in srgb, var(--glass-solid) ${t.opacity}%, transparent)`);
  if (t.shadow !== undefined) {
    const s = t.shadow / 100;
    if (s <= 0) style.setProperty("--card-shadow", "none");
    else style.setProperty("--card-shadow", `0 ${Math.round(24 * s)}px ${Math.round(56 * s)}px -${Math.round(22 * s)}px rgba(0, 0, 0, ${(0.9 * s).toFixed(2)})`);
  }
  if (t.accent) {
    style.setProperty("--accent", t.accent);
    style.setProperty("--glow", `color-mix(in srgb, ${t.accent} 55%, transparent)`);
    style.setProperty("--glass-hi", `color-mix(in srgb, ${t.accent} 20%, transparent)`);
    style.setProperty("--sel", `linear-gradient(150deg, color-mix(in srgb, ${t.accent} 46%, transparent), color-mix(in srgb, var(--glass-solid) 70%, var(--bg)))`);
  }
  if (t.font) {
    const stack = FONTS.find((f) => f.key === t.font)?.stack;
    if (stack) style.setProperty("--ui", stack);
  }
  if (t.density) style.setProperty("--pad", String(DENSITY_SCALE[t.density]));
  if (t.size !== undefined && t.size !== 100) style.setProperty("zoom", String(t.size / 100));
}

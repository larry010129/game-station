import type { ThemeTags } from "../content/brandTags.ts";

/** A station look. Colours are any CSS colour. `null` palette means the built-in charcoal. */
export interface Palette {
  bg: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  caution: string;
  alert: string;
  border: string;
  radius: string;
  shadow?: string;
  /** The type voice; leave it out for the station's own Outfit. */
  font?: FontKey;
  /** Older saved themes and modules: the same as `font: "mono"`. */
  mono?: boolean;
}

/** The faces a theme can speak in. Outfit (the default) is the absence of a key. */
export type FontKey = "inter" | "grotesk" | "jakarta" | "serif" | "mono" | "system";

/** CJK fallbacks come last in every stack, so Traditional Chinese text keeps working in any voice. */
const CJK = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC"';

/** Picker order and labels. The bundled faces are self-hosted (see main.tsx); "system" is already on Windows. */
export const FONTS: { key: FontKey | ""; label: string; stack: string }[] = [
  { key: "", label: "Outfit (default)", stack: `"Outfit", "Segoe UI", ${CJK}, system-ui, sans-serif` },
  { key: "inter", label: "Inter", stack: `"Inter Variable", "Segoe UI", ${CJK}, system-ui, sans-serif` },
  { key: "grotesk", label: "Space Grotesk", stack: `"Space Grotesk Variable", "Segoe UI", ${CJK}, system-ui, sans-serif` },
  { key: "jakarta", label: "Plus Jakarta Sans", stack: `"Plus Jakarta Sans Variable", "Segoe UI", ${CJK}, system-ui, sans-serif` },
  { key: "serif", label: "Lora (serif)", stack: `"Lora Variable", Georgia, ${CJK}, serif` },
  { key: "mono", label: "JetBrains Mono", stack: `"JetBrains Mono Variable", "Cascadia Mono", "Cascadia Code", "Segoe UI Mono", ${CJK}, ui-monospace, monospace` },
  { key: "system", label: "System (Segoe UI)", stack: `"Segoe UI", ${CJK}, system-ui, sans-serif` },
];

const FONT_KEYS = new Set<string>(FONTS.map((f) => f.key).filter(Boolean));

/** The font key a palette speaks in, folding in the older `mono` flag. */
export function fontOf(p: Palette): FontKey | undefined {
  return p.font ?? (p.mono ? "mono" : undefined);
}

/** The CSS font stack for a palette, or undefined for the station default. */
export function fontStack(p: Palette): string | undefined {
  const key = fontOf(p);
  return key ? FONTS.find((f) => f.key === key)?.stack : undefined;
}

/** Content availability (bundled for now; later a CMS release). Omitted → see themeCatalog.themeStatus. */
export type ThemeStatus = "Hidden" | "Available" | "Archived";

export interface ThemeDef {
  id: string;
  name: string;
  author: string;
  group: string;
  source: "station" | "21st" | "yours";
  url?: string;
  palette: Palette | null;
  /** Hidden: invisible until announced. Available: shop/gacha. Archived: Past themes only (owned stay usable). */
  status?: ThemeStatus;
  /** Company themes only: which packs include it, and its country and region. */
  tags?: ThemeTags;
  /** Short note for Past themes, e.g. "Nov 2026". */
  lastAvailable?: string;
  /** Past themes may say "may return" without a date. */
  mayReturn?: boolean;
  /** Only show a return date when one has been announced. */
  returnDate?: string;
}

const APPLIED = [
  "--bg",
  "--text",
  "--dim",
  "--mute",
  "--on-text",
  "--glass",
  "--glass-solid",
  "--glass-hi",
  "--edge",
  "--edge-2",
  "--orange",
  "--accent",
  "--glow",
  "--red",
  "--r",
  "--sel",
  "--card-shadow",
  "--ui",
] as const;

type Rgb = [number, number, number];

/** How much of the card colour shows through `--glass` (82%), as a fraction. */
const GLASS_OPACITY = 0.82;

/** The colours the contrast checks need, each worked out once per `applyPalette`. */
interface Resolved {
  bg: Rgb | null;
  /** What text sits on: the card at its glass opacity over the page, or the page itself. */
  surface: Rgb | null;
  /** The card laid fully opaque over the page: what popups and bars sit on. */
  solid: Rgb | null;
  text: Rgb | null;
  muted: Rgb | null;
}

function resolvePalette(p: Palette): Resolved {
  const bg = flatten(toRgba(p.bg), [0, 0, 0]);
  const cardColor = toRgba(p.card);
  const surface = bg && cardColor ? mixRgb(bg, cardColor.rgb, GLASS_OPACITY * cardColor.a) : bg;
  // Text drawn with some transparency lands on the surface, so measure it that way.
  const solid = bg && cardColor ? mixRgb(bg, cardColor.rgb, cardColor.a) : bg;
  return { bg, surface, solid, text: surface ? flatten(toRgba(p.text), surface) : null, muted: surface ? flatten(toRgba(p.muted), surface) : null };
}

function setScheme(root: HTMLElement, r: Resolved) {
  // Light when the text is darker than the page, whatever the page's own brightness.
  const light = r.bg != null && r.text != null && luminance(r.text) < luminance(r.bg);
  root.style.colorScheme = light ? "light" : "dark";
  root.dataset.scheme = light ? "light" : "dark";
}

/** Paints the page. A null palette restores the stylesheet defaults. */
export function applyPalette(p: Palette | null) {
  const root = document.documentElement;
  const style = root.style;
  if (!p) {
    for (const name of APPLIED) style.removeProperty(name);
    root.style.colorScheme = "dark";
    root.dataset.scheme = "dark";
    return;
  }
  // Each colour is read from the browser once here; the contrast loops below only do arithmetic.
  const r = resolvePalette(p);
  style.setProperty("--bg", p.bg);
  style.setProperty("--text", p.text);
  style.setProperty("--dim", readableMuted(p, r, 0));
  style.setProperty("--mute", readableMuted(p, r, 0.28));
  style.setProperty("--on-text", onTextColor(r));
  style.setProperty("--glass", `color-mix(in srgb, ${p.card} ${GLASS_OPACITY * 100}%, transparent)`);
  if (r.solid) style.setProperty("--glass-solid", rgbOf(r.solid));
  else style.setProperty("--glass-solid", p.card);
  style.setProperty("--glass-hi", `color-mix(in srgb, ${p.accent} 20%, transparent)`);
  style.setProperty("--edge", `color-mix(in srgb, ${p.border} 70%, transparent)`);
  style.setProperty("--edge-2", p.border);
  style.setProperty("--orange", p.caution);
  // Theme tint drives accent + glow (spotlight, busy cards, boot marks). Caution stays `--orange`.
  style.setProperty("--accent", p.accent);
  style.setProperty("--glow", `color-mix(in srgb, ${p.accent} 55%, transparent)`);
  style.setProperty("--red", p.alert);
  style.setProperty("--r", p.radius);
  style.setProperty(
    "--sel",
    `linear-gradient(150deg, color-mix(in srgb, ${p.accent} 46%, transparent), color-mix(in srgb, ${p.card} 70%, ${p.bg}))`,
  );
  if (p.shadow) style.setProperty("--card-shadow", p.shadow);
  else style.removeProperty("--card-shadow");
  const stack = fontStack(p);
  if (stack) style.setProperty("--ui", stack);
  else style.removeProperty("--ui");
  setScheme(root, r);
}

/** WCAG contrast ratio of two opaque colours (1 to 21). */
function contrast(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const rgbOf = (c: Rgb) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(from[i] + (to[i] - from[i]) * t)) as Rgb;
}

/** A colour with transparency, laid over `under`. Null when the colour could not be read. */
function flatten(c: { rgb: Rgb; a: number } | null, under: Rgb): Rgb | null {
  return c ? (c.a >= 1 ? c.rgb : mixRgb(under, c.rgb, Math.max(0, c.a))) : null;
}

/** Smallest contrast for secondary text, WCAG AA for normal-size text. */
const MIN_MUTE_CONTRAST = 4.5;

/**
 * Secondary text that stays readable. Starts from the theme's muted colour pulled up to `fade`
 * (0 to 1) of the way toward the page, and backs off until it reaches AA against the card
 * (as it really looks: the card's glass over the page). A muted colour that is too faint even
 * unfaded is pushed toward the text colour instead. `r` holds the colours already worked out.
 */
function readableMuted(p: Palette, r: Resolved, fade: number): string {
  const { muted, bg, text, surface } = r;
  if (!muted || !bg || !surface) return fade > 0 ? `color-mix(in srgb, ${p.muted} ${Math.round((1 - fade) * 100)}%, ${p.bg})` : p.muted;
  const ok = (c: Rgb) => contrast(c, surface) >= MIN_MUTE_CONTRAST;
  const steps = Math.round(fade * 25);
  for (let i = steps; i >= 0; i--) {
    const c = mixRgb(muted, bg, i / 25);
    if (ok(c)) return i === 0 ? p.muted : rgbOf(c);
  }
  if (text) {
    for (let i = 1; i <= 10; i++) {
      const c = mixRgb(muted, text, i / 10);
      if (ok(c)) return rgbOf(c);
    }
    return rgbOf(text);
  }
  return p.muted;
}

const NEAR_BLACK: Rgb = [17, 17, 17];
const WHITE: Rgb = [255, 255, 255];

/** Text colour for a surface filled with the text colour: whichever of near-black or white reads better. */
function onTextColor(r: Resolved): string {
  if (!r.text) return "#111111";
  return contrast(r.text, NEAR_BLACK) >= contrast(r.text, WHITE) ? "#111111" : "#ffffff";
}

export function toHex(color: string, fallback = "#888888"): string {
  const rgb = toRgb(color);
  if (!rgb) return fallback;
  return "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
}

function luminance(rgb: Rgb): number {
  const lin = rgb.map((c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * Asks the browser for a colour's pixel: handles every format the page itself can paint (oklch,
 * lab, color-mix, named colours, space-separated hsl). Returns null when it is not a colour.
 * `a` is 0 to 1.
 */
function browserColor(color: string): { rgb: [number, number, number]; a: number } | null {
  if (typeof document === "undefined") return null;
  if (/var\(|url\(|;|\{|\}/i.test(color)) return null;
  try {
    if (typeof CSS !== "undefined" && CSS.supports && !CSS.supports("color", color)) return null;
    if (probe === undefined) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      probe = cv.getContext("2d", { willReadFrequently: true });
    }
    if (!probe) return null;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#000000";
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return { rgb: [r, g, b], a: a / 255 };
  } catch {
    return null;
  }
}

/** shadcn tokens are bare triplets: `220 14% 96%`, optionally `/ 0.5`. They are hsl() without the wrapper. */
function wrapTriplet(raw: string): string {
  return /^[\d.]+(deg)?[\s,]+[\d.]+%[\s,]+[\d.]+%(\s*\/\s*[\d.]+%?)?$/i.test(raw) ? `hsl(${raw})` : raw;
}

/**
 * Turns any colour the browser understands into one this file can do arithmetic on: `#rrggbb`, or
 * `rgba()` when it is see-through. Null when the text is not a colour, so an import can say so.
 */
export function normalizeColor(color: string): string | null {
  const raw = wrapTriplet(color.trim());
  if (!raw) return null;
  // Plain hex stays as written; the browser would only round-trip it.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw.toLowerCase();
  const got = browserColor(raw);
  if (got) {
    const hex = "#" + got.rgb.map((n) => n.toString(16).padStart(2, "0")).join("");
    return got.a >= 0.995 ? hex : `rgba(${got.rgb.join(", ")}, ${Math.round(got.a * 100) / 100})`;
  }
  // No canvas (or no answer): only formats toRgb reads on its own are accepted.
  return parseKnown(raw) ? raw : null;
}

/** The colour's red, green and blue, ignoring any transparency. */
function toRgb(color: string): Rgb | null {
  return toRgba(color)?.rgb ?? null;
}

/** The colour's red, green and blue plus its opacity (0 to 1). Null when it is not a colour. */
function toRgba(color: string): { rgb: Rgb; a: number } | null {
  const raw = wrapTriplet(color.trim());
  return parseKnown(raw) ?? browserColor(raw);
}

/** An alpha written as `0.5`, `50%` or nothing at all. */
function alphaOf(raw: string | undefined): number {
  if (raw == null || raw === "") return 1;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, raw.endsWith("%") ? n / 100 : n));
}

function parseKnown(raw: string): { rgb: Rgb; a: number } | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(raw);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const hsl = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(raw);
  if (hsl) return { rgb: hslToRgb(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100), a: alphaOf(hsl[4]) };
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(raw);
  if (rgb) return { rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])], a: alphaOf(rgb[4]) };
  return null;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function slug(name: string) {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s || "theme";
}

function radiusOf(value: unknown, fallback = "12px"): string {
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.max(0, Math.min(32, value))}px`;
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (/^\d+(\.\d+)?(px|rem)$/.test(v)) return v;
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return fallback;
}

function asPalette(raw: Record<string, unknown>): Palette | null {
  /** The first non-empty value among `keys`, as a plain colour. A value that is not a colour rejects the import. */
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const v = raw[key];
      if (typeof v === "string" && v.trim()) {
        const color = normalizeColor(v);
        if (!color) throw new Error(`Can't read "${v.trim().slice(0, 40)}" as a colour (${key}). Use hex, rgb(), hsl() or oklch().`);
        return color;
      }
    }
    return "";
  };
  const bg = pick("bg", "background");
  const text = pick("text", "foreground");
  const accent = pick("accent", "primary", "ring");
  if (!bg || !text || !accent) return null;
  const card = pick("card") || bg;
  return {
    bg,
    card,
    text,
    muted: pick("muted", "mutedForeground", "muted-foreground") || text,
    accent,
    caution: pick("caution", "warning") || "#f0893a",
    alert: pick("alert", "destructive") || "#e5484d",
    border: pick("border") || accent,
    radius: radiusOf(raw.radius),
    shadow: typeof raw.shadow === "string" ? raw.shadow : undefined,
    font: typeof raw.font === "string" && FONT_KEYS.has(raw.font) ? (raw.font as FontKey) : raw.mono === true ? "mono" : undefined,
    mono: raw.mono === true,
  };
}

function fromShadcn(vars: Record<string, string>, name: string, id: string): ThemeDef | null {
  const palette = asPalette({
    background: vars["--background"] || vars.background,
    foreground: vars["--foreground"] || vars.foreground,
    card: vars["--card"] || vars.card,
    "muted-foreground": vars["--muted-foreground"] || vars["muted-foreground"],
    primary: vars["--ring"] || vars["--primary"] || vars.primary,
    destructive: vars["--destructive"] || vars.destructive,
    border: vars["--border"] || vars.border,
    radius: vars["--radius"] || vars.radius,
    caution: vars["--chart-4"] || vars["--chart-5"] || vars["chart-4"] || vars["chart-5"] || "",
  });
  if (!palette) return null;
  if (!vars["--chart-4"] && !vars["--chart-5"]) palette.caution = "#f0893a";
  return { id, name, author: "Uploaded", group: "Yours", source: "yours", palette };
}

function cssVars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[match[1]] = match[2].trim();
  return out;
}

function fromCss(css: string, baseName: string): ThemeDef[] {
  const root = /:root\s*\{([^}]*)\}/.exec(css);
  const dark = /\.dark\s*\{([^}]*)\}/.exec(css);
  const made: ThemeDef[] = [];
  const stamp = Date.now().toString(36);
  if (root) {
    const theme = fromShadcn(cssVars(root[1]), baseName, `yours-${slug(baseName)}-${stamp}`);
    if (theme) made.push(theme);
  }
  if (dark) {
    const theme = fromShadcn(cssVars(dark[1]), `${baseName} dark`, `yours-${slug(baseName)}-dark-${stamp}`);
    if (theme) made.push(theme);
  }
  return made;
}

function fromVsCode(raw: Record<string, unknown>, name: string, id: string): ThemeDef | null {
  const colors = raw.colors;
  if (!colors || typeof colors !== "object") return null;
  const c = colors as Record<string, unknown>;
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const v = c[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  return fromShadcn(
    {
      background: get("editor.background"),
      foreground: get("editor.foreground"),
      card: get("sideBar.background", "editorWidget.background", "editor.background"),
      "muted-foreground": get("descriptionForeground", "editorLineNumber.foreground", "editor.foreground"),
      primary: get("button.background", "focusBorder", "activityBarBadge.background"),
      destructive: get("errorForeground", "editorError.foreground"),
      border: get("panel.border", "widget.border", "contrastBorder", "focusBorder"),
      "chart-4": get("editorWarning.foreground", "list.warningForeground"),
      radius: "12px",
    },
    name,
    id,
  );
}

/** Reads a theme module: this station's JSON, a shadcn token object, a VS Code theme, or 21st CSS. */
export function parseThemeModule(text: string, fileName = "theme"): ThemeDef[] {
  const base = fileName.replace(/\.(json|css)$/i, "").replace(/[-_]+/g, " ").trim() || "Uploaded theme";
  const trimmed = text.trim();
  if (!trimmed) throw new Error("That file is empty.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error("That JSON could not be read.");
    }
    const items = Array.isArray(data) ? data : [data];
    const themes: ThemeDef[] = [];
    items.forEach((item, i) => {
      if (!item || typeof item !== "object") return;
      const raw = item as Record<string, unknown>;
      const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 40) : base;
      const id = `yours-${slug(name)}-${Date.now().toString(36)}-${i}`;
      const body = raw.palette && typeof raw.palette === "object" ? (raw.palette as Record<string, unknown>) : raw;
      const direct = asPalette(body);
      if (direct) {
        themes.push({ id, name, author: "You", group: "Yours", source: "yours", palette: direct });
        return;
      }
      const code = fromVsCode(raw, name, id);
      if (code) {
        code.author = "You";
        themes.push(code);
        return;
      }
      const shad = fromShadcn(body as Record<string, string>, name, id);
      if (shad) {
        shad.author = "You";
        themes.push(shad);
      }
    });
    if (!themes.length) throw new Error("No colours found. Use a station module, a VS Code theme, or shadcn tokens.");
    return themes;
  }
  const fromStyle = fromCss(trimmed, base);
  if (!fromStyle.length) throw new Error("No theme colours found in that file.");
  return fromStyle;
}

export function moduleJson(name: string, palette: Palette): string {
  return JSON.stringify({ name, ...palette }, null, 2);
}

import type { CmsTheme, ThemePalette } from "../types/draft";

/** The app's font stacks by palette key (app: FONTS in state/palette.ts). Faces the CMS has not loaded fall back. */
const FONT_STACKS: Record<string, string> = {
  inter: '"Inter Variable", "Inter", "Segoe UI", system-ui, sans-serif',
  grotesk: '"Space Grotesk Variable", "Space Grotesk", "Segoe UI", system-ui, sans-serif',
  jakarta: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
  serif: '"Lora Variable", "Lora", Georgia, serif',
  mono: '"JetBrains Mono Variable", "JetBrains Mono", "Cascadia Mono", ui-monospace, monospace',
  system: '"Segoe UI", system-ui, sans-serif',
};
const DEFAULT_STACK = '"Outfit", "Segoe UI", system-ui, sans-serif';

const fontOf = (p: ThemePalette) => FONT_STACKS[p.font ?? (p.mono ? "mono" : "")] ?? DEFAULT_STACK;

/**
 * Theme rarity in the draw: a Brand (company) look and a rainbow Regular theme are 5★ (the rainbow badge); a standard
 * Regular theme is 4★ (the gold badge). `rainbow` is whether the theme is in the draft's `rainbowThemeIds`.
 */
export const starsOfTheme = (t: Pick<CmsTheme, "group">, rainbow = false): 4 | 5 => (t.group === "Brand" || rainbow ? 5 : 4);

export function StarTag({ stars }: { stars: 4 | 5 }) {
  return (
    <span
      className="inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-[5px] pl-1.5 pr-1 text-[11px] font-bold leading-none tabular-nums"
      style={{
        color: stars === 5 ? "#17121f" : "#1a1406",
        background:
          stars === 5
            ? "linear-gradient(100deg, #ff9db0, #ffd27a 28%, #9ef0b5 52%, #8fc3ff 74%, #c9a2ff)"
            : "linear-gradient(180deg, #f3cf6a, #d9a93a)",
      }}
      title={stars === 5 ? "5★: company theme or rainbow Regular theme (rainbow badge)" : "4★: standard Regular theme (gold badge)"}
    >
      {stars}
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
        <path fill="currentColor" d="M6 .9 7.5 4.1l3.5.4-2.6 2.4.7 3.5L6 8.7 2.9 10.4l.7-3.5L1 4.5l3.5-.4Z" />
      </svg>
      <span className="sr-only"> star</span>
    </span>
  );
}

/**
 * The look as the app's Themes page and Draw poster draw it: the theme's own background, a card with "Aa" in the
 * accent colour and the accent, caution and alert dots, then the name. Updates live as the palette is edited.
 */
export function ThemeCardPreview({ theme, rainbow = false }: { theme: CmsTheme; rainbow?: boolean }) {
  const p = theme.palette;
  if (!p) return <p className="text-xs text-muted">This theme has no palette yet, so there is nothing to preview.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex w-full max-w-[240px] flex-col gap-2 p-2.5"
        style={{ background: p.bg, color: p.text, borderRadius: p.radius, boxShadow: p.shadow, fontFamily: fontOf(p) }}
      >
        <span
          className="flex min-h-[72px] items-center justify-between border px-3 py-2.5"
          style={{ background: p.card, borderColor: p.border, borderRadius: p.radius }}
        >
          <b className="text-2xl font-medium tracking-[-0.01em]" style={{ color: p.accent }}>
            Aa
          </b>
          <span className="flex gap-[5px]" aria-hidden="true">
            {[p.accent, p.caution, p.alert].map((c, i) => (
              <i key={i} className="block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            ))}
          </span>
        </span>
        <span className="flex flex-col gap-0.5">
          <strong className="text-sm font-medium">{theme.name || theme.id}</strong>
          <small className="flex items-center gap-1.5 text-xs" style={{ color: p.muted }}>
            <StarTag stars={starsOfTheme(theme, rainbow)} />
            {theme.group === "Brand" ? "Brand theme" : rainbow ? "Rainbow Regular theme · draw only" : "Regular theme"}
          </small>
        </span>
      </div>
      <p className="text-xs text-muted">Card preview, as the app shows this theme. Fonts the CMS has not loaded fall back.</p>
    </div>
  );
}

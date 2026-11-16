import { useEffect, useRef, type CSSProperties } from "react";
import type { ThemeDef } from "../state/palette";
import { brandLogoFor } from "../content/brandLogos";
import { LookCard } from "./LookCard";
import { TagPills } from "./TagPills";

/** Relative luminance of a #rgb / #rrggbb colour, or null when it is not a hex value. */
function luminance(color: string | undefined): number | null {
  const m = color?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string | undefined, b: string | undefined): number {
  const la = luminance(a);
  const lb = luminance(b) ?? 0.01; // a non-hex background is treated as dark, like the app itself
  if (la == null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The brand's own colour when it reads on the theme's background; otherwise the theme's accent, then its text. */
function markColour(brandHex: string, look: ThemeDef): string {
  const bg = look.palette?.bg;
  if (contrast(brandHex, bg) >= 3) return brandHex;
  const accent = look.palette?.accent;
  if (accent && contrast(accent, bg) >= 3) return accent;
  return look.palette?.text ?? "#ffffff";
}

/**
 * The first time a Brand look is won: the screen floods with the look's own background, the brand mark traces
 * itself and fills, one ring of light leaves it, and the look's card rises in. Continue (or Escape) closes it.
 */
export function BrandUnlock({
  look,
  onDone,
  remaining = 0,
  doneLabel = "Continue",
}: {
  look: ThemeDef;
  onDone: () => void;
  remaining?: number;
  doneLabel?: string;
}) {
  const logo = brandLogoFor(look.id);
  const go = useRef<HTMLButtonElement>(null);
  const p = look.palette;
  const mark = logo ? markColour(logo.hex, look) : p?.accent ?? "var(--accent)";

  useEffect(() => {
    // Focus lands on Continue once it has arrived, so Enter or Space closes the moment.
    const id = window.setTimeout(() => go.current?.focus({ preventScroll: true }), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onDone();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [onDone]);

  const style = {
    "--bu-bg": p?.bg ?? "var(--bg)",
    "--bu-text": p?.text ?? "var(--text)",
    "--bu-muted": p?.muted ?? "var(--dim)",
    "--bu-mark": mark,
  } as CSSProperties;

  return (
    <div className="bu" role="dialog" aria-modal="true" aria-labelledby="bu-title" style={style}>
      <div className="bu-stage">
        <div className="bu-mark-wrap" aria-hidden="true">
          <span className="bu-ring" />
          {logo ? (
            <svg className="bu-mark" viewBox="0 0 24 24">
              <path className="bu-trace" d={logo.path} pathLength={1} />
              <path className="bu-fill" d={logo.path} />
            </svg>
          ) : (
            <span className="bu-mark bu-mark-plain">Aa</span>
          )}
        </div>
        <h2 id="bu-title" className="bu-title">
          {look.name}
        </h2>
        {look.tags ? <TagPills tags={look.tags} className="bu-tags" /> : null}
        <p className="bu-line">{logo ? `New ${logo.name} Brand look. It is unlocked.` : "New Brand look. It is unlocked."}</p>
        <LookCard look={look} className="bu-card" />
        <button ref={go} type="button" className="bu-go" onClick={onDone}>
          {remaining > 0 ? `Next (${remaining} more)` : doneLabel}
        </button>
      </div>
    </div>
  );
}

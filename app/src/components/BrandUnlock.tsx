import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { ThemeDef } from "../state/palette";
import { brandLogoFor } from "../content/brandLogos";
import { LookCard } from "./LookCard";
import { TagPills } from "./TagPills";
import { SkinSample } from "./SkinSample";
import { cardSkinById } from "../state/cardSkins";
import { CARDS, type CardId } from "../layout/layouts";

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

/** A 5-star won for the first time, shown in its own moment. */
export type FiveStarWin = { kind: "look"; id: string; brand: boolean } | { kind: "card"; id: string } | { kind: "widget"; id: string };

type Shared = { onDone: () => void; remaining?: number; doneLabel?: string };

/**
 * The dialog every 5-star moment shares: full screen, Continue focused once it arrives, Escape closes it. `variant`
 * picks the animation (CSS `.bu[data-variant]`); `mark` is the art at the top, `card` the prize itself below the words.
 */
function UnlockShell({ variant, style, mark, title, tags, line, card, onDone, remaining = 0, doneLabel = "Continue" }: Shared & {
  variant: "brand" | "rainbow" | "skin" | "widget";
  style: CSSProperties;
  mark: ReactNode;
  title: string;
  tags?: ReactNode;
  line: string;
  card: ReactNode;
}) {
  const go = useRef<HTMLButtonElement>(null);
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
  return (
    <div className="bu" data-variant={variant} role="dialog" aria-modal="true" aria-labelledby="bu-title" style={style}>
      <div className="bu-stage">
        <div className="bu-mark-wrap" aria-hidden="true">
          <span className="bu-ring" />
          {mark}
        </div>
        <h2 id="bu-title" className="bu-title">
          {title}
        </h2>
        {tags}
        <p className="bu-line">{line}</p>
        {card}
        <button ref={go} type="button" className="bu-go" onClick={onDone}>
          {remaining > 0 ? `Next (${remaining} more)` : doneLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Brand theme: the screen floods with the look's own background, the brand mark traces itself and fills, one ring of
 * light leaves it, and the look's card rises in.
 * Rainbow Regular theme: a spectrum turns once round the screen and settles into the look's background; the look's "Aa"
 * lands inside a ring of every colour.
 */
function ThemeUnlock({ look, brand, ...rest }: Shared & { look: ThemeDef; brand: boolean }) {
  const logo = brand ? brandLogoFor(look.id) : null;
  const p = look.palette;
  const mark = logo ? markColour(logo.hex, look) : p?.accent ?? "var(--accent)";
  const style = { "--bu-bg": p?.bg ?? "var(--bg)", "--bu-text": p?.text ?? "var(--text)", "--bu-muted": p?.muted ?? "var(--dim)", "--bu-mark": mark } as CSSProperties;
  return (
    <UnlockShell
      {...rest}
      variant={brand ? "brand" : "rainbow"}
      style={style}
      mark={
        logo ? (
          <svg className="bu-mark" viewBox="0 0 24 24">
            <path className="bu-trace" d={logo.path} pathLength={1} />
            <path className="bu-fill" d={logo.path} />
          </svg>
        ) : (
          <span className="bu-mark bu-mark-plain">Aa</span>
        )
      }
      title={look.name}
      tags={look.tags ? <TagPills tags={look.tags} className="bu-tags" /> : null}
      line={brand ? (logo ? `New ${logo.name} Brand theme. It is unlocked.` : "New Brand theme. It is unlocked.") : "New rainbow theme. It is unlocked."}
      card={<LookCard look={look} className="bu-card" />}
    />
  );
}

/** 5-star card skin: the skin is dealt in face down, turns over under a passing light, and settles. */
function SkinUnlock({ id, ...rest }: Shared & { id: string }) {
  const skin = cardSkinById(id);
  return (
    <UnlockShell
      {...rest}
      variant="skin"
      style={{ "--bu-mark": "#c39bff" } as CSSProperties}
      mark={
        <span className="bu-deal">
          <SkinSample id={id} className="bu-skin" />
          <i className="bu-sheen" />
        </span>
      }
      title={skin?.name ?? id}
      line={`New 5-star card skin. Put it on from the Themes page.${skin?.blurb ? ` ${skin.blurb}` : ""}`}
      card={null}
    />
  );
}

/** 5-star dashboard card: nine pieces fly in from around the screen and lock into the card, which then lights up. */
function WidgetUnlock({ id, ...rest }: Shared & { id: string }) {
  const card = CARDS[id as CardId];
  const name = card?.name ?? id;
  return (
    <UnlockShell
      {...rest}
      variant="widget"
      style={{ "--bu-mark": "var(--accent)" } as CSSProperties}
      mark={
        <span className="bu-build">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ ["--i" as string]: i, ["--dx" as string]: `${((i % 3) - 1) * 140}%`, ["--dy" as string]: `${(Math.floor(i / 3) - 1) * 140}%` } as CSSProperties} />
          ))}
          <b>{name.slice(0, 2)}</b>
        </span>
      }
      title={name}
      line={`New 5-star dashboard card. Add it from Edit layout.${card?.blurb ? ` ${card.blurb}.` : ""}`}
      card={null}
    />
  );
}

/** Every 5-star won for the first time gets its own moment: Brand and rainbow themes, card skins, dashboard cards. */
export function FiveStarUnlock({ win, look, ...rest }: Shared & { win: FiveStarWin; look?: ThemeDef }) {
  if (win.kind === "card") return <SkinUnlock id={win.id} {...rest} />;
  if (win.kind === "widget") return <WidgetUnlock id={win.id} {...rest} />;
  return look ? <ThemeUnlock look={look} brand={win.brand} {...rest} /> : <SkipMoment onDone={rest.onDone} />;
}

/** A theme whose look is not loaded has nothing to show: move on rather than hold the draw. */
function SkipMoment({ onDone }: { onDone: () => void }) {
  useEffect(() => onDone(), [onDone]);
  return null;
}

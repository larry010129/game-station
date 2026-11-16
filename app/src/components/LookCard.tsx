import type { ThemeDef } from "../state/palette";
import { fontStack } from "../state/palette";

/**
 * A look drawn the way the Themes page draws it: the real colours, "Aa", the three dots, the name and the author.
 * Uses the same theme-pick classes, so it stays in step with that page.
 */
export function LookCard({ look, className = "" }: { look: ThemeDef; className?: string }) {
  const p = look.palette;
  return (
    <div className={`theme-pick-wrap ${className}`.trim()}>
      <div
        className="theme-pick"
        style={p ? { background: p.bg, color: p.text, borderRadius: p.radius, boxShadow: p.shadow } : undefined}
      >
        <span
          className="theme-pick-card"
          style={p ? { background: p.card, borderColor: p.border, borderRadius: p.radius, fontFamily: fontStack(p) } : undefined}
        >
          <b style={{ color: p?.accent }}>Aa</b>
          <span className="theme-pick-dots" aria-hidden="true">
            <i style={{ background: p?.accent }} />
            <i style={{ background: p?.caution }} />
            <i style={{ background: p?.alert }} />
          </span>
        </span>
        <span className="theme-pick-meta">
          <strong>{look.name}</strong>
          <small style={{ color: p?.muted }}>{look.author}</small>
        </span>
      </div>
    </div>
  );
}

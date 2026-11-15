import { FONTS, type FontKey } from "../state/palette";
import { LIMITS, hasTweaks, type Density, type Tweaks } from "../state/tweaks";
import { Segmented } from "./Segmented";

interface Props {
  tweaks: Tweaks;
  /** What the active theme itself uses, shown until a slider is moved. */
  base: { radius: number; opacity: number; accent: string };
  onTweak: (patch: Partial<Tweaks>) => void;
  onClear: () => void;
  hover: boolean;
  onHover: (on: boolean) => void;
}

type Slide = "radius" | "blur" | "opacity" | "shadow" | "size";

const ROWS: { key: Slide; label: string; unit: string; fallback: number }[] = [
  { key: "radius", label: "Corners", unit: "px", fallback: 16 },
  { key: "blur", label: "Glass blur", unit: "px", fallback: 12 },
  { key: "opacity", label: "Card opacity", unit: "%", fallback: 82 },
  { key: "shadow", label: "Card shadow", unit: "", fallback: 0 },
  { key: "size", label: "Text size", unit: "%", fallback: 100 },
];

const DENSITIES: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "roomy", label: "Roomy" },
];

/**
 * Personal adjustments over the active theme. A control shows the theme's own value until it
 * is touched; "Reset tweaks" hands every one back to the theme.
 */
export function ThemeTune({ tweaks, base, onTweak, onClear, hover, onHover }: Props) {
  const shown = (key: Slide, fallback: number) => tweaks[key] ?? (key === "radius" ? base.radius : key === "opacity" ? base.opacity : fallback);
  return (
    <section className="vault-card theme-tune" aria-label="Fine-tune the look">
      <h3>Fine-tune</h3>
      <p className="hint">Changes sit on top of any theme. Untouched controls follow the theme you pick.</p>
      <div className="theme-tune-grid">
        {ROWS.map((r) => {
          const [lo, hi] = LIMITS[r.key];
          const set = tweaks[r.key] !== undefined;
          return (
            <label key={r.key} className="range">
              <span>{r.label}</span>
              <input type="range" min={lo} max={hi} step={1} value={shown(r.key, r.fallback)} aria-label={r.label} onChange={(e) => onTweak({ [r.key]: Number(e.target.value) })} />
              <output className={set ? "" : "dim"}>
                {shown(r.key, r.fallback)}
                {r.unit}
              </output>
            </label>
          );
        })}
        <label className="range">
          <span>Accent</span>
          <input type="color" aria-label="Accent colour" value={tweaks.accent ?? base.accent} onChange={(e) => onTweak({ accent: e.target.value })} />
          {tweaks.accent ? (
            <button type="button" className="link" onClick={() => onTweak({ accent: undefined })}>
              Use theme's
            </button>
          ) : (
            <output className="dim">theme</output>
          )}
        </label>
        <label className="range">
          <span>Font</span>
          <select value={tweaks.font ?? ""} aria-label="Font" onChange={(e) => onTweak({ font: (e.target.value || undefined) as FontKey | undefined })} style={{ fontFamily: FONTS.find((f) => f.key === tweaks.font)?.stack }}>
            <option value="">Follow theme</option>
            {FONTS.filter((f) => f.key).map((f) => (
              <option key={f.key} value={f.key} style={{ fontFamily: f.stack }}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <div className="range">
          <span>Spacing</span>
          <Segmented label="Card spacing" value={tweaks.density ?? "normal"} options={DENSITIES} onChange={(v) => onTweak({ density: v === "normal" ? undefined : v })} />
        </div>
      </div>
      <div className="theme-form-actions">
        <label className="theme-check">
          <input type="checkbox" checked={hover} onChange={(e) => onHover(e.target.checked)} />
          Preview a theme while hovering it
        </label>
        <button type="button" className="pill-btn" disabled={!hasTweaks(tweaks)} onClick={onClear}>
          Reset tweaks
        </button>
      </div>
    </section>
  );
}

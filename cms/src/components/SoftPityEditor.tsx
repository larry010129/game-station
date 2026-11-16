import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { Field, Input } from "../ui/primitives";
import { chanceAt, CURVE_MAX, CURVE_MIN, type SoftPityDraft } from "../lib/softPity";

export type { SoftPityDraft };

/** Slider 0..100 ↔ curve: 50 is even (1), each 21.5 steps doubles or halves it, so both ends feel equally strong. */
const curveOf = (v: number) => Math.min(CURVE_MAX, Math.max(CURVE_MIN, 2 ** ((v - 50) / 21.5)));
const sliderOf = (c: number) => Math.round(50 + 21.5 * Math.log2(c));

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

/**
 * One kind of 5-star pity: the guaranteed draw, and the soft pity that raises the chance before it. The chart shows
 * the 5-star chance at each draw since the last 5-star, so the curve slider can be judged by eye.
 */
export function SoftPityEditor({
  title,
  basePct,
  guaranteedAt,
  soft,
  onGuaranteedAt,
  onSoft,
}: {
  title: string;
  /** The pack's base 5-star chance per draw, in percent. */
  basePct: number;
  /** The draw that is always a 5-star (pity after + 1). */
  guaranteedAt: number;
  soft: SoftPityDraft | null;
  onGuaranteedAt: (draw: number) => void;
  onSoft: (soft: SoftPityDraft | null) => void;
}) {
  const id = useId();
  const base = Math.max(0, basePct) / 100;
  const on = soft != null && soft.from < guaranteedAt;
  const from = soft?.from ?? Math.max(1, Math.round(guaranteedAt * 0.82));
  const curve = soft?.curve ?? 1;

  // Chart: draws from a little before soft pity to the guaranteed draw; chance 0..100%.
  const W = 300;
  const H = 120;
  const x0 = Math.max(1, Math.min(from, guaranteedAt) - 8);
  const span = Math.max(1, guaranteedAt - x0);
  const xs = (d: number) => ((d - x0) / span) * (W - 8) + 4;
  const ys = (c: number) => H - 6 - c * (H - 12);
  const points: string[] = [];
  for (let d = x0; d <= guaranteedAt; d++) points.push(`${xs(d).toFixed(1)},${ys(chanceAt(d, base, guaranteedAt, on ? { from, curve } : null)).toFixed(1)}`);
  const mid = Math.round((from + guaranteedAt - 1) / 2);
  const sample = on
    ? [from, mid, guaranteedAt - 1].filter((d, i, a) => d < guaranteedAt && a.indexOf(d) === i).map((d) => `draw ${d}: ${pct(chanceAt(d, base, guaranteedAt, { from, curve }))}`)
    : [];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/70 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">{title}</h3>
        <span className="text-xs text-muted tabular-nums">base {pct(base)} per draw</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Guaranteed by draw" hint="That draw is always a 5-star">
          <Input
            type="number"
            min={2}
            value={guaranteedAt}
            onChange={(e) => onGuaranteedAt(Math.max(2, Math.floor(Number(e.target.value) || 2)))}
          />
        </Field>
        <Field label="Chance rises from draw" hint={on ? "Counted since the last 5-star" : "Soft pity is off"}>
          <div className="flex items-center gap-2">
            <Switch
              checked={on}
              onCheckedChange={(v) => onSoft(v ? { from: Math.min(from, guaranteedAt - 1), curve } : null)}
              aria-label="Soft pity on or off"
            />
            <Input
              type="number"
              min={1}
              max={guaranteedAt - 1}
              disabled={!on}
              value={from}
              onChange={(e) => onSoft({ from: Math.min(guaranteedAt - 1, Math.max(1, Math.floor(Number(e.target.value) || 1))), curve })}
              className="w-20"
            />
          </div>
        </Field>
      </div>

      <div className={on ? "" : "pointer-events-none opacity-50"}>
        <div className="mb-1 flex items-center justify-between text-xs">
          <label htmlFor={`${id}-curve`} className="font-medium text-muted">
            Curve
          </label>
          <span className="font-mono tabular-nums text-muted">progress^{curve.toFixed(2)}</span>
        </div>
        <input
          id={`${id}-curve`}
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={!on}
          value={sliderOf(curve)}
          onChange={(e) => onSoft({ from, curve: Math.round(curveOf(Number(e.target.value)) * 100) / 100 })}
          className="w-full accent-[var(--primary)]"
          aria-valuetext={curve < 0.9 ? "Fast: climbs early" : curve > 1.1 ? "Late: stays low, then climbs" : "Even steps"}
        />
        <div className="flex justify-between text-[11px] text-muted">
          <span>Fast</span>
          <span>Even</span>
          <span>Late</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full text-primary" role="img" aria-label={`5-star chance by draw, ${title}`}>
        {[0, 0.5, 1].map((c) => (
          <line key={c} x1={4} x2={W - 4} y1={ys(c)} y2={ys(c)} stroke="currentColor" strokeOpacity={0.12} />
        ))}
        {on ? <line x1={xs(from)} x2={xs(from)} y1={6} y2={H - 6} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 3" /> : null}
        <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
        <text x={8} y={ys(1) + 10} textAnchor="start" className="fill-current text-[9px]" opacity={0.7}>
          100% at {guaranteedAt}
        </text>
      </svg>
      <p className="text-xs text-muted">
        chance = base + (100% − base) × progress<sup>{curve.toFixed(2)}</sup>
        {sample.length ? ` · ${sample.join(" · ")}` : ""}
      </p>
    </div>
  );
}

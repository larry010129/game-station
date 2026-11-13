import type { MetaCombat, MetaHeroDetail } from "../../lib/types";

export const ARCH_COLORS: Record<string, string> = { POKE: "#eab308", RUSH: "#f0893a", DIVE: "#a78bfa" };
export const STAT_ROWS: { key: keyof MetaCombat; label: string }[] = [
  { key: "kills", label: "Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "assists", label: "Assists" },
  { key: "damage", label: "Damage" },
];

export function polar(cx: number, cy: number, r: number, i: number, n: number) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
}

export function poly(values: number[], cx: number, cy: number, r: number) {
  const n = values.length;
  return values.map((v, i) => polar(cx, cy, r * Math.max(0, Math.min(1, v)), i, n).join(",")).join(" ");
}

/** K / D / A / DMG radar: filled hero vs dotted role average (Counterwatch-style). */
export function CombatRadar({ hero, avg, max }: { hero: MetaCombat; avg: MetaCombat; max: MetaCombat }) {
  const keys: (keyof MetaCombat)[] = ["kills", "deaths", "assists", "damage"];
  const labels = ["K", "D", "A", "DMG"];
  const scale = (o: MetaCombat) => keys.map((k) => {
    const m = Math.max(Number(max[k]) || 0, Number(avg[k]) || 0, Number(hero[k]) || 0, 1);
    return (Number(o[k]) || 0) / m;
  });
  const cx = 70;
  const cy = 70;
  const r = 48;
  const n = 4;
  const rings = [0.33, 0.66, 1];
  return (
    <svg className="hradar" viewBox="0 0 140 140" role="img" aria-label="Combat stats versus role average">
      {rings.map((t) => (
        <polygon key={t} className="hgrid" points={Array.from({ length: n }, (_, i) => polar(cx, cy, r * t, i, n).join(",")).join(" ")} />
      ))}
      {keys.map((_, i) => {
        const [x, y] = polar(cx, cy, r, i, n);
        return <line key={i} className="hspoke" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon className="havg" points={poly(scale(avg), cx, cy, r)} />
      <polygon className="hfill" points={poly(scale(hero), cx, cy, r)} />
      {labels.map((lab, i) => {
        const [x, y] = polar(cx, cy, r + 14, i, n);
        return (
          <text key={lab} className="hlab" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

/** POKE / RUSH / DIVE triangle with the lean vertex emphasized. */
export function ArchetypeRadar({ scores, lean }: { scores: MetaHeroDetail["archetype"]; lean: string }) {
  const keys = ["POKE", "RUSH", "DIVE"] as const;
  const values = keys.map((k) => scores[k] ?? 0);
  const cx = 70;
  const cy = 78;
  const r = 52;
  const n = 3;
  return (
    <svg className="hradar arch" viewBox="0 0 140 150" role="img" aria-label={`Composition fit: ${keys.map((k, i) => `${k} ${Math.round(values[i] * 100)}%`).join(", ")}`}>
      {[0.33, 0.66, 1].map((t) => (
        <polygon key={t} className="hgrid" points={Array.from({ length: n }, (_, i) => polar(cx, cy, r * t, i, n).join(",")).join(" ")} />
      ))}
      <polygon className="hfill arch" points={poly(values, cx, cy, r)} />
      {keys.map((k, i) => {
        const [x, y] = polar(cx, cy, r * values[i], i, n);
        const [lx, ly] = polar(cx, cy, r + 18, i, n);
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={3.5} fill={ARCH_COLORS[k]} />
            <text className={`hlab ${k === lean ? "on" : ""}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={ARCH_COLORS[k]}>
              {k}
              <tspan className="hpct" x={lx} dy="1.15em">
                {Math.round(values[i] * 100)}%
              </tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Dual-layer bar: hero fill vs a notch for the role average. */
export function CmpBar({ value, avg, color }: { value: number; avg: number; color: string }) {
  const top = Math.max(value, avg, 0.001) * 1.08;
  return (
    <div className="hcmp" aria-hidden="true">
      <i style={{ width: `${(value / top) * 100}%`, background: color }} />
      <b style={{ left: `${(avg / top) * 100}%` }} />
    </div>
  );
}

export function Dots({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <span className="hdots" aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < n ? "on" : ""} />
      ))}
    </span>
  );
}

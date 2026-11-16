import {
  WEIGHT_KEYS,
  WEIGHT_LABELS,
  nearly100,
  type PackWeightsPct,
} from "../types/draft";

/** Distinct hues on the CMS surfaces — readable next to muted legend text. */
const SLICE_COLORS: Record<keyof PackWeightsPct, string> = {
  regularTheme: "#4f8cff",
  brandTheme: "#a78bfa",
  rainbowRegular: "#f0a3d0",
  pick: "#6ecf97",
  customUpload: "#e0b84a",
  better: "#7eb0f0",
  common: "#8b93a7",
};

type Slice = { key: keyof PackWeightsPct; label: string; value: number; color: string };

function slicesFrom(weights: PackWeightsPct): Slice[] {
  return WEIGHT_KEYS.map((key) => ({
    key,
    label: WEIGHT_LABELS[key],
    value: Number(weights[key]) || 0,
    color: SLICE_COLORS[key],
  }));
}

export function OddsPieChart({ weights }: { weights: PackWeightsPct }) {
  const slices = slicesFrom(weights);
  const sum = slices.reduce((s, x) => s + x.value, 0);
  const ok = nearly100(sum);

  // Absolute % of a full turn so under/over 100% leaves a gap or wraps.
  let cursor = 0;
  const stops: string[] = [];
  for (const s of slices) {
    if (s.value <= 0) continue;
    const start = cursor;
    cursor += s.value;
    stops.push(`${s.color} ${start}% ${cursor}%`);
  }
  if (cursor < 100) {
    stops.push(`color-mix(in srgb, var(--cms-edge) 55%, transparent) ${cursor}% 100%`);
  }

  const ring = ok ? "var(--cms-edge)" : "var(--cms-danger)";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="relative size-36 shrink-0 rounded-full"
        style={{
          background: stops.length
            ? `conic-gradient(from -90deg, ${stops.join(", ")})`
            : "var(--cms-surface-raised)",
          boxShadow: `inset 0 0 0 2px ${ring}`,
        }}
        role="img"
        aria-label={`Pack odds sum ${sum.toFixed(1)} percent`}
      >
        <div
          className="absolute inset-[22%] flex items-center justify-center rounded-full bg-[var(--cms-surface)] text-center"
          style={{ boxShadow: `0 0 0 2px ${ring}` }}
        >
          <span
            className={`text-sm font-semibold tabular-nums ${
              ok ? "text-[var(--cms-ink)]" : "text-[var(--cms-danger)]"
            }`}
          >
            {sum.toFixed(1)}%
          </span>
        </div>
      </div>

      <ul className="min-w-[10rem] flex-1 space-y-1.5 text-xs">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[var(--cms-muted)]">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="flex-1 text-[var(--cms-ink)]">{s.label}</span>
            <span className="tabular-nums">{s.value.toFixed(1)}%</span>
          </li>
        ))}
        {!ok ? (
          <li className="pt-1 text-[var(--cms-danger)]">Sum must be 100%</li>
        ) : null}
      </ul>
    </div>
  );
}

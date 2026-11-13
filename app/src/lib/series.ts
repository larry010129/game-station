export const TARGET_FPS = 144;
export const TEMP_LIMIT = 95;

export type TempState = "ok" | "caution" | "hot";

export function tempState(t: number | null): TempState {
  if (t == null) return "ok";
  if (t >= 92) return "hot";
  if (t >= 86) return "caution";
  return "ok";
}

export const TEMP_WORD: Record<TempState, string> = {
  ok: "Nominal",
  caution: "Caution",
  hot: "Too hot",
};

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export interface DipRun {
  start: number;
  end: number;
  min: number;
}

/** Consecutive samples under the target, as index ranges. Nulls are ignored. */
export function dipRuns(values: Array<number | null>, target = TARGET_FPS): DipRun[] {
  const runs: DipRun[] = [];
  let cur: DipRun | null = null;
  values.forEach((v, i) => {
    if (v != null && v < target) {
      if (!cur) {
        cur = { start: i, end: i, min: v };
        runs.push(cur);
      }
      cur.end = i;
      cur.min = Math.min(cur.min, v);
    } else {
      cur = null;
    }
  });
  return runs;
}

export function average(values: Array<number | null>) {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/** Splits the series into equal blocks and averages each one. */
export function blockAverages(values: Array<number | null>, blocks: number) {
  const size = Math.floor(values.length / blocks);
  return Array.from({ length: blocks }, (_, b) => average(values.slice(b * size, (b + 1) * size)));
}

export function points(values: Array<number | null>, width: number, y: (v: number) => number) {
  const last = Math.max(1, values.length - 1);
  return values
    .map((v, i) => (v == null ? null : `${((i / last) * width).toFixed(1)},${y(v).toFixed(1)}`))
    .filter((p): p is string => p != null)
    .join(" ");
}

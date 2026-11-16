/**
 * A tiny timeline toolkit, in the style of Remotion's interpolate() and Easing: one clock (milliseconds) drives
 * every moving part, and each property is worked out from it. Nothing is a CSS keyframe, so parts that must stay
 * in line cannot drift apart, and any moment can be rendered by passing a time.
 */
export type Ease = (x: number) => number;

/** Cubic-bezier easing, same curve as CSS cubic-bezier(x1, y1, x2, y2). */
function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  const dx = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(s) - x;
      if (Math.abs(err) < 1e-5) return sy(s);
      const d = dx(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(s);
      if (Math.abs(v - x) < 1e-5) break;
      if (v < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
}

export const Easing = {
  linear: ((x: number) => x) as Ease,
  bezier,
  /** Starts fast, settles slowly: for things that arrive and lock. */
  out: bezier(0.16, 1, 0.3, 1),
  /** Slow, then fast, then slow: for things that move across. */
  inOut: bezier(0.65, 0, 0.35, 1),
};

/** 0 to 1 across [from, to] ms, clamped, with an optional easing. */
export function progress(t: number, from: number, to: number, ease: Ease = Easing.linear): number {
  if (to <= from) return t >= to ? 1 : 0;
  return ease(Math.min(1, Math.max(0, (t - from) / (to - from))));
}

/** Maps t across the input stops to the output values, clamped at both ends. Easing applies within each segment. */
export function interpolate(t: number, input: readonly number[], output: readonly number[], ease: Ease = Easing.linear): number {
  if (t <= input[0]) return output[0];
  const last = input.length - 1;
  if (t >= input[last]) return output[last];
  let i = 0;
  while (i < last - 1 && t > input[i + 1]) i++;
  const p = ease((t - input[i]) / (input[i + 1] - input[i]));
  return output[i] + (output[i + 1] - output[i]) * p;
}

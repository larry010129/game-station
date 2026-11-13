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

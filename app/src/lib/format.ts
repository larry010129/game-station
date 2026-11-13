const pad = (n: number) => String(n).padStart(2, "0");

/** Missing live readings show as an em dash, never as a made-up number. */
export function dash(v: number | null | undefined, digits?: number) {
  if (v == null || Number.isNaN(v)) return "—";
  return digits == null ? String(v) : v.toFixed(digits);
}

export function clockTime(t: number) {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function age(t: number, now = Date.now()) {
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

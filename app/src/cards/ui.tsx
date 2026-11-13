import type { ReactNode } from "react";
import { useStationCtx } from "../state/useApi";

/** Poll interval that slows down during a match: `normal` ms, `slow` ms while quiet (0 stops it). */
export function useEvery(normal: number, slow = 0) {
  return useStationCtx().quiet ? slow : normal;
}

interface CardProps {
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  label?: string;
}

/** The common shell: same glass tile, title and corner as the built-in cards. */
export function Card({ title, sub, right, children, label }: CardProps) {
  return (
    <section className="t kcard" aria-label={label ?? title}>
      <div className="th">
        <div>
          <h2>{title}</h2>
          {sub != null && <small>{sub}</small>}
        </div>
        {right}
      </div>
      <div className="kbody">{children}</div>
    </section>
  );
}

export type Tone = "ok" | "or" | "red" | "dim";

export function Bar({ pct, tone = "ok", label }: { pct: number | null; tone?: Tone; label?: string }) {
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="kbar" role="meter" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <i className={tone} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** `45 min`, `2 h 05 min`. */
export function span(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

export const gb = (mb: number) => (mb / 1024).toFixed(1);

export function Sparkline({ values, height = 56, lo, hi }: { values: (number | null)[]; height?: number; lo?: number; hi?: number }) {
  const got = values.filter((v): v is number => v != null);
  if (!got.length) return <div className="kspark" style={{ height }} />;
  const min = lo ?? Math.min(...got);
  const max = Math.max(hi ?? Math.max(...got), min + 1);
  const W = 300;
  const y = (v: number) => height - 3 - ((v - min) / (max - min)) * (height - 8);
  const n = Math.max(values.length - 1, 1);
  const segs: string[] = [];
  let cur: string[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (cur.length) segs.push(cur.join(" "));
      cur = [];
    } else cur.push(`${((i / n) * W).toFixed(1)},${y(v).toFixed(1)}`);
  });
  if (cur.length) segs.push(cur.join(" "));
  return (
    <svg className="kspark" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" aria-hidden="true" style={{ height }}>
      {segs.map((p, i) => (
        <polyline key={i} className="l" points={p} />
      ))}
      {values.map((v, i) => (v == null ? <line key={`d${i}`} className="drop" x1={(i / n) * W} x2={(i / n) * W} y1={2} y2={height - 2} /> : null))}
    </svg>
  );
}

import { useEffect, useMemo, useState } from "react";
import { clockTime } from "../lib/format";
import type { GameModeRun, SessionsData } from "../lib/types";
import { useApi } from "../state/useApi";
import { Bar, Card, Empty, span, useEvery } from "./ui";

const HOUR = 3600_000;
const BREAK_KEY = "cs.break.hours";

function useSessions() {
  const ms = useEvery(10_000, 60_000);
  return useApi<SessionsData>("/api/sessions", ms);
}

export function SessionCard() {
  const { data } = useSessions();
  const [now, setNow] = useState(Date.now());
  const [limit, setLimit] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(BREAK_KEY)) || 2;
    } catch {
      return 2;
    }
  });
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const change = (d: number) => {
    const next = Math.min(6, Math.max(0.5, limit + d));
    setLimit(next);
    try {
      localStorage.setItem(BREAK_KEY, String(next));
    } catch {
      // not saved
    }
  };
  if (!data) return <Card title="Session timer"><Empty>Loading...</Empty></Card>;
  const cur = data.current;
  const last = data.history[data.history.length - 1];
  const elapsed = cur ? now - cur.start : 0;
  const due = cur != null && elapsed >= limit * HOUR;
  return (
    <Card
      title="Session timer"
      sub={cur ? cur.game.replace(/\.exe$/i, "") : "No game running"}
      right={due ? <span className="chip or">Take a break</span> : <span className="chip">Break every {limit} h</span>}
    >
      {cur ? (
        <>
          <div className="big">{hms(elapsed)}</div>
          <Bar pct={(elapsed / (limit * HOUR)) * 100} tone={due ? "or" : "ok"} label="Time until break" />
        </>
      ) : (
        <Empty>{last ? `Last session: ${span(last.end - last.start)}, ended ${new Date(last.end).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}.` : "Start a game and the timer starts by itself."}</Empty>
      )}
      <div className="kstep">
        <small>Break reminder</small>
        <button aria-label="Shorter" onClick={() => change(-0.5)}>−</button>
        <b>{limit} h</b>
        <button aria-label="Longer" onClick={() => change(0.5)}>+</button>
      </div>
    </Card>
  );
}

function hms(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Hours played on each of the last 7 local days, splitting a session that crosses midnight. */
function dayHours(data: SessionsData) {
  const days: { label: string; ms: number; start: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString([], { weekday: "short" }), ms: 0, start: d.getTime() });
  }
  const all = [...data.history.map((h) => ({ s: h.start, e: h.end })), ...(data.current ? [{ s: data.current.start, e: Date.now() }] : [])];
  for (const { s, e } of all) {
    for (const d of days) {
      const end = new Date(d.start);
      end.setDate(end.getDate() + 1);
      const overlap = Math.min(e, end.getTime()) - Math.max(s, d.start);
      if (overlap > 0) d.ms += overlap;
    }
  }
  return days;
}

export function PlayHistoryCard() {
  const { data } = useSessions();
  const days = useMemo(() => (data ? dayHours(data) : []), [data]);
  if (!data) return <Card title="Play history"><Empty>Loading...</Empty></Card>;
  const total = days.reduce((a, d) => a + d.ms, 0);
  const max = Math.max(...days.map((d) => d.ms), HOUR);
  return (
    <Card title="Play history" sub="Hours per day, last 7 days" right={<span className="chip">{(total / HOUR).toFixed(1)} h total</span>}>
      {total === 0 ? (
        <Empty>No sessions recorded yet. Each time a game runs for over a minute it is saved here.</Empty>
      ) : (
        <div className="khours days">
          {days.map((d) => (
            <div key={d.start} className="kh" title={`${d.label}: ${(d.ms / HOUR).toFixed(1)} h`}>
              <b>{d.ms ? (d.ms / HOUR).toFixed(1) : ""}</b>
              <i className={d.ms === Math.max(...days.map((x) => x.ms)) ? "busy" : ""} style={{ height: `${d.ms ? Math.max(6, (d.ms / max) * 100) : 0}%` }} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ReportCard() {
  const { data } = useSessions();
  if (!data) return <Card title="Session report"><Empty>Loading...</Empty></Card>;
  const r = data.history[data.history.length - 1];
  if (!r) return <Card title="Session report" sub="Last finished session"><Empty>No finished session yet. A report appears after a game closes.</Empty></Card>;
  const f = (v: number | null, unit: string) => (v == null ? "—" : `${v}${unit}`);
  return (
    <Card title="Session report" sub={`${r.game.replace(/\.exe$/i, "")} · ${new Date(r.start).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`} right={<span className="chip">{span(r.end - r.start)}</span>}>
      <div className="kfacts">
        <div>
          <small>Avg ping</small>
          <b>{f(r.avgPing != null ? Math.round(r.avgPing) : null, " ms")}</b>
        </div>
        <div>
          <small>Worst ping</small>
          <b>{f(r.maxPing, " ms")}</b>
        </div>
        <div>
          <small>GPU temp avg / max</small>
          <b>
            {r.avgGpuTemp != null ? Math.round(r.avgGpuTemp) : "—"} / {r.maxGpuTemp ?? "—"} °C
          </b>
        </div>
        <div>
          <small>GPU / CPU load</small>
          <b>
            {r.avgGpuLoad != null ? Math.round(r.avgGpuLoad) : "—"} / {r.avgCpuLoad != null ? Math.round(r.avgCpuLoad) : "—"} %
          </b>
        </div>
      </div>
    </Card>
  );
}

export function GameModeHistoryCard() {
  const ms = useEvery(15_000, 0);
  const { data } = useApi<{ runs: GameModeRun[] }>("/api/gamemode/history", ms);
  if (!data) return <Card title="Game mode history"><Empty>Loading...</Empty></Card>;
  const runs = [...data.runs].reverse().slice(0, 12);
  return (
    <Card title="Game mode history" sub="Each step applied or undone">
      {runs.length === 0 ? (
        <Empty>No game mode runs yet.</Empty>
      ) : (
        <div className="klist">
          {runs.map((r, i) => (
            <div key={`${r.t}${i}`} className="krow hist" title={r.error ?? `${r.before ?? ""} → ${r.after ?? ""}`}>
              <span className="kname">{r.label}</span>
              <span className={`kchip ${r.ok ? (r.action === "apply" ? "buff" : "changed") : "nerf"}`}>{r.ok ? (r.action === "apply" ? "applied" : "undone") : "failed"}</span>
              <span className="kval">{new Date(r.t).toDateString() === new Date().toDateString() ? clockTime(r.t).slice(0, 5) : new Date(r.t).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

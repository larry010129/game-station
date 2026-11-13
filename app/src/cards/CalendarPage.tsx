import { useEffect, useMemo, useState, type FormEvent } from "react";
import { readJson, writeJson } from "../lib/storage";

export interface CalEvent {
  id: number;
  date: string; // yyyy-mm-dd, local
  name: string;
  time: string; // "HH:MM" or ""
}

const KEY = "cs.calendar";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTH = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const SHORT = new Intl.DateTimeFormat(undefined, { month: "short" });
const FULL = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
const RANGE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

export function readEvents(): CalEvent[] {
  const raw = readJson<unknown>(KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is CalEvent => e && typeof e.id === "number" && typeof e.date === "string" && typeof e.name === "string").map((e) => ({ ...e, time: typeof e.time === "string" ? e.time : "" }));
}

export const clock = (t: string) => {
  if (!t) return "All day";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

/** Set by the Calendar card so the page opens on the day you clicked. Read once. */
export const calFocus: { date: string | null } = { date: null };

/** A month calendar page. Events are kept on this PC. */
export function CalendarPage() {
  const today = new Date();
  const [start] = useState(() => {
    const f = calFocus.date;
    return f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : ymd(today);
  });
  const [month, setMonth] = useState(() => {
    const [y, m] = start.split("-").map(Number);
    return new Date(y, m - 1, 1);
  });
  const [selected, setSelected] = useState(start);
  const [events, setEvents] = useState<CalEvent[]>(readEvents);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState(selected);

  // Cleared after mount (not in the initialiser, which React may run twice).
  useEffect(() => {
    calFocus.date = null;
  }, []);

  useEffect(() => {
    // Still shows until the app closes when storage is blocked.
    writeJson(KEY, events);
  }, [events]);

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + (6 - last.getDay()));
    const out: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) out.push(d);
    return out;
  }, [month]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    for (const list of m.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return m;
  }, [events]);

  const todayKey = ymd(today);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const move = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));
  const pick = (d: Date) => {
    setSelected(ymd(d));
    if (d.getMonth() !== month.getMonth()) setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    setEvents((list) => [...list, { id: Date.now(), date, name: name.trim().slice(0, 80), time }]);
    setSelected(date);
    const [y, m] = date.split("-").map(Number);
    setMonth(new Date(y, m - 1, 1));
    setName("");
    setTime("");
    setAdding(false);
  };

  const agenda = byDay.get(selected) ?? [];
  const [sy, sm, sd] = selected.split("-").map(Number);

  return (
    <section className="cal" aria-label="Calendar">
      <header className="cal-head">
        <div className="cal-badge" aria-hidden="true">
          <small>{SHORT.format(today)}</small>
          <b>{today.getDate()}</b>
        </div>
        <div className="cal-title">
          <h2>{MONTH.format(month)}</h2>
          <p>
            {RANGE.format(month)} - {RANGE.format(last)}
          </p>
        </div>
        <div className="cal-nav" role="group" aria-label="Change month">
          <button onClick={() => move(-1)} aria-label="Previous month">
            ‹
          </button>
          <button
            onClick={() => {
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelected(todayKey);
            }}
          >
            Today
          </button>
          <button onClick={() => move(1)} aria-label="Next month">
            ›
          </button>
        </div>
        <button
          className="cal-new"
          onClick={() => {
            setDate(selected);
            setAdding((v) => !v);
          }}
          aria-expanded={adding}
        >
          + New event
        </button>
      </header>

      {adding && (
        <form className="cal-form" onSubmit={submit}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" aria-label="Event name" maxLength={80} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time (optional)" />
          <button type="submit" disabled={!name.trim() || !date}>
            Add
          </button>
          <button type="button" className="ghost" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      )}

      <div className="cal-grid" style={{ gridTemplateRows: `auto repeat(${days.length / 7}, minmax(0, 1fr))` }}>
        {DAYS.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = ymd(d);
          const list = byDay.get(key) ?? [];
          const cls = ["cal-day", d.getMonth() !== month.getMonth() ? "out" : "", key === todayKey ? "today" : "", key === selected ? "sel" : ""].filter(Boolean).join(" ");
          return (
            <div key={key} className={cls} onClick={() => pick(d)} role="button" tabIndex={0} aria-label={`${FULL.format(d)}, ${list.length} events`} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick(d)}>
              <span className="cal-num">{d.getDate()}</span>
              {list.slice(0, 1).map((ev) => (
                <div key={ev.id} className="cal-ev">
                  <b>{ev.name}</b>
                  <small>{clock(ev.time)}</small>
                </div>
              ))}
              {list.length > 1 && <small className="cal-more">+ {list.length - 1} more</small>}
              {list.length > 0 && (
                <span className="cal-dots" aria-hidden="true">
                  {list.slice(0, 4).map((ev) => (
                    <i key={ev.id} />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="cal-agenda">
        <h3>{FULL.format(new Date(sy, sm - 1, sd))}</h3>
        {agenda.length === 0 ? (
          <p className="cal-none">Nothing planned.</p>
        ) : (
          <ul>
            {agenda.map((ev) => (
              <li key={ev.id}>
                <span>{clock(ev.time)}</span>
                <b>{ev.name}</b>
                <button aria-label={`Delete ${ev.name}`} onClick={() => setEvents((l) => l.filter((x) => x.id !== ev.id))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

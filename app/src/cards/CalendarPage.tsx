import { useCallback, useEffect, useMemo, useState } from "react";
import { EventManager, type Event } from "../components/ui/event-manager";
import { readJson, writeJson } from "../lib/storage";
import { KIND_LABEL, useGameEvents, type GameEvent } from "../lib/gameEvents";

/** One line on the calendar: an event you added, or a dated game event from live data. */
export interface CalItem {
  key: string;
  date: string;
  name: string;
  time: string;
  /** "mine" for your own events. */
  kind: "mine" | GameEvent["kind"];
  game?: string;
  url?: string;
  mineId?: number;
  /** An estimate or leak rather than an announced date. */
  est?: boolean;
}

/** Your events and the game events together, one list per day, earliest first. */
export function mergeItems(mine: CalEvent[], game: GameEvent[]): CalItem[] {
  return [
    ...mine.map((e): CalItem => ({ key: `m${e.id}`, date: e.date, name: e.name, time: e.time, kind: "mine", mineId: e.id })),
    ...game.map((g): CalItem => ({ key: g.id, date: g.date, name: g.name, time: "", kind: g.kind, game: g.game, url: g.url, est: g.est })),
  ];
}

/** The small tag under an item: the time for yours, what kind of event for the game's. */
export const itemTag = (i: CalItem) => (i.kind === "mine" ? clock(i.time) : `${i.game ?? "Game"} · ${i.est ? "Est. " : ""}${KIND_LABEL[i.kind]}`);

export interface CalEvent {
  id: number;
  date: string; // yyyy-mm-dd, local
  name: string;
  time: string; // "HH:MM" or ""
}

const KEY = "cs.calendar";
const GAME_KEY = "cs.calendar.game";
const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function readEvents(): CalEvent[] {
  const raw = readJson<unknown>(KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is CalEvent => e && typeof e.id === "number" && typeof e.date === "string" && typeof e.name === "string")
    .map((e) => ({ ...e, time: typeof e.time === "string" ? e.time : "" }));
}

export const clock = (t: string) => {
  if (!t) return "All day";
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

/** Set by the Calendar card so the page opens on the day you clicked. Read once. */
export const calFocus: { date: string | null } = { date: null };

const STATION_COLORS = [
  { name: "Orange", value: "orange", bg: "bg-orange-500", text: "text-orange-100" },
  { name: "Amber", value: "amber", bg: "bg-amber-500", text: "text-amber-100" },
  { name: "Green", value: "green", bg: "bg-emerald-500", text: "text-emerald-100" },
  { name: "Blue", value: "blue", bg: "bg-sky-500", text: "text-sky-100" },
  { name: "Slate", value: "slate", bg: "bg-slate-500", text: "text-slate-100" },
  { name: "Red", value: "red", bg: "bg-red-500", text: "text-red-100" },
] as const;

const CATEGORIES = ["Personal", "Season", "Patch", "News", "Leak"] as const;

const KIND_META: Record<GameEvent["kind"], { category: (typeof CATEGORIES)[number]; color: string; tag: string }> = {
  season: { category: "Season", color: "orange", tag: "Official" },
  "season-end": { category: "Season", color: "amber", tag: "Official" },
  patch: { category: "Patch", color: "green", tag: "Official" },
  news: { category: "News", color: "blue", tag: "Official" },
  item: { category: "Leak", color: "red", tag: "Leak" },
};

function atLocal(date: string, time: string, endOfDay = false): Date {
  const [y, m, d] = date.split("-").map(Number);
  if (time) {
    const [h, min] = time.split(":").map(Number);
    return new Date(y, m - 1, d, h, min, 0, 0);
  }
  return new Date(y, m - 1, d, endOfDay ? 23 : 9, endOfDay ? 59 : 0, 0, 0);
}

function toCalEvent(id: number, event: Omit<Event, "id"> | Event): CalEvent {
  const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
  const end = event.endTime instanceof Date ? event.endTime : event.endTime ? new Date(event.endTime) : null;
  // All-day-ish: spans most of the day from ~9:00 with no meaningful clock intent.
  const spanMs = end ? end.getTime() - start.getTime() : 0;
  const allDay = spanMs >= 12 * 3600_000 && start.getHours() <= 9 && start.getMinutes() === 0;
  return {
    id,
    date: ymd(start),
    name: event.title.trim().slice(0, 80),
    time: allDay ? "" : `${pad(start.getHours())}:${pad(start.getMinutes())}`,
  };
}

function mineToEvent(e: CalEvent): Event {
  const start = atLocal(e.date, e.time);
  const end = e.time
    ? new Date(start.getTime() + 60 * 60_000)
    : atLocal(e.date, "", true);
  return {
    id: `m${e.id}`,
    title: e.name,
    startTime: start,
    endTime: end,
    color: "orange",
    category: "Personal",
    tags: ["Personal"],
  };
}

function gameToEvent(g: GameEvent): Event {
  const meta = KIND_META[g.kind];
  const start = atLocal(g.date, "");
  const end = atLocal(g.date, "", true);
  const tags = [meta.tag, g.game].filter(Boolean) as string[];
  if (g.est) tags.push("Estimate");
  return {
    id: g.id,
    title: g.name,
    description: g.url ? `${KIND_LABEL[g.kind]}${g.est ? " (estimate)" : ""} · ${g.game}\n${g.url}` : `${KIND_LABEL[g.kind]}${g.est ? " (estimate)" : ""} · ${g.game}`,
    startTime: start,
    endTime: end,
    color: meta.color,
    category: meta.category,
    tags,
  };
}

/** Full-page Event Manager calendar. User events persist locally; game events stay read-only. */
export function CalendarPage() {
  const today = new Date();
  const [start] = useState(() => {
    const f = calFocus.date;
    return f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : ymd(today);
  });
  const [mine, setMine] = useState<CalEvent[]>(readEvents);
  const gameEvents = useGameEvents();
  const [showGame, setShowGame] = useState(() => readJson<boolean>(GAME_KEY, true) !== false);

  useEffect(() => {
    calFocus.date = null;
  }, []);

  useEffect(() => {
    writeJson(KEY, mine);
  }, [mine]);

  const mapped = useMemo(() => {
    const user = mine.map(mineToEvent);
    const games = showGame ? gameEvents.map(gameToEvent) : [];
    return [...user, ...games];
  }, [mine, gameEvents, showGame]);

  const onCreate = useCallback((event: Omit<Event, "id">) => {
    setMine((list) => [...list, toCalEvent(Date.now(), event)]);
  }, []);

  const onUpdate = useCallback((id: string, patch: Partial<Event>) => {
    if (!id.startsWith("m")) return; // game events are read-only
    const mineId = Number(id.slice(1));
    if (!Number.isFinite(mineId)) return;
    setMine((list) =>
      list.map((e) => {
        if (e.id !== mineId) return e;
        const merged: Event = {
          ...mineToEvent(e),
          ...patch,
          id,
          startTime: patch.startTime ? new Date(patch.startTime) : mineToEvent(e).startTime,
          endTime: patch.endTime ? new Date(patch.endTime) : mineToEvent(e).endTime,
          title: patch.title ?? e.name,
        };
        return toCalEvent(mineId, merged);
      }),
    );
  }, []);

  const onDelete = useCallback((id: string) => {
    if (!id.startsWith("m")) return;
    const mineId = Number(id.slice(1));
    if (!Number.isFinite(mineId)) return;
    setMine((list) => list.filter((e) => e.id !== mineId));
  }, []);

  const toggleGame = () =>
    setShowGame((v) => {
      writeJson(GAME_KEY, !v);
      return !v;
    });

  const focusDate = useMemo(() => {
    const [y, m, d] = start.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [start]);

  return (
    <section className="calendar-page" aria-label="Calendar">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <button type="button" className="cal-game" aria-pressed={showGame} onClick={toggleGame} title="Seasons, patches and news for your games">
          Game events
        </button>
        <span className="text-xs text-muted-foreground">Official · Leak · News on the month grid</span>
      </div>
      <EventManager
        events={mapped}
        onEventCreate={onCreate}
        onEventUpdate={onUpdate}
        onEventDelete={onDelete}
        categories={[...CATEGORIES]}
        colors={[...STATION_COLORS]}
        defaultView="month"
        initialDate={focusDate}
        availableTags={["Personal", "Official", "Leak", "Estimate", "Overwatch", "Steam"]}
        className="flex-1 min-h-0"
      />
    </section>
  );
}

import { memo, useMemo, useState } from "react";
import { itemTag, mergeItems, readEvents, ymd, type CalEvent } from "./CalendarPage";
import { useGameEvents } from "../lib/gameEvents";
import { Card } from "./ui";
import { useInterval } from "../layout/onScreen";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const DAY = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

/** Month at a glance plus what is next. Click a day, or the card, to open the Calendar page. */
export const CalendarCard = memo(function CalendarCard({ onOpen }: { onOpen: (date?: string) => void }) {
  const [events, setEvents] = useState<CalEvent[]>(readEvents);
  const [now, setNow] = useState(() => new Date());

  // Pick up edits made on the Calendar page, and roll over at midnight.
  useInterval(() => {
    setEvents(readEvents());
    setNow(new Date());
  }, 30_000);

  const todayKey = ymd(now);
  const days = useMemo(() => {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const total = first.getDay() + last.getDate();
    const n = Math.ceil(total / 7) * 7;
    return Array.from({ length: n }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [now]);

  const gameEvents = useGameEvents();
  const items = useMemo(() => mergeItems(events, gameEvents), [events, gameEvents]);
  const has = useMemo(() => new Set(items.map((e) => e.date)), [items]);
  const next = useMemo(
    () =>
      items
        .filter((e) => e.date >= todayKey)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 3),
    [items, todayKey],
  );

  return (
    <Card
      title="Calendar"
      sub={MONTH.format(now)}
      right={
        <button className="eb-btn" onClick={() => onOpen()} aria-label="Open the calendar page">
          Open
        </button>
      }
    >
      <div className="ccal">
        <div className="ccal-grid" style={{ gridTemplateRows: `auto repeat(${days.length / 7}, minmax(0, 1fr))` }}>
          {DOW.map((d, i) => (
            <span key={i} className="ccal-dow">
              {d}
            </span>
          ))}
          {days.map((d) => {
            const key = ymd(d);
            const cls = ["ccal-day", d.getMonth() !== now.getMonth() ? "out" : "", key === todayKey ? "today" : ""].filter(Boolean).join(" ");
            return (
              <button key={key} className={cls} onClick={() => onOpen(key)} aria-label={`${DAY.format(d)}${has.has(key) ? ", has events" : ""}`}>
                {d.getDate()}
                {has.has(key) && <i />}
              </button>
            );
          })}
        </div>
        <div className="ccal-next">
          <h4>Next up</h4>
          {next.length === 0 ? (
            <p>Nothing planned. Open the calendar to add an event.</p>
          ) : (
            <ul>
              {next.map((e) => (
                <li key={e.key} data-kind={e.kind}>
                  <button type="button" onClick={() => onOpen(e.date)}>
                    <span>{e.date === todayKey ? "Today" : DAY.format(new Date(e.date + "T00:00"))}</span>
                    <b title={e.name}>{e.name}</b>
                    <small>{itemTag(e)}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
});

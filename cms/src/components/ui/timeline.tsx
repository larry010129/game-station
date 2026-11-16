import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal timeline: a day axis that scrolls sideways, one 1px gridline per day, and each scheduled item as a
 * rounded bar packed into rows (items that do not overlap share a row). The bar's label sticks to the left edge while
 * the bar runs off screen, and a "now" line with a live clock marks the current moment. Layout pattern after the
 * paimon.moe event timeline, drawn with the CMS tokens.
 */

export interface TimelineItem {
  id: string;
  title: string;
  /** Right-hand note on the bar, e.g. "2 weeks". */
  note?: string;
  /** First day, YYYY-MM-DD. */
  start: string;
  /** Last day (inclusive). Null: runs on past the end of the axis. */
  last: string | null;
  /** Fill class, e.g. "bg-primary". Used when `colors` is absent. */
  fill: string;
  /** One or two hex colours. Two split the bar with a slash: the first on the left, the second on the right. */
  colors?: string[];
  /** With two `colors`: one name per half, each written on its own colour. */
  names?: [string, string];
  /** Banner art URL, faded in at the right end. */
  art?: string;
  /** Draft-only (switched off): drawn faint. */
  muted?: boolean;
}

/** Whether a hex colour is light enough for dark text (WCAG relative luminance). */
function isLight(hex: string): boolean {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return true;
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Pick whichever of near-black (#0a0a0a) or white gives more contrast.
  return (L + 0.05) / 0.053 > 1.05 / (L + 0.05);
}

/** A point on the axis (a release going live), drawn as a pill under the dates. */
export interface TimelinePin {
  id: string;
  label: string;
  /** Exact moment (ms). */
  at: number;
  title: string;
  fill: string;
}

export const DAY_W = 40;
const HEAD = 64; // weekday + date rows
const PIN_ROW = 30;
const BAR_H = 36;
const ROW_GAP = 16;
const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayIndex = (from: Date, iso: string) =>
  Math.round((Date.UTC(...ymd(parse(iso))) - Date.UTC(...ymd(from))) / 86_400_000);
function ymd(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth(), d.getDate()];
}
const pad = (n: number) => String(n).padStart(2, "0");

/** Greedy row packing: each item goes in the first row whose last bar ends before it starts. */
function packRows(items: { s: number; e: number }[]): number[] {
  const ends: number[] = [];
  return items.map(({ s, e }) => {
    let row = ends.findIndex((end) => end < s);
    if (row === -1) row = ends.push(e) - 1;
    else ends[row] = e;
    return row;
  });
}

export function Timeline({
  from,
  days,
  items,
  pins = [],
  selectedId,
  onSelect,
  scrollToDay,
  onNearEnd,
  footer,
  className,
}: {
  /** First day on the axis (local midnight). */
  from: Date;
  /** How many days the axis shows. */
  days: number;
  items: TimelineItem[];
  pins?: TimelinePin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Bring this day (YYYY-MM-DD) into view; change the value to scroll again. */
  scrollToDay?: { day: string; seq: number };
  /** Called when the view comes within a few weeks of the right end, so the caller can add more days. */
  onNearEnd?: () => void;
  footer?: ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    const placed = items
      .map((it) => {
        const s = Math.max(0, dayIndex(from, it.start));
        const e = it.last === null ? days - 1 : Math.min(days - 1, dayIndex(from, it.last));
        return { it, s, e: Math.max(s, e), open: it.last === null };
      })
      .filter((p) => p.e >= 0 && p.s < days)
      .sort((a, b) => a.s - b.s || b.e - a.e);
    const rows = packRows(placed);
    return placed.map((p, i) => ({ ...p, row: rows[i] }));
  }, [items, from, days]);

  const rowCount = Math.max(1, ...sorted.map((p) => p.row + 1));
  const top = HEAD + (pins.length ? PIN_ROW : 0) + 12;
  const height = top + rowCount * (BAR_H + ROW_GAP) + 8;
  const width = days * DAY_W;

  const nowX = ((now.getTime() - from.getTime()) / 86_400_000) * DAY_W;
  const nowInRange = nowX >= 0 && nowX <= width;

  // Pins on the same day collapse into one pill.
  const pinGroups = useMemo(() => {
    const g = new Map<number, TimelinePin[]>();
    for (const p of pins) {
      const d = Math.floor((p.at - from.getTime()) / 86_400_000);
      if (d < 0 || d >= days) continue;
      g.set(d, [...(g.get(d) ?? []), p]);
    }
    return [...g.entries()].sort((a, b) => a[0] - b[0]);
  }, [pins, from, days]);

  // Scroll so the target day sits a third of the way in. Runs when asked, or when the axis start moves; adding days
  // at the end (same start) leaves the view where it is.
  const fromMs = from.getTime();
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !scrollToDay) return;
    const x = dayIndex(new Date(fromMs), scrollToDay.day) * DAY_W;
    const left = Math.max(0, x - el.clientWidth / 3);
    // Glide for short hops; jump straight there when it is months away.
    const far = Math.abs(left - el.scrollLeft) > 60 * DAY_W;
    el.scrollTo({ left, behavior: scrollToDay.seq === 0 || far ? "auto" : "smooth" });
  }, [scrollToDay, fromMs]);

  // A mouse wheel scrolls the timeline sideways. At either end the wheel goes back to scrolling the page.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // pinch zoom or a sideways swipe: leave it
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag with the mouse to pan. A drag that moved does not count as a click on the bar under it.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0 || !scroller.current) return;
    drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  }
  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (scroller.current?.hasPointerCapture(e.pointerId)) scroller.current.releasePointerCapture(e.pointerId);
    setDragging(false);
    // Keep `moved` until the click that follows this pointerup has been swallowed.
    window.setTimeout(() => (drag.current = null), 0);
  }

  function onScroll() {
    const el = scroller.current;
    if (el && onNearEnd && el.scrollLeft + el.clientWidth > el.scrollWidth - 30 * DAY_W) onNearEnd();
  }

  const dates = useMemo(
    () => Array.from({ length: days }, (_, i) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)),
    [from, days],
  );

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scroller}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (drag.current?.moved) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        className={cn(
          "overflow-x-auto overscroll-x-contain [scrollbar-color:rgb(var(--cms-edge-rgb))_transparent] [scrollbar-width:thin]",
          dragging ? "cursor-grabbing select-none" : "cursor-grab",
        )}
        tabIndex={0}
        role="region"
        aria-label="Schedule timeline, scroll sideways"
      >
        <div className="relative" style={{ width: width + 320, height }}>
          {/* Day gridlines with weekday and date. Mondays (the app's week start) draw a stronger line. */}
          {dates.map((d, i) => {
            const isToday = d.toDateString() === now.toDateString();
            const monday = d.getDay() === 1;
            return (
              <div key={i} className="absolute top-0 h-full" style={{ left: i * DAY_W }}>
                <span className={cn("absolute top-[18px] w-6 -translate-x-1/2 text-center text-[11px]", "text-muted/70")}>
                  {WEEKDAY[d.getDay()]}
                </span>
                <span
                  className={cn(
                    "absolute top-[36px] w-6 -translate-x-1/2 text-center text-[13px] tabular-nums",
                    isToday ? "font-semibold text-primary" : "text-foreground/85",
                  )}
                >
                  {d.getDate()}
                </span>
                <span
                  aria-hidden
                  className={cn("absolute bottom-0 w-px", monday ? "bg-border" : "bg-border/40")}
                  style={{ top: HEAD - 4 }}
                />
              </div>
            );
          })}

          {/* Month names stick to the left edge until the next month pushes them out. */}
          {dates.map((d, i) =>
            d.getDate() === 1 || i === 0 ? (
              <div
                key={`m${i}`}
                className="pointer-events-none absolute top-0 h-5"
                style={{
                  left: i * DAY_W,
                  width: (new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - d.getTime()) / 86_400_000 * DAY_W,
                }}
              >
                <span className="sticky left-0 inline-block bg-card pr-3 text-xs font-semibold text-primary">
                  {MONTH[d.getMonth()]} {d.getFullYear()}
                </span>
              </div>
            ) : null,
          )}

          {/* Release pins under the dates. */}
          {pinGroups.map(([d, group]) => {
            const label =
              group.length === 1 ? group[0].label : `${group[0].label}–${group[group.length - 1].label.replace(/^#/, "")}`;
            return (
              <button
                key={`p${d}`}
                type="button"
                title={group.map((p) => p.title).join("\n")}
                onClick={() => onSelect?.(group[group.length - 1].id)}
                className={cn(
                  "absolute z-10 h-5 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 text-[11px] font-semibold tabular-nums text-background",
                  "transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  group[0].fill,
                  group.some((p) => p.id === selectedId) && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                )}
                style={{ left: d * DAY_W + DAY_W / 2, top: HEAD + 4 }}
              >
                {label}
              </button>
            );
          })}

          {/* Bars. */}
          {sorted.map(({ it, s, e, open, row }) => {
            const [c1, c2] = it.colors ?? [];
            // Two themes: first colour, a slash cut in the panel colour, then the second colour.
            const background = c1
              ? c2
                ? `linear-gradient(110deg, ${c1} 0 calc(50% - 2px), rgb(var(--cms-surface-rgb)) calc(50% - 2px) calc(50% + 2px), ${c2} calc(50% + 2px))`
                : c1
              : undefined;
            const lightText = c1 ? !isLight(c1) : false;
            // Split bars with two names: each name sits on its own colour, in its own half.
            const split = Boolean(c1 && c2 && it.names);
            const nameCls = (light: boolean) =>
              cn(
                "sticky left-2.5 z-[1] min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold",
                light ? "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]" : "text-background",
              );
            const pill = it.note ? (
              <span className="relative z-[1] ml-auto shrink-0 whitespace-nowrap rounded-full bg-background/75 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {it.note}
              </span>
            ) : null;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelect?.(it.id)}
                aria-pressed={selectedId === it.id}
                aria-label={`${it.title}${it.note ? `, ${it.note}` : ""}`}
                className={cn(
                  "group absolute z-10 flex items-center rounded-xl text-left",
                  !split && "gap-3 pl-2.5 pr-1.5",
                  lightText ? "text-white" : "text-background",
                  "transition-[filter,box-shadow] duration-150 hover:brightness-110",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  !c1 && it.fill,
                  it.muted && "opacity-40",
                  open && "rounded-r-none [mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]",
                  selectedId === it.id && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                )}
                style={{
                  left: s * DAY_W + 1,
                  width: (e - s + 1) * DAY_W - 2,
                  top: top + row * (BAR_H + ROW_GAP),
                  height: BAR_H,
                  background,
                }}
              >
                {/* Banner art fades in from the right. Clipped in its own layer so the label can still stick. */}
                {it.art ? (
                  <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                    <img
                      src={it.art}
                      alt=""
                      draggable={false}
                      className="absolute inset-y-0 right-0 h-full w-[min(45%,22rem)] object-cover opacity-70 [mask-image:linear-gradient(to_right,transparent,#000_55%)]"
                    />
                  </span>
                ) : null}
                {split && it.names ? (
                  <>
                    {/* The halves meet at the slash (the gradient's middle); the right half starts past its lean. */}
                    <span className="flex h-full w-1/2 min-w-0 items-center pl-2.5 pr-4">
                      <span className={nameCls(!isLight(c1!))}>{it.names[0]}</span>
                    </span>
                    <span className="flex h-full w-1/2 min-w-0 items-center gap-3 pl-4 pr-1.5">
                      <span className={nameCls(!isLight(c2!))}>{it.names[1]}</span>
                      {pill}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={nameCls(lightText)}>{it.title}</span>
                    {pill}
                  </>
                )}
              </button>
            );
          })}

          {/* Now line with a live clock. */}
          {nowInRange ? (
            <div aria-hidden className="pointer-events-none absolute z-20" style={{ left: nowX, top: HEAD - 6, bottom: 0 }}>
              <div className="absolute inset-y-0 -left-px w-0.5 bg-foreground/70" />
              <span className="absolute -top-[2px] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-foreground px-2 py-px text-[11px] font-semibold tabular-nums text-background">
                {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      {footer}
    </div>
  );
}

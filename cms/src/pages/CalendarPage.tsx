import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Timeline, type TimelineItem, type TimelinePin } from "@/components/ui/timeline";
import { cn } from "@/lib/utils";
import { listReleases } from "../api/contentApi";
import { RELEASES_CHANGED } from "../components/PushScheduler";
import { KIND_META, KIND_ORDER, addDays, calendarEntries, dayKey, parseDay, timeLeftText } from "../lib/calendarEvents";
import { useDraft } from "../state/DraftContext";
import type { ReleaseMeta } from "../types/draft";
import { PageHeader, Panel } from "../ui/primitives";

/**
 * Calendar: every dated setting in the draft on one sideways-scrolling timeline, each bar as long as it runs. Built
 * live from the draft (banners, Brand featured runs, the Region week) and the release list, so a change on any page
 * shows here at once; nothing is stored separately. Clicking a bar opens the page where it is set.
 */
export function CalendarPage() {
  const { draft } = useDraft();
  const navigate = useNavigate();
  const [releases, setReleases] = useState<ReleaseMeta[]>([]);
  const [releaseError, setReleaseError] = useState(false);
  const [jump, setJump] = useState({ day: dayKey(new Date()), seq: 0 });
  // Ticks each minute so the time-left pills count down.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let live = true;
    const load = () =>
      listReleases()
        .then((r) => {
          if (!live) return;
          setReleases(r);
          setReleaseError(false);
        })
        .catch(() => live && setReleaseError(true));
    void load();
    window.addEventListener(RELEASES_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(RELEASES_CHANGED, load);
    };
  }, []);

  const entries = useMemo(() => (draft ? calendarEntries(draft, releases) : []), [draft, releases]);
  const today = dayKey(new Date());

  // Axis: from three months back (or three weeks before the earliest item) to a year ahead (or two months past the
  // latest item), Monday to Sunday. Scrolling near the right end adds another six months.
  const [extraDays, setExtraDays] = useState(0);
  const { from, days } = useMemo(() => {
    const starts = [addDays(today, -90), ...entries.map((e) => addDays(e.start, -21))].sort();
    const ends = [addDays(today, 365), ...entries.map((e) => addDays(e.last ?? e.start, 60))].sort();
    const first = parseDay(starts[0]);
    first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const span = Math.round((parseDay(ends[ends.length - 1]).getTime() - first.getTime()) / 86_400_000) + 1;
    return { from: first, days: Math.ceil(span / 7) * 7 + extraDays };
  }, [entries, today, extraDays]);

  // A bar takes its themes' colours (each theme's accent): one theme fills it, two split it with a slash.
  const accentOf = (id: string) => draft?.themes.find((t) => t.id === id)?.palette?.accent;
  const items: TimelineItem[] = entries
    .filter((e) => e.kind !== "release")
    .map((e) => {
      const colors = (e.themeIds ?? []).map(accentOf).filter((c): c is string => !!c);
      // A featured pair writes each theme's name on that theme's colour.
      const pair = e.kind === "featured" && colors.length === 2 && e.themeIds?.length === 2;
      const names = pair
        ? (e.themeIds!.map((id) => draft?.themes.find((t) => t.id === id)?.name ?? id) as [string, string])
        : undefined;
      return {
        id: e.id,
        title: e.off ? `${e.title} (Region Pack off)` : e.title,
        note: timeLeftText(e, now),
        start: e.start,
        last: e.invalid ? e.start : e.last,
        fill: KIND_META[e.kind].bar,
        colors: colors.length ? colors : undefined,
        names,
        art: e.art,
        muted: e.off,
      };
    });
  const pins: TimelinePin[] = entries
    .filter((e) => e.kind === "release" && e.at !== undefined)
    .map((e) => ({ id: e.id, label: `#${e.id.split(":")[1]}`, at: e.at!, title: `${e.title} — ${e.detail}`, fill: KIND_META.release.bar }));

  if (!draft) return null;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Banners, Brand featured runs, the Region week and release go-lives on one timeline, each bar as long as it runs. It reads your current settings, so a change on any page shows here straight away. Click a bar to edit it."
        actions={
          <button
            type="button"
            onClick={() => setJump((j) => ({ day: dayKey(new Date()), seq: j.seq + 1 }))}
            className="h-8 rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Today
          </button>
        }
      />

      <Panel className="px-0 pb-3 pt-4">
        <Timeline
          className="px-4"
          from={from}
          days={days}
          items={items}
          pins={pins}
          scrollToDay={jump}
          onNearEnd={() => setExtraDays((d) => (d < 7 * 520 ? d + 7 * 26 : d))}
          onSelect={(id) => {
            const e = entries.find((x) => x.id === id);
            if (e) navigate(e.link);
          }}
        />
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 px-4 pt-3 text-xs text-muted" aria-label="Legend">
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-6 rounded-full"
              style={{
                background:
                  "linear-gradient(110deg, #9146ff 0 calc(50% - 1px), rgb(var(--cms-surface-rgb)) calc(50% - 1px) calc(50% + 1px), #1db954 calc(50% + 1px))",
              }}
            />
            Banners and featured runs take their themes' colors; two themes split with a slash
          </li>
          {KIND_ORDER.filter((k) => k === "region" || k === "release").map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden className={cn("h-2 w-5 rounded-full", KIND_META[k].bar)} />
              {KIND_META[k].label}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden className="rounded-full bg-background/75 px-1.5 text-[10px] font-semibold text-foreground">8d 3h</span>
            Time left
          </li>
          {items.length === 0 ? <li>Nothing dated yet: set banner dates, a featured run or a Region week.</li> : null}
          {releaseError ? <li>Releases could not be loaded, so go-lives are missing.</li> : null}
        </ul>
      </Panel>
    </div>
  );
}

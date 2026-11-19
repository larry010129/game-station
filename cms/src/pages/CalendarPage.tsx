import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Timeline, type TimelineItem, type TimelinePin } from "@/components/ui/timeline";
import { cn } from "@/lib/utils";
import { listReleases } from "../api/contentApi";
import { RELEASES_CHANGED } from "../components/PushScheduler";
import { KIND_META, KIND_ORDER, addDays, calendarEntries, dayKey, parseDay, timeLeftText } from "../lib/calendarEvents";
import { useDraft } from "../state/DraftContext";
import {
  CHECKIN_MAX_COUNT,
  checkinPrizeErrors,
  checkinPrizesOf,
  type CheckinPrizeDraft,
  type CmsDraft,
  type CmsItem,
  type ReleaseMeta,
} from "../types/draft";
import { Badge, Button, Field, Input, PageHeader, Panel, Select } from "../ui/primitives";

/**
 * Calendar: every dated setting in the draft on one sideways-scrolling timeline, each bar as long as it runs. Built
 * live from the draft (banners, Brand featured runs, the Region week) and the release list, so a change on any page
 * shows here at once; nothing is stored separately. Clicking a bar opens the page where it is set.
 */
export function CalendarPage() {
  const { draft, setDraft } = useDraft();
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
          {KIND_ORDER.filter((k) => k === "region" || k === "checkin" || k === "release").map((k) => (
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

      <CheckinEventPanel
        value={draft.checkinEvent ?? null}
        onChange={(next) => setDraft((d) => ({ ...d, checkinEvent: next }))}
      />
      <CheckinPrizesPanel draft={draft} onChange={(next) => setDraft((d) => ({ ...d, checkinPrizes: next }))} />
    </div>
  );
}

/** Select value for a box: "regular", "special" or "item:<id>". */
const prizeValue = (p: CheckinPrizeDraft) => (p.kind === "item" ? `item:${p.id}` : p.kind);

/**
 * What each check-in day pays, Day 1 to Day 7: Regular or Special Draw Tickets, or any item from the catalog, and how
 * many. Day 7 is the big box in the app. A one-time item can only pay 1; a player who owns it already gets nothing more.
 */
function CheckinPrizesPanel({ draft, onChange }: { draft: CmsDraft; onChange: (next: CheckinPrizeDraft[] | undefined) => void }) {
  const prizes = checkinPrizesOf(draft);
  const errors = checkinPrizeErrors(draft);
  const items: CmsItem[] = [...draft.items].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  const set = (i: number, next: CheckinPrizeDraft) => onChange(prizes.map((p, j) => (j === i ? next : p)));
  const choose = (i: number, value: string) => {
    const count = prizes[i].count;
    if (value === "regular" || value === "special") return set(i, { kind: value, count });
    const id = value.slice(5);
    const item = draft.items.find((x) => x.id === id);
    set(i, { kind: "item", id, count: item && !item.stackable ? 1 : count });
  };
  return (
    <Panel className="mt-5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Check-in prizes by day</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Pick what each box pays: Special or Regular Draw Tickets, or an item, and how many. Day 7 is the big box.
            Special Tickets draw in the packs set to take them (Odds, Cards); Regular Tickets in the Regular Pack by default.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {draft.checkinPrizes ? (
            <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>
              Reset to default
            </Button>
          ) : (
            <Badge tone="neutral">App default</Badge>
          )}
          <Badge tone={errors.length ? "danger" : "ok"}>{errors.length ? `${errors.length} to fix` : "Ready"}</Badge>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {prizes.map((p, i) => {
          const item = p.kind === "item" ? draft.items.find((x) => x.id === p.id) : undefined;
          const oneTime = item != null && !item.stackable;
          return (
            <li key={i} className={cn("rounded-lg border border-border/70 p-3", i === 6 && "sm:col-span-2 xl:col-span-1")}>
              <div className="mb-2 text-xs font-semibold text-foreground">Day {i + 1}</div>
              <div className="flex flex-col gap-2">
                <Field label="Prize">
                  <Select aria-label={`Day ${i + 1} prize`} value={prizeValue(p)} onChange={(e) => choose(i, e.target.value)}>
                    <option value="special">Special Ticket</option>
                    <option value="regular">Regular Ticket</option>
                    <optgroup label="Items">
                      {items.map((it) => (
                        <option key={it.id} value={`item:${it.id}`}>
                          {it.name}
                          {it.stackable ? "" : " (one-time)"}
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                </Field>
                <Field label="Amount" hint={oneTime ? "One-time item: always 1" : undefined}>
                  <Input
                    aria-label={`Day ${i + 1} amount`}
                    type="number"
                    min={1}
                    max={oneTime ? 1 : CHECKIN_MAX_COUNT}
                    disabled={oneTime}
                    value={p.count}
                    onChange={(e) => set(i, { ...p, count: Math.round(Number(e.target.value) || 0) })}
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>
      {errors.length ? (
        <ul className="mt-3 list-disc pl-5 text-xs text-destructive-foreground">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/** "2026-12-01T10:00" for the next local midnight plus `days`. */
function stampIn(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${dayKey(d)}T00:00`;
}

/**
 * The daily check-in board as an event: the app lets players claim boxes only between the start and the end (their
 * local time). With no event the board is always on.
 */
function CheckinEventPanel({
  value,
  onChange,
}: {
  value: { start: string; end: string } | null;
  onChange: (next: { start: string; end: string } | null) => void;
}) {
  const missing = value != null && (!value.start || !value.end);
  const bad = missing || (value != null && value.end <= value.start);
  return (
    <Panel className="mt-5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Daily check-in event</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted">
            Players can claim check-in boxes only inside this window, in their own local time. Outside it the board is
            hidden and shows when the next event starts; tickets already held still work. Set what each day pays below.
          </p>
        </div>
        {value ? (
          <Badge tone={bad ? "danger" : "ok"}>{missing ? "Set both a start and an end" : bad ? "End must be after start" : "Scheduled"}</Badge>
        ) : (
          <Badge tone="neutral">Always on</Badge>
        )}
      </div>
      {value ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Starts">
            <Input type="datetime-local" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
          </Field>
          <Field label="Ends">
            <Input type="datetime-local" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} />
          </Field>
          <Button type="button" variant="ghost" onClick={() => onChange(null)}>
            Make always on
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={() => onChange({ start: stampIn(1), end: stampIn(15) })}>
          Set start and end
        </Button>
      )}
    </Panel>
  );
}

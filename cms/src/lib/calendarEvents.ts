/**
 * Calendar entries read straight from the draft: banners, Brand Pack featured runs, the Region week and release
 * go-lives. Nothing here is stored; the Calendar page rebuilds it whenever a setting changes. Pure, no React.
 * Days are local-calendar YYYY-MM-DD strings, so plain string compares order them.
 */
import { bannerArtUrl } from "../components/BannerArtPreview";
import { COUNTRIES, regionName, specialQueueOf, type CmsDraft, type ReleaseMeta } from "../types/draft";

export type CalendarKind = "banner" | "featured" | "region" | "checkin" | "release";

export interface CalendarEntry {
  id: string;
  kind: CalendarKind;
  title: string;
  detail: string;
  /** First day, YYYY-MM-DD. */
  start: string;
  /** Last day (inclusive), YYYY-MM-DD. Null: no end date set. */
  last: string | null;
  /** Where the setting is edited. */
  link: string;
  /** Kept in the draft but not shown in the app (the Region Pack is switched off). */
  off?: boolean;
  /** The last day is before the first day. */
  invalid?: boolean;
  /** Themes the item features (Brand runs: the pair; banners: featured themes). Their colours paint the bar. */
  themeIds?: string[];
  /** Banner art URL. */
  art?: string;
  /** Releases: the go-live time (ms) and the release notes. */
  at?: number;
  notes?: string;
}

export const KIND_META: Record<CalendarKind, { label: string; bar: string; dot: string }> = {
  banner: { label: "Banner", bar: "bg-primary", dot: "bg-primary" },
  featured: { label: "Brand featured run", bar: "bg-warning", dot: "bg-warning" },
  region: { label: "Region week", bar: "bg-info", dot: "bg-info" },
  checkin: { label: "Check-in event", bar: "bg-[#e3b13a]", dot: "bg-[#e3b13a]" },
  release: { label: "Release goes live", bar: "bg-success", dot: "bg-success" },
};

/** Lane order on the grid, so one run stays on one line across a week. */
export const KIND_ORDER: CalendarKind[] = ["banner", "featured", "region", "checkin", "release"];

const pad = (n: number) => String(n).padStart(2, "0");
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Local-calendar day of a Date as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD as a local Date (never `new Date("YYYY-MM-DD")`, which reads UTC and can land a day early). */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** Whole days from `a` to `b` (DST-safe: counts calendar days). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** "2 weeks", "10 days", "1 day", "No end date". */
export function lengthText(e: CalendarEntry): string {
  if (!e.last) return "No end date";
  if (e.invalid) return "Ends before it starts";
  const days = daysBetween(e.start, e.last) + 1;
  if (days % 7 === 0) return `${days / 7} week${days === 7 ? "" : "s"}`;
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** "8d 3h", "5h 20m", "40m": a span in the style of a countdown. */
export function spanText(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Time left on a bar: "8d 3h" while running, "Starts in 13d 2h" before, "Ended" after. Local midnights. */
export function timeLeftText(e: CalendarEntry, now: Date): string {
  if (e.invalid) return "Ends before it starts";
  const start = parseDay(e.start).getTime();
  if (now.getTime() < start) return `Starts in ${spanText(start - now.getTime())}`;
  if (e.last === null) return "No end date";
  const end = parseDay(addDays(e.last, 1)).getTime();
  return now.getTime() >= end ? "Ended" : spanText(end - now.getTime());
}

/** Whether `day` falls inside the entry. Open-ended entries run on from their start. */
export function covers(e: CalendarEntry, day: string): boolean {
  if (e.invalid) return day === e.start;
  return day >= e.start && (e.last === null || day <= e.last);
}

export type EntryStatus = "upcoming" | "running" | "ended" | "scheduled" | "live" | "replaced";

/**
 * Where an entry stands. Releases go by their go-live time: the newest one already out is Live, older ones are
 * Replaced, later ones Scheduled. `liveAt` is the go-live time of the release apps run now.
 */
export function statusOf(e: CalendarEntry, today: string, now = Date.now(), liveAt: number | null = null): EntryStatus {
  if (e.kind === "release" && e.at !== undefined) {
    if (e.at > now) return "scheduled";
    return liveAt !== null && e.at >= liveAt ? "live" : "replaced";
  }
  if (today < e.start) return "upcoming";
  if (e.last !== null && !e.invalid && today > e.last) return "ended";
  if (e.invalid && today > e.start) return "ended";
  return "running";
}

/** Every dated setting in the draft, plus release go-lives, ordered by first day. */
export function calendarEntries(draft: CmsDraft, releases: ReleaseMeta[]): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  const themeName = (id: string) => draft.themes.find((t) => t.id === id)?.name ?? id;

  for (const b of draft.banners) {
    if (!ISO_DAY.test(b.start)) continue;
    const last = ISO_DAY.test(b.end) ? b.end : null;
    out.push({
      id: `banner:${b.id}`,
      kind: "banner",
      title: b.title || "Untitled banner",
      detail: `${b.pack[0].toUpperCase()}${b.pack.slice(1)} Pack banner`,
      start: b.start,
      last,
      link: "/banners",
      invalid: last !== null && last < b.start,
      themeIds: b.featuredIds.filter((id) => draft.themes.some((t) => t.id === id)).slice(0, 2),
      art: bannerArtUrl(b) || undefined,
    });
  }

  specialQueueOf(draft).forEach((run, i) => {
    if (!ISO_DAY.test(run.weekOf)) return;
    const names = run.brandIds.map(themeName);
    out.push({
      id: `featured:${run.weekOf}:${i}`,
      kind: "featured",
      title: names.length ? names.join(" / ") : "Featured run (no themes picked)",
      detail: "Brand Pack featured pair",
      start: run.weekOf,
      last: addDays(run.weekOf, 7 * (run.weeks ?? 1) - 1),
      link: "/odds",
      themeIds: run.brandIds,
    });
  });

  const rw = draft.regionWeek;
  if (rw && ISO_DAY.test(rw.weekOf)) {
    const off = draft.regionPackEnabled === false;
    const focus = rw.kind === "region" ? regionName(rw.value) : `${COUNTRIES[rw.value] ?? rw.value} (country week)`;
    out.push({
      id: `region:${rw.weekOf}`,
      kind: "region",
      title: focus,
      detail: off ? "Region Pack focus — the pack is switched off" : "Region Pack focus",
      start: rw.weekOf,
      last: addDays(rw.weekOf, 7 * (rw.weeks ?? 1) - 1),
      link: "/odds",
      off,
    });
  }

  const ck = draft.checkinEvent;
  if (ck && ISO_DAY.test(ck.start.slice(0, 10)) && ISO_DAY.test(ck.end.slice(0, 10))) {
    // The end is exclusive: an event ending at 00:00 runs through the day before.
    const endDay = ck.end.slice(0, 10);
    const last = ck.end.slice(11) === "00:00" ? addDays(endDay, -1) : endDay;
    const start = ck.start.slice(0, 10);
    out.push({
      id: `checkin:${ck.start}`,
      kind: "checkin",
      title: "Daily check-in",
      detail: `Check-in event ${ck.start.replace("T", " ")} to ${ck.end.replace("T", " ")}`,
      start,
      last,
      link: "/calendar",
      invalid: ck.end <= ck.start,
    });
  }

  for (const r of releases) {
    const at = new Date(r.effectiveAt ?? r.publishedAt);
    if (!Number.isFinite(at.getTime())) continue;
    const day = dayKey(at);
    out.push({
      id: `release:${r.number}`,
      kind: "release",
      title: `Release #${r.number}`,
      detail: `Goes live ${pad(at.getHours())}:${pad(at.getMinutes())}`,
      at: at.getTime(),
      notes: r.notes || undefined,
      start: day,
      last: day,
      link: "/releases",
    });
  }

  return out.sort(
    (a, b) =>
      a.start.localeCompare(b.start) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || (a.at ?? 0) - (b.at ?? 0),
  );
}

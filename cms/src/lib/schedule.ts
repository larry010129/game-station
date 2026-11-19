/**
 * Go-live times for a Push, typed as `mm/dd/yy hh:mm` (24-hour, the owner's local time). Pure helpers, no React.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** `11/17/26 09:00` for a date, in local time. */
export function formatMdyHm(d: Date): string {
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${pad(d.getFullYear() % 100)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Reads `mm/dd/yy hh:mm` as local time (yy is 20yy). Returns null unless every part is a real calendar date and a
 * real 24-hour time: 02/30/26 and 24:00 are refused.
 */
export function parseMdyHm(text: string): Date | null {
  const m = text.trim().match(/^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const [mo, d, y, h, mi] = m.slice(1).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59) return null;
  const date = new Date(2000 + y, mo - 1, d, h, mi);
  return date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

/** Shapes typed digits into `mm/dd/yy hh:mm` as the owner types, so the separators never need typing. */
export function maskMdyHm(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6), digits.slice(6, 8), digits.slice(8, 10)];
  let out = parts[0];
  if (digits.length > 2) out += `/${parts[1]}`;
  if (digits.length > 4) out += `/${parts[2]}`;
  if (digits.length > 6) out += ` ${parts[3]}`;
  if (digits.length > 8) out += `:${parts[4]}`;
  return out;
}

/** "in 8 h 12 min", "in 3 days", "now": how far away a go-live time is. */
export function untilText(at: Date, now: Date = new Date()): string {
  const min = Math.round((at.getTime() - now.getTime()) / 60_000);
  if (min <= 0) return "now";
  if (min >= 2 * 24 * 60) return `in ${Math.floor(min / (24 * 60))} days`;
  if (min >= 60) return `in ${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`;
  return `in ${min} min`;
}

/** Quick picks for the go-live time. Weeks start Monday 00:00, like the app's quests and Region weeks. */
export function schedulePresets(now: Date = new Date()): { label: string; at: Date }[] {
  const at = (days: number, h: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, 0);
  const inHour = new Date(now.getTime() + 60 * 60_000);
  inHour.setSeconds(0, 0);
  const toMonday = ((8 - now.getDay()) % 7) || 7;
  return [
    { label: "In 1 hour", at: inHour },
    { label: "Midnight", at: at(1, 0) },
    { label: "Tomorrow 09:00", at: at(1, 9) },
    { label: "Next Monday 00:00", at: at(toMonday, 0) },
  ];
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local-calendar Monday of `d` as YYYY-MM-DD (the app's quest, Region and featured weeks). */
export function mondayOf(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}

/** The Monday of the week holding `iso` (YYYY-MM-DD) plus `plusDays`. */
export function mondayOfIso(iso: string, plusDays = 0): string {
  const [y, m, d] = iso.split("-").map(Number);
  return mondayOf(new Date(y, m - 1, d + plusDays));
}

/** `11/16/26` for a YYYY-MM-DD date. */
export function mdy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}

/**
 * Releases still scheduled (go-live after `now`) that a push going live at `goLive` would overtake. Every release is
 * built from the whole draft, so such a push makes their scheduled changes live at `goLive`, and apps then skip the
 * scheduled release itself (it has a lower number). The Push panel warns with these numbers.
 */
export function overtakenReleases(
  goLive: Date,
  releases: readonly { number: number; effectiveAt?: string | null }[],
  now: Date = new Date(),
): number[] {
  const at = (r: { effectiveAt?: string | null }) => (r.effectiveAt ? Date.parse(r.effectiveAt) : NaN);
  // Apps only move to higher numbers, so a scheduled release below the newest live one will never be applied anyway.
  const newestLive = Math.max(0, ...releases.filter((r) => !(at(r) > now.getTime())).map((r) => r.number));
  return releases
    .filter((r) => {
      const t = at(r);
      return Number.isFinite(t) && t > now.getTime() && t > goLive.getTime() && r.number > newestLive;
    })
    .map((r) => r.number)
    .sort((a, b) => a - b);
}

/** The last day (a Sunday) of a run that starts on Monday `weekOf` and lasts `weeks` weeks, as mm/dd/yy. */
export function runLastDay(weekOf: string, weeks = 1): string {
  const [y, m, d] = weekOf.split("-").map(Number);
  const last = new Date(y, m - 1, d + 7 * weeks - 1);
  return `${pad2(last.getMonth() + 1)}/${pad2(last.getDate())}/${pad2(last.getFullYear() % 100)}`;
}

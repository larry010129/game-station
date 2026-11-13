/**
 * Keeps a leak only when it is about a season after the current one.
 * The current number comes from Counterwatch (`season.number`, or a season number in the name).
 * A named season at or before that number is hidden. If the number is unknown, any named season is hidden.
 * A leak that names no season stays only when it is clearly about something still unreleased.
 */

export function seasonNumberFromMeta(season: { name?: string | null; number?: number | string | null } | null | undefined): number | null {
  if (!season) return null;
  const raw = season.number;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  if (Number.isInteger(n) && n > 0 && n < 100) return n;
  const named = String(season.name ?? "").match(/\b(?:season|s)\s*(\d{1,2})\b/i);
  return named ? Number(named[1]) : null;
}

const SEASON_MENTION = /\b(?:seasons?|s)\s*(\d{1,2}(?:\s*(?:,|&|and|-|–|—|\/)\s*\d{1,2})*)/gi;
const AFTER_NAMED = /\b(?:after|following|post|beyond)\s+(?:the\s+)?(?:current\s+season|this\s+season|season\s*\d{1,2}|s\s*\d{1,2})\b/i;
const NEXT_SEASON = /\bnext season\b/i;
const FUTURE = /\b(?:next hero|new heroes?|unreleased|upcoming season|future season|hero reveal|coming soon)\b/i;
const ALREADY = /\b(?:earlier leak|old leak|leak is old|already (?:released|out|live|in)|was released|now available|went live|is now live|currently live|this season|current season|mid-?season)\b/i;

export function mentionedSeasons(text: string): number[] {
  const nums: number[] = [];
  for (const m of text.matchAll(SEASON_MENTION)) {
    for (const n of m[1].matchAll(/\d{1,2}/g)) {
      const v = Number(n[0]);
      if (v > 0) nums.push(v);
    }
  }
  return nums;
}

function aboutAlreadyOut(text: string): boolean {
  if (NEXT_SEASON.test(text) || AFTER_NAMED.test(text)) {
    const rest = text.replace(AFTER_NAMED, " ").replace(NEXT_SEASON, " ");
    return ALREADY.test(rest);
  }
  return ALREADY.test(text);
}

/** Reddit puts the author in `summary`. That is not the leak. */
export function leakDetail(summary: string | undefined): string {
  const s = (summary ?? "").trim();
  if (!s || /^u\/[\w-]+$/.test(s)) return "";
  return s;
}

const TAG_ONLY = /^(?:confirmed|leak|leaks|rumou?rs?|unconfirmed leak)$/i;

/** Title and the useful detail. A bare "Leak" / "Rumor" tag is not the heading when a summary exists. */
export function leakCopy(item: { title?: string; summary?: string }): { title: string; detail: string } {
  const title = (item.title ?? "").trim();
  const detail = leakDetail(item.summary);
  if (TAG_ONLY.test(title) && detail) return { title: detail, detail: "" };
  return { title: title || detail, detail: title && detail ? detail : "" };
}

export function isUpcomingLeak(item: { title?: string; summary?: string }, current: number | null): boolean {
  const text = `${item.title ?? ""} ${leakDetail(item.summary)}`.replace(/\s+/g, " ").trim();
  if (!text || TAG_ONLY.test(text)) return false;
  const seasons = mentionedSeasons(text);
  if (current != null && seasons.some((n) => n > current)) return true;
  if (seasons.length > 0) {
    if (current == null) return false;
    if ((AFTER_NAMED.test(text) || NEXT_SEASON.test(text)) && !aboutAlreadyOut(text)) return true;
    return false;
  }
  if (aboutAlreadyOut(text)) return false;
  return FUTURE.test(text) || NEXT_SEASON.test(text) || AFTER_NAMED.test(text);
}

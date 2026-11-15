import { useEffect, useMemo, useState } from "react";
import { useApi, useStationCtx } from "../state/useApi";
import { withGame } from "./games";
import { isUpcomingLeak, leakCopy, mentionedSeasons, seasonNumberFromMeta } from "./leakSeason";
import { readJson, writeJson } from "./storage";
import type { FeedItem, MetaData, SteamData } from "./types";

/** Something that happened (or is expected) in a game, placed on the calendar by date. Read-only: it comes from live data. */
export interface GameEvent {
  id: string;
  date: string; // yyyy-mm-dd, local
  name: string;
  kind: "season" | "season-end" | "patch" | "news" | "item";
  game: string;
  url?: string;
  /** An estimate or a leak, not an announced date. Never saved: it is worked out again each time. */
  est?: boolean;
}

export const KIND_LABEL: Record<GameEvent["kind"], string> = {
  season: "New season",
  "season-end": "Season ends",
  patch: "Patch",
  news: "News",
  item: "Leaked item",
};

const KEY = "cs.gameEvents";
const KEEP = 400;
const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Noon local on a yyyy-mm-dd, so adding whole days never lands on the wrong date across a clock change. */
const at = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};
const plusDays = (ymd: string, n: number) => dayOf(at(ymd) + n * DAY_MS);

/** News is only worth a calendar day when it is about the game changing: not sales or bundles. */
const NOTABLE = /season|patch|update|hotfix|event|launch|release|expansion|roadmap|reveal|midcycle|mid-cycle|new (?:hero|map|mode)|returns?\b|live now/i;
const PROMO = /\b(?:sale|savings|bundle|discount|deal|giveaway|% off)\b/i;
export const isNotable = (title: string) => NOTABLE.test(title) && !PROMO.test(title);

/** Turns what the service already knows into dated game events. Pure, so it can be tested alone. */
export function buildGameEvents(meta: MetaData | null, feed: FeedItem[] | null, steam: SteamData | null, gameName = "Overwatch"): GameEvent[] {
  const prefix = gameName === "Apex Legends" || gameName === "Apex" ? "apex" : "ow";
  const out: GameEvent[] = [];
  for (const w of meta?.timeline ?? []) {
    if (w.kind === "season") {
      const label = w.number != null ? `Season ${w.number}: ${w.name}` : w.name;
      out.push({ id: `${prefix}-season-${w.startsOn}`, date: w.startsOn, name: `${label} begins`, kind: "season", game: gameName });
      if (w.endsOn) out.push({ id: `${prefix}-season-end-${w.endsOn}`, date: w.endsOn, name: `${label} ends`, kind: "season-end", game: gameName });
    } else {
      out.push({ id: `${prefix}-patch-${w.startsOn}-${w.name}`, date: w.startsOn, name: `Patch ${w.name}`, kind: "patch", game: gameName });
    }
  }
  for (const f of feed ?? []) {
    if (f.kind !== "patch" && f.kind !== "official") continue;
    if (!f.publishedAt || !f.title) continue;
    if (f.kind === "official" && !isNotable(f.title)) continue;
    out.push({ id: `feed-${f.id}`, date: dayOf(f.publishedAt), name: f.title.slice(0, 80), kind: f.kind === "patch" ? "patch" : "news", game: gameName, url: f.url });
  }
  for (const n of steam?.news ?? []) {
    if (!n.date || !n.title || !isNotable(n.title)) continue;
    // Steam sends seconds; the feed sends milliseconds.
    out.push({ id: `steam-${n.id}`, date: dayOf(n.date < 1e12 ? n.date * 1000 : n.date), name: n.title.slice(0, 80), kind: "news", game: n.source || "Steam", url: n.url });
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

/** Days between season starts, as seen so far. Falls back to nine weeks, the usual Overwatch season, with too little history. */
export function seasonLength(starts: string[]): number {
  const sorted = [...starts].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(Math.round((at(sorted[i]) - at(sorted[i - 1])) / DAY_MS));
  const usable = gaps.filter((g) => g >= 28 && g <= 120);
  return usable.length ? median(usable) : 63;
}

/**
 * The next season's start, and leak headlines from the free feed that go with it. These are estimates:
 * the start is the current season's end date when the page gives one, otherwise the last start plus a usual season.
 * A leak goes on the start of the season it names. They are never saved.
 */
export function estimateUpcoming(meta: MetaData | null, feed: FeedItem[] | null, today: string, gameName = "Overwatch"): GameEvent[] {
  const seasons = (meta?.timeline ?? []).filter((w) => w.kind === "season").sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const last = seasons[seasons.length - 1];
  if (!last) return [];
  const len = seasonLength(seasons.map((s) => s.startsOn));
  // The latest listed season may itself be announced but not started yet; the estimate is the one after it.
  const lastNumber = last.number ?? seasonNumberFromMeta(meta?.season) ?? null;
  const nextNumber = lastNumber != null ? lastNumber + 1 : null;
  const start = last.endsOn && last.endsOn > last.startsOn ? last.endsOn : plusDays(last.startsOn, len);
  if (start < today) return []; // Overdue: the real date will arrive with the data; a stale guess helps nobody.

  const out: GameEvent[] = [
    {
      id: `est-season-${start}`,
      date: start,
      name: nextNumber != null ? `Season ${nextNumber} expected to begin` : "Next season expected to begin",
      kind: "season",
      game: gameName,
      est: true,
    },
  ];

  const current = seasonNumberFromMeta(meta?.season) ?? lastNumber;
  const leaks = (feed ?? []).filter((f) => f.kind === "leak");
  for (const item of leaks.slice(0, 15)) {
    if (!isUpcomingLeak({ title: item.title, summary: item.summary, status: "leak" }, current)) continue;
    const { title } = leakCopy(item);
    if (!title) continue;
    const named = mentionedSeasons(`${item.title} ${item.summary}`).filter((n) => nextNumber != null && n >= nextNumber && n - nextNumber <= 3);
    const ahead = named.length && nextNumber != null ? Math.min(...named) - nextNumber : 0;
    out.push({
      id: `est-item-${item.url || item.id || title}`,
      date: plusDays(start, ahead * len),
      name: title.slice(0, 70),
      kind: "item",
      game: gameName,
      url: item.url || undefined,
      est: true,
    });
    if (out.length >= 7) break;
  }
  return out;
}

function readSaved(): GameEvent[] {
  const raw = readJson<unknown>(KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is GameEvent => !!e && typeof e.id === "string" && typeof e.date === "string" && typeof e.name === "string" && typeof e.kind === "string" && !e.est && (e.kind !== "news" || isNotable(e.name)),
  );
}

/**
 * Game events for the calendar. Past and announced ones are added to a saved list, so a patch that has left the
 * live feed is still on its day. Live data wins when the same id is seen again. Estimates sit on top, unsaved.
 */
export function useGameEvents(): GameEvent[] {
  // Read once and ride on the polling the other cards already do: seasons and patches change by the day, so this
  // never needs a poll of its own. Paths include the active game so Apex calendars do not mix with Overwatch.
  const { game, pack } = useStationCtx();
  const meta = useApi<MetaData>(withGame("/api/meta", game), 0).data;
  const feed = useApi<FeedItem[]>(withGame("/api/feed", game), 0).data;
  const steam = useApi<SteamData>(withGame("/api/steam", game), 0).data;
  const [saved, setSaved] = useState<GameEvent[]>(readSaved);

  const live = useMemo(() => buildGameEvents(meta, feed, steam, pack.fullName), [meta, feed, steam, pack.fullName]);
  const today = dayOf(Date.now());
  const estimated = useMemo(() => estimateUpcoming(meta, feed, today, pack.fullName), [meta, feed, today, pack.fullName]);

  useEffect(() => {
    if (live.length === 0) return;
    setSaved((prev) => {
      const byId = new Map(prev.map((e) => [e.id, e]));
      let changed = false;
      for (const e of live) {
        const had = byId.get(e.id);
        if (!had || had.date !== e.date || had.name !== e.name) {
          byId.set(e.id, e);
          changed = true;
        }
      }
      if (!changed) return prev;
      const next = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, KEEP);
      writeJson(KEY, next);
      return next;
    });
  }, [live]);

  // Once a real season start is listed, its estimate would only repeat it.
  return useMemo(() => {
    const real = new Set(saved.filter((e) => e.kind === "season").map((e) => e.date));
    return [...saved, ...estimated.filter((e) => !(e.kind === "season" && real.has(e.date)))];
  }, [saved, estimated]);
}

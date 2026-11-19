/**
 * Which news stories and notices the player has read. Data and plain functions only (no React or storage), so the
 * Node tests can load it.
 *
 * A story counts as unread when it is newer than `since` and its id is not in `read`. `since` is set once, on the
 * first run, a few days back: a fresh install then shows the last few days as new instead of the whole backlog.
 * A notice has no date, so it is unread until it is read.
 */

export const NEWS_READ_KEY = "cs.newsRead";
/** The read list keeps the newest marks; older ids have long left the feed. */
export const MAX_READ = 600;
/** How far back a fresh install treats stories as new. */
export const FIRST_RUN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export interface NewsReadState {
  v: 1;
  /** Stories published before this moment count as read. */
  since: number;
  /** Ids marked read, oldest first. */
  read: string[];
}

export const freshNewsRead = (now: number): NewsReadState => ({ v: 1, since: now - FIRST_RUN_WINDOW_MS, read: [] });

/** Turns anything read from storage into a valid state; junk becomes a first-run state. */
export function cleanNewsRead(raw: unknown, now: number): NewsReadState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return freshNewsRead(now);
  const r = raw as Record<string, unknown>;
  const since = typeof r.since === "number" && Number.isFinite(r.since) ? Math.min(r.since, now) : now - FIRST_RUN_WINDOW_MS;
  const ids = Array.isArray(r.read) ? r.read.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
  return { v: 1, since, read: [...new Set(ids)].slice(-MAX_READ) };
}

/** `publishedAt` is left out for notices, which have no date. */
export function isUnread(s: NewsReadState, id: string, publishedAt?: number): boolean {
  if (publishedAt != null && publishedAt < s.since) return false;
  return !s.read.includes(id);
}

/** Adds ids to the read list. Returns the same object when nothing changes, so callers can skip the write. */
export function markRead(s: NewsReadState, ids: readonly string[]): NewsReadState {
  const add = ids.filter((id) => id && !s.read.includes(id));
  if (!add.length) return s;
  return { ...s, read: [...s.read, ...new Set(add)].slice(-MAX_READ) };
}

export function unreadCount(s: NewsReadState, items: readonly { id: string; publishedAt?: number }[]): number {
  let n = 0;
  for (const i of items) if (isUnread(s, i.id, i.publishedAt)) n++;
  return n;
}

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FEED_KIND_LABEL } from "../lib/feedKind";
import { age } from "../lib/format";
import { xBadge, xSource } from "../lib/xSource";
import { isUpcomingLeak, leakCopy, seasonNumberFromMeta } from "../lib/leakSeason";
import { openLink } from "../lib/openLink";
import { readString, writeString } from "../lib/storage";
import type { FeedItem, MetaData } from "../lib/types";
import { withGame } from "../lib/games";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty } from "./ui";
import { useInterval } from "../layout/onScreen";

const HOUR = 60 * 60 * 1000;
const HOURLY_KEY = "cs.leak.hourly";

function untilWord(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m < 1 ? "under a minute" : m < 60 ? `${m} min` : `${Math.round(m / 60)} h`;
}

/** Tasteful intel-tone lines while the leak feed is fetching. */
const LEAK_LOAD_LINES = [
  "Scanning the leak boards…",
  "Checking datamines…",
  "Listening for whispers…",
  "Cross-checking patch notes…",
  "Sifting rumor from signal…",
] as const;

const SEASON_LOAD_LINES = [
  "Checking which season is current…",
  "Reading the live season clock…",
  "Matching leaks to the current drop…",
] as const;

/** Compact loader: stable ring + soft cross-fade status line (no remount flash). */
function LeakFeedLoading({ lines = LEAK_LOAD_LINES }: { lines?: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const fadeOut = useRef<number | undefined>(undefined);
  useInterval(() => {
    setVisible(false);
    window.clearTimeout(fadeOut.current);
    fadeOut.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % lines.length);
      setVisible(true);
    }, 220);
  }, 2400);
  useEffect(() => () => window.clearTimeout(fadeOut.current), []);

  const line = lines[index] ?? lines[0];
  return (
    <div className="aleak-load" role="status" aria-live="polite" aria-label={line}>
      <svg className="aleak-ring" viewBox="0 0 40 40" aria-hidden="true">
        <circle className="aleak-ring-track" cx="20" cy="20" r="15.5" fill="none" />
        <circle className="aleak-ring-arc" cx="20" cy="20" r="15.5" fill="none" />
        <circle className="aleak-ring-core" cx="20" cy="20" r="2.5" />
      </svg>
      <p className={`aleak-line${visible ? " on" : ""}`}>{line}</p>
    </div>
  );
}

/** Headline, source, time and link. The free feed has no Confirmed / Leak / Rumor label. */
function Items({ items }: { items: FeedItem[] }) {
  return (
    <ul className="aitems">
      {items.map((i) => {
        const title = leakCopy(i).title || i.title;
        const x = xSource(i);
        const body = (
          <>
            <b>{title}</b>
            <div className="ahead">
              {i.isNew && <span className="anew">New</span>}
              {i.publishedAt ? <small>{age(i.publishedAt)} ago</small> : null}
            </div>
            {(i.source || i.url || i.kind) && (
              <small className="asrc">
                <strong className={`kindbadge kind-${i.kind}`}>{FEED_KIND_LABEL[i.kind]}</strong>
                {i.source ? ` · ${i.source}` : ""}
                {i.url ? " ↗" : ""}
                {x && <strong className="xbadge"> · {xBadge(x, i.source)}</strong>}
                {i.trusted && (
                  <strong className="trustbadge" title={i.trusted}>
                    {" "}
                    · ✓ Trusted
                  </strong>
                )}
              </small>
            )}
          </>
        );
        return (
          <li key={i.id || title}>
            {i.url ? (
              <button type="button" className="aleak" onClick={() => openLink(i.url!)} title={i.url}>
                {body}
              </button>
            ) : (
              <div className="aleak">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Leak headlines from the free feed. Check now and the hourly timer both call POST /api/feed/refresh,
 * which searches Google News RSS plus Reddit, YouTube and Blizzard. No paid AI.
 */
export const AiResearchCard = memo(function AiResearchCard() {
  const { provider, game, pack } = useStationCtx();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hourly, setHourly] = useState(() => readString(HOURLY_KEY) !== "0");
  const [nextAt, setNextAt] = useState(() => Date.now() + HOUR);
  const api = useApi<FeedItem[]>(withGame("/api/feed", game), checking ? 2000 : 60_000);
  const metaApi = useApi<MetaData>(withGame("/api/meta", game), 10 * 60_000);
  const data = api.data;
  const reloadRef = useRef(api.reload);
  reloadRef.current = api.reload;
  const busy = useRef(false);

  useInterval(() => setNow(Date.now()), 30_000);

  const check = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setChecking(true);
    setNextAt(Date.now() + HOUR);
    provider
      .api<FeedItem[]>(withGame("/api/feed/refresh", game), {})
      .then(() => reloadRef.current())
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        busy.current = false;
        setChecking(false);
      });
  }, [provider, game]);

  useEffect(() => {
    if (!hourly) return;
    const delay = Math.max(1000, nextAt - Date.now());
    const id = window.setTimeout(() => check(), delay);
    return () => window.clearTimeout(id);
  }, [hourly, nextAt, check]);

  const leaks = (data ?? []).filter((i) => i.kind === "leak");
  const seasonReady = metaApi.data != null || metaApi.error;
  const current = metaApi.data ? seasonNumberFromMeta(metaApi.data.season) : null;
  const shown = seasonReady ? leaks.filter((i) => isUpcomingLeak({ title: i.title, summary: i.summary, status: "leak" }, current)) : [];
  const freshCount = shown.filter((i) => i.isNew).length;
  const seasonLabel = current != null ? `S${current}` : null;
  const newest = leaks.reduce((m, i) => (i.publishedAt > m ? i.publishedAt : m), 0);
  const noneWhy =
    current == null
      ? "The current season number isn't available, so only a leak that is clearly about something unreleased can show."
      : `Nothing in the feed is about a season after ${seasonLabel}.`;
  const when = checking ? "Checking Google News, Reddit and YouTube…" : hourly ? `Next check in ${untilWord(nextAt - now)}` : "Hourly check is off";
  const status = newest ? `${when} · newest story ${age(newest, now)} ago` : when;

  return (
    <Card
      className={checking ? "aleak-busy" : undefined}
      title={pack.cards.airesearch}
      sub={
        data
          ? seasonLabel
            ? `After ${seasonLabel} · Google News`
            : game === "apex"
              ? "Events, leaks · Google News, Reddit, YouTube"
              : "Google News, Reddit and YouTube"
          : undefined
      }
      right={freshCount ? <span className="chip">{freshCount} new</span> : undefined}
    >
      {api.error && !data ? (
        <Empty>The local service isn't answering, so leak headlines can't load.</Empty>
      ) : !data ? (
        <LeakFeedLoading />
      ) : (
        <>
          <div className="aauto">
            <label className="aswitch">
              <input
                type="checkbox"
                checked={hourly}
                onChange={(e) => {
                  const on = e.target.checked;
                  setHourly(on);
                  writeString(HOURLY_KEY, on ? "1" : "0");
                  if (on) setNextAt(Date.now() + HOUR);
                }}
              />
              <span>Check every hour</span>
            </label>
            <button className="abtn" disabled={checking} onClick={check}>
              {checking ? "Checking…" : "Check now"}
            </button>
          </div>
          <p className="anote">{status}</p>
          {error && (
            <p className="aerr" role="alert">
              {error}
            </p>
          )}
          {leaks.length === 0 ? (
            <Empty>No leak headlines in the feed yet.</Empty>
          ) : !seasonReady ? (
            <LeakFeedLoading lines={SEASON_LOAD_LINES} />
          ) : shown.length > 0 ? (
            <div className="aanswer">
              <Items items={shown} />
              {current == null && <p className="anote">Current season number isn't known, so anything that names a season is hidden.</p>}
              <p className="mfoot">These are unconfirmed headlines. Open one to read the source.</p>
            </div>
          ) : (
            <Empty>{noneWhy}</Empty>
          )}
        </>
      )}
    </Card>
  );
});

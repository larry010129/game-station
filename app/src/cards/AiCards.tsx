import { memo, useEffect, useState } from "react";
import { age } from "../lib/format";
import { isUpcomingLeak, leakCopy, seasonNumberFromMeta } from "../lib/leakSeason";
import { openLink } from "../lib/openLink";
import type { AiData, AiResult, MetaData } from "../lib/types";
import { Segmented } from "../components/Segmented";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty } from "./ui";

const STATUS_WORD = { confirmed: "Confirmed", leak: "Leak", rumor: "Rumor" } as const;

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

  useEffect(() => {
    let fadeOut: number | undefined;
    const id = window.setInterval(() => {
      setVisible(false);
      fadeOut = window.setTimeout(() => {
        setIndex((i) => (i + 1) % lines.length);
        setVisible(true);
      }, 220);
    }, 2400);
    return () => {
      window.clearInterval(id);
      if (fadeOut != null) window.clearTimeout(fadeOut);
    };
  }, [lines]);

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

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return <>{Math.max(0, Math.round((now - since) / 1000))} s</>;
}

function untilWord(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m < 1 ? "under a minute" : m < 60 ? `${m} min` : `${Math.round(m / 60)} h`;
}

function Items({ items }: { items: AiResult["items"] }) {
  return (
    <ul className="aitems">
      {items.map((i, k) => {
        const copy = leakCopy(i);
        const body = (
          <>
            <b>{copy.title}</b>
            {copy.detail && <p>{copy.detail}</p>}
            <div className="ahead">
              <span className={`astatus ${i.status}`}>{STATUS_WORD[i.status]}</span>
              {i.fresh && <span className="anew">New</span>}
              {i.date && <small>{i.date}</small>}
            </div>
            {(i.source || i.url) && (
              <small className="asrc">
                {i.source || "Source"}
                {i.url ? " ↗" : ""}
              </small>
            )}
          </>
        );
        return (
          <li key={`${i.url || copy.title}-${k}`} className={i.status}>
            {i.url ? (
              <button type="button" className="aleak" onClick={() => openLink(i.url)} title={i.url}>
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

/** The leak feed: Claude or Gemini (API key) searches the web for leaks once an hour, on its own, and the card shows what it found. */
export const AiResearchCard = memo(function AiResearchCard() {
  const { provider } = useStationCtx();
  const [running, setRunning] = useState(false);
  const api = useApi<AiData>("/api/ai", running ? 2000 : 60_000);
  const metaApi = useApi<MetaData>("/api/meta", 10 * 60_000);
  const data = api.data;
  const job = data?.job ?? null;
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    setRunning(job?.state === "running");
  }, [job?.state, job?.id]);

  const send = (path: string, body: unknown) =>
    provider
      .api(path, body)
      .then(() => api.reload())
      .catch((e: Error) => {
        setRunning(false);
        setError(e.message);
      });

  const busy = job?.state === "running" || running;
  const auto = data?.auto;
  const engines = data?.engines ?? {};
  const latest = data?.results.find((r) => r.topic === "leaks") ?? null;
  const seasonReady = metaApi.data != null || metaApi.error;
  const current = metaApi.data ? seasonNumberFromMeta(metaApi.data.season) : null;
  const shown = seasonReady && latest ? latest.items.filter((i) => isUpcomingLeak(i, current)) : [];
  const freshCount = shown.filter((i) => i.fresh).length;
  const seasonLabel = current != null ? `S${current}` : null;
  const noneWhy =
    current == null
      ? "The current season number isn't available, so only a leak that is clearly about something unreleased can show."
      : `Nothing in the last check is about a season after ${seasonLabel}.`;
  const failed = !busy ? (auto?.error ?? (job?.state === "error" ? job.error : null)) : null;
  const engineName = engines[auto?.engine ?? "claude"] ?? "AI";
  const status = !auto
    ? ""
    : !auto.enabled
      ? "Hourly check is off"
      : busy
        ? `${engineName} is searching…`
        : auto.nextAt > now
          ? `Next check in ${untilWord(auto.nextAt - now)}`
          : "Checking soon";

  // One stable Card shell: busy tint only while searching; glass again when done.
  return (
    <Card
      className={busy ? "aleak-busy" : undefined}
      title="Leak feed"
      sub={
        data
          ? seasonLabel
            ? `${engineName} · after ${seasonLabel}`
            : `${engineName} searches the web for leaks every hour`
          : undefined
      }
      right={freshCount ? <span className="chip">{freshCount} new</span> : undefined}
    >
      {api.error && !data ? (
        <Empty>The local service isn't answering, so the hourly leak check can't run.</Empty>
      ) : !data ? (
        <LeakFeedLoading />
      ) : (
        <>
          <div className="aauto">
            <label className="aswitch">
              <input type="checkbox" checked={auto?.enabled ?? false} onChange={(e) => send("/api/ai/auto", { enabled: e.target.checked })} />
              <span>Check every hour</span>
            </label>
            <button
              className="abtn"
              disabled={busy}
              onClick={() => {
                setError(null);
                setRunning(true);
                send("/api/ai/ask", { engine: auto?.engine ?? "claude", topic: "leaks" });
              }}
            >
              {busy ? (
                <>
                  Searching… <Elapsed since={job?.startedAt ?? Date.now()} />
                </>
              ) : (
                "Check now"
              )}
            </button>
          </div>
          {auto && Object.keys(engines).length > 1 && (
            <Segmented label="AI" value={auto.engine} options={Object.entries(engines).map(([value, label]) => ({ value, label }))} onChange={(e) => send("/api/ai/auto", { engine: e })} />
          )}
          <p className="anote">
            {status}
            {latest ? ` · last checked ${age(latest.at)} ago` : ""}
          </p>
          {(error || failed) && (
            <p className="aerr" role="alert">
              {error ?? failed}
            </p>
          )}
          {latest && (latest.summary || latest.items.length > 0) ? (
            <div className="aanswer">
              {latest.summary && <p className="asum">{latest.summary}</p>}
              {shown.length > 0 ? (
                <Items items={shown} />
              ) : !seasonReady ? (
                <LeakFeedLoading lines={SEASON_LOAD_LINES} />
              ) : (
                <Empty>{noneWhy}</Empty>
              )}
              {seasonReady && current == null && shown.length > 0 && (
                <p className="anote">Current season number isn't known, so anything that names a season is hidden.</p>
              )}
              <p className="mfoot">AI can be wrong: open a leak to read the source.</p>
            </div>
          ) : busy ? (
            <LeakFeedLoading />
          ) : (
            <Empty>{latest ? "No leaks found in the last check." : "No check has finished yet. The first one runs a couple of minutes after the app starts."}</Empty>
          )}
        </>
      )}
    </Card>
  );
});

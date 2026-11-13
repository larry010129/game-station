import { useEffect, useState } from "react";
import { age } from "../lib/format";
import { openLink } from "../lib/openLink";
import type { AiData, AiResult } from "../lib/types";
import { Segmented } from "../components/Segmented";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty } from "./ui";

const STATUS_WORD = { confirmed: "Confirmed", leak: "Leak", rumor: "Rumor" } as const;

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

function Items({ r }: { r: AiResult }) {
  return (
    <ul className="aitems">
      {r.items.map((i, k) => (
        <li key={k}>
          <div className="ahead">
            <span className={`astatus ${i.status}`}>{STATUS_WORD[i.status]}</span>
            {i.fresh && <span className="anew">New</span>}
            {i.date && <small>{i.date}</small>}
          </div>
          <b>{i.title}</b>
          {i.summary && <p>{i.summary}</p>}
          <small className="asrc">
            {i.url ? (
              <button className="mlink" onClick={() => openLink(i.url)} title={i.url}>
                {i.source || "Source"} ↗
              </button>
            ) : (
              i.source
            )}
          </small>
        </li>
      ))}
    </ul>
  );
}

/** The leak feed: Claude or Gemini searches the web for leaks once an hour, on its own, and the card shows what it found. */
export function AiResearchCard() {
  const { provider } = useStationCtx();
  const [running, setRunning] = useState(false);
  const api = useApi<AiData>("/api/ai", running ? 2000 : 60_000);
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

  if (api.error && !data) {
    return (
      <Card title="Leak feed">
        <Empty>The local service isn't answering, so the hourly leak check can't run.</Empty>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card title="Leak feed">
        <Empty>Loading…</Empty>
      </Card>
    );
  }

  const auto = data.auto;
  const engines = data.engines;
  const latest = data.results.find((r) => r.topic === "leaks") ?? null;
  const busy = job?.state === "running" || running;
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

  return (
    <Card title="Leak feed" sub={`${engineName} searches the web for leaks every hour`} right={latest?.newCount ? <span className="chip">{latest.newCount} new</span> : undefined}>
      <div className="aauto">
        <label className="aswitch">
          <input type="checkbox" checked={auto?.enabled ?? false} onChange={(e) => send("/api/ai/auto", { enabled: e.target.checked })} />
          <span>Check every hour</span>
        </label>
        <button className="abtn" disabled={busy} onClick={() => { setError(null); setRunning(true); send("/api/ai/ask", { engine: auto?.engine ?? "claude", topic: "leaks" }); }}>
          {busy ? <>Searching… <Elapsed since={job?.startedAt ?? Date.now()} /></> : "Check now"}
        </button>
      </div>
      {auto && Object.keys(engines).length > 1 && (
        <Segmented label="AI" value={auto.engine} options={Object.entries(engines).map(([value, label]) => ({ value, label }))} onChange={(e) => send("/api/ai/auto", { engine: e })} />
      )}
      <p className="anote">{status}{latest ? ` · last checked ${age(latest.at)} ago` : ""}</p>
      {(error || failed) && <p className="aerr" role="alert">{error ?? failed}</p>}
      {latest && latest.items.length > 0 ? (
        <div className="aanswer">
          {latest.summary && <p className="asum">{latest.summary}</p>}
          <Items r={latest} />
          <p className="mfoot">AI can be wrong: open the source before you trust a leak.</p>
        </div>
      ) : (
        !busy && <Empty>{latest ? "No leaks found in the last check." : "No check has finished yet. The first one runs a couple of minutes after the app starts."}</Empty>
      )}
    </Card>
  );
}

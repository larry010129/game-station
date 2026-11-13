import { useEffect, useMemo, useState } from "react";
import { age } from "../lib/format";
import { openLink } from "../lib/openLink";
import type { FeedItem, PlayersData, SteamData } from "../lib/types";
import { useApi } from "../state/useApi";
import { Card, Empty, useEvery } from "./ui";

const fmt = (n: number) => n.toLocaleString("en-US");
const hourWord = (h: number) => {
  const d = new Date(2000, 0, 1, h);
  return d.toLocaleTimeString([], { hour: "numeric" }).replace(" ", "").toLowerCase();
};

function hourStats(data: PlayersData | null) {
  const hours = data?.hours ?? [];
  const byHour = new Map<number, number[]>();
  for (const h of hours) {
    const k = new Date(h.t).getHours();
    byHour.set(k, [...(byHour.get(k) ?? []), h.count]);
  }
  const avg = Array.from({ length: 24 }, (_, h) => {
    const v = byHour.get(h);
    return v?.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  });
  return { hours, avg };
}

export function TrendCard({ players }: { players: PlayersData | null }) {
  const { hours, avg } = useMemo(() => hourStats(players), [players]);
  if (!players) return <Card title="Player trend"><Empty>Loading...</Empty></Card>;
  if (hours.length < 3) {
    return (
      <Card title="Player trend" sub="Steam players, per hour">
        <Empty>Needs a few hours of history. The app has recorded {hours.length} so far, and it keeps recording while it runs.</Empty>
      </Card>
    );
  }
  const peak = hours.reduce((m, h) => (h.count > m.count ? h : m));
  const low = hours.reduce((m, h) => (h.count < m.count ? h : m));
  const now = players.latest?.count ?? hours[hours.length - 1].count;
  const dayAgo = hours.find((h) => Math.abs(h.t - (Date.now() - 24 * 3600_000)) < 90 * 60_000);
  const change = dayAgo ? Math.round(((now - dayAgo.count) / dayAgo.count) * 100) : null;
  const known = avg.map((v, h) => ({ v, h })).filter((x): x is { v: number; h: number } => x.v != null);
  const busiest = known.length ? known.reduce((m, x) => (x.v > m.v ? x : m)) : null;
  return (
    <Card title="Player trend" sub={`Last ${hours.length} hours, Steam players`} right={change != null && <span className={`chip${change < 0 ? " or" : ""}`}>{change > 0 ? "+" : ""}{change}% vs 24 h ago</span>}>
      <div className="kfacts">
        <div>
          <small>Peak · {hourWord(new Date(peak.t).getHours())}</small>
          <b>{fmt(peak.count)}</b>
        </div>
        <div>
          <small>Low · {hourWord(new Date(low.t).getHours())}</small>
          <b>{fmt(low.count)}</b>
        </div>
        <div>
          <small>Now</small>
          <b>{fmt(now)}</b>
        </div>
        <div>
          <small>Busiest hour</small>
          <b>{busiest ? hourWord(busiest.h) : "—"}</b>
        </div>
      </div>
    </Card>
  );
}

export function QueueCard({ players }: { players: PlayersData | null }) {
  const { hours, avg } = useMemo(() => hourStats(players), [players]);
  const known = avg.filter((v): v is number => v != null);
  if (!players) return <Card title="Best time to play"><Empty>Loading...</Empty></Card>;
  if (known.length < 4) {
    return (
      <Card title="Best time to play" sub="From the hourly player history">
        <Empty>Needs more history ({hours.length} hours so far). It fills in as the app runs, and gets better over a few days.</Empty>
      </Card>
    );
  }
  const max = Math.max(...known);
  const min = Math.min(...known);
  const order = avg.map((v, h) => ({ v, h })).filter((x): x is { v: number; h: number } => x.v != null).sort((a, b) => b.v - a.v);
  const busy = new Set(order.slice(0, 3).map((x) => x.h));
  const quiet = new Set(order.slice(-3).map((x) => x.h));
  return (
    <Card title="Best time to play" sub="More players usually means shorter queues" right={<span className="chip">Your time zone</span>}>
      <div className="khours" role="img" aria-label="Average players by hour of day">
        {avg.map((v, h) => (
          <div key={h} className="kh" title={v == null ? `${hourWord(h)}: no data yet` : `${hourWord(h)}: about ${fmt(v)} players`}>
            <i className={busy.has(h) ? "busy" : quiet.has(h) ? "quiet" : ""} style={{ height: v == null ? 0 : `${Math.max(6, ((v - min * 0.9) / (max - min * 0.9)) * 100)}%` }} />
            {h % 6 === 0 && <span>{hourWord(h)}</span>}
          </div>
        ))}
      </div>
      <p className="kwhy">
        Busiest: {order.slice(0, 3).map((x) => hourWord(x.h)).join(", ")}. Quietest: {order.slice(-3).reverse().map((x) => hourWord(x.h)).join(", ")}.
      </p>
    </Card>
  );
}

export function PatchCard({ items }: { items: FeedItem[] }) {
  const patch = items.filter((i) => i.kind === "patch").sort((a, b) => b.publishedAt - a.publishedAt)[0];
  if (!patch) return <Card title="Patch summary"><Empty>No patch notes loaded yet.</Empty></Card>;
  const heroes = patch.heroChanges ?? [];
  const tag = (h: { up: number; down: number }) => (h.up > h.down ? "buff" : h.down > h.up ? "nerf" : "changed");
  const counts = { buff: 0, nerf: 0, changed: 0 };
  heroes.forEach((h) => (counts[tag(h)] += 1));
  return (
    <Card
      title="Patch summary"
      sub={`${patch.title} · ${age(patch.publishedAt)} ago`}
      right={
        <button className="klink" onClick={() => patch.url && openLink(patch.url)}>
          Open
        </button>
      }
    >
      {heroes.length === 0 ? (
        <Empty>{patch.summary || "No hero changes listed."}</Empty>
      ) : (
        <>
          <div className="kfacts three">
            <div>
              <small>Buffed</small>
              <b>{counts.buff}</b>
            </div>
            <div>
              <small>Nerfed</small>
              <b>{counts.nerf}</b>
            </div>
            <div>
              <small>Other</small>
              <b>{counts.changed}</b>
            </div>
          </div>
          <div className="klist">
            {heroes.map((h) => (
              <div key={h.name} className="krow">
                <span className="kname">{h.name}</span>
                <span className={`kchip ${tag(h)}`}>{tag(h)}</span>
              </div>
            ))}
          </div>
          <p className="kwhy">Buff or nerf is guessed from the wording of each change, so check the notes.</p>
        </>
      )}
    </Card>
  );
}

export function LeaksCard({ items }: { items: FeedItem[] }) {
  const leaks = items.filter((i) => i.kind === "leak").sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 8);
  return (
    <Card title="Leak watch" sub="From the Overwatch leaks community">
      {leaks.length === 0 ? (
        <Empty>No leak posts right now.</Empty>
      ) : (
        <div className="klist news">
          {leaks.map((l) => (
            <button key={l.id} className="knews" onClick={() => l.url && openLink(l.url)}>
              <b>{l.title}</b>
              <small>
                {l.source} · {age(l.publishedAt)} ago
              </small>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export function SteamNewsCard() {
  const ms = useEvery(10 * 60_000, 0);
  const { data, error } = useApi<SteamData>("/api/steam", ms);
  return (
    <Card title="Steam news" sub="Overwatch 2 on Steam">
      {!data ? (
        <Empty>{error ? "Could not reach Steam." : "Loading..."}</Empty>
      ) : data.news.length === 0 ? (
        <Empty>{data.error ? "Could not reach Steam." : "No Steam posts."}</Empty>
      ) : (
        <div className="klist news">
          {data.news.map((n) => (
            <button key={n.id} className="knews" onClick={() => openLink(n.url)}>
              <b>{n.title}</b>
              <small>
                {n.source} · {age(n.date)} ago
              </small>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

const SEASON_KEY = "cs.season.end";

export function SeasonCard() {
  const [end, setEnd] = useState<string>(() => {
    try {
      return localStorage.getItem(SEASON_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const save = (v: string) => {
    setEnd(v);
    try {
      localStorage.setItem(SEASON_KEY, v);
    } catch {
      // not saved
    }
  };
  const endMs = end ? new Date(`${end}T00:00:00`).getTime() : NaN;
  const left = endMs - now;
  return (
    <Card
      title="Season countdown"
      sub={end ? `Ends ${new Date(endMs).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}` : "Set the end date"}
      right={
        <button className="klink" onClick={() => setEditing((e) => !e)}>
          {editing || !end ? "Done" : "Change"}
        </button>
      }
    >
      {(editing || !end) && (
        <label className="kfield">
          <small>Season end date (not published anywhere I can read, so you set it)</small>
          <input type="date" value={end} onChange={(e) => save(e.target.value)} />
        </label>
      )}
      {end && !Number.isNaN(endMs) &&
        (left > 0 ? (
          <div className="big">
            {Math.floor(left / 86400000)}
            <small>days</small> {Math.floor((left % 86400000) / 3600000)}
            <small>h</small>
          </div>
        ) : (
          <Empty>This season has ended. Set the next end date.</Empty>
        ))}
    </Card>
  );
}

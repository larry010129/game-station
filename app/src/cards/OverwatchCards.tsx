import { memo, useEffect, useMemo, useState } from "react";
import { age } from "../lib/format";
import { openLink } from "../lib/openLink";
import type { FeedItem, MetaData, PlayersData, SteamData } from "../lib/types";
import { withGame } from "../lib/games";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty, useEvery } from "./ui";
import { readString, removeKey, writeString } from "../lib/storage";
import { KEYS } from "../lib/storageKeys";
import { useInterval } from "../layout/onScreen";

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

export const TrendCard = memo(function TrendCard({ players }: { players: PlayersData | null }) {
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
          <b className="or">{fmt(now)}</b>
        </div>
        <div>
          <small>Busiest hour</small>
          <b>{busiest ? hourWord(busiest.h) : "—"}</b>
        </div>
      </div>
    </Card>
  );
});

export const QueueCard = memo(function QueueCard({ players }: { players: PlayersData | null }) {
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
});

/** Official patch notes URL when the active game pack recognizes the host. */
function officialPatchUrl(url: string | undefined, host: RegExp | null): string | null {
  if (!url) return null;
  if (!host) return url;
  if (!host.test(url)) return null;
  return url;
}

function NotesLink({ url, className, children }: { url: string; className?: string; children: string }) {
  return (
    <a
      className={className}
      href={url}
      rel="noreferrer"
      onClick={(e) => {
        e.preventDefault();
        void openLink(url);
      }}
    >
      {children}
    </a>
  );
}

export const PatchCard = memo(function PatchCard({ items }: { items: FeedItem[] }) {
  const { pack } = useStationCtx();
  const patch = items.filter((i) => i.kind === "patch").sort((a, b) => b.publishedAt - a.publishedAt)[0];
  if (!patch) return <Card title={pack.cards.patch}><Empty>No patch notes loaded yet.</Empty></Card>;
  const notes = officialPatchUrl(patch.url, pack.officialPatchHost);
  const heroes = patch.heroChanges ?? [];
  const tag = (h: { up: number; down: number }) => (h.up > h.down ? "buff" : h.down > h.up ? "nerf" : "changed");
  const counts = { buff: 0, nerf: 0, changed: 0 };
  heroes.forEach((h) => (counts[tag(h)] += 1));
  return (
    <Card
      title={pack.cards.patch}
      sub={
        <>
          {notes ? <NotesLink url={notes}>{patch.title}</NotesLink> : patch.title}
          {` · ${age(patch.publishedAt)} ago`}
        </>
      }
      right={notes ? <NotesLink className="klink" url={notes}>Official notes</NotesLink> : undefined}
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
              <b className={counts.nerf > 0 ? "or" : undefined}>{counts.nerf}</b>
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
});

export const SteamNewsCard = memo(function SteamNewsCard() {
  const { game, pack } = useStationCtx();
  const ms = useEvery(10 * 60_000, 0);
  const { data, error } = useApi<SteamData>(withGame("/api/steam", game), ms);
  return (
    <Card title={pack.cards.steam} sub={pack.steamSub}>
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
});

const SEASON_KEY = KEYS.seasonEnd;
const ET = "America/New_York";
/** Overwatch seasons run about 9 weeks. Counterwatch often has a start and no end. */
const ROUGH_DAYS = 63;
const ET_EVENING = 20;

function ymdShift(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour") % 24, n("minute"), n("second")) - utcMs;
}

/** 8:00pm on a calendar date in America/New_York, so EST and EDT both land on that evening. */
function easternEvening(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  let utc = Date.UTC(y, m - 1, d, ET_EVENING, 0, 0);
  const off = zoneOffset(utc, ET);
  utc -= off;
  const off2 = zoneOffset(utc, ET);
  if (off2 !== off) utc -= off2 - off;
  return utc;
}

const isYmd = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Start plus about 9 weeks, at 8pm Eastern. If that evening has passed, step forward by the same length. */
function roughEndMs(since: string, now: number): number {
  const start = since.slice(0, 10);
  if (!isYmd(start)) return NaN;
  let ymd = ymdShift(start, ROUGH_DAYS);
  let end = easternEvening(ymd);
  for (let i = 0; i < 40 && end <= now; i++) {
    ymd = ymdShift(ymd, ROUGH_DAYS);
    end = easternEvening(ymd);
  }
  return end;
}

function parseEnd(value: string): number {
  if (isYmd(value)) return easternEvening(value);
  const t = Date.parse(value);
  return Number.isNaN(t) ? NaN : t;
}

function easternLabel(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: ET,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export const SeasonCard = memo(function SeasonCard() {
  const { game, pack } = useStationCtx();
  const seasonKey = `${SEASON_KEY}.${game}`;
  const [custom, setCustom] = useState<string>(() => readString(seasonKey) ?? (game === "overwatch" ? readString(SEASON_KEY) : null) ?? "");
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setCustom(readString(seasonKey) ?? (game === "overwatch" ? readString(SEASON_KEY) : null) ?? "");
    setEditing(false);
  }, [game, seasonKey]);
  useInterval(() => setNow(Date.now()), 60_000);
  const poll = useEvery(10 * 60_000, 0);
  const { data: meta, error } = useApi<MetaData>(withGame("/api/meta", game), poll);
  const save = (v: string) => {
    setCustom(v);
    if (v) writeString(seasonKey, v);
    else removeKey(seasonKey);
  };
  const season = meta?.season;
  const customMs = custom ? new Date(`${custom}T00:00:00`).getTime() : NaN;
  const published = !custom && season?.until ? parseEnd(season.until) : NaN;
  const roughMs = !custom && Number.isNaN(published) && season?.since ? roughEndMs(season.since, now) : NaN;
  const endMs = custom ? customMs : !Number.isNaN(published) ? published : roughMs;
  const rough = !custom && Number.isNaN(published) && !Number.isNaN(roughMs);
  const known = !Number.isNaN(endMs);
  const left = endMs - now;
  const sub = !known
    ? error
      ? "Couldn't read the season"
      : "Loading..."
    : rough
      ? `Rough estimate · ${easternLabel(endMs)}`
      : custom
        ? `Ends ${new Date(endMs).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
        : `Ends ${easternLabel(endMs)}`;
  return (
    <Card
      title={pack.cards.season}
      sub={sub}
      right={
        <button className="klink" onClick={() => setEditing((e) => !e)}>
          {editing ? "Done" : "Change"}
        </button>
      }
    >
      {editing && (
        <label className="kfield">
          <small>Override the end date. Clear it to use the automatic estimate.</small>
          <input type="date" value={custom} onChange={(e) => save(e.target.value)} />
        </label>
      )}
      {!known ? (
        <Empty>{error ? "No season start yet, so there is no estimate." : "Loading..."}</Empty>
      ) : left > 0 ? (
        <>
          <div className="big or">
            {Math.floor(left / 86400000)}
            <small>days</small> {Math.floor((left % 86400000) / 3600000)}
            <small>h</small>
          </div>
          {rough && <p className="kwhy">About 9 weeks after {season?.name ? `${season.name} ` : "the season "}started. Not an official end time.</p>}
        </>
      ) : (
        <p className="empty ended">This season has ended. Set the next end date.</p>
      )}
    </Card>
  );
});

import { memo, useMemo, useState } from "react";
import { clockTime } from "../lib/format";
import type { CostData, DiscordStatus, LibraryData } from "../lib/types";
import type { AppToast } from "../state/useToasts";
import { useToast } from "../state/Toast";
import { useApi, useStationCtx } from "../state/useApi";
import { Bar, Card, Empty, span, useEvery, type Tone } from "./ui";
import { readJson, writeJson } from "../lib/storage";
import { KEYS } from "../lib/storageKeys";

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/* ---------- What this app costs ---------- */

export const CostCard = memo(function CostCard() {
  // Cost walks every process; match the service's 15 s refresh floor.
  const ms = useEvery(15_000, 30_000);
  const { data } = useApi<CostData>("/api/cost", ms);
  if (!data) return <Card title="App cost"><Empty>Measuring…</Empty></Card>;
  const cpu = (data.service.cpuPct ?? 0) + (data.shell?.cpuPct ?? 0);
  // Memory is judged on the service and its helpers. The window is a Chromium view, shown for reference below.
  const mb = data.service.mb;
  const cpuOk = cpu <= data.budget.cpuPct;
  const mbOk = mb <= data.budget.mb;
  const tone = (ok: boolean): Tone => (ok ? "ok" : "or");
  const measured = data.service.cpuPct != null;
  return (
    <Card
      title="App cost"
      sub="This app's own use, against its budget"
      right={<span className={`chip ${cpuOk && mbOk ? "good" : "or"}`}>{cpuOk && mbOk ? "Within budget" : "Over budget"}</span>}
    >
      <div className="klist">
        <div className="krow">
          <span className="kname">CPU</span>
          <Bar pct={measured ? (cpu / data.budget.cpuPct) * 100 : 0} tone={tone(cpuOk)} label="CPU against budget" />
          <span className="kval">{measured ? `${cpu.toFixed(2)}%` : "…"}</span>
        </div>
        <div className="krow">
          <span className="kname">Memory</span>
          <Bar pct={(mb / data.budget.mb) * 100} tone={tone(mbOk)} label="Memory against budget" />
          <span className="kval">{mb} MB</span>
        </div>
      </div>
      <div className="kfacts">
        <div>
          <small>Service</small>
          <b>{data.service.mb} MB</b>
        </div>
        <div>
          <small>Window</small>
          <b>{data.shell ? `${data.shell.mb} MB` : "Browser"}</b>
        </div>
      </div>
      <p className="khint">
        Budget: under {data.budget.cpuPct}% CPU in all, and {data.budget.mb} MB for the service and its helpers. The window is a web view and is not held to the memory number.
        {data.shell ? "" : " Open the desktop app to include its window."}
      </p>
    </Card>
  );
});

/* ---------- Game library ---------- */

const ago = (t: number) => {
  if (!t) return "Never played";
  const h = (Date.now() - t) / 3600_000;
  if (h < 48) return `${span(Date.now() - t)} ago`;
  const d = Math.floor(h / 24);
  return d < 60 ? `${d} days ago` : `${Math.floor(d / 30)} months ago`;
};

export const LibraryCard = memo(function LibraryCard() {
  const ms = useEvery(60000, 0);
  const { data, error } = useApi<LibraryData>("/api/library", ms);
  const { provider } = useStationCtx();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const play = async (id: string, name: string) => {
    if (busy) return;
    setBusy(id);
    try {
      await provider.api("/api/library/launch", { id });
      toast(`Starting ${name}…`);
    } catch (e) {
      toast(msg(e, `Couldn't start ${name}.`));
    } finally {
      window.setTimeout(() => setBusy(null), 1500);
    }
  };

  if (!data) return <Card title="Game library"><Empty>{error ? "Couldn't read the library." : "Looking for games…"}</Empty></Card>;
  return (
    <Card
      title="Game library"
      sub={`${data.total} installed on Steam`}
      right={
        data.battlenet ? (
          <button className="eb-btn" type="button" onClick={() => play("battlenet", "Battle.net")} disabled={busy != null}>
            Battle.net
          </button>
        ) : undefined
      }
    >
      {!data.steam && !data.battlenet ? (
        <Empty>No Steam or Battle.net install found.</Empty>
      ) : (
        <ul className="klib">
          {data.games.map((g) => (
            <li key={g.id}>
              <span className="kname">
                {g.name}
                <small>{ago(g.lastPlayed)}</small>
              </span>
              <button className="eb-btn" type="button" onClick={() => play(g.id, g.name)} disabled={busy != null} aria-label={`Play ${g.name}`}>
                {busy === g.id ? "Starting…" : "Play"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
});

/* ---------- Discord ---------- */

export interface DiscordToasts {
  items: AppToast[];
  access: string;
  dismiss: (id: string) => void;
}

/** Discord's own Windows notifications as an inbox: All, Unread and Mentions, newest first. */
const READ_KEY = KEYS.discordRead;
const BIDI = /[\u2066-\u2069\u200e\u200f]/g;
const clean = (s: string) => s.replace(BIDI, "").trim();

function readSet(): Set<string> {
  const raw = readJson<unknown>(READ_KEY, []);
  return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []);
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

/**
 * Finds the picture for a notification. Discord titles look like "Author #channel (#room, Server)" or "Name (#room)".
 * The sender's own server (the name before the bracket) wins, then the server named inside the bracket.
 * Direct messages have no server, so they keep the letter badge.
 */
function iconFor(title: string, guilds: Map<string, string>): string | null {
  const m = title.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  const author = (m ? m[1] : title).replace(/\s+#\S.*$/u, "").trim().toLowerCase();
  const inside = m ? m[2].split(",").map((x) => x.trim().toLowerCase()) : [];
  const server = inside.length >= 2 ? inside[inside.length - 1] : "";
  return guilds.get(author) ?? (server ? guilds.get(server) : undefined) ?? null;
}

function DiscordNotes({ toasts }: { toasts?: DiscordToasts }) {
  const { data: guildData } = useApi<{ guilds: DiscordGuild[] }>("/api/discord/guilds", 0);
  const icons = useMemo(() => new Map((guildData?.guilds ?? []).filter((g) => g.icon).map((g) => [g.name.trim().toLowerCase(), g.icon as string])), [guildData]);
  const [read, setRead] = useState<Set<string>>(readSet);
  const [filter, setFilter] = useState<"all" | "unread" | "mentions">("all");
  if (!toasts) return null;

  const save = (next: Set<string>) => {
    setRead(next);
    // It still applies until the app closes when storage is blocked.
    writeJson(READ_KEY, [...next].slice(-200));
  };
  const list = toasts.items
    .filter((n) => /discord/i.test(n.app))
    .sort((a, b) => b.t - a.t)
    .map((n) => {
      const title = clean(n.title || n.body);
      const body = n.body && n.body !== n.title ? clean(n.body) : "";
      return { id: n.id, title, body, t: n.t, unread: !read.has(n.id), mention: /@/.test(`${title} ${body}`), icon: iconFor(title, icons) };
    });
  const unread = list.filter((n) => n.unread).length;
  const mentions = list.filter((n) => n.mention).length;
  const shown = filter === "unread" ? list.filter((n) => n.unread) : filter === "mentions" ? list.filter((n) => n.mention) : list;
  const blocked = toasts.access === "denied" || toasts.access === "unspecified";

  return (
    <div className="dnotes">
      <div className="dhead">
        <h4>
          Notifications{unread > 0 && <span className="dcount">{unread} new</span>}
        </h4>
        <button type="button" className="dlink" disabled={unread === 0} onClick={() => save(new Set([...read, ...list.map((n) => n.id)]))}>
          Mark all read
        </button>
      </div>
      <div className="dtabs" role="tablist" aria-label="Filter notifications">
        {(
          [
            ["all", "All", 0],
            ["unread", "Unread", unread],
            ["mentions", "Mentions", mentions],
          ] as const
        ).map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>
            {label}
            {n > 0 && <span>{n}</span>}
          </button>
        ))}
      </div>
      {blocked ? (
        <p className="dempty">Windows has not allowed reading notifications.</p>
      ) : shown.length === 0 ? (
        <p className="dempty">{list.length === 0 ? "No Discord notifications right now." : "You're all caught up."}</p>
      ) : (
        <ul className="dlist" aria-live="polite">
          {shown.map((n) => (
            <li key={n.id} className={n.unread ? "unread" : ""}>
              <button type="button" className="drow" onClick={() => save(new Set([...read, n.id]))}>
                <span className="dav" aria-hidden="true">
                  {n.icon ? <img src={n.icon} alt="" referrerPolicy="no-referrer" loading="lazy" /> : (n.title.match(/[\p{L}\p{N}]/u)?.[0] ?? "#").toUpperCase()}
                  {n.mention && <i>@</i>}
                </span>
                <span className="dtext">
                  <span className="dline">
                    <b>{n.title}</b>
                    {n.t > 0 && <time dateTime={new Date(n.t).toISOString()}>{clockTime(n.t)}</time>}
                  </span>
                  {n.body && <small>{n.body}</small>}
                </span>
                <span className="ddot" aria-hidden="true" />
              </button>
              <button type="button" className="dx" aria-label="Dismiss this notification" onClick={() => toasts.dismiss(n.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const DiscordCard = memo(function DiscordCard({ toasts }: { toasts?: DiscordToasts }) {
  const ms = useEvery(3000, 10000);
  const { data, error, reload } = useApi<DiscordStatus>("/api/discord", ms);
  const { provider } = useStationCtx();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState("");
  const [secret, setSecret] = useState("");

  const act = async (path: string, body: unknown, ok?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await provider.api(path, body);
      if (ok) toast(ok);
      reload();
    } catch (e) {
      toast(msg(e, "Discord did not respond."));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <Card title="Discord"><Empty>{error ? "Couldn't reach the service." : "Looking for Discord…"}</Empty></Card>;

  if (data.state === "setup") {
    return (
      <Card title="Discord" sub="One-time setup">
        <p className="khint">
          Create an application at discord.com/developers, add <code>http://127.0.0.1</code> as a redirect, and paste its client id and secret here. Only the app owner can use the voice permissions.
        </p>
        <form
          className="kform"
          onSubmit={(e) => {
            e.preventDefault();
            void act("/api/discord/setup", { clientId: id, clientSecret: secret }, "Saved. Now sign in.").then(() => setSecret(""));
          }}
        >
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Client id" aria-label="Discord client id" inputMode="numeric" autoComplete="off" />
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Client secret" aria-label="Discord client secret" type="password" autoComplete="off" />
          <button className="eb-btn primary" type="submit" disabled={busy || !id || !secret}>
            Save
          </button>
        </form>
      </Card>
    );
  }
  if (data.state === "closed") return <Card title="Discord" sub="Not running"><Empty>Open Discord and this card connects by itself.</Empty><DiscordNotes toasts={toasts} /></Card>;
  if (data.state === "login") {
    return (
      <Card title="Discord" sub="Needs your approval">
        <Empty>Press sign in, then approve the prompt inside the Discord window.</Empty>
        <div className="krowbtn">
          <button className="eb-btn primary" type="button" disabled={busy} onClick={() => act("/api/discord/login", {}, "Signed in to Discord.")}>
            {busy ? "Waiting for Discord…" : "Sign in"}
          </button>
          <button className="eb-btn" type="button" disabled={busy} onClick={() => act("/api/discord/forget", {})}>
            Change app
          </button>
        </div>
        <DiscordNotes toasts={toasts} />
      </Card>
    );
  }
  return (
    <Card title="Discord" sub={data.channel ? data.channel.name : "Not in a voice channel"}>
      {data.channel ? (
        <ul className="klib">
          {data.channel.members.map((m, i) => (
            <li key={`${m.name}${i}`}>
              <span className="kname">{m.name}</span>
              <span className={`chip${m.deaf || m.mute ? " or" : ""}`}>{m.deaf ? "Deafened" : m.mute ? "Muted" : "Talking"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Join a voice channel to see who is in it.</Empty>
      )}
      <DiscordNotes toasts={toasts} />
    </Card>
  );
});

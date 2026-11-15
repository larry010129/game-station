import { memo, useEffect, useRef, useState } from "react";
import type { SpotifyPlaylist, SpotifyStatus } from "../lib/types";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty, useEvery } from "./ui";
import { useInterval } from "../layout/onScreen";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={d} />
  </svg>
);
const PREV = "M7 6v12M19 6 9 12l10 6V6z";
const NEXT = "M17 6v12M5 6l10 6-10 6V6z";
const PLAY = "M8 5v14l11-7L8 5z";
const PAUSE = "M8 5v14M16 5v14";
const SHUFFLE = "M3 7h3c5 0 5 10 10 10h5M3 17h3c1.5 0 2.5-.8 3.5-2M14.5 9C15.5 7.8 16.5 7 18 7h3M18 4l3 3-3 3M18 14l3 3-3 3";
const REPEAT = "M4 11V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H4M7 21l-3-3 3-3";

const NEXT_REPEAT = { off: "context", context: "track", track: "off" } as const;

const ROW = 40;

/** The playlist list is paged to the card's height, so it never scrolls and resizing the card shows more or fewer. */
function PlaylistPane({ deviceId, busy, onPick }: { deviceId?: string; busy: boolean; onPick: (uri: string, deviceId?: string) => void }) {
  const { data, error } = useApi<{ playlists: SpotifyPlaylist[] }>("/api/spotify/playlists", 0);
  const box = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(4);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setRows(Math.max(1, Math.floor(el.clientHeight / ROW)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);
  if (!data) return <Empty>{error ? "Could not load your playlists." : "Loading your playlists..."}</Empty>;
  const all = data.playlists;
  if (!all.length) return <Empty>No playlists on this account yet.</Empty>;
  const pages = Math.max(1, Math.ceil(all.length / rows));
  const cur = Math.min(page, pages - 1);
  return (
    <>
      <div className="ksp-pl" ref={box}>
        {all.slice(cur * rows, cur * rows + rows).map((p) => (
          <button key={p.id} disabled={busy} onClick={() => onPick(p.uri, deviceId)} title={p.name}>
            <span className="pa">{p.art ? <img src={p.art} alt="" referrerPolicy="no-referrer" /> : "♪"}</span>
            <span className="pn">{p.name}</span>
            <small>{p.tracks}</small>
          </button>
        ))}
      </div>
      {pages > 1 && (
        <div className="ksp-pager">
          <button className="eb-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page">
            Prev
          </button>
          <span>
            {cur + 1} / {pages}
          </span>
          <button className="eb-btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page">
            Next
          </button>
        </div>
      )}
    </>
  );
}

/** Spotify remote: any account, any device. Sign-in and setup happen inside the card. */
export const SpotifyCard = memo(function SpotifyCard() {
  const { provider } = useStationCtx();
  const ms = useEvery(3000, 20000);
  const { data, reload } = useApi<SpotifyStatus>("/api/spotify", ms);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [clientId, setClientId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [vol, setVol] = useState<number | null>(null);
  const [view, setView] = useState<"player" | "lists">("player");
  const base = useRef({ pos: 0, at: Date.now() });
  const volTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (data?.state === "ready") base.current = { pos: data.positionMs ?? 0, at: Date.now() };
  }, [data]);

  useInterval(() => setNow(Date.now()), data?.state === "ready" && data.playing ? 500 : null);

  useEffect(() => () => window.clearTimeout(volTimer.current), []);

  const run = async (path: string, body?: object) => {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await provider.api(path, body ?? {});
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };
  const control = (action: string, extra?: object) => run("/api/spotify/control", { action, ...extra });

  if (!data) {
    return (
      <Card title="Spotify" sub="Remote control">
        <Empty>Connecting to the station service...</Empty>
      </Card>
    );
  }

  if (data.state === "setup") {
    return (
      <Card title="Spotify" sub="One-time setup">
        <ol className="ksp-steps">
          <li>
            Open <b>developer.spotify.com/dashboard</b> and create an app (any name).
          </li>
          <li>
            Add this Redirect URI, exactly:
            <code className="ksp-uri" onClick={() => void navigator.clipboard?.writeText(data.redirectUri)} title="Click to copy">
              {data.redirectUri}
            </code>
          </li>
          <li>Tick "Web API", save, then paste the app's Client ID here.</li>
        </ol>
        <form
          className="ksp-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run("/api/spotify/setup", { clientId });
          }}
        >
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" spellCheck={false} aria-label="Spotify Client ID" />
          <button className="eb-btn" disabled={busy || !clientId.trim()}>
            Save
          </button>
        </form>
        {err && <p className="ksp-err">{err}</p>}
      </Card>
    );
  }

  if (data.state === "login") {
    return (
      <Card title="Spotify" sub="Not connected">
        <Empty>{data.message ?? "Sign in with any Spotify account. A browser tab opens; come back here when it says connected."}</Empty>
        <div className="ksp-form">
          <button className="eb-btn" disabled={busy} onClick={() => void run("/api/spotify/login")}>
            Connect Spotify
          </button>
        </div>
        {err && <p className="ksp-err">{err}</p>}
      </Card>
    );
  }

  const disconnect = (
    <div className="ksp-head">
      {(data.state === "ready" || data.state === "idle") && (
        <button className="eb-btn" onClick={() => setView(view === "lists" ? "player" : "lists")} aria-pressed={view === "lists"}>
          {view === "lists" ? "Player" : "Playlists"}
        </button>
      )}
      <button className="eb-btn" onClick={() => void run("/api/spotify/logout")} disabled={busy} aria-label="Disconnect Spotify">
        Disconnect
      </button>
    </div>
  );
  const pick = (uri: string, deviceId?: string) => {
    setView("player");
    void control("playlist", { uri, deviceId });
  };

  if (data.state === "error") {
    return (
      <Card title="Spotify" sub="Problem" right={disconnect}>
        <Empty>{data.message ?? "Spotify did not answer."}</Empty>
      </Card>
    );
  }

  if (data.state === "idle") {
    const devices = data.devices ?? [];
    if (view === "lists")
      return (
        <Card title="Spotify" sub="Your playlists" right={disconnect}>
          <div className="ksp">
            <PlaylistPane deviceId={devices.find((d) => d.active)?.id ?? devices[0]?.id} busy={busy} onPick={pick} />
          </div>
        </Card>
      );
    return (
      <Card title="Spotify" sub="Nothing playing" right={disconnect}>
        {devices.length ? (
          <>
            <Empty>Pick a device to start on.</Empty>
            <ul className="ksp-devices">
              {devices.map((d) => (
                <li key={d.id}>
                  <span>
                    {d.name} <small>{d.type}</small>
                  </span>
                  <button className="eb-btn" disabled={busy} onClick={() => void control("transfer", { deviceId: d.id })}>
                    Play here
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Empty>No device is open. Start Spotify on this PC or your phone and it shows up here.</Empty>
        )}
        {err && <p className="ksp-err">{err}</p>}
      </Card>
    );
  }

  const dur = data.durationMs ?? 0;
  const pos = Math.min(dur || Infinity, data.playing ? base.current.pos + (now - base.current.at) : (data.positionMs ?? 0));
  const volume = vol ?? data.device?.volume ?? 0;
  const others = (data.devices ?? []).filter((d) => !d.active);

  if (view === "lists")
    return (
      <Card title="Spotify" sub="Your playlists" right={disconnect}>
        <div className="ksp">
          <PlaylistPane deviceId={data.device?.id} busy={busy} onPick={pick} />
        </div>
      </Card>
    );

  return (
    <Card title="Spotify" sub={data.device?.name ?? "Remote"} right={disconnect}>
      <div className="ksp ksp-player">
      <div className="ksp-over" title={data.device?.name}>{disconnect}</div>
      <div className="ksp-cover" aria-hidden="true">
        {data.art ? <img src={data.art} alt="" referrerPolicy="no-referrer" /> : <span>♪</span>}
      </div>
      <div className="ksp-title">
        <b title={data.title}>{data.title}</b>
        <span title={[data.artist, data.album].filter(Boolean).join(" · ")}>{data.artist}</span>
      </div>
      <div
        className="kseek"
        role="slider"
        aria-label="Track position"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur / 1000)}
        aria-valuenow={Math.round(pos / 1000)}
        tabIndex={0}
        onClick={(e) => {
          if (!dur) return;
          const r = e.currentTarget.getBoundingClientRect();
          void control("seek", { ms: Math.round(((e.clientX - r.left) / r.width) * dur) });
        }}
      >
        <i style={{ width: `${dur ? (pos / dur) * 100 : 0}%` }} />
      </div>
      <div className="xl">
        <span>{mmss(pos)}</span>
        <span>{dur ? mmss(dur) : ""}</span>
      </div>
      <div className="kctl ksp-pill">
        <button className={`ksp-tog${data.shuffle ? " on" : ""}`} aria-pressed={data.shuffle} aria-label="Shuffle" onClick={() => void control("shuffle", { on: !data.shuffle })} disabled={busy}>
          <Ico d={SHUFFLE} />
        </button>
        <button aria-label="Previous track" onClick={() => void control("previous")} disabled={busy}>
          <Ico d={PREV} />
        </button>
        <button className="main" aria-label={data.playing ? "Pause" : "Play"} onClick={() => void control(data.playing ? "pause" : "play")} disabled={busy}>
          <Ico d={data.playing ? PAUSE : PLAY} />
        </button>
        <button aria-label="Next track" onClick={() => void control("next")} disabled={busy}>
          <Ico d={NEXT} />
        </button>
        <button
          className={`ksp-tog${data.repeat !== "off" ? " on" : ""}`}
          aria-label={`Repeat: ${data.repeat}`}
          onClick={() => void control("repeat", { mode: NEXT_REPEAT[data.repeat ?? "off"] })}
          disabled={busy}
        >
          <Ico d={REPEAT} />
          {data.repeat === "track" && <em>1</em>}
        </button>
      </div>
      {(
        <label className="ksp-vol" title={data.device?.canVolume ? undefined : "This device does not allow volume changes from Spotify"}>
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            disabled={!data.device?.canVolume}
            aria-label="Volume"
            onChange={(e) => {
              const v = Number(e.target.value);
              setVol(v);
              window.clearTimeout(volTimer.current);
              volTimer.current = window.setTimeout(() => {
                void provider
                  .api("/api/spotify/control", { action: "volume", percent: v })
                  .then(() => reload())
                  .catch((x) => setErr(x instanceof Error ? x.message : "Volume failed."))
                  .finally(() => setVol(null));
              }, 250);
            }}
          />
          <span>{volume}</span>
        </label>
      )}
      {others.length > 0 && (
        <select className="ksp-dev" aria-label="Play on another device" value="" disabled={busy} onChange={(e) => e.target.value && void control("transfer", { deviceId: e.target.value })}>
          <option value="">Play on another device...</option>
          {others.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.type})
            </option>
          ))}
        </select>
      )}
      {err && <p className="ksp-err">{err}</p>}
      </div>
    </Card>
  );
});

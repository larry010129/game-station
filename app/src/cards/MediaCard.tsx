import { useEffect, useRef, useState } from "react";
import type { MediaStatus } from "../lib/types";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty, useEvery } from "./ui";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function appName(id?: string) {
  if (!id) return "";
  if (/spotify/i.test(id)) return "Spotify";
  if (/chrome/i.test(id)) return "Chrome";
  if (/msedge/i.test(id)) return "Edge";
  if (/firefox/i.test(id)) return "Firefox";
  if (/music|itunes/i.test(id)) return "Apple Music";
  return id.replace(/\.exe$/i, "").split(/[!_]/).pop() ?? id;
}

const Prev = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 6v12M19 6 9 12l10 6V6z" />
  </svg>
);
const Next = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17 6v12M5 6l10 6-10 6V6z" />
  </svg>
);
const Play = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14l11-7L8 5z" />
  </svg>
);
const Pause = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5v14M16 5v14" />
  </svg>
);

/** Now playing, with play, pause, skip and seek. Uses Windows' media session, so it works for Spotify and anything else that is playing. */
export function MediaCard() {
  const { provider } = useStationCtx();
  const ms = useEvery(2000, 15000);
  const { data, reload } = useApi<MediaStatus>("/api/media", ms);
  const [art, setArt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const base = useRef({ pos: 0, at: Date.now() });

  // The cover is a large picture, so it is fetched only when the track changes.
  const artId = data?.artId ?? 0;
  useEffect(() => {
    let alive = true;
    if (!artId) {
      setArt(null);
      return;
    }
    provider
      .api<{ art: string | null }>("/api/media/art")
      .then((r) => alive && setArt(r.art))
      .catch(() => alive && setArt(null));
    return () => {
      alive = false;
    };
  }, [artId, provider]);

  useEffect(() => {
    if (data?.available) base.current = { pos: data.positionMs ?? 0, at: Date.now() };
  }, [data]);

  useEffect(() => {
    if (!data?.playing) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [data?.playing]);

  const send = async (action: string, extra?: object) => {
    if (busy) return;
    setBusy(true);
    try {
      await provider.api("/api/media/control", { action, ...extra });
      reload();
    } catch {
      // The next poll shows the real state.
    } finally {
      setBusy(false);
    }
  };

  if (!data?.available) {
    return (
      <Card title="Now playing" sub="Spotify and other media">
        <Empty>Nothing is playing. Start Spotify, or any media, and it shows up here.</Empty>
      </Card>
    );
  }

  const dur = data.durationMs ?? 0;
  const pos = Math.min(dur || Infinity, data.playing ? base.current.pos + (now - base.current.at) : (data.positionMs ?? 0));
  const pct = dur ? (pos / dur) * 100 : 0;

  return (
    <Card title="Now playing" sub={appName(data.app)}>
      <div className="kmedia">
        <div className="kart" aria-hidden="true">
          {art ? <img src={art} alt="" /> : <span>♪</span>}
        </div>
        <div className="kmeta">
          <b title={data.title}>{data.title || "Unknown track"}</b>
          <span title={data.artist}>{data.artist || "Unknown artist"}</span>
          {data.album && <small title={data.album}>{data.album}</small>}
        </div>
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
          void send("seek", { ms: Math.round(((e.clientX - r.left) / r.width) * dur) });
        }}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="xl">
        <span>{mmss(pos)}</span>
        <span>{dur ? mmss(dur) : ""}</span>
      </div>
      <div className="kctl">
        <button aria-label="Previous track" onClick={() => send("previous")} disabled={busy}>
          <Prev />
        </button>
        <button className="main" aria-label={data.playing ? "Pause" : "Play"} onClick={() => send("playpause")} disabled={busy}>
          {data.playing ? <Pause /> : <Play />}
        </button>
        <button aria-label="Next track" onClick={() => send("next")} disabled={busy}>
          <Next />
        </button>
      </div>
    </Card>
  );
}

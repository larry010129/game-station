import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import type { WaveLinkData } from "../lib/types";
import { Segmented } from "../components/Segmented";
import { readString, writeString } from "../lib/storage";
import { useApi, useStationCtx } from "../state/useApi";
import { Card, Empty, useEvery } from "./ui";

/** What the user just changed, shown at once while the change travels to Wave Link. */
type Local = Record<string, { level?: number; isMuted?: boolean }>;
type View = "channels" | "mixes";
const VIEW_KEY = "cs.wavelink.view";

// Lucide line icons, drawn at one stroke weight like the rest of the app.
const PATHS = {
  speaker: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
  waves: "M16 9a5 5 0 0 1 0 6M19.364 18.364a9 9 0 0 0 0-12.728",
  cross: "M22 9l-6 6M16 9l6 6",
  mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  micOff: "m2 2 20 20M18.89 13.23A7.12 7.12 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 12 5M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v3a3 3 0 0 0 5.12 2.12M12 19v3",
} as const;

function Ico({ paths }: { paths: (keyof typeof PATHS)[] }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((p) => (
        <path key={p} d={PATHS[p]} />
      ))}
    </svg>
  );
}

interface FaderProps {
  name: string;
  level: number;
  muted: boolean;
  onLevel: (v: number) => void;
  onMute: (m: boolean) => void;
}

/** One strip: the speaker is the mute button, the whole bar is the fader. */
function Fader({ name, level, muted, onLevel, onMute }: FaderProps) {
  const pct = Math.round(level * 100);
  return (
    <div className={`kwl-row${muted ? " muted" : ""}`}>
      <button type="button" className="kwl-ico" aria-pressed={muted} aria-label={`${muted ? "Unmute" : "Mute"} ${name}`} title={muted ? "Unmute" : "Mute"} onClick={() => onMute(!muted)}>
        <Ico paths={muted ? ["speaker", "cross"] : ["speaker", "waves"]} />
      </button>
      <span className="kwl-name" title={name}>
        {name}
      </span>
      <input
        type="range"
        className="kwl-fader"
        min={0}
        max={100}
        value={pct}
        style={{ "--fill": pct } as CSSProperties}
        aria-label={`${name} volume`}
        onChange={(e) => onLevel(Number(e.target.value) / 100)}
      />
      <span className="kwl-pct">{pct}</span>
    </div>
  );
}

/** Elgato Wave Link 3: microphone mutes, then one list of channel or mix faders, from the dashboard. */
export const WaveLinkCard = memo(function WaveLinkCard() {
  const { provider } = useStationCtx();
  const ms = useEvery(2000, 4000);
  const { data, reload } = useApi<WaveLinkData>("/api/wavelink", ms);
  const [local, setLocal] = useState<Local>({});
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => (readString(VIEW_KEY) === "mixes" ? "mixes" : "channels"));
  const timers = useRef<Record<string, number>>({});

  // A fresh reading replaces what was shown while a change was on its way.
  useEffect(() => {
    setLocal({});
  }, [data]);
  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  if (!data) return <Card title="Wave Link"><Empty>Looking for Wave Link…</Empty></Card>;
  if (data.state === "offline")
    return (
      <Card title="Wave Link" sub="Not running">
        <Empty>Open Elgato Wave Link and this card connects by itself.</Empty>
      </Card>
    );
  if (data.state === "unsupported")
    return (
      <Card title="Wave Link" sub={data.version}>
        <Empty>This card needs Wave Link 3 or newer.</Empty>
      </Card>
    );

  const send = (key: string, body: Record<string, unknown>, delay: number) => {
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => {
      provider
        .api("/api/wavelink/set", body)
        .then(() => {
          setErr(null);
          reload();
        })
        .catch((e) => {
          setLocal({});
          setErr(e instanceof Error && e.message ? e.message : "Wave Link did not accept that.");
        });
    }, delay);
  };
  const change = (key: string, patch: { level?: number; isMuted?: boolean }, body: Record<string, unknown>) => {
    setLocal((l) => ({ ...l, [key]: { ...l[key], ...patch } }));
    send(key, { ...body, ...patch }, patch.level !== undefined ? 120 : 0);
  };
  const pick = (v: View) => {
    setView(v);
    writeString(VIEW_KEY, v);
  };

  const mics = data.inputs.flatMap((d) => d.inputs.map((i) => ({ deviceId: d.id, input: i })));
  const strips = view === "channels" ? data.channels.map((c) => ({ ...c, kind: "channel" as const })) : data.mixes.map((m) => ({ ...m, kind: "mix" as const }));

  return (
    <Card title="Wave Link" sub={`Version ${data.version}`}>
      {err && <p className="ksp-err">{err}</p>}
      {mics.length > 0 && (
        <div className="kwl-mics">
          {mics.map(({ deviceId, input }) => {
            const key = `i:${deviceId}:${input.id}`;
            const muted = local[key]?.isMuted ?? input.isMuted;
            return (
              <button
                key={key}
                type="button"
                className={`kwl-mic${muted ? " on" : ""}`}
                aria-pressed={muted}
                aria-label={`${muted ? "Unmute" : "Mute"} microphone ${input.name}`}
                onClick={() => change(key, { isMuted: !muted }, { kind: "input", id: deviceId, inputId: input.id })}
              >
                <Ico paths={[muted ? "micOff" : "mic"]} />
                <span title={input.name}>{input.name}</span>
                <b>{muted ? "Muted" : "Live"}</b>
              </button>
            );
          })}
        </div>
      )}
      <Segmented
        label="Wave Link faders"
        value={view}
        options={[
          { value: "channels", label: "Channels" },
          { value: "mixes", label: "Mixes" },
        ]}
        onChange={pick}
      />
      <div className="kwl-list">
        {strips.map((s) => {
          const key = `${s.kind === "channel" ? "c" : "m"}:${s.id}`;
          return (
            <Fader
              key={key}
              name={s.name}
              level={local[key]?.level ?? s.level}
              muted={local[key]?.isMuted ?? s.isMuted}
              onLevel={(level) => change(key, { level }, { kind: s.kind, id: s.id })}
              onMute={(isMuted) => change(key, { isMuted }, { kind: s.kind, id: s.id })}
            />
          );
        })}
      </div>
    </Card>
  );
});

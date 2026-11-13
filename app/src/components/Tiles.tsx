import { dash } from "../lib/format";
import { TEMP_LIMIT, TEMP_WORD, clamp, tempState } from "../lib/series";
import type { Sample } from "../lib/types";
import { Icon } from "./Icon";

const SEGMENTS = 10;
const RING_R = 13;
const RING_C = 2 * Math.PI * RING_R;

/** Ten glowing pills, kept for the memory card. `label` includes the live number. */
export function StatMeter({ pct, tone = "ok", label }: { pct: number | null; tone?: "ok" | "good" | "mid" | "or" | "red"; label: string }) {
  const value = pct == null ? null : Math.round(clamp(pct, 0, 100));
  const filled = value == null || value <= 0 ? 0 : Math.max(1, Math.round(value / (100 / SEGMENTS)));
  return (
    <div
      className={`statmeter${tone === "ok" ? "" : ` ${tone}`}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={label}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <i key={i} className={i < filled ? "on" : ""} />
      ))}
    </div>
  );
}

/**
 * Small ring adapted from 21st.dev Circle Progress (hihahihahoho, demo 1727).
 * The arc starts at 12 o'clock. `pct` is 0 to 100; null draws the track only.
 */
function StatRing({ pct, tone = "ok", label }: { pct: number | null; tone?: "ok" | "or" | "red"; label: string }) {
  const value = pct == null ? null : Math.round(clamp(pct, 0, 100));
  const offset = value == null ? RING_C : RING_C * (1 - value / 100);
  return (
    <svg
      className={`statring${tone === "ok" ? "" : ` ${tone}`}`}
      viewBox="0 0 36 36"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={label}
    >
      <circle className="track" cx="18" cy="18" r={RING_R} />
      {value != null && value > 0 && <circle className="arc" cx="18" cy="18" r={RING_R} strokeDasharray={RING_C} strokeDashoffset={offset} />}
    </svg>
  );
}

interface DeviceProps {
  kind: "cpu" | "gpu";
  title: string;
  model: string;
  temp: number | null;
  selected?: boolean;
  hint?: string;
}

export function DeviceTile({ title, model, temp, selected, hint }: DeviceProps) {
  const state = tempState(temp);
  const tone = temp == null ? "ok" : state === "hot" ? "red" : state === "caution" ? "or" : "ok";
  const label = `${title} ${dash(temp)} degrees Celsius`;
  return (
    <section className={`t dev${selected ? " sel" : ""}`} aria-label={label} title={hint}>
      <div className="th">
        <div>
          <h2>{title}</h2>
          <small>{model}</small>
        </div>
        <Icon name="out" small />
      </div>
      <div className="statblock">
        <div className="val">
          <b className={tone === "red" ? "red" : tone === "or" ? "or" : undefined}>
            {dash(temp)}
            <small> °C</small>
          </b>
          <span className="ringend">
            <span className={`chip${temp == null ? "" : tone === "ok" ? "" : tone === "or" ? " or" : " red"}`}>
              {temp == null ? "No signal" : TEMP_WORD[state]}
            </span>
            <StatRing pct={temp == null ? null : ((temp - 40) / 60) * 100} tone={tone} label={label} />
          </span>
          <span className="lim">{temp == null ? hint ?? "—" : TEMP_LIMIT - temp > 0 ? `${TEMP_LIMIT - temp}° to limit` : "At the limit"}</span>
        </div>
      </div>
    </section>
  );
}

function LoadMeter({ name, pct }: { name: string; pct: number | null }) {
  const tone = pct != null && pct >= 90 ? "or" : "ok";
  const label = `${name} ${dash(pct)} percent`;
  return (
    <div className="stath">
      <span>{name}</span>
      <span className="ringend">
        <b className={tone === "or" ? "or" : undefined}>
          {dash(pct)}
          <small> %</small>
        </b>
        <StatRing pct={pct} tone={tone} label={label} />
      </span>
    </div>
  );
}

export function LoadTile({ cpu, gpu, stale }: { cpu: number | null; gpu: number | null; stale?: boolean }) {
  return (
    <section className="t dev" aria-label={`Load, CPU ${dash(cpu)} percent, GPU ${dash(gpu)} percent`}>
      <div className="th">
        <div>
          <h2>Load</h2>
          <small>CPU / GPU</small>
        </div>
        {stale && <span className="chip">No signal</span>}
      </div>
      <div className="statblock">
        <LoadMeter name="CPU" pct={cpu} />
        <LoadMeter name="GPU" pct={gpu} />
      </div>
    </section>
  );
}

export function UplinkTile({ sample }: { sample: Sample }) {
  const ping = sample.pingRegionMs;
  const tone = ping == null ? "ok" : ping > 120 ? "red" : ping > 60 ? "or" : "ok";
  const label = `Uplink ${dash(ping)} milliseconds`;
  return (
    <section className="t dev" aria-label="Uplink and power">
      <div className="th">
        <div>
          <h2>Uplink</h2>
          <small>Connect time</small>
        </div>
      </div>
      <div className="statblock">
        <div className="val">
          <b className={tone === "red" ? "red" : tone === "or" ? "or" : undefined}>
            {dash(ping)}
            <small> ms</small>
          </b>
          <span className="ringend">
            <span className="chip">
              {sample.stale ? "No signal" : sample.onAc == null ? "—" : sample.onAc ? "AC" : "Battery"}
              {sample.batteryPct != null ? ` · ${sample.batteryPct}%` : ""}
            </span>
            <StatRing pct={ping == null ? null : clamp(ping, 0, 100)} tone={tone} label={label} />
          </span>
          <span className="lim">router {dash(sample.pingRouterMs)} ms</span>
        </div>
      </div>
    </section>
  );
}

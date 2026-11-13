import { dash } from "../lib/format";
import { TEMP_LIMIT, TEMP_WORD, clamp, tempState } from "../lib/series";
import type { Sample } from "../lib/types";
import { Icon } from "./Icon";

const ART = {
  cpu: (
    <>
      <rect x="38" y="6" width="44" height="42" rx="4" />
      <rect x="48" y="16" width="24" height="22" rx="2" />
      <path d="M46 6V1M54 6V1M62 6V1M70 6V1M46 53v-5M54 53v-5M62 53v-5M70 53v-5M38 16h-6M38 27h-6M38 38h-6M82 16h6M82 27h6M82 38h6M4 27h22M94 27h22" />
    </>
  ),
  gpu: (
    <>
      <rect x="8" y="10" width="104" height="34" rx="4" />
      <circle cx="38" cy="27" r="11" />
      <circle cx="82" cy="27" r="11" />
      <circle cx="38" cy="27" r="3" />
      <circle cx="82" cy="27" r="3" />
      <path d="M18 44v6M30 44v6M42 44v6M54 44v6M2 16h6M2 38h6" />
    </>
  ),
};

/** A tick-mark scale with a sliding marker. `pct` is 0 to 100. */
function Ticks({ pct, state, limit }: { pct: number | null; state?: string; limit?: boolean }) {
  return (
    <div className={`ticks${state && state !== "ok" ? ` ${state}` : ""}`}>
      {pct != null && <i style={{ left: `${clamp(pct, 0, 100)}%` }} />}
      {limit && <u />}
    </div>
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

export function DeviceTile({ kind, title, model, temp, selected, hint }: DeviceProps) {
  const state = tempState(temp);
  return (
    <section className={`t dev${selected ? " sel" : ""}`} aria-label={`${title} temperature`} title={hint}>
      <div className="th">
        <div>
          <h2>{title}</h2>
          <small>{model}</small>
        </div>
        <Icon name="out" small />
      </div>
      <svg className="art" viewBox="0 0 120 54" aria-hidden="true">
        {ART[kind]}
      </svg>
      <div className="val">
        <b>
          {dash(temp)}
          <small> °C</small>
        </b>
        <span className={`chip${temp == null ? "" : state === "ok" ? "" : state === "caution" ? " or" : " red"}`}>
          {temp == null ? "No signal" : TEMP_WORD[state]}
        </span>
      </div>
      <Ticks pct={temp == null ? null : ((temp - 40) / 60) * 100} state={state === "caution" ? "or" : state === "hot" ? "red" : "ok"} limit />
      <div className="xl">
        <span>40°</span>
        <span>{temp == null ? hint ?? "—" : TEMP_LIMIT - temp > 0 ? `${TEMP_LIMIT - temp}° to limit` : "At the limit"}</span>
        <span>100°</span>
      </div>
    </section>
  );
}

export function LoadTile({ cpu, gpu }: { cpu: number | null; gpu: number | null }) {
  return (
    <section className="t dev" aria-label="Load">
      <div className="th">
        <div>
          <h2>Load</h2>
          <small>CPU / GPU</small>
        </div>
      </div>
      <div className="val">
        <b>
          {dash(cpu)}
          <small> %</small>
        </b>
        <b>
          {dash(gpu)}
          <small> %</small>
        </b>
      </div>
      <div className="tick-pair">
        <Ticks pct={cpu} />
        <Ticks pct={gpu} />
      </div>
    </section>
  );
}

export function UplinkTile({ sample }: { sample: Sample }) {
  return (
    <section className="t dev" aria-label="Uplink and power">
      <div className="th">
        <div>
          <h2>Uplink</h2>
          <small>Connect time</small>
        </div>
      </div>
      <div className="val">
        <b>
          {dash(sample.pingRegionMs)}
          <small> ms</small>
        </b>
        <span className="chip">
          {sample.onAc == null ? "—" : sample.onAc ? "AC" : "Battery"}
          {sample.batteryPct != null ? ` · ${sample.batteryPct}%` : ""}
        </span>
      </div>
      <Ticks pct={sample.pingRegionMs} />
      <div className="xl">
        <span>0</span>
        <span>router {dash(sample.pingRouterMs)} ms</span>
        <span>100</span>
      </div>
    </section>
  );
}

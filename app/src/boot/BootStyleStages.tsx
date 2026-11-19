import type { CSSProperties, FC, ReactNode } from "react";
import type { BootStyleId } from "./bootStyles";
import type { BootState, StepStatus } from "./types";

/**
 * The stage of each boot style: what draws the work while the shell (BootScreen) keeps the backdrop, the exit timer,
 * the screen-reader list and the retry. Every stage draws from the same facts, works for any number of steps, and
 * keeps the dashboard meanings: white carries progress, orange is caution, red is alert.
 * Animations are "from"-only or ambient, so reduced motion (app.css) lands on the finished state.
 */
export interface StageProps {
  state: BootState;
  pct: number;
  line: string;
  failed: boolean;
  leaving: boolean;
  noSignal: boolean;
  /** Starting / Working / Ready / Stopped / No signal. */
  chip: string;
  /** The retry alert while failed, placed by the stage. */
  children?: ReactNode;
}

const WORD: Record<StepStatus, string> = {
  standby: "Waiting",
  linking: "Linking",
  online: "Online",
  offline: "Offline",
  deferred: "Later",
  failed: "Failed",
};

/** Steps with the status each one shows: with no signal, the first core system reads as failed. */
function rows({ state, noSignal }: StageProps) {
  const firstCore = state.steps.findIndex((s) => s.required);
  return state.steps.map((s, i) => {
    const status: StepStatus = noSignal && i === firstCore ? "failed" : s.status;
    return { ...s, status, word: noSignal && i === firstCore ? "No signal" : WORD[status] };
  });
}

const settled = (s: StepStatus) => s === "online" || s === "offline" || s === "deferred";

const Title = () => (
  <p className="bs-title">
    <b>Command</b> Station
  </p>
);

const Line = ({ p }: { p: StageProps }) => (
  <p className="bs-line" role="status" key={p.failed ? "failed" : p.line}>
    {p.line}
  </p>
);

const Pct = ({ pct, className = "bs-pct" }: { pct: number; className?: string }) => (
  <b className={className}>
    {pct}
    <small>%</small>
  </b>
);

const bar = (pct: number) =>
  ({ role: "progressbar", "aria-label": "Startup progress", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct }) as const;

const vars = (pct: number, extra: Record<string, string | number> = {}) => ({ "--boot-p": pct / 100, ...extra }) as CSSProperties;

/* 01 Log: each settled system writes a line; the one in flight holds the caret. */
const Log: FC<StageProps> = (p) => {
  const list = rows(p);
  const shown = list.filter((s) => s.status !== "standby");
  return (
    <div className="bs-stage bs-log" style={vars(p.pct)}>
      <div className="bs-log-head">
        <Title />
        <Pct pct={p.pct} />
      </div>
      <div className="bs-log-rule" {...bar(p.pct)}>
        <i />
      </div>
      <ol className="bs-log-lines">
        {shown.map((s) => (
          <li key={s.id} className={s.status}>
            <span className="bs-log-label">{s.status === "linking" ? s.detail : s.label}</span>
            <span className="bs-log-lead" aria-hidden="true" />
            <span className="bs-log-word">{s.word}</span>
          </li>
        ))}
        {!p.leaving && !p.failed && !shown.some((s) => s.status === "linking") ? (
          <li className="linking">
            <span className="bs-log-label">{p.line}</span>
          </li>
        ) : null}
      </ol>
      <Line p={p} />
      {p.children}
    </div>
  );
};

/* 02 Sweep: a scope; each system is a mark on the ring that lights when the beam finds it. */
const Sweep: FC<StageProps> = (p) => {
  const list = rows(p);
  const n = Math.max(1, list.length);
  const up = list.filter((s) => settled(s.status)).length;
  return (
    <div className="bs-stage bs-sweep" style={vars(p.pct)}>
      <div className="bs-sweep-scope" {...bar(p.pct)}>
        <span className="bs-sweep-beam" aria-hidden="true" />
        <svg viewBox="-120 -120 240 240" aria-hidden="true">
          <circle className="bs-ring" r="112" />
          <circle className="bs-ring faint" r="76" />
          <circle className="bs-ring faint" r="40" />
          <path className="bs-cross" d="M-112 0 H112 M0 -112 V112" />
          <circle className="bs-sweep-arc" r="112" pathLength="100" />
          {list.map((s, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            return <circle key={s.id} className={`bs-blip ${s.status}`} cx={Math.cos(a) * 94} cy={Math.sin(a) * 94} r="4.5" />;
          })}
        </svg>
        <div className="bs-sweep-read">
          <Pct pct={p.pct} />
          <small>
            {up} of {list.length} up
          </small>
        </div>
      </div>
      <div className="bs-sweep-copy">
        <Title />
        <Line p={p} />
        <span className={`chip${p.failed ? " red" : p.leaving ? "" : " or"}`}>{p.chip}</span>
      </div>
      {p.children}
    </div>
  );
};

/* 03 Hairline: one line across the screen; the step in flight rides its tip. */
const Hairline: FC<StageProps> = (p) => (
  <div className="bs-stage bs-hair" style={vars(p.pct)}>
    <div className="bs-hair-track" {...bar(p.pct)}>
      <i className="bs-hair-fill" />
      <span className="bs-hair-tip">{p.failed ? p.chip : p.leaving ? "Ready" : (p.state.steps.find((s) => s.status === "linking")?.label ?? p.chip)}</span>
    </div>
    <div className="bs-hair-foot">
      <div>
        <Title />
        <Line p={p} />
      </div>
      <Pct pct={p.pct} />
    </div>
    {p.children}
  </div>
);

/* 04 Bus: every system taps into one line; the line carries current as far as the work has reached. */
const Bus: FC<StageProps> = (p) => {
  const list = rows(p);
  return (
    <div className="bs-stage bs-bus" style={vars(p.pct, { "--n": list.length })}>
      <div className="bs-bus-head">
        <Title />
        <Pct pct={p.pct} />
      </div>
      <ol className="bs-bus-line" {...bar(p.pct)}>
        {list.map((s) => (
          <li key={s.id} className={s.status}>
            <i className="bs-bus-node" aria-hidden="true" />
            <span>{s.label}</span>
          </li>
        ))}
      </ol>
      <Line p={p} />
      {p.children}
    </div>
  );
};

/* 05 Visor: corner frame closes in with progress; systems tick along the lower edge. */
const Visor: FC<StageProps> = (p) => {
  const list = rows(p);
  return (
    <div className="bs-stage bs-visor" style={vars(p.pct)}>
      <div className="bs-visor-frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <span className="bs-visor-scan" />
      </div>
      <div className="bs-visor-core" {...bar(p.pct)}>
        <Title />
        <Pct pct={p.pct} />
        <Line p={p} />
        {p.children}
      </div>
      <ul className="bs-visor-ticker">
        {list.map((s) => (
          <li key={s.id} className={s.status}>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* 06 Roll call: the column of systems scrolls so the one in flight sits on the line. */
const RollCall: FC<StageProps> = (p) => {
  const list = rows(p);
  let at = list.findIndex((s) => s.status === "failed");
  if (at < 0) at = list.findIndex((s) => s.status === "linking");
  if (at < 0) at = Math.max(0, list.findIndex((s) => s.status === "standby"));
  if (p.leaving) at = list.length - 1;
  return (
    <div className="bs-stage bs-roll" style={vars(p.pct, { "--at": at })}>
      <div className="bs-roll-side">
        <Title />
        <Pct pct={p.pct} />
        <div className="bs-roll-bar" {...bar(p.pct)}>
          <i />
        </div>
      </div>
      <div className="bs-roll-window">
        <ol className="bs-roll-list">
          {list.map((s, i) => (
            <li key={s.id} className={`${s.status}${i === at ? " at" : ""}`}>
              <span>{s.label}</span>
              <small>{s.word}</small>
            </li>
          ))}
        </ol>
      </div>
      <div className="bs-roll-foot">
        <Line p={p} />
        {p.children}
      </div>
    </div>
  );
};

/* 07 Tally: a stroke per system, gathered in fives; the count is the headline. */
const Tally: FC<StageProps> = (p) => {
  const list = rows(p);
  const groups: (typeof list)[] = [];
  list.forEach((s, i) => (groups[Math.floor(i / 5)] ??= []).push(s));
  return (
    <div className="bs-stage bs-tally" style={vars(p.pct)}>
      <Title />
      <Pct pct={p.pct} className="bs-pct bs-tally-num" />
      <div className="bs-tally-marks" {...bar(p.pct)}>
        {groups.map((g, gi) => (
          <svg key={gi} viewBox={`0 0 ${g.length === 5 ? 60 : g.length * 12 + 4} 48`} className="bs-tally-group" aria-hidden="true">
            {g.map((s, i) =>
              i < 4 ? (
                <line key={s.id} className={s.status} x1={6 + i * 12} y1="6" x2={6 + i * 12} y2="42" />
              ) : (
                <line key={s.id} className={`${s.status} slash`} x1="0" y1="38" x2="56" y2="10" />
              ),
            )}
          </svg>
        ))}
      </div>
      <Line p={p} />
      {p.children}
    </div>
  );
};

/* 08 Pulse: a trace across the screen; every system that answers adds a beat where it sits. */
const Pulse: FC<StageProps> = (p) => {
  const list = rows(p);
  const n = Math.max(1, list.length);
  const W = 1000;
  // Same command count for every step, so the path can morph from flat to a beat.
  let d = "M0 100";
  list.forEach((s, i) => {
    const x = ((i + 0.5) / n) * W;
    const k = s.status === "online" ? 1 : s.status === "linking" ? 0.35 : s.status === "offline" || s.status === "deferred" ? 0.18 : 0;
    d += ` L${x - 22} 100 L${x - 8} ${100 + 14 * k} L${x} ${100 - 72 * k} L${x + 9} ${100 + 34 * k} L${x + 20} 100`;
  });
  d += ` L${W} 100`;
  return (
    <div className="bs-stage bs-pulse" style={vars(p.pct)}>
      <div className="bs-pulse-head">
        <Title />
        <Pct pct={p.pct} />
      </div>
      <div className="bs-pulse-scope" {...bar(p.pct)}>
        <svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
          <path className="bs-pulse-base" d="M0 100 H1000" />
          <path className="bs-pulse-trace" d={d} />
        </svg>
        <i className="bs-pulse-head-dot" />
      </div>
      <Line p={p} />
      {p.children}
    </div>
  );
};

/* 09 Matrix: a field of cells fills in a scattered order as the weighted progress climbs. */
const CELLS = 120;
/** A fixed shuffle (seeded, so every boot fills the same way): cells land scattered, not in stripes. */
const ORDER = (() => {
  const out = Array.from({ length: CELLS }, (_, i) => i);
  let seed = 0x5eed;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
})();
const Matrix: FC<StageProps> = (p) => {
  const lit = Math.round((p.pct / 100) * CELLS);
  const on = new Set(ORDER.slice(0, lit));
  const newest = new Set(ORDER.slice(Math.max(0, lit - 3), lit));
  return (
    <div className="bs-stage bs-matrix" style={vars(p.pct)}>
      <div className="bs-matrix-head">
        <Title />
        <Pct pct={p.pct} />
      </div>
      <div className="bs-matrix-field" {...bar(p.pct)}>
        {Array.from({ length: CELLS }, (_, i) => (
          <i key={i} className={on.has(i) ? (newest.has(i) && !p.leaving ? "on new" : "on") : undefined} />
        ))}
      </div>
      <div className="bs-matrix-foot">
        <Line p={p} />
        <span className={`chip${p.failed ? " red" : p.leaving ? "" : " or"}`}>{p.chip}</span>
      </div>
      {p.children}
    </div>
  );
};

/* 10 Gauge: a needle climbs a half dial marked with one tick per system. */
const Gauge: FC<StageProps> = (p) => {
  const list = rows(p);
  const n = Math.max(1, list.length);
  return (
    <div className="bs-stage bs-gauge" style={vars(p.pct)}>
      <div className="bs-gauge-dial" {...bar(p.pct)}>
        <svg viewBox="-130 -124 260 136" aria-hidden="true">
          <path className="bs-gauge-arc" d="M-110 0 A110 110 0 0 1 110 0" />
          <path className="bs-gauge-fill" d="M-110 0 A110 110 0 0 1 110 0" pathLength="100" />
          {list.map((s, i) => {
            const a = Math.PI + ((i + 0.5) / n) * Math.PI;
            const c = Math.cos(a);
            const si = Math.sin(a);
            return <line key={s.id} className={`bs-gauge-tick ${s.status}`} x1={c * 92} y1={si * 92} x2={c * 100} y2={si * 100} />;
          })}
          <g className="bs-gauge-needle">
            <line x1="0" y1="0" x2="0" y2="-84" />
            <circle r="6" />
          </g>
        </svg>
        <Pct pct={p.pct} />
      </div>
      <Title />
      <Line p={p} />
      {p.children}
    </div>
  );
};

/* 11 Lanes: every system on its own track; a track fills when its system answers. */
const Lanes: FC<StageProps> = (p) => {
  const list = rows(p);
  return (
    <div className="bs-stage bs-lanes" style={vars(p.pct)}>
      <div className="bs-lanes-head">
        <div>
          <Title />
          <Line p={p} />
        </div>
        <Pct pct={p.pct} />
      </div>
      <ul className={`bs-lanes-list${list.length > 8 ? " two" : ""}`} {...bar(p.pct)}>
        {list.map((s) => (
          <li key={s.id} className={s.status}>
            <span className="bs-lane-label">{s.label}</span>
            <span className="bs-lane-track">
              <i />
            </span>
            <small>{s.word}</small>
          </li>
        ))}
      </ul>
      {p.children}
    </div>
  );
};

/* 12 Aperture: the cover opens from the centre onto the desk underneath, wider with every step. */
const Aperture: FC<StageProps> = (p) => (
  <div className="bs-stage bs-aperture" style={vars(p.pct)}>
    <div className="bs-aperture-ring" aria-hidden="true">
      <svg viewBox="-100 -100 200 200">
        <circle r="96" />
        <path d="M0 -96 V-84 M0 96 V84 M-96 0 H-84 M96 0 H84 M-68 -68 L-59 -59 M68 68 L59 59 M-68 68 L-59 59 M68 -68 L59 -59" />
      </svg>
    </div>
    <div className="bs-aperture-copy">
      <Title />
      <Line p={p} />
    </div>
    <div className="bs-aperture-read" {...bar(p.pct)}>
      <Pct pct={p.pct} />
      <span className={`chip${p.failed ? " red" : p.leaving ? "" : " or"}`}>{p.chip}</span>
    </div>
    {p.children ? <div className="bs-aperture-alert">{p.children}</div> : null}
  </div>
);

export const STYLE_STAGES: Record<BootStyleId, FC<StageProps>> = {
  "boot-01": Log,
  "boot-02": Sweep,
  "boot-03": Hairline,
  "boot-04": Bus,
  "boot-05": Visor,
  "boot-06": RollCall,
  "boot-07": Tally,
  "boot-08": Pulse,
  "boot-09": Matrix,
  "boot-10": Gauge,
  "boot-11": Lanes,
  "boot-12": Aperture,
};

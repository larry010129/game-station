import { useEffect, useRef, useState } from "react";
import { Backdrop } from "../components/Backdrop";
import { StationAlert } from "../components/StationAlert";
import type { BootState, BootStep, StepStatus } from "./types";
import { readBootStyle, type BootStyleId } from "./bootStyles";
import { STYLE_STAGES, type StageProps } from "./BootStyleStages";
import "../styles/boot.css";
import "../styles/bootstyles.css";

const EXIT_MS = 900;
const SEGMENTS = 24;

export const STATUS_WORD: Record<StepStatus, string> = {
  standby: "Waiting",
  linking: "Linking",
  online: "Online",
  offline: "Offline",
  deferred: "Later",
  failed: "Failed",
};

export function headline(state: BootState): string {
  if (state.phase === "error") return state.problem ?? "Something stopped the startup.";
  if (state.phase === "ready") return "All systems online";
  if (state.phase === "connecting") return "Reaching the local service…";
  return state.steps.find((s) => s.status === "linking")?.detail ?? "Bringing systems online…";
}

function reducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full loading work surface over the dashboard ghost.
 * Frames assemble underneath; this layer reports real boot work; on ready it peels away
 * and the existing handoff reveals the dashboard.
 */
export function BootScreen({
  state,
  image,
  onExited,
  style,
}: {
  state: BootState;
  image?: string | null;
  onExited: () => void;
  /** A boot style to draw; omitted: the one this PC has equipped (read once, the cover is the first paint). */
  style?: BootStyleId | null;
}) {
  const [equipped] = useState(() => (style === undefined ? readBootStyle() : style));
  const exited = useRef(onExited);
  exited.current = onExited;

  const leaving = state.phase === "ready";
  const failed = state.phase === "error";

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => exited.current(), reducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  const pct = Math.round(Math.min(1, Math.max(0, state.progress)) * 100);
  const line = headline(state);
  const noSignal = failed && state.steps[0]?.status !== "online";
  const cls = `boot${leaving ? " out" : ""}${failed ? " bad" : ""}${state.short ? " short" : ""}`;
  const linking = state.steps.find((s) => s.status === "linking");

  const alert = failed ? (
    <StationAlert className="boot-stopped" tone="alert" action={{ label: "Try again", onClick: state.retry }}>
      {line}
    </StationAlert>
  ) : null;
  const Stage = equipped ? STYLE_STAGES[equipped] : PlainStage;
  const chip = failed ? (noSignal ? "No signal" : "Stopped") : leaving ? "Ready" : linking ? "Working" : "Starting";
  const stage: StageProps = { state, pct, line, failed, leaving, noSignal, chip };

  return (
    <div className={cls} aria-busy={!leaving && !failed} data-boot-style={equipped ?? undefined}>
      <Backdrop image={image} />

      <div className="boot-work" aria-hidden={leaving || undefined}>
        <div className="boot-work-veil" />
        <Stage {...stage}>{alert}</Stage>
      </div>

      <ul className="boot-sr">
        {state.steps.map((s, i) => (
          <li key={s.id}>
            {s.label}: {noSignal && i === 0 ? "No signal" : STATUS_WORD[s.status]}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The plain screen's stage: free for everyone, and what shows when no boot style is equipped. */
export function PlainStage({ state, pct, line, failed, leaving, noSignal, chip, children }: StageProps) {
  const lit = Math.round((pct / 100) * SEGMENTS);
  const required = state.steps.filter((s) => s.required);
  const optional = state.steps.filter((s) => !s.required);
  return (
    <div className="boot-work-stage">
      <div className="boot-work-head">
        <WorkMark failed={failed} />
        <div className="boot-work-copy">
          <p className="boot-work-title">
            <b>Command</b> Station
          </p>
          <p className="boot-work-line" role="status" key={failed ? "failed" : line}>
            {line}
          </p>
          <div className="boot-work-meta">
            <span className={`chip${failed ? " red" : leaving ? "" : " or"}`}>{chip}</span>
            <b className="boot-pct">
              {pct}
              <small>%</small>
            </b>
          </div>
        </div>
      </div>

      <div className="boot-work-progress" role="progressbar" aria-label="Startup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <i key={i} className={i < lit ? "on" : undefined} />
        ))}
      </div>

      <div className="boot-work-lists">
        <SystemsList title="Core systems" steps={required} noSignal={noSignal} />
        {optional.length > 0 && <SystemsList title="Pulling data" steps={optional} noSignal={false} />}
      </div>

      {children}
    </div>
  );
}

function SystemsList({ title, steps, noSignal }: { title: string; steps: BootStep[]; noSignal: boolean }) {
  return (
    <section className="boot-systems">
      <h2>{title}</h2>
      <ul>
        {steps.map((step, i) => {
          const status: StepStatus = noSignal && i === 0 ? "failed" : step.status;
          return (
            <li key={step.id} className={status}>
              <span className="boot-sys-label">{step.label}</span>
              <span className="boot-sys-status">{noSignal && i === 0 ? "No signal" : STATUS_WORD[status]}</span>
              <span className="boot-sys-mark" aria-hidden="true" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Command Station brand mark: corner lock + station reticule (static; progress lives in the bar/%). */
function WorkMark({ failed }: { failed: boolean }) {
  return (
    <svg className={`boot-mark${failed ? " red" : ""}`} viewBox="0 0 100 100" aria-hidden="true">
      <path className="boot-mark-bracket" d="M16 30 V16 H30" />
      <path className="boot-mark-bracket" d="M70 16 H84 V30" />
      <path className="boot-mark-bracket" d="M16 70 V84 H30" />
      <path className="boot-mark-bracket" d="M70 84 H84 V70" />
      <circle className="boot-mark-ring" cx="50" cy="50" r="18" />
      <path className="boot-mark-cross" d="M50 28 V40 M50 60 V72 M28 50 H40 M60 50 H72" />
      <circle className="boot-mark-hub" cx="50" cy="50" r="5" />
    </svg>
  );
}

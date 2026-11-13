import { useEffect, useRef, useState } from "react";
import { Backdrop } from "../components/Backdrop";
import { StationAlert } from "../components/StationAlert";
import { CARD_NAMES, type CardId } from "../layout/layouts";
import { STEPS, TELEMETRY } from "./bootSteps";
import type { BootState, BootStep, StepStatus } from "./types";
import "../styles/boot.css";

const EXIT_MS = 900;
const SEGMENTS = 24;

const STATUS_WORD: Record<StepStatus, string> = {
  standby: "Waiting",
  linking: "Linking",
  online: "Online",
  offline: "Offline",
  deferred: "Later",
  failed: "Failed",
};

function headline(state: BootState): string {
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
export function BootScreen({ state, image, onExited }: { state: BootState; image?: string | null; onExited: () => void }) {
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
  const lit = Math.round((pct / 100) * SEGMENTS);
  const line = headline(state);
  const noSignal = failed && state.steps[0]?.status !== "online";
  const cls = `boot${leaving ? " out" : ""}${failed ? " bad" : ""}${state.short ? " short" : ""}`;
  const required = state.steps.filter((s) => s.required);
  const optional = state.steps.filter((s) => !s.required);
  const linking = state.steps.find((s) => s.status === "linking");

  return (
    <div className={cls} aria-busy={!leaving && !failed}>
      <Backdrop image={image} />
      <Frames steps={state.steps} noSignal={noSignal} />

      <div className="boot-page">
        <header className="boot-top">
          <div className="brand">
            <b>Command</b> Station
          </div>
        </header>
      </div>

      <div className="boot-work" aria-hidden={leaving || undefined}>
        <div className="boot-work-veil" />
        <div className="boot-work-stage">
          <div className="boot-work-head">
            <WorkMark done={leaving} failed={failed} progress={state.progress} />
            <div className="boot-work-copy">
              <p className="boot-work-title">
                <b>Command</b> Station
              </p>
              <p className="boot-work-line" role="status" key={failed ? "failed" : line}>
                {line}
              </p>
              <div className="boot-work-meta">
                <span className={`chip${failed ? " red" : leaving ? "" : " or"}`}>
                  {failed ? (noSignal ? "No signal" : "Stopped") : leaving ? "Ready" : linking ? "Working" : "Starting"}
                </span>
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

          {failed && (
            <StationAlert
              className="boot-stopped"
              tone="alert"
              action={{ label: "Try again", onClick: state.retry }}
            >
              {line}
            </StationAlert>
          )}
        </div>
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

const SIG_BARS = [0.38, 0.52, 0.68, 0.84, 1] as const;

/** Telemetry signal lock: ascending bars fill with real progress; frontier bar pulses while linking. */
function WorkMark({ done, failed, progress }: { done: boolean; failed: boolean; progress: number }) {
  const p = done ? 1 : Math.min(1, Math.max(0, progress));
  const n = SIG_BARS.length;
  return (
    <svg className={`boot-sig${done ? " done" : ""}${failed ? " red" : ""}`} viewBox="0 0 100 100" aria-hidden="true">
      <path className="boot-sig-bracket" d="M16 30 V16 H30" />
      <path className="boot-sig-bracket" d="M70 16 H84 V30" />
      <path className="boot-sig-bracket" d="M16 70 V84 H30" />
      <path className="boot-sig-bracket" d="M70 84 H84 V70" />
      {SIG_BARS.map((h, i) => {
        const start = i / n;
        const slice = 1 / n;
        const fill = Math.min(1, Math.max(0, (p - start) / slice));
        const barH = 56 * h;
        const x = 22 + i * 13;
        const y = 78 - barH;
        const frontier = !done && !failed && p >= start && p < start + slice;
        return (
          <g key={i}>
            <rect className="boot-sig-track" x={x} y={y} width={8} height={barH} rx={1.5} />
            <rect
              className={`boot-sig-bar${fill > 0.02 ? " on" : ""}${frontier ? " tip" : ""}`}
              x={x}
              y={y + barH * (1 - fill)}
              width={8}
              height={Math.max(0, barH * fill)}
              rx={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

interface Frame {
  key: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which startup system each card waits on. Cards with no source of their own come alive with the live reading. */
const CARD_STEP = new Map<string, string>(STEPS.flatMap((d) => d.sources.flatMap((s) => (s.cards ?? []).map((c) => [c, d.id] as [string, string]))));

/** Where the hidden dashboard's cards really sit, so the cover can draw their empty frames in place. */
function useFrames(): Frame[] {
  const [frames, setFrames] = useState<Frame[]>([]);
  const seen = useRef("");
  useEffect(() => {
    const read = () => {
      const out: Frame[] = [];
      document.querySelectorAll<HTMLElement>(".boot-under .cell[data-card]").forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8 || r.top > innerHeight || r.bottom < 0) return;
        out.push({ key: `${i}:${el.dataset.card}`, type: el.dataset.card ?? "", x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
      });
      const sig = JSON.stringify(out);
      if (sig === seen.current) return;
      seen.current = sig;
      setFrames(out);
    };
    read();
    let frame = 0;
    const seenDom = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    });
    seenDom.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    const id = window.setInterval(read, 300);
    window.addEventListener("resize", read);
    return () => {
      seenDom.disconnect();
      cancelAnimationFrame(frame);
      window.clearInterval(id);
      window.removeEventListener("resize", read);
    };
  }, []);
  return frames;
}

/**
 * The dashboard's own layout, as empty frames exactly where the cards will be.
 * Each frame waits, links and locks in with the system that feeds its card.
 */
function Frames({ steps, noSignal }: { steps: BootStep[]; noSignal: boolean }) {
  const frames = useFrames();
  const status = new Map(steps.map((s) => [s.id, s.status]));
  const label = new Map(steps.map((s) => [s.id, s.label]));
  const live = status.get(TELEMETRY) ?? "standby";
  return (
    <div className="boot-frames" aria-hidden="true">
      {frames.map((f, i) => {
        const stepId = CARD_STEP.get(f.type);
        const id = stepId && status.has(stepId) ? stepId : TELEMETRY;
        const name = CARD_NAMES[f.type as CardId] ?? f.type;
        const sys = label.get(id) ?? "Live telemetry";
        const st: StepStatus = noSignal ? "standby" : (status.get(id) ?? live);
        return (
          <div key={f.key} className={`boot-frame ${st}${f.h < 64 ? " tight" : ""}`} style={{ left: f.x, top: f.y, width: f.w, height: f.h, animationDelay: `${Math.min(i, 14) * 35}ms` }}>
            <span className="boot-frame-text">
              <span className="boot-frame-name">{name}</span>
              {sys !== name && <small>{sys}</small>}
            </span>
            <span className="boot-frame-mark" />
          </div>
        );
      })}
    </div>
  );
}

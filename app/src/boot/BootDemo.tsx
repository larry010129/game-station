import { useEffect, useState } from "react";
import { Backdrop } from "../components/Backdrop";
import { BootScreen } from "./BootScreen";
import type { BootState, BootStep, StepStatus } from "./types";

/**
 * Design preview only: /?boot=demo plays the boot screen on a scripted timeline, no service needed.
 * Add &fail=1 for the no-signal state, &short=1 for the warm-restart version.
 */
const STEPS: Omit<BootStep, "status">[] = [
  { id: "core", label: "Core service", detail: "Waking the core service…", required: true },
  { id: "hardware", label: "Hardware scan", detail: "Scanning hardware…", required: true },
  { id: "profiles", label: "Profiles", detail: "Loading your profiles…", required: true },
  { id: "telemetry", label: "Live telemetry", detail: "Linking live telemetry…", required: true },
  { id: "net", label: "Network uplink", detail: "Measuring the uplink…", required: false },
  { id: "players", label: "Players online", detail: "Counting players online…", required: false },
  { id: "feed", label: "Intel feed", detail: "Pulling the intel feed…", required: false },
  { id: "meta", label: "Overwatch meta", detail: "Reading the current meta…", required: false },
  { id: "media", label: "Media", detail: "Finding what's playing…", required: false },
  { id: "extras", label: "System extras", detail: "Checking temperatures and cost…", required: false },
];

const STEP_MS = 620;

/** A stand-in Home layout (left, top, width, height in %), so the cover has card frames to draw without a dashboard. */
const CELLS: [string, number, number, number, number][] = [
  ["chart", 1.4, 9, 97.2, 42],
  ["gpu", 1.4, 53, 31.6, 20],
  ["alerts", 34.2, 53, 31.6, 44],
  ["feed", 67, 53, 31.6, 44],
  ["load", 1.4, 75, 15.2, 22],
  ["uplink", 17.8, 75, 15.2, 22],
];

export function BootDemo() {
  const q = new URLSearchParams(location.search);
  const fail = q.has("fail");
  const short = q.has("short");
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(0);
  const [gone, setGone] = useState(false);
  const [noSignal, setNoSignal] = useState(false);

  useEffect(() => {
    setDone(0);
    setGone(false);
    setNoSignal(false);
    if (fail) {
      const id = window.setTimeout(() => setNoSignal(true), 3000);
      return () => window.clearTimeout(id);
    }
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setDone(n);
      if (n > STEPS.length) window.clearInterval(id);
    }, short ? 120 : STEP_MS);
    return () => window.clearInterval(id);
  }, [run, fail, short]);

  const steps: BootStep[] = STEPS.map((s, i) => {
    let status: StepStatus = i < done ? "online" : i === done ? "linking" : "standby";
    if (s.id === "media" && i < done) status = "offline";
    return { ...s, status };
  });

  const state: BootState = {
    phase: noSignal ? "error" : done > STEPS.length ? "ready" : done === 0 ? "connecting" : "booting",
    steps,
    progress: Math.min(1, done / STEPS.length),
    problem: noSignal ? "The local service hasn't started. It may still be launching, or it may have stopped." : null,
    short,
    retry: () => setRun((r) => r + 1),
  };

  return (
    <>
      <Backdrop />
      <div className="page" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <button type="button" className="pill-btn" onClick={() => setRun((r) => r + 1)}>
          Replay boot
        </button>
      </div>
      <div className="boot-under" aria-hidden="true">
        {CELLS.map(([type, l, t, w, h]) => (
          <div key={type} className="cell" data-card={type} style={{ position: "fixed", left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }} />
        ))}
      </div>
      {!gone && <BootScreen key={run} state={state} onExited={() => setGone(true)} />}
    </>
  );
}

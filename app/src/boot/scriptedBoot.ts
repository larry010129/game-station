import { useEffect, useState } from "react";
import type { BootState, BootStep, StepStatus } from "./types";

/**
 * A boot played on a timer, with no service behind it: the dev demo (/?boot=demo) and the boot style preview on the
 * Themes page both use it. `fail` ends in the no-signal state, `short` plays the warm-restart pace.
 */
const STEPS: Omit<BootStep, "status">[] = [
  { id: "content", label: "Updating content", detail: "Checking for content updates…", required: false },
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

export function useScriptedBoot({ fail = false, short = false }: { fail?: boolean; short?: boolean } = {}): BootState & { run: number } {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(0);
  const [noSignal, setNoSignal] = useState(false);

  useEffect(() => {
    setDone(0);
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

  return {
    run,
    phase: noSignal ? "error" : done > STEPS.length ? "ready" : done === 0 ? "connecting" : "booting",
    steps,
    progress: Math.min(1, done / STEPS.length),
    problem: noSignal ? "The local service hasn't started. It may still be launching, or it may have stopped." : null,
    short,
    retry: () => setRun((r) => r + 1),
  };
}

/** A still frame for picker thumbnails: about two thirds through, one optional source offline. */
export function sampleBootState(): BootState {
  const at = 7;
  return {
    phase: "booting",
    steps: STEPS.map((s, i) => ({ ...s, status: i < at ? (s.id === "players" ? "offline" : "online") : i === at ? "linking" : "standby" })),
    progress: at / STEPS.length,
    problem: null,
    short: false,
    retry: () => {},
  };
}

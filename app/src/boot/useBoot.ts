import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CardId } from "../layout/layouts";
import type { Provider } from "../lib/types";
import { connectProvider, liveAvailable, StageError } from "../providers";
import { apiResult, watchApi, type ApiResult } from "../state/useApi";
import { failCount, onSignal, signalled } from "./bootSignals";
import { CORE, HARDWARE, PROFILES, TELEMETRY, stepsFor, type StepDef, type StepSource } from "./bootSteps";
import type { BootPhase, BootState, BootStep, StepStatus } from "./types";

const MIN_MS = 1200;
const MIN_SHORT_MS = 600;
/**
 * How long optional steps may hold the reveal once the required ones are done.
 * Long enough for the refreshable cards (feed, meta, players, network) to finish
 * the grab they started, then the cover gives up and those cards fill in later.
 */
const OPTIONAL_MS = 50_000;
const NO_SIGNAL_MS = 10_000;
const HEALTH_MS = 1000;
const HEALTH_TIMEOUT_MS = 1500;
const RETRY_MS = 1500;
/** Failed tries in a row before a required step shows as failed (it keeps trying). */
const FAILS_SHOWN = 2;
const SAMPLE_FAILS_SHOWN = 3;
const LINKING_SHARE = 0.3;
const BOOTED_KEY = "cs.booted";

const NO_SIGNAL = "The local service hasn't started. It may still be launching, or it may have stopped.";
const PROBLEM: Record<string, string> = {
  [HARDWARE]: "The service answered, but the hardware scan failed. It keeps trying; Retry to try now.",
  [PROFILES]: "The service answered, but the game mode profiles could not be loaded. It keeps trying; Retry to try now.",
  [TELEMETRY]: "The service answered, but live readings are not coming through yet.",
};

type Stage = "standby" | "linking" | "online" | "failed";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bootedBefore(): boolean {
  try {
    return sessionStorage.getItem(BOOTED_KEY) === "1";
  } catch {
    return false;
  }
}

function markBooted() {
  try {
    sessionStorage.setItem(BOOTED_KEY, "1");
  } catch {
    // Only costs the short version on the next reload.
  }
}

const replay = () => new URLSearchParams(location.search).get("boot") === "replay";

/** What a source has returned: useApi's cache first, then the loaders that report on their own. */
function resultOf(path: string): ApiResult | null {
  const r = apiResult(path);
  if (r) return r;
  const s = signalled(path);
  return s === "ok" ? { ok: true, data: undefined } : s === "error" ? { ok: false } : null;
}

/** pending: nothing yet. ok: real data. off: failed or not set up. */
function sourceState(src: StepSource): "pending" | "ok" | "off" {
  const r = resultOf(src.path);
  if (!r) return "pending";
  if (!r.ok) return "off";
  return src.unset?.(r.data) ? "off" : "ok";
}

function optionalStatus(def: StepDef, started: boolean, late: boolean): StepStatus {
  if (!started) return "standby";
  const states = def.sources.map(sourceState);
  if (states.includes("pending")) return late ? "deferred" : "linking";
  return states.includes("ok") ? "online" : "offline";
}

interface Options {
  /** Card types on the current tab, or null until the dashboard has mounted. */
  cards: readonly CardId[] | null;
  /** Called once with the provider, after the hardware and profiles have loaded. */
  onProvider: (p: Provider) => void;
}

/**
 * Runs the startup: polls the service, builds the provider stage by stage, then
 * watches the dashboard's own first fetches (mounted hidden underneath) tick off.
 * Reports "ready" once the required steps are done, the minimum time has passed,
 * and the optional steps have finished or run out of time.
 */
export function useBoot({ cards, onProvider }: Options): BootState {
  const onProviderRef = useRef(onProvider);
  onProviderRef.current = onProvider;
  const provider = useRef<Provider | null>(null);

  const [attempt, setAttempt] = useState(0);
  const [health, setHealth] = useState(false);
  const [noSignal, setNoSignal] = useState(false);
  const [hw, setHw] = useState<Stage>("standby");
  const [prof, setProf] = useState<Stage>("standby");
  const [hasProvider, setHasProvider] = useState(false);
  const [short, setShort] = useState(() => bootedBefore() && !replay());
  const firstChecked = useRef(false);
  const sampleBase = useRef(0);

  const born = useRef(Date.now());
  const [requiredAt, setRequiredAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  // Service, then hardware, then profiles. Keeps trying; Retry restarts it at once.
  useEffect(() => {
    if (provider.current) return;
    let alive = true;
    setNoSignal(false);
    const noSig = window.setTimeout(() => alive && setNoSignal(true), NO_SIGNAL_MS);

    (async () => {
      for (;;) {
        const ok = await liveAvailable(HEALTH_TIMEOUT_MS);
        if (!alive) return;
        if (!firstChecked.current) {
          firstChecked.current = true;
          // A warm restart is only one where the service was already up.
          if (!ok) setShort(false);
        }
        if (ok) break;
        await sleep(HEALTH_MS);
        if (!alive) return;
      }
      window.clearTimeout(noSig);
      setHealth(true);
      setNoSignal(false);

      let fails = 0;
      for (;;) {
        setHw((s) => (s === "online" ? s : s === "failed" ? s : "linking"));
        try {
          const p = await connectProvider((stage) => {
            if (!alive) return;
            if (stage === "machine") {
              setHw("online");
              setProf((s) => (s === "failed" ? s : "linking"));
            } else setProf("online");
          });
          if (!alive) return;
          provider.current = p;
          setHasProvider(true);
          onProviderRef.current(p);
          return;
        } catch (e) {
          if (!alive) return;
          fails++;
          if (fails >= FAILS_SHOWN) (e instanceof StageError && e.stage === "profiles" ? setProf : setHw)("failed");
          await sleep(RETRY_MS);
          if (!alive) return;
        }
      }
    })();

    return () => {
      alive = false;
      window.clearTimeout(noSig);
    };
  }, [attempt]);

  // Re-read when a card's first data (or failure) lands. Not needed once revealed.
  useEffect(() => {
    if (ready) return;
    const offApi = watchApi(bump);
    const offSig = onSignal(bump);
    return () => {
      offApi();
      offSig();
    };
  }, [ready, bump]);

  const cardKey = cards ? cards.join(",") : null;
  // Keyed by the card list's contents, not the array.
  const defs = useMemo(() => stepsFor(cards), [cardKey]);

  const sampleOk = signalled("/api/sample") === "ok";
  const sampleFailed = !sampleOk && failCount("/api/sample") - sampleBase.current >= SAMPLE_FAILS_SHOWN;

  const core: StepStatus = health ? "online" : noSignal ? "failed" : "linking";
  const required: Record<string, StepStatus> = {
    [CORE]: core,
    [HARDWARE]: !health ? "standby" : hw,
    [PROFILES]: hw !== "online" ? "standby" : prof,
    [TELEMETRY]: !hasProvider ? "standby" : sampleOk ? "online" : sampleFailed ? "failed" : "linking",
  };
  const requiredDone = defs.every((d) => !d.required || required[d.id] === "online");

  const now = Date.now();
  const late = requiredAt != null && now - requiredAt >= OPTIONAL_MS;
  const steps: BootStep[] = defs.map((d) => ({
    id: d.id,
    label: d.label,
    detail: d.detail,
    required: d.required,
    status: d.required ? required[d.id] : optionalStatus(d, hasProvider, late),
  }));
  const settled = steps.every((s) => s.required || (s.status !== "standby" && s.status !== "linking"));
  const minMs = short ? MIN_SHORT_MS : MIN_MS;
  const minPassed = now - born.current >= minMs;

  useEffect(() => {
    if (requiredDone && requiredAt == null) setRequiredAt(Date.now());
  }, [requiredDone, requiredAt]);

  // Wake up for the minimum time and the optional-steps limit.
  useEffect(() => {
    if (ready || !requiredDone || requiredAt == null) return;
    if (minPassed && (settled || late)) {
      setReady(true);
      markBooted();
      return;
    }
    const waits = [born.current + minMs, requiredAt + OPTIONAL_MS].map((t) => t - Date.now()).filter((ms) => ms > 0);
    if (!waits.length) return;
    const id = window.setTimeout(bump, Math.min(...waits) + 5);
    return () => window.clearTimeout(id);
  }, [ready, requiredDone, requiredAt, minPassed, settled, late, minMs, bump]);

  const failedStep = steps.find((s) => s.required && s.status === "failed");
  const phase: BootPhase = ready ? "ready" : failedStep ? "error" : !health ? "connecting" : "booting";
  const problem = phase !== "error" || !failedStep ? null : failedStep.id === CORE ? NO_SIGNAL : (PROBLEM[failedStep.id] ?? null);

  // Weighted, and only ever forwards.
  const best = useRef(0);
  let total = 0;
  let done = 0;
  defs.forEach((d, i) => {
    const s = steps[i].status;
    total += d.weight;
    if (s === "online" || s === "offline" || s === "deferred") done += d.weight;
    else if (s === "linking") done += d.weight * LINKING_SHARE;
  });
  const raw = ready ? 1 : total ? Math.min(0.99, done / total) : 0;
  best.current = Math.max(best.current, raw);
  const progress = best.current;

  const retry = useCallback(() => {
    sampleBase.current = failCount("/api/sample");
    setHw((s) => (s === "failed" ? "linking" : s));
    setProf((s) => (s === "failed" ? "linking" : s));
    setNoSignal(false);
    setAttempt((a) => a + 1);
  }, []);

  // Same object while nothing changed, so the screen does not redraw on every parent render.
  const last = useRef<BootState | null>(null);
  const prev = last.current;
  if (
    !prev ||
    prev.phase !== phase ||
    prev.progress !== progress ||
    prev.problem !== problem ||
    prev.short !== short ||
    prev.steps.length !== steps.length ||
    prev.steps.some((s, i) => s.id !== steps[i].id || s.status !== steps[i].status)
  ) {
    last.current = { phase, steps, progress, problem, short, retry };
  }
  return last.current!;
}

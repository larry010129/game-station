import { useCallback, useEffect, useRef, useState } from "react";
import type { GameModeStep, Profile, StationInfo } from "../lib/types";
import type { NewEvent } from "./useEvents";
import { api, applyStep, restoreStep } from "../lib/api";

export type Phase = "off" | "applying" | "on" | "restoring";
export type StepStatus = "waiting" | "running" | "done" | "failed";

/**
 * The undo journal lives in the service (written before each step runs, and
 * replayed by the service itself on startup), so the UI keeps no copy of it.
 * Restoring a step the service does not know about is a harmless no-op.
 * On reload, the UI re-reads /api/gamemode/active so "on" survives a refresh.
 */
export function useGameMode(info: StationInfo, onEvent: (e: NewEvent) => void) {
  // The list of profiles lives here, so a settings change shows up in the game mode panel without touching the start-up info.
  const [profiles, setProfiles] = useState<Profile[]>(info.profiles);
  const [profileId, setProfileId] = useState(info.profiles[0]?.id ?? "");
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];
  const [phase, setPhase] = useState<Phase>("off");
  const [status, setStatus] = useState<Record<string, StepStatus>>({});
  const activeSteps = useRef<GameModeStep[]>([]);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  /** Reads the profiles again (after a settings change). Rejects when the service does not answer. */
  const refreshProfiles = useCallback(async () => {
    const next = await api<{ profiles: Profile[] }>("/api/profiles");
    if (Array.isArray(next.profiles)) setProfiles(next.profiles);
  }, []);

  /** Undo steps newest first. Keeps going if one fails; returns how many failed. */
  const restoreAll = useCallback(
    async (steps: GameModeStep[]) => {
      let failed = 0;
      for (const s of [...steps].reverse()) {
        try {
          await restoreStep(s);
        } catch {
          failed++;
        }
      }
      return failed;
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    api<{ active: boolean; steps: GameModeStep[] }>("/api/gamemode/active")
      .then((state) => {
        if (!alive || !state.active || !state.steps?.length) return;
        activeSteps.current = state.steps;
        setStatus(Object.fromEntries(state.steps.map((s) => [s.id, "done" as StepStatus])));
        setPhase("on");
        onEventRef.current({
          kind: "info",
          text: `Game mode still on after reload (${state.steps.length} settings active)`,
        });
      })
      .catch(() => {
        // Service briefly unavailable: stay off until the user starts again.
      });
    return () => {
      alive = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (phase !== "off" || !profile) return;
    setPhase("applying");
    setStatus({});
    const applied: GameModeStep[] = [];
    for (const s of profile.steps) {
      setStatus((prev) => ({ ...prev, [s.id]: "running" }));
      try {
        await applyStep(s);
      } catch {
        setStatus((prev) => ({ ...prev, [s.id]: "failed" }));
        // The failed step is included: the service may hold a pending entry for it.
        const failed = await restoreAll([...applied, s]);
        activeSteps.current = [];
        setPhase("off");
        onEvent({
          kind: "alert",
          text: failed
            ? `Game mode stopped at "${s.label}". ${failed} step(s) could not be undone yet; the service will retry.`
            : `Game mode stopped at "${s.label}". Earlier steps were undone.`,
        });
        return;
      }
      applied.push(s);
      setStatus((prev) => ({ ...prev, [s.id]: "done" }));
    }
    activeSteps.current = applied;
    setPhase("on");
    onEvent({
      kind: "info",
      text: `Game mode on, ${applied.length} of ${profile.steps.length} steps complete`,
      marker: "Game mode on",
    });
  }, [phase, profile, restoreAll, onEvent]);

  const stop = useCallback(async () => {
    if (phase !== "on" || !profile) return;
    setPhase("restoring");
    let steps = activeSteps.current.length ? activeSteps.current : profile.steps;
    try {
      const state = await api<{ active: boolean; steps: GameModeStep[] }>("/api/gamemode/active");
      if (state.steps?.length) steps = state.steps;
    } catch {
      // Fall back to the steps we remember from this session.
    }
    const failed = await restoreAll(steps);
    activeSteps.current = [];
    setStatus({});
    setPhase("off");
    onEvent(
      failed
        ? { kind: "alert", text: `Game mode off, but ${failed} setting(s) could not be restored yet; the service will retry.` }
        : { kind: "info", text: "Game mode off, settings restored from the undo log", marker: "Restored" },
    );
  }, [phase, profile, restoreAll, onEvent]);

  return { profiles, refreshProfiles, profile, setProfileId, phase, status, start, stop };
}

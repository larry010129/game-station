import { useMemo } from "react";
import { dash } from "../lib/format";
import { tempState } from "../lib/series";
import type { Sample } from "../lib/types";

export type KeyState = "idle" | "on" | "new" | "alert";

export interface DeckKey {
  id: string;
  label: string;
  value: string;
  state: KeyState;
}
export interface DeckDial {
  id: string;
  label: string;
  value: string;
  unit: string;
  /** 0 to 1 fill of the ring. */
  fill: number;
  state: KeyState;
}
export interface DeckStrip {
  label: string;
  value: string;
  state: KeyState;
}

export interface DeckInput {
  history: Sample[];
  gameModeOn: boolean;
  hasNews: boolean;
  stopped: boolean;
  profileName: string;
}

const PING_LIMIT_MS = 60;
const f = (v: number | null, max: number) => (v == null ? 0 : Math.max(0, Math.min(1, v / max)));
const tempKey = (t: number | null): KeyState => {
  const s = tempState(t);
  return s === "hot" ? "alert" : s === "caution" ? "new" : "idle";
};

/** Everything the Stream Deck preview shows, worked out from data the dashboard already has. */
export function useDeck({ history, gameModeOn, hasNews, stopped, profileName }: DeckInput) {
  const latest = history[history.length - 1];
  return useMemo(() => {
    const pingBad = latest.pingRegionMs != null && latest.pingRegionMs > PING_LIMIT_MS;
    const keys: DeckKey[] = [
      { id: "mode", label: "Game mode", value: gameModeOn ? "On" : "Off", state: gameModeOn ? "on" : "idle" },
      { id: "cpu", label: "CPU %", value: dash(latest.cpuLoad), state: "idle" },
      { id: "gpu", label: "GPU °C", value: dash(latest.gpuTemp), state: tempKey(latest.gpuTemp) },
      { id: "gpuload", label: "GPU %", value: dash(latest.gpuLoad), state: "idle" },
      { id: "ping", label: "Ping ms", value: dash(latest.pingRegionMs), state: pingBad ? "alert" : "idle" },
      { id: "news", label: "Overwatch", value: hasNews ? "New" : "—", state: hasNews ? "new" : "idle" },
      { id: "kill", label: "Kill", value: stopped ? "Stopped" : "Live", state: stopped ? "alert" : "idle" },
      { id: "profile", label: "Profile", value: profileName, state: "idle" },
    ];
    const dials: DeckDial[] = [
      { id: "cpu", label: "CPU load", value: dash(latest.cpuLoad), unit: "%", fill: f(latest.cpuLoad, 100), state: "idle" },
      { id: "gpu", label: "GPU", value: dash(latest.gpuTemp), unit: "°C", fill: f(latest.gpuTemp, 100), state: tempKey(latest.gpuTemp) },
      { id: "load", label: "GPU load", value: dash(latest.gpuLoad), unit: "%", fill: f(latest.gpuLoad, 100), state: "idle" },
      { id: "power", label: "GPU power", value: dash(latest.gpuPowerW), unit: "W", fill: f(latest.gpuPowerW, 120), state: "idle" },
    ];
    const strip: DeckStrip[] = [
      { label: "GPU W", value: dash(latest.gpuPowerW), state: "idle" },
      { label: "Ping ms", value: dash(latest.pingRegionMs), state: pingBad ? "alert" : "idle" },
    ];
    return { keys, dials, strip };
  }, [history, latest, gameModeOn, hasNews, stopped, profileName]);
}

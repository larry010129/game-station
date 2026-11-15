import { useEffect, useRef } from "react";
import { readEvents } from "../cards/CalendarPage";
import type { Provider, SystemData } from "../lib/types";
import type { StationStore } from "./useStation";
import { readJson, writeJson } from "../lib/storage";

export interface AlertRule {
  on: boolean;
  /** Degrees, percent or milliseconds; minutes before an event for the calendar rule. */
  limit: number;
}

export type RuleId = "gpuTemp" | "ram" | "ping" | "calendar";

export const RULE_INFO: Record<RuleId, { name: string; unit: string; min: number; max: number; step: number; blurb: string }> = {
  gpuTemp: { name: "GPU too hot", unit: "°C", min: 60, max: 100, step: 1, blurb: "When the GPU goes over this" },
  ram: { name: "Memory nearly full", unit: "%", min: 60, max: 99, step: 1, blurb: "When RAM in use goes over this" },
  ping: { name: "Ping spike", unit: "ms", min: 50, max: 500, step: 10, blurb: "When ping stays over this for 3 readings" },
  calendar: { name: "Calendar event soon", unit: "min", min: 1, max: 120, step: 1, blurb: "This many minutes before an event with a time" },
};

export const RULE_IDS = Object.keys(RULE_INFO) as RuleId[];

export const DEFAULT_RULES: Record<RuleId, AlertRule> = {
  gpuTemp: { on: true, limit: 85 },
  ram: { on: true, limit: 90 },
  ping: { on: true, limit: 120 },
  calendar: { on: true, limit: 10 },
};

const KEY = "cs.alerts";
const COOLDOWN_MS = 5 * 60_000;

export function readRules(): Record<RuleId, AlertRule> {
  const out = { ...DEFAULT_RULES };
  const raw = readJson<Record<string, { on?: unknown; limit?: unknown } | undefined> | null>(KEY, {});
  for (const id of RULE_IDS) {
    const r = raw?.[id];
    if (r && typeof r.on === "boolean" && typeof r.limit === "number" && Number.isFinite(r.limit)) {
      const info = RULE_INFO[id];
      out[id] = { on: r.on, limit: Math.min(info.max, Math.max(info.min, r.limit)) };
    }
  }
  return out;
}

export function writeRules(rules: Record<RuleId, AlertRule>) {
  writeJson(KEY, rules);
}

type Notify = (text: string, rule: RuleId) => void;

/**
 * Raises an alert when a rule trips. Each rule waits five minutes before it can fire again,
 * so a PC that sits just over a limit does not nag. Rules are read from storage on every check,
 * so changes in the Vault apply straight away.
 */
export function useSmartAlerts(provider: Provider, store: StationStore, paused: boolean, notify: Notify) {
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const lastFired = useRef<Partial<Record<RuleId, number>>>({});
  const pingStreak = useRef(0);
  const told = useRef(new Set<string>());

  const fire = (rule: RuleId, text: string) => {
    const now = Date.now();
    if (now - (lastFired.current[rule] ?? 0) < COOLDOWN_MS) return;
    lastFired.current[rule] = now;
    notifyRef.current(text, rule);
  };

  // Readings that arrive with every sample.
  useEffect(() => {
    if (paused) return;
    const check = () => {
      const latest = store.latest();
      if (latest.stale) {
        pingStreak.current = 0;
        return;
      }
      const rules = readRules();
      if (rules.gpuTemp.on && latest.gpuTemp != null && latest.gpuTemp >= rules.gpuTemp.limit) {
        fire("gpuTemp", `GPU is at ${latest.gpuTemp}°C, over your ${rules.gpuTemp.limit}°C limit`);
      }
      if (latest.pingRegionMs != null && rules.ping.on && latest.pingRegionMs >= rules.ping.limit) pingStreak.current++;
      else pingStreak.current = 0;
      if (pingStreak.current >= 3) fire("ping", `Ping is ${Math.round(latest.pingRegionMs ?? 0)} ms, over your ${rules.ping.limit} ms limit`);
    };
    return store.subscribe(check);
  }, [store, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // A slower check that asks the service: memory.
  useEffect(() => {
    if (paused || provider.id !== "live") return;
    let alive = true;
    const check = async () => {
      const rules = readRules();
      if (!rules.ram.on) return;
      if (rules.ram.on) {
        try {
          const s = await provider.api<SystemData>("/api/system");
          const pct = (s.mem.usedMb / s.mem.totalMb) * 100;
          if (alive && pct >= rules.ram.limit) fire("ram", `Memory is ${Math.round(pct)}% full, over your ${rules.ram.limit}% limit`);
        } catch {
          // service busy
        }
      }
    };
    const id = window.setInterval(check, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [provider, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calendar events with a time, checked every 30 seconds.
  useEffect(() => {
    const check = () => {
      const rule = readRules().calendar;
      if (!rule.on) return;
      const now = Date.now();
      for (const e of readEvents()) {
        if (!e.time) continue;
        const [y, mo, d] = e.date.split("-").map(Number);
        const [h, mi] = e.time.split(":").map(Number);
        const at = new Date(y, mo - 1, d, h, mi).getTime();
        const mins = (at - now) / 60_000;
        const key = `${e.id}:${e.date}:${e.time}`;
        if (mins > 0 && mins <= rule.limit && !told.current.has(key)) {
          told.current.add(key);
          notifyRef.current(`${e.name} starts in ${Math.max(1, Math.round(mins))} min`, "calendar");
        }
      }
    };
    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, []);
}

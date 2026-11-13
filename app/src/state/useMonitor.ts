import { useEffect, useState } from "react";
import { isTauri } from "../providers";
import { readString, writeJson } from "../lib/storage";

/** Which screen Command Station opens on. Remembered on this PC. */
export const MONITOR_KEY = "cs.monitor";

export type MonitorPref = {
  /** 0-based index in the left-to-right listing when the choice was saved. */
  index: number;
  /** OS monitor name when available (more stable across hot-plug than index). */
  name: string | null;
};

export type MonitorChoice = {
  value: string;
  label: string;
  name: string | null;
  primary: boolean;
};

type Listed = {
  name: string | null;
  primary: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  workArea: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
};

function readPref(): MonitorPref | null {
  const raw = readString(MONITOR_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MonitorPref>;
    if (typeof parsed.index === "number" && Number.isFinite(parsed.index) && parsed.index >= 0) {
      return { index: Math.floor(parsed.index), name: typeof parsed.name === "string" ? parsed.name : null };
    }
  } catch {
    // Not JSON: it may be the legacy bare index below.
  }
  // Legacy: bare index string.
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum >= 0) return { index: Math.floor(asNum), name: null };
  return null;
}

function remember(pref: MonitorPref) {
  // The choice still applies until the app closes when storage is blocked.
  writeJson(MONITOR_KEY, pref);
}

function sameScreen(a: { name: string | null; position: { x: number; y: number } }, b: { name: string | null; position: { x: number; y: number } }) {
  if (a.name && b.name && a.name === b.name) return true;
  return a.position.x === b.position.x && a.position.y === b.position.y;
}

/** Left-to-right, then top-to-bottom — close to Windows display numbering. */
function sortMonitors<T extends { position: { x: number; y: number } }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
}

async function listMonitors(): Promise<Listed[]> {
  if (!isTauri) return [];
  try {
    const { availableMonitors, primaryMonitor } = await import("@tauri-apps/api/window");
    const [all, primary] = await Promise.all([availableMonitors(), primaryMonitor()]);
    const sorted = sortMonitors(all);
    return sorted.map((m) => ({
      name: m.name,
      primary: primary ? sameScreen(m, primary) : false,
      position: { x: m.position.x, y: m.position.y },
      size: { width: m.size.width, height: m.size.height },
      workArea: {
        position: { x: m.workArea.position.x, y: m.workArea.position.y },
        size: { width: m.workArea.size.width, height: m.workArea.size.height },
      },
    }));
  } catch {
    return [];
  }
}

function labelFor(index: number, primary: boolean): string {
  const base = `Monitor ${index + 1}`;
  return primary ? `${base} (Main)` : base;
}

function toChoices(monitors: Listed[]): MonitorChoice[] {
  return monitors.map((m, i) => ({
    value: String(i),
    label: labelFor(i, m.primary),
    name: m.name,
    primary: m.primary,
  }));
}

/**
 * Pick the saved screen, else primary/main, else the first listed.
 * Missing saved monitor (unplugged) falls back to main.
 */
export function resolveMonitorIndex(monitors: Listed[], pref: MonitorPref | null): number {
  if (monitors.length === 0) return 0;
  if (pref?.name) {
    const byName = monitors.findIndex((m) => m.name === pref.name);
    if (byName >= 0) return byName;
  }
  if (pref && pref.index >= 0 && pref.index < monitors.length) return pref.index;
  const primary = monitors.findIndex((m) => m.primary);
  return primary >= 0 ? primary : 0;
}

/** Move the window onto the preferred monitor (center in the work area). No-op in the browser. */
export async function placeOnPreferredMonitor(): Promise<void> {
  if (!isTauri) return;
  try {
    const monitors = await listMonitors();
    if (monitors.length === 0) return;
    const target = monitors[resolveMonitorIndex(monitors, readPref())];
    if (!target) return;

    const { getCurrentWindow, PhysicalPosition } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    // Leave exclusive modes so setPosition can land on another screen.
    if (await win.isFullscreen()) await win.setFullscreen(false);
    if (await win.isMaximized()) await win.unmaximize();

    const size = await win.outerSize();
    const area = target.workArea;
    const x = Math.round(area.position.x + Math.max(0, (area.size.width - size.width) / 2));
    const y = Math.round(area.position.y + Math.max(0, (area.size.height - size.height) / 2));
    await win.setPosition(new PhysicalPosition(x, y));
  } catch {
    // Desktop window refused the call; the saved choice stays.
  }
}

/** Target monitor for fullscreen / maximize after placeOnPreferredMonitor. */
export async function preferredMonitorPosition(): Promise<{ x: number; y: number } | null> {
  if (!isTauri) return null;
  try {
    const monitors = await listMonitors();
    if (monitors.length === 0) return null;
    const target = monitors[resolveMonitorIndex(monitors, readPref())];
    return target ? { ...target.position } : null;
  } catch {
    return null;
  }
}

export function useMonitor() {
  const [options, setOptions] = useState<MonitorChoice[]>([]);
  const [value, setValue] = useState(() => {
    const pref = readPref();
    return pref ? String(pref.index) : "0";
  });

  const refresh = async () => {
    const monitors = await listMonitors();
    const choices = toChoices(monitors);
    setOptions(choices);
    if (choices.length === 0) return;
    const idx = resolveMonitorIndex(monitors, readPref());
    setValue(String(idx));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const choose = (next: string) => {
    const choice = options.find((o) => o.value === next);
    const index = Number(next);
    if (!choice || !Number.isFinite(index) || index < 0) return;
    const pref: MonitorPref = { index, name: choice.name };
    remember(pref);
    setValue(next);
    // Place + re-apply window/borderless/fullscreen on the new screen.
    void import("./useWindowView").then(({ applyWindowView, readWindowView }) => applyWindowView(readWindowView()));
  };

  return { options, value, choose, refresh };
}

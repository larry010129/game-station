import { useEffect, useState } from "react";
import { isTauri } from "../lib/connect";
import { placeOnPreferredMonitor, preferredMonitorPosition } from "./useMonitor";
import { readString, writeString } from "../lib/storage";

/** How the desktop window is shown. Remembered on this PC. */
export type WindowView = "window" | "borderless" | "fullscreen";

export const WINDOW_VIEW_KEY = "cs.windowView";

const VIEWS: readonly WindowView[] = ["window", "borderless", "fullscreen"];

export function readWindowView(): WindowView {
  // Storage blocked: stay on a normal window.
  const saved = readString(WINDOW_VIEW_KEY);
  if (saved && (VIEWS as readonly string[]).includes(saved)) return saved as WindowView;
  return "window";
}

function remember(mode: WindowView) {
  // The choice still applies until the app closes when storage is blocked.
  writeString(WINDOW_VIEW_KEY, mode);
}

/** Last write wins if the user clicks through modes quickly. */
let tail: Promise<void> = Promise.resolve();

/**
 * Window: title bar on, not fullscreen.
 * Borderless: decorations off, maximized.
 * Full screen: decorations off, fullscreen on the preferred monitor.
 * No-op when there is no Tauri window (the browser). Never throws.
 */
export function applyWindowView(mode: WindowView): Promise<void> {
  const job = tail.then(() => applyNow(mode));
  tail = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

async function applyNow(mode: WindowView): Promise<void> {
  if (!isTauri) return;
  try {
    const { getCurrentWindow, PhysicalPosition } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    // Land on the saved monitor first so maximize / fullscreen use that screen.
    await placeOnPreferredMonitor();
    const onScreen = await preferredMonitorPosition();

    if (mode === "fullscreen") {
      await win.setDecorations(false);
      if (onScreen) {
        await win.setFullscreenOnMonitor(new PhysicalPosition(onScreen.x, onScreen.y));
      } else {
        await win.setFullscreen(true);
      }
      return;
    }
    await win.setFullscreen(false);
    if (mode === "borderless") {
      await win.setDecorations(false);
      await win.maximize();
      return;
    }
    await win.unmaximize();
    await win.setDecorations(true);
  } catch {
    // Browser, or the desktop window refused the call. The choice stays saved.
  }
}

export function useWindowView() {
  const [view, setView] = useState<WindowView>(readWindowView);

  useEffect(() => {
    void applyWindowView(view);
  }, [view]);

  const choose = (next: WindowView) => {
    setView(next);
    remember(next);
  };

  return { view, choose };
}

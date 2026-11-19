import { useEffect, useState } from "react";
import { Backdrop } from "../components/Backdrop";
import { BootScreen } from "./BootScreen";
import { isBootStyleId } from "./bootStyles";
import { useScriptedBoot } from "./scriptedBoot";
import { BootStylePicker } from "../components/BootStylePicker";

/**
 * Design preview only: /?boot=demo plays the boot screen on a scripted timeline, no service needed.
 * Add &fail=1 for the no-signal state, &short=1 for the warm-restart version, &style=boot-07 for a boot style
 * (&style=plain for the plain screen; without it, the style this PC has equipped). &picker=1 shows the Themes-page
 * boot picker instead of playing a boot.
 */

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
  const raw = q.get("style");
  const style = raw === "plain" ? null : isBootStyleId(raw) ? raw : undefined;
  const state = useScriptedBoot({ fail: q.has("fail"), short: q.has("short") });
  const picker = q.has("picker");
  const [gone, setGone] = useState(picker);
  useEffect(() => setGone(picker), [state.run, picker]);

  if (picker) {
    return (
      <>
        <Backdrop />
        <div className="page" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
          <BootStylePicker onOpenDraw={() => {}} />
        </div>
      </>
    );
  }

  return (
    <>
      <Backdrop />
      <div className="page" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <button type="button" className="pill-btn" onClick={state.retry}>
          Replay boot
        </button>
      </div>
      <div className="boot-under" aria-hidden="true">
        {CELLS.map(([type, l, t, w, h]) => (
          <div key={type} className="cell" data-card={type} style={{ position: "fixed", left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%` }} />
        ))}
      </div>
      {!gone && <BootScreen key={state.run} state={state} style={style} onExited={() => setGone(true)} />}
    </>
  );
}

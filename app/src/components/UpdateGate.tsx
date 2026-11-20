import { useEffect, useRef } from "react";
import { clockTime } from "../lib/format";
import { useT } from "../lib/i18n";
import { useClock } from "../state/useEnvironment";
import { useExeUpdate } from "../state/useExeUpdate";
import { useUpdateGate } from "../state/useUpdateGate";

/**
 * Forced popup for a new exe (update type 2). No close button: it downloads, installs and restarts the app by itself.
 * If the download fails it stays up with Retry.
 */
function ExePopup() {
  const T = useT();
  const { state, retry } = useExeUpdate();
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btn.current?.focus();
    const hold = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
        btn.current?.focus();
      }
    };
    window.addEventListener("keydown", hold, true);
    return () => window.removeEventListener("keydown", hold, true);
  }, []);

  const version = "version" in state ? state.version : null;
  const failed = state.phase === "failed";
  const body = failed
    ? T("exe.failed", { error: state.error })
    : state.phase === "installing"
      ? T("exe.installing")
      : T("exe.downloading", { pct: state.phase === "downloading" && state.percent != null ? `${state.percent}%` : "" });

  return (
    <div className="ug-scrim" role="presentation">
      <div className="ug-card" role="alertdialog" aria-modal="true" aria-labelledby="ug-title" aria-describedby="ug-body">
        <div className="ug-head">
          <span className="ug-mark" aria-hidden="true">
            <svg className="i" viewBox="0 0 24 24">
              <path d="M20 12a8 8 0 1 1-2.6-5.9" />
              <path d="M20 4v4.5h-4.5" />
            </svg>
          </span>
          <h2 id="ug-title">{T("exe.title")}</h2>
          {version && <span className="ug-badge">{T("exe.badge", { v: version })}</span>}
        </div>
        <div className="ug-foot">
          <p id="ug-body">{body}</p>
          <button ref={btn} type="button" className="ug-btn" disabled={!failed} onClick={retry}>
            {failed ? T("exe.retry") : T("exe.wait")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mounted once at the app root. Shows the forced popup for a new exe. A content release that goes live is not drawn
 * here: the app brings its loading screen back with a Reload button instead (see App.tsx, boot phase "update").
 */
export function UpdateGate() {
  const exe = useExeUpdate();
  return exe.blocking ? <ExePopup /> : null;
}

/** Top-bar chip, shown from 30 minutes before a scheduled release goes live: a countdown to the go-live time. */
export function UpdateChip() {
  const T = useT();
  const { noticeAt, mustReload } = useUpdateGate();
  const now = useClock();
  if (noticeAt == null || mustReload) return null;
  const left = Math.max(0, noticeAt - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return (
    <span className="ug-chip" role="status" title={T("update.chipTitle", { at: clockTime(noticeAt) })}>
      <span className="ug-dot" aria-hidden="true" />
      {T("update.chip", { time: `${mm}:${ss}` })}
    </span>
  );
}

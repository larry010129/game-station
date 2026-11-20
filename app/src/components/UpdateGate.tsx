import { useEffect, useRef } from "react";
import { clockTime } from "../lib/format";
import { useT } from "../lib/i18n";
import { useClock } from "../state/useEnvironment";
import { appVersionOf } from "../content/contentSettings";
import { isUnread } from "../state/newsRead";
import { listNotices, useNewsRead } from "../state/useNewsRead";
import { NoticeBar } from "./NoticeBar";
import { useExeUpdate } from "../state/useExeUpdate";
import { useContentStatus, useUpdateGate } from "../state/useUpdateGate";

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

/**
 * Heads-up banner, shown from 30 minutes before a scheduled release goes live: a slim dark bar across the top of the
 * page with a small mark, one line, and the countdown underlined where a link would sit.
 */
export function UpdateBanner() {
  const T = useT();
  const { noticeAt, mustReload } = useUpdateGate();
  const now = useClock();
  if (noticeAt == null || mustReload) return null;
  const left = Math.max(0, noticeAt - now);
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return (
    <NoticeBar wide>
      {T("update.banner", { at: clockTime(noticeAt).slice(0, 5) })} <b>{T("update.bannerIn", { time: `${mm}:${ss}` })}</b>
    </NoticeBar>
  );
}

/**
 * Under the tabs: the app was updated and its notes are not read yet. "See what's new" opens the Notices board; the
 * bar goes away once the notes are read.
 */
export function WhatsNewBanner({ onOpen }: { onOpen: () => void }) {
  const T = useT();
  const { applied } = useContentStatus();
  const { state: read } = useNewsRead();
  // Opening the Notices board marks its first entry read, so the first release entry decides whether the bar shows.
  const head = listNotices().find((n) => n.id.startsWith("release-"));
  if (applied <= 0 || !head || !isUnread(read, head.id)) return null;
  return (
    <div className="notice-slot">
      <NoticeBar action={{ label: T("update.see"), onClick: onOpen }}>{T("update.new", { v: appVersionOf(applied) })}</NoticeBar>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { clockTime } from "../lib/format";
import { appVersionOf } from "../content/contentSettings";
import { useT } from "../lib/i18n";
import { useClock } from "../state/useEnvironment";
import { useUpdateGate } from "../state/useUpdateGate";

/**
 * Forced-reload popup for a content release that went live. Structure adapted from the 21st.dev "System Update
 * Notification Alert Dialog" (cnippet-dev, id 24835): mark, title, release badge, tinted body, one action. The
 * "Remind me later" action is removed on purpose, and the Command Station tokens replace Tailwind/shadcn.
 * It cannot be dismissed: Escape and Tab are held on the button, and the only way out is Reload.
 */
function ReloadPopup({ number }: { number: number | null }) {
  const T = useT();
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
          <h2 id="ug-title">{T("update.title")}</h2>
          {number != null && <span className="ug-badge">{T("update.badge", { n: appVersionOf(number) })}</span>}
        </div>
        <div className="ug-foot">
          <p id="ug-body">{T("update.body")}</p>
          <button ref={btn} type="button" className="ug-btn" onClick={() => window.location.reload()}>
            {T("update.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mounted once at the app root. */
export function UpdateGate() {
  const { mustReload, number } = useUpdateGate();
  return mustReload ? <ReloadPopup number={number} /> : null;
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

import type { ReactNode } from "react";

/**
 * The app's notice bar: a slim dark bar with a small mark, one message, and an optional underlined action where a
 * link would sit. Used for the update heads-up, What's new, and the in-app notices. The mark's colour carries the tone.
 * (The loading screen keeps StationAlert: its pill button belongs to that screen's own design.)
 */
export type NoticeTone = "notice" | "caution" | "alert";

export function NoticeBar({
  children,
  tone = "notice",
  action,
  wide,
  left,
  role = "status",
}: {
  children: ReactNode;
  tone?: NoticeTone;
  action?: { label: string; onClick: () => void };
  /** Runs edge to edge across the page, for a bar at the very top. */
  wide?: boolean;
  /** Left-aligned text, for lists of notes. Default: centred. */
  left?: boolean;
  role?: "status" | "alert";
}) {
  const cls = `notice-bar tone-${tone}${wide ? " wide" : ""}${left ? " left" : ""}`;
  return (
    <div className={cls} role={role}>
      <svg className="i notice-bar-mark" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 9 9h-9z" />
      </svg>
      <p>
        {children}
        {action && (
          <>
            {" "}
            <button type="button" className="notice-bar-link" onClick={action.onClick}>
              {action.label}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

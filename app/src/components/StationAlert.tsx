import type { ReactNode } from "react";

/**
 * Inline status banner adapted from 21st.dev System Message (ibelick, id 28288).
 * Structure kept: slim row, optional leading mark, message, trailing CTA.
 * Restyled with Command Station tokens — charcoal glass, hairline edges, Outfit —
 * no Tailwind / lucide / shadcn primitives.
 */
export type StationAlertTone = "alert" | "caution" | "notice";

type Action = {
  label: string;
  onClick: () => void;
};

type Props = {
  children: ReactNode;
  tone?: StationAlertTone;
  action?: Action;
  /** Leading status mark. Default on for operate-mode scan. */
  mark?: boolean;
  role?: "alert" | "status";
  className?: string;
};

export function StationAlert({
  children,
  tone = "alert",
  action,
  mark = true,
  role = "alert",
  className,
}: Props) {
  const cls = ["station-alert", `tone-${tone}`, className].filter(Boolean).join(" ");
  return (
    <div className={cls} role={role}>
      <div className="station-alert-body">
        {mark && <span className="station-alert-mark" aria-hidden="true" />}
        <div className="station-alert-text">{children}</div>
      </div>
      {action && (
        <button type="button" className="pill-btn station-alert-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

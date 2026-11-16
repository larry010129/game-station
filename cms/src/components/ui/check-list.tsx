/**
 * Status rows with a line of explanation under a row that needs attention.
 * Pattern adapted from 21st.dev "Great UI Deployment Checklist" (saurabh-2607, MIT): a status mark per row and
 * detail that opens under the row. Rebuilt on this CMS's tokens, without the fake pipeline run or animation
 * library: every row is a real check on the draft.
 */
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckStatus = "ok" | "fail" | "warn";

export type CheckItem = {
  id: string;
  label: string;
  status: CheckStatus;
  /** Short value shown at the end of the row, such as "100.0%". */
  value?: string;
  /** Shown under the row when it is not ok: what is wrong and what to do. */
  note?: string;
};

const MARK: Record<CheckStatus, { icon: typeof Check; box: string; label: string }> = {
  ok: { icon: Check, box: "bg-success/15 text-success", label: "Passed" },
  fail: { icon: X, box: "bg-destructive text-destructive-foreground", label: "Needs a fix" },
  warn: { icon: AlertTriangle, box: "bg-warning/15 text-warning", label: "Check" },
};

export function CheckList({ items, className }: { items: CheckItem[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-border/50", className)}>
      {items.map((item) => {
        const m = MARK[item.status];
        const Icon = m.icon;
        return (
          <li key={item.id} className="px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span
                className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", m.box)}
                role="img"
                aria-label={m.label}
              >
                <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{item.label}</span>
              {item.value ? (
                <span className="shrink-0 text-xs tabular-nums text-muted">{item.value}</span>
              ) : null}
            </div>
            {item.status !== "ok" && item.note ? (
              <p
                className={cn(
                  "mt-1 pl-8 text-xs leading-snug",
                  item.status === "fail" ? "text-destructive-foreground" : "text-warning",
                )}
              >
                {item.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Adapted from 21st.dev Stat Card (aadixc0de / chatcn) — StatCardGroup + StatCard.
 * Hairline-split KPI strip for Operate dashboards; sparklines omitted (no fake trends).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export function StatCardGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card-group"
      role="group"
      className={cn(
        "flex min-w-0 flex-wrap overflow-hidden rounded-lg border border-border bg-card shadow-sm",
        "[&>[data-slot=stat-card]]:-ms-px [&>[data-slot=stat-card]]:-mt-px [&>[data-slot=stat-card]]:flex-[1_1_10rem]",
        "[&>[data-slot=stat-card]]:border-s [&>[data-slot=stat-card]]:border-t [&>[data-slot=stat-card]]:border-border",
        "[&>[data-slot=stat-card]]:rounded-none [&>[data-slot=stat-card]]:shadow-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface StatCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode;
  value?: string | number | null;
  hint?: React.ReactNode;
  tone?: "neutral" | "ok" | "danger" | "warn";
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  className,
  ...props
}: StatCardProps) {
  const shown = value === undefined || value === null || value === "" ? "—" : String(value);

  return (
    <div
      data-slot="stat-card"
      className={cn("flex min-w-0 flex-col gap-1 px-4 py-3.5", className)}
      {...props}
    >
      <span className="truncate text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
        {label}
      </span>
      <span
        data-slot="stat-card-value"
        className={cn(
          "text-[1.5rem] font-semibold leading-none tracking-[-0.022em] tabular-nums",
          tone === "ok" && "text-success",
          tone === "danger" && "text-destructive-foreground",
          tone === "warn" && "text-warning",
          tone === "neutral" && "text-foreground",
        )}
      >
        {shown}
      </span>
      {hint ? (
        <p className="text-[11px] leading-snug text-muted text-pretty">{hint}</p>
      ) : null}
    </div>
  );
}

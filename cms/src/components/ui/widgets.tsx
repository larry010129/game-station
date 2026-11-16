/**
 * Dashboard widgets following the Datta Able admin template (CodedThemes, MIT): MainCard,
 * SalesPerformanceCard (title, light number, thin gradient bar), StatIndicatorCard (icon, light number,
 * uppercase label) and SocialStatsCard (big count over two stats with bars). Rebuilt on Tailwind and this
 * CMS's tokens; every number passed in is real draft data.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MainCard({
  title,
  subheader,
  secondary,
  footer,
  flush = false,
  className,
  bodyClassName,
  children,
  ...props
}: {
  title?: ReactNode;
  subheader?: ReactNode;
  secondary?: ReactNode;
  footer?: ReactNode;
  /** No body padding, for lists and tables that run edge to edge. */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section className={cn("flex flex-col rounded-lg bg-card shadow-card", className)} {...props}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subheader ? <p className="mt-1 text-xs text-muted">{subheader}</p> : null}
          </div>
          {secondary}
        </header>
      ) : null}
      <div className={cn("flex-1", flush ? "" : "p-5", bodyClassName)}>{children}</div>
      {footer ? <footer className="border-t border-border/60 px-5 py-3">{footer}</footer> : null}
    </section>
  );
}

export type BarTone = "brand1" | "brand2" | "danger";

const FILL: Record<BarTone, string> = {
  brand1: "var(--cms-grad-1)",
  brand2: "var(--cms-grad-2)",
  danger: "var(--cms-grad-danger)",
};

/** A thin rounded bar with a gradient fill. `value` is a percentage from 0 to 100. */
export function ProgressBar({
  value,
  tone = "brand1",
  label,
  className,
}: {
  value: number;
  tone?: BarTone;
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-1.5 w-full rounded-full bg-secondary", className)}
    >
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FILL[tone] }} />
    </div>
  );
}

const ICON_TONE = { ok: "text-success", danger: "text-destructive-foreground", primary: "text-primary", muted: "text-muted" } as const;
export type IconTone = keyof typeof ICON_TONE;

/** Datta "Sales performance" card: title, icon with a light-weight number, a percentage, and a bar. */
export function MetricWidget({
  title,
  icon: Icon,
  iconTone = "ok",
  amount,
  unit,
  percentLabel,
  percent,
  tone = "brand1",
  barLabel,
}: {
  title: string;
  icon: LucideIcon;
  iconTone?: IconTone;
  amount: string;
  unit?: string;
  percentLabel: string;
  percent: number;
  tone?: BarTone;
  barLabel: string;
}) {
  return (
    <MainCard>
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className={cn("h-7 w-7 shrink-0", ICON_TONE[iconTone])} strokeWidth={1.5} aria-hidden />
          <p className="min-w-0 truncate text-[1.75rem] font-light leading-none tabular-nums text-foreground">
            {amount}
            {unit ? <span className="ml-1.5 text-sm text-muted">{unit}</span> : null}
          </p>
        </div>
        <p className="shrink-0 text-sm tabular-nums text-muted">{percentLabel}</p>
      </div>
      <ProgressBar value={percent} tone={tone} label={barLabel} className="mt-5" />
    </MainCard>
  );
}

/** Datta "Stat indicator" card: stacked rows of an icon, a light number and an uppercase label. */
export function IndicatorStack({
  items,
}: {
  items: { icon: LucideIcon; tone?: IconTone; value: string | number; label: string }[];
}) {
  return (
    <MainCard flush className="h-full">
      <ul className="divide-y divide-border/60">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-4 px-5 py-4">
              <Icon className={cn("h-7 w-7 shrink-0", ICON_TONE[it.tone ?? "primary"])} strokeWidth={1.5} aria-hidden />
              <div className="min-w-0">
                <p className="text-[1.5rem] font-light leading-none tabular-nums text-foreground">{it.value}</p>
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{it.label}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </MainCard>
  );
}

/** Datta "Social stats" card: an icon, a big figure and a caption, then two stats each with a bar. */
export function PackWidget({
  icon: Icon,
  iconTone = "primary",
  title,
  big,
  caption,
  stats,
  footer,
}: {
  icon: LucideIcon;
  iconTone?: IconTone;
  title: string;
  big: string;
  caption: string;
  stats: { label: string; value: string; percent: number; tone: BarTone }[];
  footer?: ReactNode;
}) {
  return (
    <MainCard flush footer={footer} className="h-full">
      <div className="flex items-center gap-4 border-b border-border/60 px-5 py-5">
        <Icon className={cn("h-9 w-9 shrink-0", ICON_TONE[iconTone])} strokeWidth={1.4} aria-hidden />
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</p>
          <p className="mt-1 truncate text-2xl font-light tabular-nums text-foreground">{big}</p>
          <p className="mt-0.5 text-xs text-muted">{caption}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/60">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <p className="text-center text-xs text-muted">
              {s.label}: <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
            </p>
            <ProgressBar value={s.percent} tone={s.tone} label={`${s.label} ${s.value}`} className="mt-3" />
          </div>
        ))}
      </div>
    </MainCard>
  );
}

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input as UiInput } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs as UiTabs } from "@/components/ui/tabs";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

const buttonVariantMap = {
  primary: "default",
  ghost: "outline",
  danger: "destructive",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <UiButton
      variant={buttonVariantMap[variant]}
      className={className}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <UiInput className={className} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-9 rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return <UiTextarea {...props} />;
}

const toneToVariant = {
  neutral: "outline",
  ok: "success",
  warn: "warning",
  danger: "destructive",
  info: "info",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
  children: ReactNode;
}) {
  return <UiBadge variant={toneToVariant[tone]}>{children}</UiBadge>;
}

/** Status badges for theme Hidden / Available / Archived (and similar). */
export function StatusBadge({
  status,
}: {
  status: "Hidden" | "Available" | "Archived" | string;
}) {
  const tone =
    status === "Available"
      ? "ok"
      : status === "Hidden"
        ? "info"
        : status === "Archived"
          ? "neutral"
          : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={cn(className)}>{children}</Card>;
}

/**
 * `scroll`: on wide screens the table scrolls inside its own box (the height of the window below the sticky top bar)
 * with the header row pinned, instead of growing the whole page. Narrow screens keep the page scroll.
 */
export function TableShell({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) {
    return (
      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        <Table>{children}</Table>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative overflow-auto overscroll-contain rounded-lg bg-card shadow-card",
        "lg:max-h-[calc(100dvh-var(--cms-header-height)-2rem)]",
        "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-card",
      )}
    >
      <table className="w-full caption-bottom text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className = "",
  sort,
}: {
  children?: ReactNode;
  className?: string;
  /** Set on a sortable column: tells assistive tech how the table is sorted by it. */
  sort?: "ascending" | "descending" | "none";
}) {
  return (
    <TableHead className={cn("bg-background/60", className)} aria-sort={sort}>
      {children}
    </TableHead>
  );
}

export function Td({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <TableCell className={className}>{children}</TableCell>;
}

export { TableHeader, TableBody, TableRow };

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return <UiTabs tabs={tabs} value={value} onChange={onChange} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}

export function Swatch({ color }: { color: string | undefined | null }) {
  if (!color) {
    return (
      <span className="inline-block h-4 w-4 rounded border border-border bg-background" />
    );
  }
  return (
    <span
      className="inline-block h-4 w-4 rounded border border-border"
      style={{ background: color }}
      title={color}
    />
  );
}

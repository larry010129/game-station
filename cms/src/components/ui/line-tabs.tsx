import type { KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Underline tabs with a count beside each label, from the 21st.dev "Tabs with Count Badges" (felipemenezes098,
 * Flexnative "line" variant). Restyled with the CMS tokens; keeps roving tabindex and Left/Right arrow keys.
 */
export interface LineTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function LineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: readonly LineTab<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === value);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.id);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab-id="${next.id}"]`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("flex items-end gap-1 border-b border-border/60", className)}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab-id={t.id}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative -mb-px inline-flex h-9 items-center gap-1.5 rounded-t-md px-3 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity after:duration-150",
              active ? "text-foreground after:opacity-100" : "text-muted after:opacity-0 hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] tabular-nums leading-4",
                  active ? "bg-primary/15 text-foreground" : "bg-secondary text-muted",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

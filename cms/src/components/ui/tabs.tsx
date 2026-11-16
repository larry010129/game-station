import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative z-0 flex w-fit items-center gap-0.5 rounded-lg bg-secondary p-0.5 text-muted",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex h-8 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

import { useRef } from "react";

interface Props<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

/** One choice out of a few. Arrow keys move between the options, Home and End jump to the ends, like any radio group. */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (index: number) => {
    const next = options[index];
    if (!next) return;
    onChange(next.value);
    buttons.current[index]?.focus();
  };
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value || (!options.some((x) => x.value === value) && i === 0) ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const n = options.length;
            if (e.key === "ArrowRight" || e.key === "ArrowDown") go((i + 1) % n);
            else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go((i - 1 + n) % n);
            else if (e.key === "Home") go(0);
            else if (e.key === "End") go(n - 1);
            else return;
            e.preventDefault();
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

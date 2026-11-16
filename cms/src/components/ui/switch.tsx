import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * On/off switch, from the 21st.dev "Switch" by kemiljk: a real `<button>` (click, Space/Enter and focus come free)
 * with `role="switch"` and `aria-checked`. Pill track that fills with the accent when on, wide oval thumb that slides.
 * Restyled with the CMS tokens in place of the original CSS module.
 */
export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, disabled, className, onClick, ...rest },
  ref,
) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onCheckedChange(!checked);
      }}
      className={cn(
        "group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5",
        "transition-colors duration-200 ease-out motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-primary bg-primary" : "border-border bg-secondary",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block h-[18px] w-6 rounded-full bg-white shadow-sm",
          "transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
          checked ? "translate-x-[14px]" : "translate-x-0",
        )}
      />
    </button>
  );
});

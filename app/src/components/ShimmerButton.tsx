import { useRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from "react";

/**
 * A call to action with a sheen that sweeps across it and a soft light that follows the pointer.
 * Adapted from "Klyv Shimmer Button" by klyv-ui on 21st.dev (MIT License, Copyright (c) 2026 Klyv contributors),
 * rewritten as plain CSS on this app's tokens (see `.shimmer-btn` in station-ui.css). The pointer light is written to
 * CSS variables, not React state, so a pointer move never re-renders anything.
 */
export function ShimmerButton({
  children,
  className = "",
  onPointerMove,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e);
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    node.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
    node.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
    node.style.setProperty("--glow-opacity", "1");
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`shimmer-btn ${className}`.trim()}
      onPointerMove={move}
      onPointerLeave={() => ref.current?.style.setProperty("--glow-opacity", "0")}
      {...props}
    >
      <span className="shimmer-glow" aria-hidden="true" />
      <span className="shimmer-sheen" aria-hidden="true" />
      <span className="shimmer-label">{children}</span>
    </button>
  );
}

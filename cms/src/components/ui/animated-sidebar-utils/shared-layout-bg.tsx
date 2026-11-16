"use client";
// Written for this project: the animated sidebar imports it but ships without this file.

import { motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  useCallback,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { SPRING_LAYOUT } from "@/components/ui/animated-sidebar-utils/ease";

interface Highlight {
  top: number;
  height: number;
}

export interface SharedLayoutBgProps extends HTMLAttributes<HTMLElement> {
  /** The element to render, such as "ul". */
  as?: ElementType;
  /** Horizontal inset of the highlight, in px. */
  inset?: number;
  /** Classes for the highlight itself (colour, radius). */
  pillClassName?: string;
  /** Classes for the box that carries the highlight (position and height). */
  pillContainerClassName?: string;
  /** Which descendants the highlight can land on. */
  itemSelector?: string;
  children?: ReactNode;
}

/**
 * One highlight shared by every row of a list. It glides to the row under the pointer or keyboard focus and
 * fades out when nothing is hovered, instead of each row flashing its own background.
 */
export const SharedLayoutBg = forwardRef<HTMLElement, SharedLayoutBgProps>(function SharedLayoutBg(
  {
    as: Tag = "div",
    inset = 0,
    pillClassName,
    pillContainerClassName,
    itemSelector = "[data-slot='sidebar-menu-item']",
    className,
    children,
    onPointerMove,
    onPointerLeave,
    onFocus,
    onBlur,
    ...props
  },
  forwardedRef,
) {
  const reduce = useReducedMotion() ?? false;
  const own = useRef<HTMLElement | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      own.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const land = (target: EventTarget | null) => {
    const root = own.current;
    const item = target instanceof Element ? target.closest<HTMLElement>(itemSelector) : null;
    if (!root || !item || !root.contains(item)) {
      setHighlight(null);
      return;
    }
    setHighlight({ top: item.offsetTop, height: item.offsetHeight });
  };

  return (
    <Tag
      {...props}
      ref={setRef as Ref<HTMLElement>}
      className={cn("relative", className)}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        onPointerMove?.(e);
        land(e.target);
      }}
      onPointerLeave={(e: React.PointerEvent<HTMLElement>) => {
        onPointerLeave?.(e);
        setHighlight(null);
      }}
      onFocus={(e: React.FocusEvent<HTMLElement>) => {
        onFocus?.(e);
        if (e.target.matches(":focus-visible")) land(e.target);
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        onBlur?.(e);
        setHighlight(null);
      }}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{
          y: highlight?.top ?? 0,
          height: highlight?.height ?? 0,
          opacity: highlight ? 1 : 0,
        }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        style={{ left: inset, right: inset }}
        className={cn("pointer-events-none absolute", pillContainerClassName)}
      >
        <span className={cn("absolute inset-0", pillClassName)} />
      </motion.span>
      {children}
    </Tag>
  );
});

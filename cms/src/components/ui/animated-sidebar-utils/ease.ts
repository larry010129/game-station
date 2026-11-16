/**
 * Motion curves and springs for the animated sidebar (beui.dev "Animated Sidebar").
 * Written for this project: the component imports them but ships without this file.
 */
type Bezier = [number, number, number, number];

/** Fast start, long soft landing: small movements like labels and rows. */
export const EASE_OUT: Bezier = [0.23, 1, 0.32, 1];

/** The drawer curve: a quick pull, then a slow settle. Used for the mobile sheet and the rail. */
export const EASE_DRAWER: Bezier = [0.32, 0.72, 0, 1];

/** Layout moves (the active pill, row shifts): firm, no overshoot. */
export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 500,
  damping: 38,
  mass: 0.7,
} as const;

/** Press feedback on a button: snappy and small. */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 600,
  damping: 30,
} as const;

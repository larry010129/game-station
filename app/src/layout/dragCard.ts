import type { CardId } from "./layouts";

/** The card type being dragged out of the Cards list. A drag event cannot be read until it drops, so the grid asks this for the size to preview. */
export const dragging: { type: CardId | null } = { type: null };
export const CARD_MIME = "application/x-command-station-card";

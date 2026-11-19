/**
 * Dashboard card skins: the prizes of the Card Pack. A skin restyles every dashboard card (frame, surface, edge
 * light) on top of the active theme, so it reads on any theme. The art is CSS in `styles/cardskins.css`, keyed by id,
 * so the list of ids lives in the app; the CMS only switches skins on and off, sets their stars and runs the pack.
 * Data only: no React or storage.
 */

export type CardStars = 4 | 5;

export interface CardSkinDef {
  id: string;
  name: string;
  /** The stars the skin ships with. A release can move a skin between 4 and 5 stars. */
  stars: CardStars;
  /** One line for the pack list and the preview. */
  blurb: string;
}

/** Twelve 4-star skins (still surfaces) and six 5-star skins (moving light). */
export const CARD_SKINS: readonly CardSkinDef[] = [
  { id: "carbon-weave", name: "Carbon Weave", stars: 4, blurb: "Woven carbon fibre under a satin top coat." },
  { id: "brushed-steel", name: "Brushed Steel", stars: 4, blurb: "Fine brushed metal with a cool edge." },
  { id: "blueprint", name: "Blueprint", stars: 4, blurb: "Drafting grid in your accent colour." },
  { id: "velvet-night", name: "Velvet Night", stars: 4, blurb: "Deep velvet that soaks up the light." },
  { id: "circuit-trace", name: "Circuit Trace", stars: 4, blurb: "Board traces running along the edges." },
  { id: "frosted-glass", name: "Frosted Glass", stars: 4, blurb: "Heavier frost with a bright rim." },
  { id: "scanline", name: "Scanline", stars: 4, blurb: "Old monitor scanlines over the card." },
  { id: "gilded-edge", name: "Gilded Edge", stars: 4, blurb: "A thin gold frame with corner marks." },
  { id: "topo-lines", name: "Topo Lines", stars: 4, blurb: "Contour lines like a map of the hills." },
  { id: "hex-mesh", name: "Hex Mesh", stars: 4, blurb: "Hexagon mesh fading in from the corner." },
  { id: "paper-grain", name: "Paper Grain", stars: 4, blurb: "Soft paper grain with a printed edge." },
  { id: "neon-rim", name: "Neon Rim", stars: 4, blurb: "A steady neon tube around the frame." },
  { id: "holo-foil", name: "Holo Foil", stars: 5, blurb: "Rainbow foil that shifts as it catches light." },
  { id: "aurora-drift", name: "Aurora Drift", stars: 5, blurb: "Slow aurora ribbons behind the card." },
  { id: "solar-flare", name: "Solar Flare", stars: 5, blurb: "A warm flare that circles the frame." },
  { id: "prism-glass", name: "Prism Glass", stars: 5, blurb: "Cut glass that splits light into colour." },
  { id: "molten-core", name: "Molten Core", stars: 5, blurb: "Glowing seams of molten metal." },
  { id: "starfield", name: "Starfield", stars: 5, blurb: "Stars drifting past behind the card." },
];

export const CARD_SKIN_IDS: readonly string[] = CARD_SKINS.map((s) => s.id);

export function cardSkinById(id: string): CardSkinDef | undefined {
  return CARD_SKINS.find((s) => s.id === id);
}

export const isCardSkinId = (id: unknown): id is string => typeof id === "string" && CARD_SKIN_IDS.includes(id);

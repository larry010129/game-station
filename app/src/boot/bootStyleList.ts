// Plain data (no React), so the item names and the Node tests can read it too.
/**
 * The twelve boot screen styles. The ids are the catalog item ids (`boot-01` to `boot-12`) that the packs and the
 * season pass already hand out, so they must not be renamed or renumbered. The plain screen (no style) stays free
 * for everyone. Styles are code: a downloadable boot format is still an open question in GACHA REDESIGN.md.
 */
export const BOOT_STYLES = [
  { id: "boot-01", name: "Log", blurb: "Each system writes its own line as it comes up." },
  { id: "boot-02", name: "Sweep", blurb: "A scope that marks each system as the beam finds it." },
  { id: "boot-03", name: "Hairline", blurb: "One line across the whole screen, and nothing else." },
  { id: "boot-04", name: "Bus", blurb: "Systems tap into one line, left to right." },
  { id: "boot-05", name: "Visor", blurb: "The frame closes in as the station comes up." },
  { id: "boot-06", name: "Roll call", blurb: "Systems scroll past, one at a time." },
  { id: "boot-07", name: "Tally", blurb: "A stroke for every system, counted in fives." },
  { id: "boot-08", name: "Pulse", blurb: "Each system that answers adds a beat." },
  { id: "boot-09", name: "Matrix", blurb: "A field of cells fills in as the work lands." },
  { id: "boot-10", name: "Gauge", blurb: "A needle that climbs with the startup." },
  { id: "boot-11", name: "Lanes", blurb: "Every system on its own track." },
  { id: "boot-12", name: "Aperture", blurb: "The cover opens onto your desk." },
] as const;

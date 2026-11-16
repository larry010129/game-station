/**
 * Rebuild cms/data/draft.json from app themeCatalog look()/brand() + brandTags.ts + gacha defaults.
 * Run: node cms/scripts/seed-draft.mjs [out.json]   (default: cms/data/draft.json — this overwrites the draft)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const srcPath = path.join(root, "app/src/state/themeCatalog.ts");
const outDir = path.join(root, "cms/data");
const src = fs.readFileSync(srcPath, "utf8");
const DEMO = ["spotify-night", "twitch-purple", "asus-tw", "acer-tw"];

// Pack / country / region tags for every company theme.
const tagSrc = fs.readFileSync(path.join(root, "app/src/content/brandTags.ts"), "utf8");
const TAGS = {};
const tagRe = /"([^"]+)":\s*\{\s*packs:\s*\[([^\]]*)\],\s*country:\s*"([A-Z]{2})",\s*region:\s*"([a-z-]+)"\s*\}/g;
let t;
while ((t = tagRe.exec(tagSrc))) {
  TAGS[t[1]] = { packs: [...t[2].matchAll(/"(brand|region)"/g)].map((x) => x[1]), country: t[3], region: t[4] };
}

function parseExtra(s) {
  if (!s) return {};
  try {
    const j = s
      .replace(/(\w+)\s*:/g, '"$1":')
      .replace(/'/g, '"');
    return JSON.parse(j);
  } catch {
    return {};
  }
}

const themes = [];
const lookRe =
  /look\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*(\{[^}]*\}))?\s*\)/g;
let m;
while ((m = lookRe.exec(src))) {
  const extra = parseExtra(m[14]);
  themes.push({
    id: m[1],
    name: m[2],
    group: "Regular",
    status: "Available",
    palette: {
      bg: m[5],
      card: m[6],
      text: m[7],
      muted: m[8],
      accent: m[9],
      caution: m[10],
      alert: m[11],
      border: m[12],
      radius: m[13],
      ...extra,
    },
  });
}

const brandRe =
  /brand\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*(?:,\s*(\{[^}]*\}))?\s*\)/g;
while ((m = brandRe.exec(src))) {
  const extra = parseExtra(m[12]);
  themes.push({
    id: m[1],
    name: m[2],
    group: "Brand",
    status: DEMO.includes(m[1]) ? "Available" : "Hidden",
    ...(TAGS[m[1]] ? { tags: TAGS[m[1]] } : {}),
    palette: {
      bg: m[3],
      card: m[4],
      text: m[5],
      muted: m[6],
      accent: m[7],
      caution: m[8],
      alert: m[9],
      border: m[10],
      radius: m[11],
      ...extra,
    },
  });
}

themes.unshift({
  id: "charcoal",
  name: "Charcoal",
  group: "Regular",
  status: "Available",
  palette: null,
});
themes.push({
  id: "nightsteel",
  name: "Nightsteel",
  group: "Regular",
  status: "Available",
  palette: {
    bg: "#0a0c10",
    card: "#151922",
    text: "#e8edf5",
    muted: "#8b95a8",
    accent: "#7a9ec8",
    caution: "#d4a017",
    alert: "#c45c5c",
    border: "#2a3344",
    radius: "14px",
    shadow: "0 10px 28px rgba(0, 0, 0, 0.45)",
    font: "grotesk",
  },
});

const items = [
  {
    id: "streak-freeze",
    name: "Streak freeze",
    kind: "streak-freeze",
    stackable: true,
    tier: "common",
  },
];
for (let i = 1; i <= 20; i++) {
  items.push({
    id: `alert-sound-${String(i).padStart(2, "0")}`,
    name: `Alert sound ${i}`,
    kind: "alert-sound",
    stackable: false,
    tier: "common",
  });
}
for (let i = 1; i <= 2; i++) {
  items.push({
    id: `font-${String(i).padStart(2, "0")}`,
    name: `Font unlock ${i}`,
    kind: "font",
    stackable: false,
    tier: "common",
  });
}
for (let i = 1; i <= 2; i++) {
  items.push({
    id: `name-flair-${String(i).padStart(2, "0")}`,
    name: `Name flair ${i}`,
    kind: "name-flair",
    stackable: false,
    tier: "common",
  });
}
for (let i = 1; i <= 25; i++) {
  items.push({
    id: `wallpaper-${String(i).padStart(2, "0")}`,
    name: `Wallpaper ${i}`,
    kind: "wallpaper",
    stackable: false,
    tier: "better",
  });
}
for (let i = 1; i <= 12; i++) {
  items.push({
    id: `boot-${String(i).padStart(2, "0")}`,
    name: `Boot screen ${i}`,
    kind: "boot",
    stackable: false,
    tier: "better",
  });
}
for (let i = 1; i <= 3; i++) {
  items.push({
    id: `layout-slot-${String(i).padStart(2, "0")}`,
    name: `Layout slot ${i}`,
    kind: "layout-slot",
    stackable: false,
    tier: "better",
  });
}
items.push({
  id: "custom-upload",
  name: "Custom upload unlock",
  kind: "custom-upload",
  stackable: false,
  tier: "brand",
});

const brandThemeIds = Object.keys(TAGS).filter((id) => TAGS[id].packs.includes("brand"));

const draft = {
  version: 1,
  updatedAt: new Date().toISOString(),
  releaseNotes: "Bundled seed from app themeCatalog + gachaContent.",
  economy: {
    lookCost: 120,
    lookPityAfter: 9,
    brandPityAfter: 69,
    rainbowPityAfter: 89,
    promotedChance: 50,
    weeklyPickCap: 2,
    regularCrystalCost: 10,
    brandPrismCost: 5,
    crystalValues: {
      common: 1,
      better: 2,
      regularTheme: 3,
      brandTheme: 5,
      customUpload: 5,
    },
    brandEpoch: "2024-01-01",
    brandFortnightDays: 14,
  },
  packs: {
    regular: {
      id: "regular",
      priceOne: 100,
      priceTen: 900,
      weights: {
        regularTheme: 14,
        brandTheme: 1,
        pick: 3,
        customUpload: 0,
        better: 25,
        common: 57,
      },
      betterInner: { wallpaper: 70, boot: 20, layout: 10 },
      commonInner: { streakFreeze: 30, alert: 50, font: 10, flair: 10 },
    },
    brand: {
      id: "brand",
      priceOne: 150,
      priceTen: 1350,
      weights: {
        regularTheme: 13,
        brandTheme: 1.5,
        pick: 3,
        customUpload: 0.5,
        better: 25,
        common: 57,
      },
      betterInner: { wallpaper: 55, boot: 30, layout: 15 },
      commonInner: { streakFreeze: 30, alert: 50, font: 10, flair: 10 },
    },
    region: {
      id: "region",
      priceOne: 150,
      priceTen: 1350,
      weights: {
        regularTheme: 13,
        brandTheme: 1.5,
        pick: 3,
        customUpload: 0.5,
        better: 25,
        common: 57,
      },
      betterInner: { wallpaper: 55, boot: 30, layout: 15 },
      commonInner: { streakFreeze: 30, alert: 50, font: 10, flair: 10 },
    },
  },
  themes,
  items,
  brandThemeIds,
  rainbowThemeIds: ["retro-arcade", "neon-magenta", "purple-rain", "claymorphism", "pine-terminal", "emerald-dark", "rose-pine", "aj-cybernetics"],
  regionWeek: null,
  banners: [
    {
      id: "banner-regular-1",
      title: "New looks in the Regular Pack",
      subtitle: "Draw for wallpapers, boots, and station themes.",
      pack: "regular",
      start: "2026-01-01",
      end: "2026-12-31",
      featuredIds: ["nightsteel", "wallpaper-01", "boot-01"],
      priority: 1,
      body: "Featured this season.",
      art: "",
    },
  ],
  releases: [],
};

fs.mkdirSync(outDir, { recursive: true });
const outFile = process.argv[2] ? path.resolve(process.argv[2]) : path.join(outDir, "draft.json");
fs.writeFileSync(outFile, JSON.stringify(draft, null, 2));
console.log(
  `Wrote ${outFile} (${themes.length} themes, ${items.length} items)`,
);

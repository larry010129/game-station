import { lockedIdsOf } from "./lookAccess";
import type { FontKey, Palette, ThemeDef } from "./palette";

/**
 * Looks taken from 21st.dev community themes (serafimcloud) and fitted onto this station:
 * page, cards, type, accent, caution, alert, border, and corner radius.
 * Each entry is the theme's dark block unless the name says light.
 */

function look(
  id: string,
  name: string,
  group: string,
  slug: string,
  bg: string,
  card: string,
  text: string,
  muted: string,
  accent: string,
  caution: string,
  alert: string,
  border: string,
  radius: string,
  extra?: Partial<Palette>,
): ThemeDef {
  return {
    id,
    name,
    author: "21st.dev",
    group,
    source: "21st",
    url: `https://21st.dev/community/themes/${slug}`,
    palette: { bg, card, text, muted, accent, caution, alert, border, radius, ...extra },
  };
}

/** Whose colours a brand look borrows; shown on its tile in place of "Command Station". */
const COMPANY: Record<string, string> = {
  "spotify-night": "Spotify",
  "twitch-purple": "Twitch",
  "netflix-cinema": "Netflix",
  "youtube-signal": "YouTube",
  "steam-storefront": "Steam",
  "nintendo-red": "Nintendo",
  "playstation-blue": "PlayStation",
  "xbox-green": "Xbox",
  "valorant-clutch": "Valorant",
  "blizzard-blue": "Blizzard",
  "slack-aubergine": "Slack",
  "stripe-blurple": "Stripe",
  "figma-frame": "Figma",
  "github-terminal": "GitHub",
  "notion-ink": "Notion",
  "apple-graphite": "Apple",
  "microsoft-quad": "Microsoft",
  "cola-red": "Coca-Cola",
  "starbucks-siren": "Starbucks",
  "nike-volt": "Nike",
  "adidas-court": "Adidas",
  "ikea-blue-yellow": "IKEA",
  "golden-arch": "McDonald's",
  "tiktok-dual": "TikTok",
  "hulu-night": "Hulu",
  "amazon-smile": "Amazon",
  "linkedin-navy": "LinkedIn",
  "airbnb-coral": "Airbnb",
};

/** Station UI palettes derived from well-known brand colour DNA (not official kits). */
function brand(
  id: string,
  name: string,
  bg: string,
  card: string,
  text: string,
  muted: string,
  accent: string,
  caution: string,
  alert: string,
  border: string,
  radius: string,
  extra?: Partial<Palette>,
): ThemeDef {
  return {
    id,
    name,
    author: COMPANY[id] ?? "Command Station",
    group: "Brand",
    source: "station",
    palette: { bg, card, text, muted, accent, caution, alert, border, radius, ...extra },
  };
}

export const CHARCOAL: ThemeDef = {
  id: "charcoal",
  name: "Charcoal",
  author: "Command Station",
  group: "Station",
  source: "station",
  palette: null,
};

/** Locked until unlocked via quest or pay; kept out of CATALOG until then. */
export const NIGHTSTEEL: ThemeDef = {
  id: "nightsteel",
  name: "Nightsteel",
  author: "Command Station",
  group: "Station",
  source: "station",
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
};

/** Themes gated behind unlock; not listed in CATALOG until `cs.themeUnlocks` says so. */
export const UNLOCKABLES: ThemeDef[] = [NIGHTSTEEL];

const MIKU: ThemeDef = {
  id: "miku",
  name: "Miku",
  author: "Command Station",
  group: "Station",
  source: "station",
  palette: {
    bg: "#0d0e1a",
    card: "#17192b",
    text: "#e7fffb",
    muted: "#8ecfc9",
    accent: "#39c5bb",
    caution: "#f0b429",
    alert: "#e85a8c",
    border: "#2a6d68",
    radius: "16px",
  },
};

/**
 * Each look's type voice. These are our picks by feel (the 21st.dev originals name their own
 * families, which we do not ship): serifs for the editorial looks, mono for terminals, grotesk
 * for loud or techy ones, system Segoe where the real product uses it. Light twins follow
 * their dark one; anything unlisted takes its group's voice below.
 */
const FONT_BY_ID: Record<string, FontKey> = {
  wikipedia: "serif",
  "kodama-grove": "serif",
  "elegant-luxury": "serif",
  "starry-night": "serif",
  claude: "serif",
  "claude-azure": "serif",
  "mocha-mousse": "serif",
  "rose-pine": "serif",
  matrix: "mono",
  "crimson-terminal": "mono",
  "advent-of-code": "mono",
  "pine-terminal": "mono",
  "github-terminal": "mono",
  "aj-cybernetics": "mono",
  "retro-arcade": "mono",
  "graphite-mono": "mono",
  "vs-code": "system",
  "twitter-azure": "system",
  whatsapp: "system",
  "microsoft-quad": "system",
  "neo-brutalism": "grotesk",
  nxtbet: "grotesk",
  "neon-magenta": "grotesk",
  "purple-rain": "grotesk",
  "tiktok-dual": "grotesk",
  "nike-volt": "grotesk",
  "adidas-court": "grotesk",
  "valorant-clutch": "grotesk",
  "blizzard-blue": "grotesk",
  "playstation-blue": "grotesk",
  candyland: "jakarta",
  "sakura-dawn": "jakarta",
  claymorphism: "jakarta",
  catppuccin: "jakarta",
  discord: "jakarta",
  "twitch-purple": "jakarta",
  "nintendo-red": "jakarta",
  "airbnb-coral": "jakarta",
  "starbucks-siren": "jakarta",
  "ikea-blue-yellow": "jakarta",
  "golden-arch": "jakarta",
  "cola-red": "jakarta",
  "hulu-night": "jakarta",
  "t3-chat": "inter",
};

const FONT_BY_GROUP: Record<string, FontKey> = {
  Blue: "inter",
  Green: "jakarta",
  Teal: "grotesk",
  Red: "grotesk",
  Amber: "jakarta",
  Pink: "jakarta",
  Violet: "grotesk",
  Neutral: "inter",
  Brand: "inter",
};

/** Gives a look its type voice unless it already names one. */
function withFont(t: ThemeDef): ThemeDef {
  if (!t.palette || t.palette.font || t.palette.mono) return t;
  const base = t.id.replace(/-(light|latte)$/, "");
  const font = FONT_BY_ID[base] ?? FONT_BY_ID[t.id] ?? FONT_BY_GROUP[t.group];
  return font ? { ...t, palette: { ...t.palette, font } } : t;
}

const LOOKS: ThemeDef[] = [
  CHARCOAL,
  MIKU,
  look("modern-minimal", "Modern Minimal", "Blue", "modern-minimal", "#171717", "#262626", "#e5e5e5", "#a3a3a3", "#3b82f6", "#f0893a", "#ef4444", "#404040", "0.375rem"),
  look("starry-night", "Starry Night", "Blue", "starry-night", "#181a24", "#23243a", "#e6eaf3", "#7a88a1", "#bccdf0", "#ffe066", "#a04a6c", "#2d2e3e", "0.5rem"),
  look("azure-noir", "Azure Noir", "Blue", "azure-noir", "#141c30", "#212b3e", "#e2e8f0", "#8f96a3", "#5085fb", "#f0893a", "#ff6467", "#3e4858", "0.625rem"),
  look("solar-halo", "Solar Halo", "Blue", "solar-halo", "#1a1b1e", "#25262b", "#dcdcdc", "#909296", "#91a7ff", "#ff922b", "#f03e3e", "#373a40", "0.5rem"),
  look("wikipedia", "Wikipedia", "Blue", "wikipedia", "hsl(0, 0%, 12%)", "hsl(0, 0%, 15%)", "hsl(0, 0%, 92%)", "hsl(0, 0%, 65%)", "hsl(212, 100%, 75%)", "hsl(40, 90%, 65%)", "hsl(0, 75%, 50%)", "hsl(0, 0%, 25%)", "0.125rem"),
  look("wikipedia-light", "Wikipedia light", "Blue", "wikipedia", "#ffffff", "#ffffff", "hsl(0, 0%, 15%)", "hsl(0, 0%, 45%)", "hsl(214, 85%, 45%)", "hsl(30, 95%, 45%)", "hsl(0, 84%, 44%)", "hsl(0, 0%, 82%)", "0.125rem"),
  look("supabase", "Supabase", "Green", "supabase", "#121212", "#171717", "#e2e8f0", "#a2a2a2", "#4ade80", "#fbbf24", "#ef4444", "#292929", "0.5rem"),
  look("nature", "Nature", "Green", "nature", "#1c2a1f", "#2d3a2e", "#f0ebe5", "#d7cfc4", "#4caf50", "#f0893a", "#c62828", "#3e4a3d", "0.5rem"),
  look("ocean-breeze", "Ocean Breeze", "Green", "ocean-breeze", "#0f172a", "#1e293b", "#d1d5db", "#6b7280", "#34d399", "#f0893a", "#ef4444", "#4b5563", "0.5rem"),
  look("kodama-grove", "Kodama Grove", "Green", "kodama-grove", "#3a3529", "#413c33", "#ede4d4", "#a8a096", "#8a9f7b", "#a18f5c", "#b5766a", "#5a5345", "0.425rem"),
  look("kodama-grove-light", "Kodama Grove light", "Green", "kodama-grove", "#e4d7b0", "#e7dbbf", "#5c4b3e", "#85766a", "#8d9d4f", "#a18f5c", "#d98b7e", "#b19681", "0.425rem"),
  look("matrix", "Matrix", "Green", "matrix-green", "#000000", "#050505", "#00ff41", "#008f11", "#00ff41", "#f0893a", "#ff0000", "#003b00", "0px", { mono: true, shadow: "0 0 14px rgba(0, 255, 65, 0.35)" }),
  look("cyber-cyan", "Cyber Cyan", "Teal", "cyber-cyan", "#020811", "#0a0c13", "#def7fb", "hsl(215, 20.2%, 65.1%)", "#3cedeb", "#f0893a", "#ef4444", "#112a37", "0.5rem"),
  look("sea-glass", "Sea Glass", "Teal", "sea-glass", "#16171d", "#202b30", "#cbf4ed", "#9ca3af", "#00f0d3", "#e98100", "#ef4444", "#4a6767", "0.15rem"),
  look("cyan-dawn", "Cyan Dawn", "Teal", "cyan-dawn", "#121212", "#17181c", "#e7e9ea", "#8b98a5", "#58d3db", "#f7b928", "#f4212e", "#2f3336", "0.5rem"),
  look("elegant-luxury", "Elegant Luxury", "Red", "elegant-luxury", "#1c1917", "#292524", "#f5f5f4", "#d6d3d1", "#b91c1c", "#fbbf24", "#ef4444", "#44403c", "0.375rem"),
  look("crimson-terminal", "Crimson Terminal", "Red", "crimson-terminal", "hsl(0, 0%, 2%)", "hsl(0, 0%, 5%)", "hsl(0, 0%, 92%)", "hsl(0, 0%, 62%)", "hsl(0, 80%, 52%)", "#f0893a", "hsl(0, 75%, 58%)", "hsl(0, 0%, 25%)", "0px", { mono: true }),
  look("neo-brutalism", "Neo Brutalism", "Red", "neo-brutalism", "#000000", "#333333", "#ffffff", "#cccccc", "#ff6666", "#ffff33", "#ff3333", "#ffffff", "0px", { shadow: "4px 4px 0 #000000" }),
  look("neo-brutalism-light", "Neo Brutalism light", "Red", "neo-brutalism", "#ffffff", "#ffffff", "#000000", "#333333", "#ff3333", "#ffff00", "#000000", "#000000", "0px", { shadow: "4px 4px 0 #000000" }),
  look("claude", "Claude", "Amber", "claude", "#262624", "#262624", "#c3c0b6", "#b7b5a9", "#d97757", "#d97757", "#ef4444", "#3e3e38", "0.5rem"),
  look("claude-light", "Claude light", "Amber", "claude", "#faf9f5", "#faf9f5", "#3d3929", "#83827d", "#c96442", "#c96442", "#141413", "#dad9d4", "0.5rem"),
  look("darkmatter", "Darkmatter", "Amber", "darkmatter", "#121113", "#121212", "#c1c1c1", "#888888", "#e78a53", "#fbcb97", "#ef4444", "#222222", "0.75rem"),
  look("caffeine", "Caffeine", "Amber", "caffeine", "#111111", "#191919", "#eeeeee", "#b4b4b4", "#ffe0c2", "#e54d2e", "#e54d2e", "#201e18", "0.5rem"),
  look("caffeine-light", "Caffeine light", "Amber", "caffeine", "#f9f9f9", "#fcfcfc", "#202020", "#646464", "#644a40", "#e54d2e", "#e54d2e", "#d8d8d8", "0.5rem"),
  look("mocha-mousse", "Mocha Mousse", "Amber", "mocha-mousse", "#2d2521", "#3c332e", "#f1f0e5", "#c5aa9b", "#c39e88", "#baab92", "#e57373", "#56453f", "0.5rem"),
  look("mocha-mousse-light", "Mocha Mousse light", "Amber", "mocha-mousse", "#f1f0e5", "#f1f0e5", "#56453f", "#8a655a", "#a37764", "#baab92", "#1f1a17", "#baab92", "0.5rem"),
  look("candyland", "Candyland", "Pink", "candyland", "#1a1d23", "#2f3436", "#e5e5e5", "#a3a3a3", "#ff99cc", "#ffff00", "#ef4444", "#444444", "0.5rem"),
  look("candyland-light", "Candyland light", "Pink", "candyland", "#f7f9fa", "#ffffff", "#333333", "#6e6e6e", "#ffc0cb", "#ffff00", "#ef4444", "#d4d4d4", "0.5rem"),
  look("t3-chat", "T3 Chat", "Pink", "t3-chat", "#221d27", "#2c2632", "#d2c4de", "#c2b6cf", "#db2777", "#e88c30", "#e23670", "#3b3237", "0.5rem"),
  look("retro-arcade", "Retro Arcade", "Pink", "retro-arcade", "#002b36", "#073642", "#93a1a1", "#93a1a1", "#d33682", "#cb4b16", "#dc322f", "#586e75", "0.25rem"),
  look("sakura-dawn", "Sakura Dawn", "Pink", "sakura-dawn", "#1a1412", "#241d1a", "#eae0dc", "#a18e84", "#ff7ea5", "#d4a59a", "#e5484d", "#332a26", "0.5rem"),
  look("sakura-dawn-light", "Sakura Dawn light", "Pink", "sakura-dawn", "#fff9f6", "#ffffff", "#5c4b43", "#a18e84", "#ff7ea5", "#d4a59a", "#e5484d", "#ebe0da", "0.5rem"),
  look("neon-magenta", "Neon Magenta", "Pink", "neon-magenta", "#000000", "#111111", "#ffffff", "#aaaaaa", "#ff00c8", "#ffe600", "#ff3d00", "#333333", "0.5rem"),
  look("catppuccin", "Catppuccin", "Violet", "catppuccin", "#181825", "#1e1e2e", "#cdd6f4", "#a6adc8", "#cba6f7", "#fab387", "#f38ba8", "#313244", "0.35rem"),
  look("catppuccin-latte", "Catppuccin Latte", "Violet", "catppuccin", "#eff1f5", "#ffffff", "#4c4f69", "#6c6f85", "#8839ef", "#fe640b", "#d20f39", "#bcc0cc", "0.35rem"),
  look("purple-rain", "Purple Rain", "Violet", "purple-rain", "hsl(222, 47%, 4%)", "hsl(222, 47%, 7%)", "hsl(210, 40%, 98%)", "hsl(215, 20.2%, 65.1%)", "hsl(263, 70%, 60%)", "hsl(30, 80%, 55%)", "hsl(340, 75%, 58%)", "hsl(217.2, 32.6%, 22%)", "0.75rem"),
  look("claymorphism", "Claymorphism", "Violet", "claymorphism", "#1e1b18", "#2c2825", "#e2e8f0", "#9ca3af", "#818cf8", "#f0893a", "#ef4444", "#3a3633", "1.25rem", { shadow: "2px 2px 12px rgba(0, 0, 0, 0.28)" }),
  look("graphite", "Graphite", "Neutral", "graphite", "#1a1a1a", "#202020", "#d9d9d9", "#808080", "#a0a0a0", "#f0893a", "#e06666", "#353535", "0.35rem"),
  // Fresh 21st picks for a command / gaming station (existing entries kept).
  look("discord", "Discord", "Blue", "discord", "#323339", "#393a41", "#ffffff", "#a4a5ab", "#5865f2", "#f5d18a", "#ffa09b", "#3e3f45", "0.625rem"),
  look("discord-light", "Discord light", "Blue", "discord", "#fbfbfb", "#ffffff", "#28282d", "#6c6d76", "#5865f2", "#c9892b", "#b92733", "#dfdfe1", "0.625rem"),
  look("vs-code", "VS Code", "Blue", "vs-code", "#1b1b1b", "#1f1f1f", "#cecece", "#808080", "#226bc0", "#d18c65", "#e24947", "#383838", "0rem"),
  look("vs-code-light", "VS Code light", "Blue", "vs-code", "#ffffff", "#ffffff", "#333333", "#717171", "#226bc0", "#6c5019", "#c51d28", "#e1e1e1", "0.625rem"),
  look("twitter-azure", "Twitter Azure", "Blue", "twitter-azure", "#000000", "#17181c", "#e7e9ea", "#8b98a5", "#1c9cf0", "#f7b928", "#f4212e", "#242628", "1.3rem"),
  look("twitter-azure-light", "Twitter Azure light", "Blue", "twitter-azure", "#ffffff", "#f7f8f8", "#0f1419", "#536471", "#1e9df1", "#c9892b", "#f4212e", "#e1eaef", "1.3rem"),
  look("claude-azure", "Claude Azure", "Blue", "claude-azure", "#111111", "#242526", "#e2e4e5", "#a9b1b7", "#5795d9", "#f0893a", "#ef4444", "#383b3e", "0.5rem"),
  look("claude-azure-light", "Claude Azure light", "Blue", "claude-azure", "#f1f1f1", "#f5f8fa", "#29323d", "#5c656d", "#4288c9", "#c9892b", "#b92733", "#d4dadb", "0.5rem"),
  look("supabase-sage", "Supabase Sage", "Green", "supabase-sage", "#121212", "#171717", "#e2e8f0", "#a2a2a2", "#008a50", "#fbbf24", "#ca3214", "#292929", "0.5rem"),
  look("supabase-sage-light", "Supabase Sage light", "Green", "supabase-sage", "#fcfcfc", "#ffffff", "#171717", "#525252", "#008a50", "#c9892b", "#ca3214", "#dfdfdf", "0.5rem"),
  look("emerald-dark", "Emerald Dark", "Teal", "emerald-dark-1790687880809", "hsl(180, 50%, 4%)", "hsl(180, 45%, 7%)", "hsl(170, 20%, 96%)", "hsl(170, 10%, 70%)", "hsl(171, 90%, 50%)", "#f0893a", "hsl(340, 80%, 45%)", "hsl(180, 30%, 18%)", "1rem"),
  look("coral-teal", "Coral Teal", "Red", "coral-teal", "#030303", "#09090b", "#f8fafc", "#a1a1aa", "#ff4d4d", "#f59e0b", "#991b1b", "#27272a", "0.75rem"),
  look("coral-teal-light", "Coral Teal light", "Red", "coral-teal", "#ffffff", "#f8fafc", "#0a0a0b", "#64748b", "#ff4d4d", "#c9892b", "#ef4444", "#e2e8f0", "0.75rem"),
  look("advent-of-code", "Advent of Code", "Amber", "advent-of-code", "#333333", "#444444", "#ffffff", "#b0b0b0", "#f2c464", "#6688cc", "#cc3737", "#555555", "0px", { mono: true }),
  look("advent-of-code-light", "Advent of Code light", "Amber", "advent-of-code", "#f7f7f7", "#ffffff", "#333333", "#666666", "#c9a227", "#3178c6", "#ff3737", "#cccccc", "0px", { mono: true }),
  look("nxtbet", "NXTBET", "Amber", "nxtbet", "hsl(0, 0%, 3%)", "hsl(0, 0%, 6%)", "hsl(0, 0%, 98%)", "hsl(0, 0%, 65%)", "hsl(33, 96%, 51%)", "#f0893a", "hsl(0, 84%, 60%)", "hsl(0, 0%, 18%)", "0.25rem"),
  look("nxtbet-light", "NXTBET light", "Amber", "nxtbet", "hsl(0, 0%, 100%)", "hsl(0, 0%, 98%)", "hsl(0, 0%, 8%)", "hsl(0, 0%, 40%)", "hsl(33, 96%, 45%)", "#c9892b", "hsl(0, 84%, 50%)", "hsl(0, 0%, 88%)", "0.375rem"),
  look("aj-cybernetics", "AJ Cybernetics", "Amber", "ajcybernetics-theme-1793173566868", "#0c0c1d", "#1e1e3f", "#eceff4", "#8085a6", "#ea580c", "#f59e0b", "#ff3d00", "#2e2e5e", "0.5rem"),
  look("aj-cybernetics-light", "AJ Cybernetics light", "Amber", "ajcybernetics-theme-1793173566868", "#f8f9fa", "#ffffff", "#0c0c1d", "#5c5f73", "#ea580c", "#c9892b", "#ff3d00", "#dfe6e9", "0.5rem"),
  look("rose-pine", "Rosé Pine", "Pink", "ros-pine", "#191724", "#1f1d2e", "#e0def4", "#908caa", "#c4a7e7", "#f6c177", "#eb6f92", "#403d52", "0.5rem"),
  look("openprofile-noir", "OpenProfile Noir", "Neutral", "openprofile-noir", "#1f1f1f", "#141414", "#f4f4f0", "#a3a3a3", "#ffef85", "#ffd873", "#ef4444", "#4a4a4a", "1.4rem"),
  look("openprofile-noir-light", "OpenProfile Noir light", "Neutral", "openprofile-noir", "#f4f4f0", "#fefefe", "#0e0e0e", "#545454", "#1a1a1a", "#c9892b", "#ef4444", "#4a4a4a", "1.25rem"),
  // Fresh 21st batch (distinct from the prior Discord / VS Code / etc. set).
  look("mint-signal", "Mint Signal", "Green", "mint-signal", "#000000", "#0a0a0a", "#f0f0f0", "#969696", "#51f0a8", "#ffb188", "#ff78a5", "#19191a", "1.4rem"),
  look("mint-signal-light", "Mint Signal light", "Green", "mint-signal", "#fdfdfd", "#fdfdfd", "#000000", "#525252", "#0d9f5d", "#c9892b", "#f54a88", "#ebebeb", "1.4rem"),
  look("pine-terminal", "Pine Terminal", "Green", "pine-terminal", "hsl(142, 15%, 4%)", "hsl(142, 15%, 6%)", "hsl(142, 35%, 75%)", "hsl(142, 20%, 55%)", "hsl(142, 40%, 45%)", "hsl(28, 50%, 45%)", "hsl(0, 50%, 45%)", "hsl(142, 15%, 15%)", "0rem", { mono: true, shadow: "3px 3px 0 rgba(0, 0, 0, 0.5)" }),
  look("pine-terminal-light", "Pine Terminal light", "Green", "pine-terminal", "hsl(142, 15%, 95%)", "hsl(142, 15%, 92%)", "hsl(142, 20%, 15%)", "hsl(142, 15%, 35%)", "hsl(142, 40%, 35%)", "hsl(28, 40%, 45%)", "hsl(0, 40%, 45%)", "hsl(142, 10%, 80%)", "0rem", { mono: true, shadow: "2px 2px 0 rgba(0, 0, 0, 0.12)" }),
  look("verdant-sky", "Verdant Sky", "Green", "verdant-sky", "#02080e", "#09131a", "#e9f0f5", "#85919a", "#2fbc5b", "#ff7f16", "#f22a36", "#202a32", "0.625rem"),
  look("verdant-sky-light", "Verdant Sky light", "Green", "verdant-sky", "#f3faff", "#ffffff", "#09131a", "#4c575f", "#00a33d", "#f46800", "#f22a36", "#d3e0ea", "0.75rem"),
  look("whatsapp", "WhatsApp", "Teal", "whatsapp", "#0b141a", "#1f2c34", "#e9edef", "#8696a0", "#00a884", "#f0893a", "#ea4335", "#2a3942", "1rem"),
  look("whatsapp-light", "WhatsApp light", "Teal", "whatsapp", "#f0f2f5", "#ffffff", "#111b21", "#667781", "#075e54", "#c9892b", "#ea4335", "#e9edef", "1rem"),
  look("teal-mist", "Teal Mist", "Teal", "teal-mist", "#030b0b", "#061415", "#e4edee", "#7a9596", "#00bba7", "#ffc677", "#f84b4b", "#142223", "0.5rem"),
  look("teal-mist-light", "Teal Mist light", "Teal", "teal-mist", "#f9fdff", "#ffffff", "#031a1e", "#50686d", "#00bba7", "#c9892b", "#ce514d", "#dae3e4", "0.5rem"),
  look("graphite-mono", "Graphite Mono", "Neutral", "graphite-mono", "#171717", "#141414", "#fafafa", "#a1a1a1", "#e5e5e5", "#f0893a", "#ff6467", "#262626", "1rem"),
  look("graphite-mono-light", "Graphite Mono light", "Neutral", "graphite-mono", "#ffffff", "#fdfdfd", "#0a0a0a", "#737373", "#171717", "#c9892b", "#e7000b", "#e5e5e5", "1rem"),
  look("coral-noir", "Coral Noir", "Neutral", "coral-noir", "#000000", "#000000", "#ffffff", "#a3a3a3", "#d6544b", "#e68933", "#d6544b", "#222222", "0rem"),
  look("coral-noir-light", "Coral Noir light", "Neutral", "coral-noir", "#ffffff", "#ffffff", "#1a1a1a", "#8a8a8a", "#1c1c1c", "#c9892b", "#ea1330", "#e5e5e5", "0rem"),
  look("slate-linen", "Slate Linen", "Neutral", "slate-linen", "#10100e", "#10100e", "#ffffe3", "#8c8c7d", "#ffffe3", "#d2691e", "#ef4444", "#606055", "0rem"),
  look("slate-linen-light", "Slate Linen light", "Neutral", "slate-linen", "#f5f5f5", "#ffffff", "#1a1a1a", "#666666", "#1a1a1a", "#d2691e", "#ef4444", "#cccccc", "0rem"),
  look("amber-minimal", "Amber Minimal", "Amber", "amber-minimal", "#171717", "#262626", "#e5e5e5", "#a3a3a3", "#f59e0b", "#d97706", "#ef4444", "#404040", "0.375rem"),
  look("amber-minimal-light", "Amber Minimal light", "Amber", "amber-minimal", "#ffffff", "#ffffff", "#262626", "#6b7280", "#d97706", "#b45309", "#ef4444", "#e5e7eb", "0.375rem"),
  look("ember-dawn", "Ember Dawn", "Amber", "ember-dawn", "#0a0a0a", "#121212", "#f0f0f0", "#969696", "#f2470c", "#f4cd0b", "#fb6a6a", "#1f1f1f", "1.4rem"),
  look("ember-dawn-light", "Ember Dawn light", "Amber", "ember-dawn", "#fdfdfd", "#fdfdfd", "#000000", "#525252", "#f2470c", "#fd822b", "#e54b4f", "#e7e7ee", "1.4rem"),
  look("solar-dusk", "Solar Dusk", "Amber", "solar-dusk", "#1c1917", "#292524", "#f5f5f4", "#a8a29e", "#f97316", "#eab308", "#dc2626", "#44403c", "0.3rem"),
  look("tangerine", "Tangerine", "Red", "tangerine", "#1c2433", "#2a3040", "#e5e5e5", "#a3a3a3", "#e05d38", "#e6a08f", "#ef4444", "#3d4354", "0.75rem"),
  look("tangerine-light", "Tangerine light", "Red", "tangerine", "#e8ebed", "#ffffff", "#333333", "#6b7280", "#e05d38", "#c9892b", "#ef4444", "#dcdfe2", "0.75rem"),
  look("scarlet-snow", "Scarlet Snow", "Red", "scarlet-snow", "#0a0a0a", "#18181b", "#fafafa", "#a1a1a1", "#fb2c36", "#f0893a", "#ff6467", "#404040", "0.5rem"),
  look("scarlet-snow-light", "Scarlet Snow light", "Red", "scarlet-snow", "#fafafa", "#fcfcfc", "#0a0a0a", "#62748e", "#fb2c36", "#c9892b", "#e7000b", "#e2e8f0", "0.5rem"),
  look("quantum-rose", "Quantum Rose", "Pink", "quantum-rose", "#1a0922", "#2a1435", "#ffb3ff", "#d67ad6", "#ff6bef", "#c359e3", "#ff2876", "#4a1b5f", "0.5rem"),
  look("quantum-rose-light", "Quantum Rose light", "Pink", "quantum-rose", "#fff0f8", "#fff7fc", "#91185c", "#c04283", "#e6067a", "#c44b97", "#d13869", "#ffc7e6", "0.5rem"),
  look("graphite-signal", "Graphite Signal", "Neutral", "hanzo-graphite-signal-1794566963149", "#1a1a1a", "#202020", "#d9d9d9", "#808080", "#dc2828", "#f0893a", "#e06666", "#353535", "0.375rem"),
  look("graphite-signal-light", "Graphite Signal light", "Neutral", "hanzo-graphite-signal-1794566963149", "#f0f0f0", "#f5f5f5", "#333333", "#666666", "#ba1c1c", "#c9892b", "#cc3333", "#d0d0d0", "0.35rem"),
  look("crimson-noir", "Crimson Noir", "Red", "hanzo-crimson-noir-1794566808897", "#000000", "#090909", "#ffffff", "#a4a4a4", "#ef4343", "#f0893a", "#ff5b5b", "#242424", "0.375rem"),
  look("crimson-noir-light", "Crimson Noir light", "Red", "hanzo-crimson-noir-1794566808897", "#fcfcfc", "#ffffff", "#000000", "#525252", "#dc2828", "#c9892b", "#e54b4f", "#e4e4e4", "0.5rem"),
  // Brand-inspired station looks (DNA from public brand guidelines / reputable refs). Discord & WhatsApp already live above as 21st picks.
  brand("spotify-night", "Spotify Night", "#191414", "#282828", "#ffffff", "#b3b3b3", "#1db954", "#f0b429", "#e5484d", "#3e3e3e", "0.5rem"),
  brand("twitch-purple", "Twitch Purple", "#0e0e10", "#1f1f23", "#f0f0ff", "#adadb8", "#9146ff", "#ffca5f", "#fc6675", "#2f2f35", "0.375rem"),
  brand("netflix-cinema", "Netflix Cinema", "#141414", "#221f1f", "#ffffff", "#808080", "#e50914", "#f0893a", "#b20710", "#3a3333", "0.25rem"),
  brand("youtube-signal", "YouTube Signal", "#0f0f0f", "#282828", "#ffffff", "#aaaaaa", "#ff0000", "#f0893a", "#cc0000", "#3f3f3f", "0.5rem"),
  brand("steam-storefront", "Steam Storefront", "#171a21", "#1b2838", "#c7d5e0", "#8f98a0", "#66c0f4", "#c6b037", "#c15755", "#2a475e", "0.25rem"),
  brand("nintendo-red", "Nintendo Red", "#1a1214", "#2a1a1c", "#ffffff", "#a8a0a2", "#e60012", "#f0b429", "#ff3c28", "#4a3034", "0.5rem"),
  brand("playstation-blue", "PlayStation Blue", "#121314", "#1c1e22", "#ffffff", "#adadad", "#0070cc", "#d53b00", "#e5484d", "#3a3c40", "0.75rem"),
  brand("xbox-green", "Xbox Green", "#0a0a0a", "#161616", "#ffffff", "#a0a0a0", "#107c10", "#9bf00b", "#e5484d", "#2e2e2e", "0.5rem"),
  brand("valorant-clutch", "Valorant Clutch", "#0f1923", "#1a2733", "#ece8e1", "#5a6672", "#ff4655", "#ffb84c", "#fa4454", "#2a3844", "0.25rem"),
  brand("blizzard-blue", "Blizzard Blue", "#0a0e14", "#121820", "#e8f4ff", "#8a9bb0", "#00b4ff", "#f0b429", "#e5484d", "#1e2a38", "0.5rem"),
  brand("slack-aubergine", "Slack Aubergine", "#1a0f1c", "#2a1830", "#f5eef6", "#b5a3b8", "#36c5f0", "#ecb22e", "#e01e5a", "#3d2742", "0.5rem", { shadow: "0 8px 24px rgba(74, 21, 75, 0.28)" }),
  brand("stripe-blurple", "Stripe Blurple", "#0a2540", "#0f3152", "#ffffff", "#8898aa", "#635bff", "#00d4aa", "#e5484d", "#1c3d5c", "0.5rem"),
  brand("figma-frame", "Figma Frame", "#111111", "#1c1c1c", "#f5f5f5", "#a3a3a3", "#a259ff", "#ff7237", "#ff3737", "#333333", "0.5rem"),
  brand("github-terminal", "GitHub Terminal", "#0d1117", "#161b22", "#e6edf3", "#8b949e", "#0fbf3e", "#d29922", "#f85149", "#30363d", "0.375rem", { mono: true }),
  brand("notion-ink", "Notion Ink", "#191919", "#252525", "#f7f6f3", "#9b9b9b", "#e3e2de", "#9f6b53", "#eb5757", "#3f3f3f", "0.5rem"),
  brand("apple-graphite", "Apple Graphite", "#1d1d1f", "#2c2c2e", "#f5f5f7", "#86868b", "#0071e3", "#ff9f0a", "#ff453a", "#424245", "0.75rem"),
  brand("microsoft-quad", "Microsoft Quad", "#111111", "#1f1f1f", "#ffffff", "#a3a3a3", "#00a4ef", "#ffb900", "#f25022", "#333333", "0.25rem"),
  brand("cola-red", "Cola Red", "#120808", "#1f1010", "#ffffff", "#b0a0a0", "#f40009", "#f0b429", "#c8102e", "#3a2020", "0.75rem"),
  brand("starbucks-siren", "Starbucks Siren", "#0c1612", "#15241c", "#f5faf7", "#8aa89a", "#00704a", "#cba258", "#e5484d", "#2a3f34", "1rem"),
  brand("nike-volt", "Nike Volt", "#111111", "#1a1a1a", "#ffffff", "#7e7e7e", "#c5ff00", "#fa5400", "#e5484d", "#2e2e2e", "0.25rem"),
  brand("adidas-court", "Adidas Court", "#0a0a0a", "#161616", "#ffffff", "#a0a0a0", "#0066b2", "#00a651", "#ef3340", "#2c2c2c", "0px"),
  brand("ikea-blue-yellow", "IKEA Blue Yellow", "#0a1520", "#122033", "#ffffff", "#8fa3b8", "#0058a3", "#ffda1a", "#cc0008", "#1e3348", "0.25rem"),
  brand("golden-arch", "Golden Arch", "#1a160c", "#27210f", "#fff8e7", "#b0a078", "#ffc72c", "#ffb000", "#da291c", "#3d3420", "0.75rem"),
  brand("tiktok-dual", "TikTok Dual", "#010101", "#161823", "#ffffff", "#a0a0a8", "#25f4ee", "#fe2c55", "#fe2c55", "#2a2c38", "0.5rem"),
  brand("hulu-night", "Hulu Night", "#040405", "#1b1f23", "#ffffff", "#8a9096", "#1ce783", "#f0b429", "#e5484d", "#2c3238", "0.5rem"),
  brand("amazon-smile", "Amazon Smile", "#131921", "#232f3e", "#ffffff", "#aab7c4", "#ff9900", "#f0b429", "#e5484d", "#37475a", "0.5rem"),
  brand("linkedin-navy", "LinkedIn Navy", "#0a1219", "#121c27", "#ffffff", "#8a9aab", "#0a66c2", "#70b5f9", "#e5484d", "#1e2d3d", "0.5rem"),
  brand("airbnb-coral", "Airbnb Coral", "#1a1212", "#261a1a", "#ffffff", "#a89898", "#ff5a5f", "#fc642d", "#e5484d", "#3d2a2a", "0.75rem"),
];

export const CATALOG: ThemeDef[] = LOOKS.map(withFont);

/** Every locked preset (see lookAccess.ts): catalogue looks after the first 30, then the gated ones outside the catalogue. */
export const LOCKED_IDS: ReadonlySet<string> = new Set(lockedIdsOf(CATALOG.map((t) => t.id), UNLOCKABLES.map((t) => t.id)));
export const LOCKED_PRESETS: ThemeDef[] = [...CATALOG, ...UNLOCKABLES].filter((t, i, all) => LOCKED_IDS.has(t.id) && all.findIndex((x) => x.id === t.id) === i);
export const FREE_COUNT = CATALOG.length - LOCKED_PRESETS.filter((t) => CATALOG.some((c) => c.id === t.id)).length;

export const THEME_GROUPS =["All", ...Array.from(new Set(CATALOG.map((t) => t.group)))];

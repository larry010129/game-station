import type { Palette, ThemeDef } from "./palette";

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

export const CHARCOAL: ThemeDef = {
  id: "charcoal",
  name: "Charcoal",
  author: "Command Station",
  group: "Station",
  source: "station",
  palette: null,
};

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

export const CATALOG: ThemeDef[] = [
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
];

export const THEME_GROUPS = ["All", ...Array.from(new Set(CATALOG.map((t) => t.group)))];

import { lockedIdsOf } from "./lookAccess.ts";
import { BRAND_TAGS, validTags } from "../content/brandTags.ts";
import { isRainbowThemeId } from "./gachaContent.ts";
import type { FontKey, Palette, ThemeDef, ThemeStatus } from "./palette.ts";

export type { ThemeStatus };

/**
 * Local demo: the first two Brand looks, and two Taiwan Region looks (an East Asia week), are Available so the
 * Brand and Region Packs can be exercised offline.
 * Every other Brand look stays Hidden until a content release announces it.
 * Engine agent: Brand themes are only drawable / prism-pickable from the Brand Pack — never Credits or weekly pick.
 */
export const DEMO_AVAILABLE_BRAND_IDS: readonly string[] = ["spotify-night", "twitch-purple", "asus-tw", "acer-tw"];

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
  "uber-black": "Uber",
  "robinhood-green": "Robinhood",
  "revolut-midnight": "Revolut",
  "shopify-commerce": "Shopify",
  "arc-violet": "Arc",
  "vercel-void": "Vercel",
  "linear-orbit": "Linear",
  "hermes-orange": "Hermès",
  "redbull-charge": "Red Bull",
  "google-spectrum": "Google",
  "tesla-circuit": "Tesla",
  "nasa-mission": "NASA",
  "ferrari-rosso": "Ferrari",
  "reddit-orangered": "Reddit",
  "epic-games-vault": "Epic Games",
  "riot-red": "Riot Games",
  "ubisoft-swirl": "Ubisoft",
  "ea-pulse": "Electronic Arts",
  "sega-blue": "Sega",
  "roblox-studio": "Roblox",
  "razer-chroma": "Razer",
  "logitech-g": "Logitech",
  "steelseries-arctic": "SteelSeries",
  "corsair-sail": "Corsair",
  "nvidia-green": "NVIDIA",
  "amd-red": "AMD",
  "intel-blue": "Intel",
  "samsung-galaxy": "Samsung",
  "crunchyroll-orange": "Crunchyroll",
  "soundcloud-wave": "SoundCloud",
  "duolingo-owl": "Duolingo",
  "dropbox-blue": "Dropbox",
  "paypal-blue": "PayPal",
  "porsche-racing": "Porsche",
  "telegram-sky": "Telegram",
  "pinterest-pin": "Pinterest",
  "snapchat-ghost": "Snapchat",
  "coinbase-blue": "Coinbase",
  "bmw-m": "BMW",
  "square-enix-crystal": "Square Enix",
  "asus-tw": "ASUS",
  "acer-tw": "Acer",
  "msi-tw": "MSI",
  "htc-tw": "HTC",
  "mediatek-tw": "MediaTek",
  "sony-jp": "Sony",
  "toyota-jp": "Toyota",
  "honda-jp": "Honda",
  "rakuten-jp": "Rakuten",
  "line-jp": "LINE",
  "uniqlo-jp": "Uniqlo",
  "konami-jp": "Konami",
  "niconico-jp": "niconico",
  "lg-kr": "LG",
  "kakaotalk-kr": "KakaoTalk",
  "naver-kr": "Naver",
  "hyundai-kr": "Hyundai",
  "kia-kr": "Kia",
  "nexon-kr": "Nexon",
  "bilibili-cn": "Bilibili",
  "xiaomi-cn": "Xiaomi",
  "huawei-cn": "Huawei",
  "oneplus-cn": "OnePlus",
  "lenovo-cn": "Lenovo",
  "dji-cn": "DJI",
  "wechat-cn": "WeChat",
  "grab-sg": "Grab",
  "shopee-sg": "Shopee",
  "gojek-id": "Gojek",
  "airasia-my": "AirAsia",
  "flipkart-in": "Flipkart",
  "paytm-in": "Paytm",
  "zomato-in": "Zomato",
  "swiggy-in": "Swiggy",
  "jio-in": "Jio",
  "zoho-in": "Zoho",
  "emirates-ae": "Emirates",
  "qatarairways-qa": "Qatar Airways",
  "turkishairlines-tr": "Turkish Airlines",
  "etihadairways-ae": "Etihad Airways",
  "renault-fr": "Renault",
  "vodafone-gb": "Vodafone",
  "klarna-se": "Klarna",
  "ericsson-se": "Ericsson",
  "nokia-fi": "Nokia",
  "volvo-se": "Volvo",
  "monzo-gb": "Monzo",
  "mclaren-gb": "McLaren",
  "siemens-de": "Siemens",
  "sap-de": "SAP",
  "bosch-de": "Bosch",
  "volkswagen-de": "Volkswagen",
  "audi-de": "Audi",
  "mercedes-de": "Mercedes",
  "puma-de": "Puma",
  "dhl-de": "DHL",
  "zalando-de": "Zalando",
  "cdprojekt-pl": "CD Projekt",
  "jetbrains-cz": "JetBrains",
  "skoda-cz": "ŠKODA",
  "kaspersky-ru": "Kaspersky",
  "grammarly-ua": "Grammarly",
  "bitdefender-ro": "Bitdefender",
  "fiat-it": "Fiat",
  "ducati-it": "Ducati",
  "lamborghini-it": "Lamborghini",
  "maserati-it": "Maserati",
  "zara-es": "Zara",
  "glovo-es": "Glovo",
  "farfetch-pt": "FARFETCH",
  "mercadopago-ar": "Mercado Pago",
  "nubank-br": "Nubank",
  "ifood-br": "iFood",
  "picpay-br": "PicPay",
  "avianca-co": "avianca",
  "aeromexico-mx": "Aeroméxico",
  "andela-ng": "Andela",
  "ethiopianairlines-et": "Ethiopian Airlines",
  "canva-au": "Canva",
  "atlassian-au": "Atlassian",
  "afterpay-au": "Afterpay",
  "qantas-au": "Qantas",
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
  // Brand pool, second wave (40). Uber through Ferrari take their dark palettes from 21st.dev brand themes by
  // ibrandify (21st.dev/community/themes/<name>); the rest derive bg/card/border from the brand colour, with
  // the accent lifted until it reads on the dark station. All start Hidden; swap them into the 28 rotation slots in the CMS.
  brand("uber-black", "Uber Black", "#000000", "#1a1a1a", "#ffffff", "#999999", "#ffffff", "#f0b429", "#ff0000", "#404040", "0rem"),
  brand("robinhood-green", "Robinhood Green", "#000000", "#141414", "#ffffff", "#999999", "#00e600", "#ffbf00", "#ff0000", "#333333", "0.125rem"),
  brand("revolut-midnight", "Revolut Midnight", "#0a0c0f", "#14181f", "#fafafa", "#9da3af", "#00aaff", "#ffbf00", "#e83030", "#29303d", "1rem"),
  brand("shopify-commerce", "Shopify Commerce", "#171a1c", "#202527", "#f2f2f2", "#9da9af", "#00994d", "#e6ac00", "#e83030", "#394246", "0.5rem"),
  brand("arc-violet", "Arc Violet", "#1c1c22", "#25252d", "#f2f2f2", "#9d9daf", "#c285e0", "#ebb447", "#eb4747", "#393946", "1rem"),
  brand("vercel-void", "Vercel Void", "#000000", "#141414", "#ffffff", "#999999", "#ffffff", "#ffbf00", "#ff0000", "#333333", "0.25rem"),
  brand("linear-orbit", "Linear Orbit", "#131315", "#1d1d20", "#f2f2f2", "#94949e", "#9956f5", "#ff9500", "#e83030", "#2c2c30", "0.375rem"),
  brand("hermes-orange", "Hermès Orange", "#2b1f12", "#392918", "#ede7de", "#b8a994", "#f46a25", "#f0b429", "#e61919", "#634d36", "0.125rem"),
  brand("redbull-charge", "Red Bull Charge", "#0f1a2e", "#14223d", "#f0f1f5", "#a3adc2", "#f20d0d", "#ffbf00", "#f53d3d", "#263759", "0.125rem"),
  brand("google-spectrum", "Google Spectrum", "#1c1f22", "#25292d", "#e3e6e8", "#abb3ba", "#4387f4", "#ffc105", "#dc3848", "#3c4249", "1rem"),
  brand("tesla-circuit", "Tesla Circuit", "#000000", "#141414", "#cccccc", "#808080", "#cc0000", "#f0b429", "#ff1a1a", "#333333", "0rem"),
  brand("nasa-mission", "NASA Mission", "#000000", "#141414", "#ffffff", "#999999", "#dd3c57", "#5281e0", "#ff0000", "#404040", "0rem"),
  brand("ferrari-rosso", "Ferrari Rosso", "#0f0f0f", "#1a1a1a", "#fafafa", "#a6a6a6", "#f20d0d", "#ffd400", "#f54747", "#383838", "0.125rem"),
  brand("reddit-orangered", "Reddit Orangered", "#170f0c", "#231915", "#f4f1f0", "#b1a4a0", "#ff4500", "#f0b429", "#ff6b6b", "#3e2e28", "1rem"),
  brand("epic-games-vault", "Epic Games Vault", "#0c1217", "#151c23", "#f0f2f4", "#a0a8b1", "#0078f2", "#f0b429", "#e5484d", "#28333e", "0.375rem"),
  brand("riot-red", "Riot Red", "#170c0e", "#231517", "#f4f0f1", "#b1a0a3", "#eb0029", "#f0b429", "#ff6b6b", "#3e282c", "0.25rem"),
  brand("ubisoft-swirl", "Ubisoft Swirl", "#0c1117", "#151b23", "#f0f2f4", "#a0a7b1", "#0070ff", "#f0b429", "#e5484d", "#28323e", "0.5rem"),
  brand("ea-pulse", "EA Pulse", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ff4747", "#f0b429", "#ff6b6b", "#3e2828", "0.5rem"),
  brand("sega-blue", "Sega Blue", "#0c1417", "#151e23", "#f0f3f4", "#a0abb1", "#0089cf", "#f0b429", "#e5484d", "#28373e", "0.5rem"),
  brand("roblox-studio", "Roblox Studio", "#0c0f17", "#151823", "#f0f1f4", "#a0a3b1", "#335fff", "#f0b429", "#e5484d", "#282d3e", "0.75rem"),
  brand("razer-chroma", "Razer Chroma", "#0e170c", "#172315", "#f1f4f0", "#a2b1a0", "#44d62c", "#f0b429", "#e5484d", "#2b3e28", "0.25rem"),
  brand("logitech-g", "Logitech G", "#0c1417", "#151f23", "#f0f3f4", "#a0acb1", "#00b8fc", "#f0b429", "#e5484d", "#28383e", "0.5rem"),
  brand("steelseries-arctic", "SteelSeries Arctic", "#17100c", "#231915", "#f4f2f0", "#b1a5a0", "#ff5200", "#f0b429", "#ff6b6b", "#3e2f28", "0.375rem"),
  brand("corsair-sail", "Corsair Sail", "#17160c", "#232215", "#f4f4f0", "#b1afa0", "#f9e300", "#f0893a", "#e5484d", "#3e3c28", "0.25rem"),
  brand("nvidia-green", "NVIDIA Green", "#13170c", "#1e2315", "#f3f4f0", "#abb1a0", "#76b900", "#f0b429", "#e5484d", "#363e28", "0.25rem"),
  brand("amd-red", "AMD Red", "#170c0d", "#231515", "#f4f0f0", "#b1a0a0", "#ed1c24", "#f0b429", "#ff6b6b", "#3e2829", "0.25rem"),
  brand("intel-blue", "Intel Blue", "#0c1317", "#151d23", "#f0f3f4", "#a0aab1", "#0071c5", "#f0b429", "#e5484d", "#28353e", "0.5rem"),
  brand("samsung-galaxy", "Samsung Galaxy", "#0c0e17", "#151723", "#f0f1f4", "#a0a2b1", "#3952e6", "#f0b429", "#e5484d", "#282b3e", "1rem"),
  brand("crunchyroll-orange", "Crunchyroll Orange", "#17110c", "#231b15", "#f4f2f0", "#b1a7a0", "#f47521", "#f0b429", "#ff6b6b", "#3e3128", "0.5rem"),
  brand("soundcloud-wave", "SoundCloud Wave", "#17100c", "#231a15", "#f4f2f0", "#b1a5a0", "#ff5500", "#f0b429", "#ff6b6b", "#3e2f28", "0.375rem"),
  brand("duolingo-owl", "Duolingo Owl", "#11170c", "#1b2315", "#f2f4f0", "#a7b1a0", "#58cc02", "#f0b429", "#e5484d", "#313e28", "1rem"),
  brand("dropbox-blue", "Dropbox Blue", "#0c1117", "#151a23", "#f0f2f4", "#a0a6b1", "#0061ff", "#f0b429", "#e5484d", "#28303e", "0.5rem"),
  brand("paypal-blue", "PayPal Blue", "#0c1017", "#151a23", "#f0f2f4", "#a0a6b1", "#0056f2", "#f0b429", "#e5484d", "#28303e", "0.75rem"),
  brand("porsche-racing", "Porsche Racing", "#170c0e", "#231517", "#f4f0f1", "#b1a0a2", "#d5001c", "#f0b429", "#ff6b6b", "#3e282b", "0.25rem"),
  brand("telegram-sky", "Telegram Sky", "#0c1417", "#151f23", "#f0f3f4", "#a0abb1", "#26a5e4", "#f0b429", "#e5484d", "#28373e", "0.75rem"),
  brand("pinterest-pin", "Pinterest Pin", "#170c0e", "#231516", "#f4f0f1", "#b1a0a2", "#cc091e", "#f0b429", "#ff6b6b", "#3e282a", "1rem"),
  brand("snapchat-ghost", "Snapchat Ghost", "#17170c", "#232315", "#f4f4f0", "#b1b1a0", "#fffc00", "#f0893a", "#e5484d", "#3e3e28", "1rem"),
  brand("coinbase-blue", "Coinbase Blue", "#0c1017", "#151923", "#f0f2f4", "#a0a5b1", "#0052ff", "#f0b429", "#e5484d", "#282f3e", "0.75rem"),
  brand("bmw-m", "BMW M", "#0c1317", "#151d23", "#f0f3f4", "#a0aab1", "#006fc0", "#f0b429", "#e5484d", "#28353e", "0.25rem"),
  brand("square-enix-crystal", "Square Enix Crystal", "#0c1217", "#151c23", "#f0f2f4", "#a0a9b1", "#3aa0ff", "#f0b429", "#e5484d", "#28333e", "0.25rem"),
  // Region Pack companies (82): regional brands tagged by country and region in content/brandTags.ts. Palettes derive from
  // the brand colour like the second wave. With the 68 above, the company library is 150. All start Hidden.
  brand("asus-tw", "ASUS Azure", "#0c1217", "#151d23", "#f0f2f4", "#a0a9b1", "#006cc9", "#f0b429", "#e5484d", "#28343e", "1rem"),
  brand("acer-tw", "Acer Lime", "#14170c", "#1e2315", "#f3f4f0", "#abb1a0", "#83b81a", "#f0b429", "#e5484d", "#373e28", "1rem"),
  brand("msi-tw", "MSI Crimson", "#170c0e", "#231516", "#f4f0f1", "#b1a0a2", "#e2001a", "#f0b429", "#ff6b6b", "#3e282a", "0.75rem"),
  brand("htc-tw", "HTC Lime", "#14170c", "#1f2315", "#f3f4f0", "#abb1a0", "#a5cf4c", "#f0b429", "#e5484d", "#373e28", "0.75rem"),
  brand("mediatek-tw", "MediaTek Ember", "#17120c", "#231d15", "#f4f2f0", "#b1a9a0", "#ec9430", "#f0893a", "#e5484d", "#3e3428", "0.75rem"),
  brand("sony-jp", "Sony Azure", "#0c1217", "#151d23", "#f0f2f4", "#a0a9b1", "#0072ce", "#f0b429", "#e5484d", "#28343e", "1rem"),
  brand("toyota-jp", "Toyota Crimson", "#170c0d", "#231516", "#f4f0f1", "#b1a0a1", "#eb0a1e", "#f0b429", "#ff6b6b", "#3e282a", "0.375rem"),
  brand("honda-jp", "Honda Crimson", "#170c0e", "#231517", "#f4f0f1", "#b1a0a2", "#e40521", "#f0b429", "#ff6b6b", "#3e282b", "0.25rem"),
  brand("rakuten-jp", "Rakuten Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ce0000", "#f0b429", "#ff6b6b", "#3e2828", "0.5rem"),
  brand("line-jp", "LINE Jade", "#0c170c", "#152315", "#f0f4f0", "#a0b1a0", "#00c300", "#f0b429", "#e5484d", "#283e28", "1rem"),
  brand("uniqlo-jp", "Uniqlo Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ff0000", "#f0b429", "#ff6b6b", "#3e2828", "0.375rem"),
  brand("konami-jp", "Konami Crimson", "#170c0e", "#231516", "#f4f0f1", "#b1a0a2", "#d50017", "#f0b429", "#ff6b6b", "#3e282a", "0.375rem"),
  brand("niconico-jp", "niconico Ember", "#17120c", "#231c15", "#f4f2f0", "#b1a8a0", "#ff7a00", "#f0b429", "#ff6b6b", "#3e3328", "0.75rem"),
  brand("lg-kr", "LG Orchid", "#170c10", "#231519", "#f4f0f2", "#b1a0a5", "#d30042", "#f0b429", "#ff6b6b", "#3e282f", "0.5rem"),
  brand("kakaotalk-kr", "KakaoTalk Amber", "#17150c", "#232015", "#f4f3f0", "#b1aea0", "#ffcd00", "#f0893a", "#e5484d", "#3e3a28", "1rem"),
  brand("naver-kr", "Naver Jade", "#0c1711", "#15231b", "#f0f4f2", "#a0b1a7", "#03c75a", "#f0b429", "#e5484d", "#283e32", "0.25rem"),
  brand("hyundai-kr", "Hyundai Cobalt", "#0c1217", "#151c23", "#f0f2f4", "#a0a8b1", "#0065d8", "#f0b429", "#e5484d", "#28323e", "0.5rem"),
  brand("kia-kr", "Kia Crimson", "#170c0e", "#231517", "#f4f0f1", "#b1a0a2", "#c9182e", "#f0b429", "#ff6b6b", "#3e282b", "0.75rem"),
  brand("nexon-kr", "Nexon Azure", "#0c1317", "#151e23", "#f0f3f4", "#a0aab1", "#0072bc", "#f0b429", "#e5484d", "#28353e", "0.25rem"),
  brand("bilibili-cn", "Bilibili Azure", "#0c1517", "#152023", "#f0f3f4", "#a0adb1", "#00a1d6", "#f0b429", "#e5484d", "#28393e", "0.75rem"),
  brand("xiaomi-cn", "Xiaomi Ember", "#17110c", "#231b15", "#f4f2f0", "#b1a7a0", "#ff6900", "#f0b429", "#ff6b6b", "#3e3128", "0.375rem"),
  brand("huawei-cn", "Huawei Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ff0000", "#f0b429", "#ff6b6b", "#3e2828", "0.375rem"),
  brand("oneplus-cn", "OnePlus Crimson", "#170c0d", "#231515", "#f4f0f1", "#b1a0a0", "#f5010c", "#f0b429", "#ff6b6b", "#3e2829", "0.5rem"),
  brand("lenovo-cn", "Lenovo Crimson", "#170d0c", "#231515", "#f4f1f0", "#b1a0a0", "#e2231a", "#f0b429", "#ff6b6b", "#3e2928", "0.375rem"),
  brand("dji-cn", "DJI Cobalt", "#0c1117", "#151b23", "#f0f2f4", "#a0a7b1", "#1b75e8", "#f0b429", "#e5484d", "#28323e", "0.75rem"),
  brand("wechat-cn", "WeChat Jade", "#0c1712", "#15231c", "#f0f4f2", "#a0b1a8", "#07c160", "#f0b429", "#e5484d", "#283e33", "0.375rem"),
  brand("grab-sg", "Grab Jade", "#0c1711", "#15231b", "#f0f4f2", "#a0b1a7", "#00b14f", "#f0b429", "#e5484d", "#283e32", "1rem"),
  brand("shopee-sg", "Shopee Crimson", "#170e0c", "#231715", "#f4f1f0", "#b1a3a0", "#ee4d2d", "#f0b429", "#ff6b6b", "#3e2c28", "0.375rem"),
  brand("gojek-id", "Gojek Jade", "#0c170e", "#152316", "#f0f4f1", "#a0b1a2", "#00aa13", "#f0b429", "#e5484d", "#283e2a", "0.25rem"),
  brand("airasia-my", "AirAsia Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ff0000", "#f0b429", "#ff6b6b", "#3e2828", "0.5rem"),
  brand("flipkart-in", "Flipkart Cobalt", "#0c1117", "#151a23", "#f0f2f4", "#a0a6b1", "#2874f0", "#f0b429", "#e5484d", "#28303e", "0.75rem"),
  brand("paytm-in", "Paytm Cobalt", "#0c0f17", "#151823", "#f0f1f4", "#a0a4b1", "#4062c6", "#f0b429", "#e5484d", "#282d3e", "0.25rem"),
  brand("zomato-in", "Zomato Crimson", "#170c0d", "#231516", "#f4f0f1", "#b1a0a1", "#e23744", "#f0b429", "#ff6b6b", "#3e2829", "0.375rem"),
  brand("swiggy-in", "Swiggy Ember", "#17110c", "#231b15", "#f4f2f0", "#b1a7a0", "#fc8019", "#f0b429", "#ff6b6b", "#3e3228", "0.375rem"),
  brand("jio-in", "Jio Cobalt", "#0c0f17", "#151823", "#f0f1f4", "#a0a4b1", "#2a5aef", "#f0b429", "#e5484d", "#282d3e", "0.75rem"),
  brand("zoho-in", "Zoho Crimson", "#170c0d", "#231515", "#f4f0f0", "#b1a0a0", "#e42527", "#f0b429", "#ff6b6b", "#3e2828", "1rem"),
  brand("emirates-ae", "Emirates Crimson", "#170c0d", "#231515", "#f4f0f0", "#b1a0a0", "#d71921", "#f0b429", "#ff6b6b", "#3e2829", "0.75rem"),
  brand("qatarairways-qa", "Qatar Airways Orchid", "#170c12", "#23151c", "#f4f0f2", "#b1a0a8", "#c71c71", "#f0b429", "#ff6b6b", "#3e2833", "0.5rem"),
  brand("turkishairlines-tr", "Turkish Airlines Crimson", "#170c0d", "#231515", "#f4f0f0", "#b1a0a0", "#d60b0d", "#f0b429", "#ff6b6b", "#3e2828", "0.25rem"),
  brand("etihadairways-ae", "Etihad Airways Amber", "#17140c", "#231f15", "#f4f3f0", "#b1aca0", "#bd8b13", "#f0893a", "#e5484d", "#3e3828", "0.75rem"),
  brand("renault-fr", "Renault Amber", "#17150c", "#232015", "#f4f3f0", "#b1ada0", "#ffcc33", "#f0893a", "#e5484d", "#3e3928", "0.5rem"),
  brand("vodafone-gb", "Vodafone Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#e60000", "#f0b429", "#ff6b6b", "#3e2828", "0.75rem"),
  brand("klarna-se", "Klarna Orchid", "#170c0f", "#231519", "#f4f0f1", "#b1a0a4", "#ffb3c7", "#f0b429", "#ff6b6b", "#3e282e", "0.375rem"),
  brand("ericsson-se", "Ericsson Azure", "#0c1217", "#151d23", "#f0f2f4", "#a0a9b1", "#0082f0", "#f0b429", "#e5484d", "#28343e", "0.75rem"),
  brand("nokia-fi", "Nokia Cobalt", "#0c1017", "#151a23", "#f0f2f4", "#a0a6b1", "#005aff", "#f0b429", "#e5484d", "#28303e", "0.25rem"),
  brand("volvo-se", "Volvo Azure", "#0c1217", "#151d23", "#f0f2f4", "#a0a9b1", "#006bc2", "#f0b429", "#e5484d", "#28343e", "0.25rem"),
  brand("monzo-gb", "Monzo Cobalt", "#0c1117", "#151a23", "#f0f2f4", "#a0a6b1", "#3a66af", "#f0b429", "#e5484d", "#28303e", "0.25rem"),
  brand("mclaren-gb", "McLaren Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ff0000", "#f0b429", "#ff6b6b", "#3e2828", "0.5rem"),
  brand("siemens-de", "Siemens Teal", "#0c1717", "#152323", "#f0f4f4", "#a0b1b1", "#009999", "#f0b429", "#e5484d", "#283e3e", "0.5rem"),
  brand("sap-de", "SAP Azure", "#0c1317", "#151e23", "#f0f3f4", "#a0abb1", "#0faaff", "#f0b429", "#e5484d", "#28363e", "0.75rem"),
  brand("bosch-de", "Bosch Crimson", "#170c0e", "#231516", "#f4f0f1", "#b1a0a1", "#ea0016", "#f0b429", "#ff6b6b", "#3e282a", "0.25rem"),
  brand("volkswagen-de", "Volkswagen Cobalt", "#0c0e17", "#151723", "#f0f1f4", "#a0a2b1", "#4559d5", "#f0b429", "#e5484d", "#282b3e", "0.25rem"),
  brand("audi-de", "Audi Crimson", "#170c0f", "#231518", "#f4f0f1", "#b1a0a3", "#ca0b34", "#f0b429", "#ff6b6b", "#3e282d", "1rem"),
  brand("mercedes-de", "Mercedes Azure", "#0c1417", "#151f23", "#f0f3f4", "#a0acb1", "#00adef", "#f0b429", "#e5484d", "#28383e", "0.75rem"),
  brand("puma-de", "Puma Crimson", "#170c0e", "#231516", "#f4f0f1", "#b1a0a2", "#e2001a", "#f0b429", "#ff6b6b", "#3e282a", "1rem"),
  brand("dhl-de", "DHL Amber", "#17150c", "#232015", "#f4f3f0", "#b1aea0", "#ffcc00", "#f0893a", "#e5484d", "#3e3a28", "0.75rem"),
  brand("zalando-de", "Zalando Ember", "#17110c", "#231b15", "#f4f2f0", "#b1a7a0", "#ff6900", "#f0b429", "#ff6b6b", "#3e3128", "0.5rem"),
  brand("cdprojekt-pl", "CD Projekt Crimson", "#170c0d", "#231515", "#f4f0f0", "#b1a0a0", "#dc0d15", "#f0b429", "#ff6b6b", "#3e2829", "1rem"),
  brand("jetbrains-cz", "JetBrains Ember", "#17110c", "#231b15", "#f4f2f0", "#b1a7a0", "#fc801d", "#f0b429", "#ff6b6b", "#3e3228", "1rem"),
  brand("skoda-cz", "ŠKODA Teal", "#0c1715", "#152320", "#f0f4f3", "#a0b1ad", "#1d7861", "#f0b429", "#e5484d", "#283e39", "0.25rem"),
  brand("kaspersky-ru", "Kaspersky Teal", "#0c1716", "#152321", "#f0f4f4", "#a0b1ae", "#007c69", "#f0b429", "#e5484d", "#283e3b", "1rem"),
  brand("grammarly-ua", "Grammarly Teal", "#0c1716", "#152322", "#f0f4f4", "#a0b1af", "#027e6f", "#f0b429", "#e5484d", "#283e3c", "1rem"),
  brand("bitdefender-ro", "Bitdefender Crimson", "#170c0d", "#231515", "#f4f0f0", "#b1a0a0", "#ed1c24", "#f0b429", "#ff6b6b", "#3e2829", "0.375rem"),
  brand("fiat-it", "Fiat Crimson", "#170d0c", "#231515", "#f4f1f0", "#b1a0a0", "#cb2017", "#f0b429", "#ff6b6b", "#3e2928", "1rem"),
  brand("ducati-it", "Ducati Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#cc0000", "#f0b429", "#ff6b6b", "#3e2828", "0.375rem"),
  brand("lamborghini-it", "Lamborghini Amber", "#17150c", "#232015", "#f4f3f0", "#b1ada0", "#ddb321", "#f0893a", "#e5484d", "#3e3928", "0.375rem"),
  brand("maserati-it", "Maserati Cobalt", "#0c1117", "#151b23", "#f0f2f4", "#a0a7b1", "#2469c1", "#f0b429", "#e5484d", "#28323e", "0.75rem"),
  brand("zara-es", "Zara Amber", "#17140c", "#231f15", "#f4f3f0", "#b1aba0", "#c8a96a", "#f0893a", "#e5484d", "#3e3728", "1rem"),
  brand("glovo-es", "Glovo Amber", "#17150c", "#232015", "#f4f3f0", "#b1ada0", "#f2cc38", "#f0893a", "#e5484d", "#3e3a28", "0.25rem"),
  brand("farfetch-pt", "FARFETCH Graphite", "#121212", "#1c1c1c", "#f2f2f2", "#a8a8a8", "#a2a2a2", "#f0b429", "#e5484d", "#333333", "0.75rem"),
  brand("mercadopago-ar", "Mercado Pago Azure", "#0c1517", "#152023", "#f0f3f4", "#a0adb1", "#00b1ea", "#f0b429", "#e5484d", "#28393e", "0.375rem"),
  brand("nubank-br", "Nubank Violet", "#130c17", "#1e1523", "#f3f0f4", "#aaa0b1", "#940bee", "#f0b429", "#e5484d", "#35283e", "0.375rem"),
  brand("ifood-br", "iFood Crimson", "#170c0d", "#231516", "#f4f0f1", "#b1a0a1", "#ea1d2c", "#f0b429", "#ff6b6b", "#3e2829", "0.25rem"),
  brand("picpay-br", "PicPay Jade", "#0c1711", "#15231a", "#f0f4f2", "#a0b1a6", "#21c25e", "#f0b429", "#e5484d", "#283e30", "0.375rem"),
  brand("avianca-co", "avianca Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#ff0000", "#f0b429", "#ff6b6b", "#3e2828", "0.5rem"),
  brand("aeromexico-mx", "Aeroméxico Cobalt", "#0c1117", "#151b23", "#f0f2f4", "#a0a7b1", "#2168c6", "#f0b429", "#e5484d", "#28313e", "0.25rem"),
  brand("andela-ng", "Andela Cobalt", "#0c0f17", "#151823", "#f0f1f4", "#a0a3b1", "#3359df", "#f0b429", "#e5484d", "#282d3e", "0.375rem"),
  brand("ethiopianairlines-et", "Ethiopian Airlines Lime", "#14170c", "#1e2315", "#f3f4f0", "#abb1a0", "#648b1a", "#f0b429", "#e5484d", "#363e28", "0.5rem"),
  brand("canva-au", "Canva Teal", "#0c1717", "#152323", "#f0f4f4", "#a0b0b1", "#00c4cc", "#f0b429", "#e5484d", "#283d3e", "0.25rem"),
  brand("atlassian-au", "Atlassian Cobalt", "#0c1117", "#151b23", "#f0f2f4", "#a0a7b1", "#005eeb", "#f0b429", "#e5484d", "#28313e", "1rem"),
  brand("afterpay-au", "Afterpay Teal", "#0c1714", "#15231f", "#f0f4f3", "#a0b1ab", "#b2fce4", "#f0b429", "#e5484d", "#283e37", "0.75rem"),
  brand("qantas-au", "Qantas Crimson", "#170c0c", "#231515", "#f4f0f0", "#b1a0a0", "#e40000", "#f0b429", "#ff6b6b", "#3e2828", "0.375rem"),
];

/** Default: Brand → Hidden (except DEMO_AVAILABLE_BRAND_IDS); everything else → Available. */
function withStatus(t: ThemeDef): ThemeDef {
  if (t.status) return t;
  if (t.group === "Brand") {
    return { ...t, status: DEMO_AVAILABLE_BRAND_IDS.includes(t.id) ? "Available" : "Hidden" };
  }
  return { ...t, status: "Available" };
}

/** Company themes carry their pack / country / region tags from content/brandTags.ts. */
function withTags(t: ThemeDef): ThemeDef {
  if (t.tags || t.group !== "Brand") return t;
  const tags = BRAND_TAGS[t.id];
  return tags ? { ...t, tags } : t;
}

/** Bundled baseline (offline / no CMS themes in the applied release). */
export const CATALOG: ThemeDef[] = LOOKS.map(withFont).map(withStatus).map(withTags);

const BUNDLED_BY_ID = new Map(CATALOG.map((t) => [t.id, t]));

/** Every locked preset (see lookAccess.ts): catalogue looks after the first 30, then the gated ones outside the catalogue. */
export const LOCKED_IDS: ReadonlySet<string> = new Set(lockedIdsOf(CATALOG.map((t) => t.id), UNLOCKABLES.map((t) => t.id)));
export const LOCKED_PRESETS: ThemeDef[] = [...CATALOG, ...UNLOCKABLES].filter((t, i, all) => LOCKED_IDS.has(t.id) && all.findIndex((x) => x.id === t.id) === i);
export const FREE_COUNT = CATALOG.length - LOCKED_PRESETS.filter((t) => CATALOG.some((c) => c.id === t.id)).length;

const FONT_KEYS: ReadonlySet<string> = new Set(["inter", "grotesk", "jakarta", "serif", "mono", "system"]);
const STATUS_KEYS: ReadonlySet<string> = new Set(["Hidden", "Available", "Archived"]);

let liveCatalog: ThemeDef[] | null = null;
let catalogVersion = 0;
const catalogListeners = new Set<() => void>();

function notifyCatalog(): void {
  catalogVersion += 1;
  for (const listener of catalogListeners) listener();
}

/** Subscribe to live catalog swaps (CMS release apply / hydrate / clear). */
export function subscribeThemeCatalog(onStoreChange: () => void): () => void {
  catalogListeners.add(onStoreChange);
  return () => {
    catalogListeners.delete(onStoreChange);
  };
}

export function getThemeCatalogVersion(): number {
  return catalogVersion;
}

function parsePalette(raw: unknown, fallback: Palette | null): Palette | null {
  if (raw === null) return null;
  if (!raw || typeof raw !== "object") return fallback;
  const p = raw as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const bg = str("bg");
  const text = str("text");
  const accent = str("accent");
  if (!bg || !text || !accent) return fallback;
  const font = typeof p.font === "string" && FONT_KEYS.has(p.font) ? (p.font as FontKey) : undefined;
  return {
    bg,
    card: str("card") || bg,
    text,
    muted: str("muted") || text,
    accent,
    caution: str("caution") || "#f0893a",
    alert: str("alert") || "#e5484d",
    border: str("border") || accent,
    radius: str("radius") || "0.5rem",
    shadow: typeof p.shadow === "string" ? p.shadow : undefined,
    font: font ?? (p.mono === true ? "mono" : undefined),
    mono: p.mono === true,
  };
}

/**
 * CMS theme → ThemeDef. Keeps bundled author/url/colour-group when the id is known;
 * Brand|Regular from the release decide Brand vs not.
 */
export function parseReleaseTheme(raw: unknown): ThemeDef | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || !t.id.trim()) return null;
  if (typeof t.name !== "string" || !t.name.trim()) return null;
  const id = t.id.trim();
  const base = BUNDLED_BY_ID.get(id) ?? UNLOCKABLES.find((u) => u.id === id);
  const cmsGroup = typeof t.group === "string" ? t.group : "Regular";
  const group =
    cmsGroup === "Brand"
      ? "Brand"
      : base && base.group !== "Brand"
        ? base.group
        : cmsGroup === "Regular"
          ? "Regular"
          : cmsGroup;
  const status =
    typeof t.status === "string" && STATUS_KEYS.has(t.status) ? (t.status as ThemeStatus) : base?.status;
  const palette = parsePalette(t.palette, base?.palette ?? null);
  const def: ThemeDef = {
    id,
    name: t.name.trim().slice(0, 80),
    author: base?.author ?? (group === "Brand" ? (COMPANY[id] ?? "Command Station") : "Command Station"),
    group,
    source: base?.source ?? "station",
    url: base?.url,
    palette,
    status,
    tags: group === "Brand" ? (validTags(t.tags) ? t.tags : base?.tags) : undefined,
  };
  return withTags(withFont(withStatus(def)));
}

/** Replace listed catalog from a non-empty release `themes` array; empty/missing keeps bundled. Owned unlocks stay in local storage. */
export function setReleaseThemes(raw: unknown[] | null | undefined): void {
  if (!raw?.length) {
    if (liveCatalog != null) {
      liveCatalog = null;
      notifyCatalog();
    }
    return;
  }
  const next: ThemeDef[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    const parsed = parseReleaseTheme(row);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    next.push(parsed);
  }
  if (!next.length) {
    if (liveCatalog != null) {
      liveCatalog = null;
      notifyCatalog();
    }
    return;
  }
  liveCatalog = next;
  notifyCatalog();
}

/** Tests / factory reset: drop CMS overlay. */
export function clearReleaseThemes(): void {
  if (liveCatalog == null) return;
  liveCatalog = null;
  notifyCatalog();
}

/** Live catalog (release overlay) or bundled CATALOG. */
export function getCatalog(): ThemeDef[] {
  return liveCatalog ?? CATALOG;
}

/** Unlockables not already present in the live catalog (e.g. Nightsteel when CMS lists it). */
export function getExtraUnlockables(): ThemeDef[] {
  const ids = new Set(getCatalog().map((t) => t.id));
  return UNLOCKABLES.filter((u) => !ids.has(u.id));
}

/** Catalog + gated unlockables (deduped). */
export function getListedPresets(): ThemeDef[] {
  return [...getCatalog(), ...getExtraUnlockables()];
}

export function getLockedIds(): ReadonlySet<string> {
  const catalog = getCatalog();
  return new Set(lockedIdsOf(catalog.map((t) => t.id), getExtraUnlockables().map((t) => t.id)));
}

export function getLockedPresets(): ThemeDef[] {
  const locked = getLockedIds();
  return getListedPresets().filter((t) => locked.has(t.id));
}

export function getThemeGroups(): string[] {
  const visible = Array.from(new Set(getCatalog().filter((t) => themeStatus(t) !== "Hidden").map((t) => t.group)));
  return ["All", ...visible];
}

export function getFreeCount(): number {
  const catalog = getCatalog();
  const lockedInCatalog = getLockedPresets().filter((t) => catalog.some((c) => c.id === t.id)).length;
  return catalog.length - lockedInCatalog;
}

/** Catalog themes already carry status via withStatus; fallback for modules / unlockables. */
export function themeStatus(t: ThemeDef): ThemeStatus {
  return t.status ?? "Available";
}

export function isBrandTheme(t: ThemeDef): boolean {
  return t.group === "Brand";
}

/** Themes page / pickers: Hidden never appears unless already owned. */
export function isListedTheme(t: ThemeDef, owned: boolean): boolean {
  if (t.source === "yours") return true;
  const s = themeStatus(t);
  if (s === "Hidden") return owned;
  return true;
}

/** Regular Pack + Brand Pack look rows: only Available locked presets. Brand Pack further restricts Brand to the fortnight feature set (engine). */
export function isDrawableTheme(t: ThemeDef): boolean {
  return themeStatus(t) === "Available" && getLockedIds().has(t.id);
}

/** Rainbow (5-star) Regular theme: draw-only, in the Regular Pack's rainbow row and a company pack's lost 50/50. */
export function isRainbowTheme(t: ThemeDef): boolean {
  return !isBrandTheme(t) && isRainbowThemeId(t.id);
}

/**
 * Credits unlock, weekly pick and Regular crystal pick: Available, locked, not Brand and not rainbow. Brand looks come
 * only from company packs, rainbow Regular themes only from draws.
 */
export function isCreditBuyableTheme(t: ThemeDef): boolean {
  return isDrawableTheme(t) && !isBrandTheme(t) && !isRainbowTheme(t);
}

/** Drawable pool ids for the engine agent (Available locked only). Filter Brand vs Regular with isBrandTheme. */
export function listDrawableThemes(): ThemeDef[] {
  return getLockedPresets().filter(isDrawableTheme);
}

/** Bundled release notes stub when no CMS release has been applied yet. */
export const CONTENT_CHANGELOG: readonly { id: string; title: string; body: string }[] = [
  {
    id: "bundled-availability",
    title: "Theme availability",
    body: "Looks can be Hidden, Available, or Archived. Past themes lists what left the shop; Brand looks stay Hidden until announced (Spotify Night and Twitch Purple are Available for local demo).",
  },
];

const visibleGroups = Array.from(
  new Set(CATALOG.filter((t) => themeStatus(t) !== "Hidden").map((t) => t.group)),
);
export const THEME_GROUPS = ["All", ...visibleGroups];

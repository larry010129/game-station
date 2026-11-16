/**
 * Pack, country and region tags for every company (Brand-group) theme. A theme is in a pack when its tags name it:
 * "brand" puts it in the Brand Pack rotation, "region" lets a Region Pack week feature it.
 * Region keys follow continents, with Europe and Asia split into four parts each (Nordic countries sit in West Europe).
 */
export type PackTag = "brand" | "region";

export type RegionKey =
  | "na"
  | "latam"
  | "eu-west"
  | "eu-central"
  | "eu-east"
  | "eu-south"
  | "asia-east"
  | "asia-southeast"
  | "asia-south"
  | "asia-west"
  | "africa"
  | "oceania";

export interface ThemeTags {
  packs: readonly PackTag[];
  /** ISO 3166-1 alpha-2, upper case. */
  country: string;
  region: RegionKey;
}

/** `short` is the code a theme's tag shows next to its country (gaming-style region codes). */
export const REGIONS: Record<RegionKey, { name: string; short: string; continent: string }> = {
  na: { name: "North America", short: "NA", continent: "North America" },
  latam: { name: "South America", short: "SA", continent: "South America" },
  "eu-west": { name: "West Europe", short: "EUW", continent: "Europe" },
  "eu-central": { name: "Central Europe", short: "EUC", continent: "Europe" },
  "eu-east": { name: "East Europe", short: "EUE", continent: "Europe" },
  "eu-south": { name: "South Europe", short: "EUS", continent: "Europe" },
  "asia-east": { name: "East Asia", short: "EA", continent: "Asia" },
  "asia-southeast": { name: "Southeast Asia", short: "SEA", continent: "Asia" },
  "asia-south": { name: "South Asia", short: "SAS", continent: "Asia" },
  "asia-west": { name: "West Asia (Middle East)", short: "ME", continent: "Asia" },
  africa: { name: "Africa", short: "AF", continent: "Africa" },
  oceania: { name: "Oceania", short: "OCE", continent: "Oceania" },
};

export const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];

export const COUNTRIES: Record<string, string> = {
  AE: "United Arab Emirates", AR: "Argentina", AT: "Austria", AU: "Australia", BR: "Brazil", CA: "Canada", CH: "Switzerland",
  CN: "China", CO: "Colombia", CZ: "Czechia", DE: "Germany", DK: "Denmark", ES: "Spain", ET: "Ethiopia", FI: "Finland",
  FR: "France", GB: "United Kingdom", ID: "Indonesia", IN: "India", IT: "Italy", JP: "Japan", KR: "South Korea", MX: "Mexico",
  MY: "Malaysia", NG: "Nigeria", PL: "Poland", PT: "Portugal", QA: "Qatar", RO: "Romania", RU: "Russia", SE: "Sweden",
  SG: "Singapore", TR: "Türkiye", TW: "Taiwan", UA: "Ukraine", US: "United States",
};

/** What a theme's tag shows: its country code and its region code, plus the full names for hover and screen readers. */
export function tagParts(tags: ThemeTags): { country: string; region: string; label: string } {
  const r = REGIONS[tags.region];
  const country = tags.country.toUpperCase();
  return {
    country,
    region: r?.short ?? tags.region,
    label: `${COUNTRIES[country] ?? country}, ${r?.name ?? tags.region}`,
  };
}

export function isRegionKey(v: unknown): v is RegionKey {
  return typeof v === "string" && v in REGIONS;
}

/** True when `raw` is a well-formed tag set (used for CMS release themes). */
export function validTags(raw: unknown): raw is ThemeTags {
  if (!raw || typeof raw !== "object") return false;
  const t = raw as ThemeTags;
  return (
    Array.isArray(t.packs) &&
    t.packs.every((p) => p === "brand" || p === "region") &&
    typeof t.country === "string" &&
    /^[A-Z]{2}$/.test(t.country) &&
    isRegionKey(t.region)
  );
}

/** The bundled tag table: the 68 Brand Pack themes first, then the 82 Region-only themes (150 in all). */
export const BRAND_TAGS: Record<string, ThemeTags> = {
  "spotify-night": { packs: ["brand", "region"], country: "SE", region: "eu-west" },
  "twitch-purple": { packs: ["brand", "region"], country: "US", region: "na" },
  "netflix-cinema": { packs: ["brand", "region"], country: "US", region: "na" },
  "youtube-signal": { packs: ["brand", "region"], country: "US", region: "na" },
  "steam-storefront": { packs: ["brand", "region"], country: "US", region: "na" },
  "nintendo-red": { packs: ["brand", "region"], country: "JP", region: "asia-east" },
  "playstation-blue": { packs: ["brand", "region"], country: "JP", region: "asia-east" },
  "xbox-green": { packs: ["brand", "region"], country: "US", region: "na" },
  "valorant-clutch": { packs: ["brand", "region"], country: "US", region: "na" },
  "blizzard-blue": { packs: ["brand", "region"], country: "US", region: "na" },
  "slack-aubergine": { packs: ["brand", "region"], country: "US", region: "na" },
  "stripe-blurple": { packs: ["brand", "region"], country: "US", region: "na" },
  "figma-frame": { packs: ["brand", "region"], country: "US", region: "na" },
  "github-terminal": { packs: ["brand", "region"], country: "US", region: "na" },
  "notion-ink": { packs: ["brand", "region"], country: "US", region: "na" },
  "apple-graphite": { packs: ["brand", "region"], country: "US", region: "na" },
  "microsoft-quad": { packs: ["brand", "region"], country: "US", region: "na" },
  "cola-red": { packs: ["brand", "region"], country: "US", region: "na" },
  "starbucks-siren": { packs: ["brand", "region"], country: "US", region: "na" },
  "nike-volt": { packs: ["brand", "region"], country: "US", region: "na" },
  "adidas-court": { packs: ["brand", "region"], country: "DE", region: "eu-central" },
  "ikea-blue-yellow": { packs: ["brand", "region"], country: "SE", region: "eu-west" },
  "golden-arch": { packs: ["brand", "region"], country: "US", region: "na" },
  "tiktok-dual": { packs: ["brand", "region"], country: "CN", region: "asia-east" },
  "hulu-night": { packs: ["brand", "region"], country: "US", region: "na" },
  "amazon-smile": { packs: ["brand", "region"], country: "US", region: "na" },
  "linkedin-navy": { packs: ["brand", "region"], country: "US", region: "na" },
  "airbnb-coral": { packs: ["brand", "region"], country: "US", region: "na" },
  "uber-black": { packs: ["brand", "region"], country: "US", region: "na" },
  "robinhood-green": { packs: ["brand", "region"], country: "US", region: "na" },
  "revolut-midnight": { packs: ["brand", "region"], country: "GB", region: "eu-west" },
  "shopify-commerce": { packs: ["brand", "region"], country: "CA", region: "na" },
  "arc-violet": { packs: ["brand", "region"], country: "US", region: "na" },
  "vercel-void": { packs: ["brand", "region"], country: "US", region: "na" },
  "linear-orbit": { packs: ["brand", "region"], country: "US", region: "na" },
  "hermes-orange": { packs: ["brand", "region"], country: "FR", region: "eu-west" },
  "redbull-charge": { packs: ["brand", "region"], country: "AT", region: "eu-central" },
  "google-spectrum": { packs: ["brand", "region"], country: "US", region: "na" },
  "tesla-circuit": { packs: ["brand", "region"], country: "US", region: "na" },
  "nasa-mission": { packs: ["brand", "region"], country: "US", region: "na" },
  "ferrari-rosso": { packs: ["brand", "region"], country: "IT", region: "eu-south" },
  "reddit-orangered": { packs: ["brand", "region"], country: "US", region: "na" },
  "epic-games-vault": { packs: ["brand", "region"], country: "US", region: "na" },
  "riot-red": { packs: ["brand", "region"], country: "US", region: "na" },
  "ubisoft-swirl": { packs: ["brand", "region"], country: "FR", region: "eu-west" },
  "ea-pulse": { packs: ["brand", "region"], country: "US", region: "na" },
  "sega-blue": { packs: ["brand", "region"], country: "JP", region: "asia-east" },
  "roblox-studio": { packs: ["brand", "region"], country: "US", region: "na" },
  "razer-chroma": { packs: ["brand", "region"], country: "SG", region: "asia-southeast" },
  "logitech-g": { packs: ["brand", "region"], country: "CH", region: "eu-central" },
  "steelseries-arctic": { packs: ["brand", "region"], country: "DK", region: "eu-west" },
  "corsair-sail": { packs: ["brand", "region"], country: "US", region: "na" },
  "nvidia-green": { packs: ["brand", "region"], country: "US", region: "na" },
  "amd-red": { packs: ["brand", "region"], country: "US", region: "na" },
  "intel-blue": { packs: ["brand", "region"], country: "US", region: "na" },
  "samsung-galaxy": { packs: ["brand", "region"], country: "KR", region: "asia-east" },
  "crunchyroll-orange": { packs: ["brand", "region"], country: "US", region: "na" },
  "soundcloud-wave": { packs: ["brand", "region"], country: "DE", region: "eu-central" },
  "duolingo-owl": { packs: ["brand", "region"], country: "US", region: "na" },
  "dropbox-blue": { packs: ["brand", "region"], country: "US", region: "na" },
  "paypal-blue": { packs: ["brand", "region"], country: "US", region: "na" },
  "porsche-racing": { packs: ["brand", "region"], country: "DE", region: "eu-central" },
  "telegram-sky": { packs: ["brand", "region"], country: "AE", region: "asia-west" },
  "pinterest-pin": { packs: ["brand", "region"], country: "US", region: "na" },
  "snapchat-ghost": { packs: ["brand", "region"], country: "US", region: "na" },
  "coinbase-blue": { packs: ["brand", "region"], country: "US", region: "na" },
  "bmw-m": { packs: ["brand", "region"], country: "DE", region: "eu-central" },
  "square-enix-crystal": { packs: ["brand", "region"], country: "JP", region: "asia-east" },
  "asus-tw": { packs: ["region"], country: "TW", region: "asia-east" },
  "acer-tw": { packs: ["region"], country: "TW", region: "asia-east" },
  "msi-tw": { packs: ["region"], country: "TW", region: "asia-east" },
  "htc-tw": { packs: ["region"], country: "TW", region: "asia-east" },
  "mediatek-tw": { packs: ["region"], country: "TW", region: "asia-east" },
  "sony-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "toyota-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "honda-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "rakuten-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "line-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "uniqlo-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "konami-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "niconico-jp": { packs: ["region"], country: "JP", region: "asia-east" },
  "lg-kr": { packs: ["region"], country: "KR", region: "asia-east" },
  "kakaotalk-kr": { packs: ["region"], country: "KR", region: "asia-east" },
  "naver-kr": { packs: ["region"], country: "KR", region: "asia-east" },
  "hyundai-kr": { packs: ["region"], country: "KR", region: "asia-east" },
  "kia-kr": { packs: ["region"], country: "KR", region: "asia-east" },
  "nexon-kr": { packs: ["region"], country: "KR", region: "asia-east" },
  "bilibili-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "xiaomi-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "huawei-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "oneplus-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "lenovo-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "dji-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "wechat-cn": { packs: ["region"], country: "CN", region: "asia-east" },
  "grab-sg": { packs: ["region"], country: "SG", region: "asia-southeast" },
  "shopee-sg": { packs: ["region"], country: "SG", region: "asia-southeast" },
  "gojek-id": { packs: ["region"], country: "ID", region: "asia-southeast" },
  "airasia-my": { packs: ["region"], country: "MY", region: "asia-southeast" },
  "flipkart-in": { packs: ["region"], country: "IN", region: "asia-south" },
  "paytm-in": { packs: ["region"], country: "IN", region: "asia-south" },
  "zomato-in": { packs: ["region"], country: "IN", region: "asia-south" },
  "swiggy-in": { packs: ["region"], country: "IN", region: "asia-south" },
  "jio-in": { packs: ["region"], country: "IN", region: "asia-south" },
  "zoho-in": { packs: ["region"], country: "IN", region: "asia-south" },
  "emirates-ae": { packs: ["region"], country: "AE", region: "asia-west" },
  "qatarairways-qa": { packs: ["region"], country: "QA", region: "asia-west" },
  "turkishairlines-tr": { packs: ["region"], country: "TR", region: "asia-west" },
  "etihadairways-ae": { packs: ["region"], country: "AE", region: "asia-west" },
  "renault-fr": { packs: ["region"], country: "FR", region: "eu-west" },
  "vodafone-gb": { packs: ["region"], country: "GB", region: "eu-west" },
  "klarna-se": { packs: ["region"], country: "SE", region: "eu-west" },
  "ericsson-se": { packs: ["region"], country: "SE", region: "eu-west" },
  "nokia-fi": { packs: ["region"], country: "FI", region: "eu-west" },
  "volvo-se": { packs: ["region"], country: "SE", region: "eu-west" },
  "monzo-gb": { packs: ["region"], country: "GB", region: "eu-west" },
  "mclaren-gb": { packs: ["region"], country: "GB", region: "eu-west" },
  "siemens-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "sap-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "bosch-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "volkswagen-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "audi-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "mercedes-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "puma-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "dhl-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "zalando-de": { packs: ["region"], country: "DE", region: "eu-central" },
  "cdprojekt-pl": { packs: ["region"], country: "PL", region: "eu-east" },
  "jetbrains-cz": { packs: ["region"], country: "CZ", region: "eu-east" },
  "skoda-cz": { packs: ["region"], country: "CZ", region: "eu-east" },
  "kaspersky-ru": { packs: ["region"], country: "RU", region: "eu-east" },
  "grammarly-ua": { packs: ["region"], country: "UA", region: "eu-east" },
  "bitdefender-ro": { packs: ["region"], country: "RO", region: "eu-east" },
  "fiat-it": { packs: ["region"], country: "IT", region: "eu-south" },
  "ducati-it": { packs: ["region"], country: "IT", region: "eu-south" },
  "lamborghini-it": { packs: ["region"], country: "IT", region: "eu-south" },
  "maserati-it": { packs: ["region"], country: "IT", region: "eu-south" },
  "zara-es": { packs: ["region"], country: "ES", region: "eu-south" },
  "glovo-es": { packs: ["region"], country: "ES", region: "eu-south" },
  "farfetch-pt": { packs: ["region"], country: "PT", region: "eu-south" },
  "mercadopago-ar": { packs: ["region"], country: "AR", region: "latam" },
  "nubank-br": { packs: ["region"], country: "BR", region: "latam" },
  "ifood-br": { packs: ["region"], country: "BR", region: "latam" },
  "picpay-br": { packs: ["region"], country: "BR", region: "latam" },
  "avianca-co": { packs: ["region"], country: "CO", region: "latam" },
  "aeromexico-mx": { packs: ["region"], country: "MX", region: "na" },
  "andela-ng": { packs: ["region"], country: "NG", region: "africa" },
  "ethiopianairlines-et": { packs: ["region"], country: "ET", region: "africa" },
  "canva-au": { packs: ["region"], country: "AU", region: "oceania" },
  "atlassian-au": { packs: ["region"], country: "AU", region: "oceania" },
  "afterpay-au": { packs: ["region"], country: "AU", region: "oceania" },
  "qantas-au": { packs: ["region"], country: "AU", region: "oceania" },
};

/** Ids whose tags put them in `pack`, in table order. */
export function idsTagged(pack: PackTag, tags: Record<string, ThemeTags> = BRAND_TAGS): string[] {
  return Object.keys(tags).filter((id) => tags[id].packs.includes(pack));
}

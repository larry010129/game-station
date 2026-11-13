import type { FeedItem, FeedPlatform } from "../lib/types";

export const PLATFORM_NAME: Record<FeedPlatform, string> = {
  blizzard: "Blizzard",
  reddit: "Reddit",
  youtube: "YouTube",
  x: "X",
};

/** Older cached items have no platform field, so fall back to the id prefix. */
export function platformOf(item: Pick<FeedItem, "id" | "platform" | "source">): FeedPlatform {
  if (item.platform) return item.platform;
  if (item.id.startsWith("reddit-") || item.source.startsWith("r/")) return "reddit";
  if (item.id.startsWith("yt-")) return "youtube";
  return "blizzard";
}

const PATH: Record<FeedPlatform, JSX.Element> = {
  // Blizzard: a swirl-free mark, three arcs around a core
  blizzard: (
    <>
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path d="M12 3a9 9 0 0 1 9 9M12 21a9 9 0 0 1-9-9M6 5.5A9 9 0 0 1 18.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  reddit: (
    <>
      <ellipse cx="12" cy="14" rx="7.5" ry="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9.4" cy="13.4" r="1.1" fill="currentColor" />
      <circle cx="14.6" cy="13.4" r="1.1" fill="currentColor" />
      <path d="M9.6 16.2c1.3.9 3.5.9 4.8 0M12 8.8l.9-3.6 3 .7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.2 9.4v5.2l4.4-2.6z" fill="currentColor" />
    </>
  ),
  x: <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
};

export function PlatformIcon({ platform, size = 16 }: { platform: FeedPlatform; size?: number }) {
  return (
    <svg className={`pf pf-${platform}`} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={PLATFORM_NAME[platform]}>
      <title>{PLATFORM_NAME[platform]}</title>
      {PATH[platform]}
    </svg>
  );
}

import type { FeedKind } from "./types";

/** Short role tags for feed cards and Vault > Sources. */
export const FEED_KIND_LABEL: Record<FeedKind, string> = {
  patch: "Patch",
  official: "Official",
  leak: "Leak",
  news: "News",
  video: "Video",
  community: "Community",
};

/** Roles the user can set when tracking an X / YouTube / Reddit source. */
export type SourceKind = "official" | "leak" | "news" | "video" | "community";

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  official: "Official",
  leak: "Leak",
  news: "News",
  video: "Video",
  community: "Community",
};

export const SOURCE_KIND_OPTIONS: Record<"x" | "youtube" | "reddit", { value: SourceKind; label: string }[]> = {
  x: [
    { value: "official", label: "Official" },
    { value: "leak", label: "Leak" },
    { value: "news", label: "News" },
  ],
  youtube: [
    { value: "leak", label: "Leak" },
    { value: "video", label: "Video" },
  ],
  reddit: [
    { value: "community", label: "Community" },
    { value: "leak", label: "Leak" },
  ],
};

export const DEFAULT_SOURCE_KIND: Record<"x" | "youtube" | "reddit", SourceKind> = {
  x: "leak",
  youtube: "leak",
  reddit: "community",
};

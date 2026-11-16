import type { CmsBanner } from "../types/draft";

/** Resolve banner art URL from art / imageUrl / assetPath. */
export function bannerArtUrl(banner: Pick<CmsBanner, "art" | "imageUrl" | "assetPath">): string {
  const raw = banner.art || banner.imageUrl || banner.assetPath || "";
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Inline banner card preview — image + title/subtitle overlay.
 * Updates live as draft fields change.
 */
export function BannerArtPreview({
  banner,
}: {
  banner: Pick<CmsBanner, "title" | "subtitle" | "art" | "imageUrl" | "assetPath" | "pack">;
}) {
  const src = bannerArtUrl(banner);

  return (
    <div className="overflow-hidden rounded border border-edge bg-bg">
      <div className="relative aspect-[16/7] w-full bg-edge/40">
        {src ? (
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">
            No art yet
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
          <p className="truncate text-sm font-semibold text-white">
            {banner.title || "Untitled banner"}
          </p>
          {banner.subtitle ? (
            <p className="mt-0.5 truncate text-xs text-white/80">{banner.subtitle}</p>
          ) : null}
        </div>
      </div>
      <p className="border-t border-edge px-2 py-1 text-[10px] text-muted">
        Live preview · {banner.pack}
        {src ? ` · ${src}` : ""}
      </p>
    </div>
  );
}

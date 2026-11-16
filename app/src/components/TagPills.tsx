import { tagParts, type ThemeTags } from "../content/brandTags";

/** A company theme's tag: its country code and its region code (e.g. TW · EA). Full names on hover and for screen readers. */
export function TagPills({ tags, className = "" }: { tags: ThemeTags; className?: string }) {
  const t = tagParts(tags);
  return (
    <span className={`tag-pills ${className}`.trim()} title={t.label} aria-label={t.label} role="img">
      <i>{t.country}</i>
      <i>{t.region}</i>
    </span>
  );
}

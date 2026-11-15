/** Tells whether a leak came from X/Twitter, and from which user when that can be seen. */
export interface XSource {
  /** The post itself is on x.com (the link proves it). Otherwise only the text mentions X. */
  direct: boolean;
  handle: string | null;
}

const X_HOST = /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/i;
const RESERVED = new Set(["i", "home", "search", "hashtag", "explore", "intent", "share", "messages", "notifications"]);

export function xSource(item: { url?: string; title?: string; source?: string }): XSource | null {
  if (item.url) {
    try {
      const u = new URL(item.url);
      if (X_HOST.test(u.hostname)) {
        const first = u.pathname.split("/").filter(Boolean)[0];
        return { direct: true, handle: first && !RESERVED.has(first.toLowerCase()) ? first : null };
      }
    } catch {
      /* not a URL: fall through to the text check */
    }
  }
  const text = `${item.source ?? ""} ${item.title ?? ""}`;
  const at = /(?:^|\s)@(\w{2,15})\b/.exec(text);
  if (at) return { direct: false, handle: at[1] };
  if (/\b(on X|X user|X post|tweet(?:ed|s)?|twitter|x\.com)\b/i.test(text)) return { direct: false, handle: null };
  return null;
}

/** Short badge text: "X @name" for a real post, "via X" when a news story only says it came from X. */
export function xBadge(x: XSource, source = ""): string {
  // The source line already names the account ("@SkaVorah"), so the badge only says it is a post on X.
  if (x.direct) return x.handle && !source.toLowerCase().includes(x.handle.toLowerCase()) ? `X @${x.handle}` : "X post";
  return x.handle ? `via X @${x.handle}` : "via X";
}

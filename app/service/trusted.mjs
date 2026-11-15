// Which sources the user trusts for leaks: an X account, a YouTube channel, a subreddit or a website.

const norm = (s) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/^r\//, "");

const X_HOSTS = new Set(["x.com", "twitter.com", "mobile.twitter.com", "mobile.x.com"]);

function hostOf(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** True when this source/link belongs to the trusted entry: same name, same x.com account, same YouTube @handle or same website. */
function matches(entry, source, url) {
  const n = norm(entry.name);
  if (!n) return false;
  if (norm(source) === n) return true;
  // A longer source line counts when the trusted name leads it ("Blizzard News", "SkaVorah on X, via Gfinity") or is
  // cited as the origin ("Gfinity Esports, citing SkaVorah on X"). Merely mentioning the name does not: a site
  // "reporting Blizzard's announcement" is not Blizzard. Names under 5 letters are skipped.
  if (n.length >= 5 && !n.includes(".")) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const text = String(source ?? "").trim().replace(/^@/, "");
    if (new RegExp(`^${esc}(?![\\w'’])`, "i").test(text)) return true;
    if (new RegExp(`\\b(citing|via|per|from|by|according to)\\s+@?${esc}(?![\\w])`, "i").test(text)) return true;
  }
  const u = hostOf(url);
  if (!u) return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const first = (u.pathname.split("/").filter(Boolean)[0] ?? "").toLowerCase().replace(/^@/, "");
  if (X_HOSTS.has(host) && first === n) return true;
  if (host.endsWith("youtube.com") && first === n) return true;
  if (n.includes(".") && (host === n || host.endsWith(`.${n}`))) return true;
  return false;
}

/**
 * The trusted entry for an item (its main source or any source bundled with it), or null.
 * `item`: { source, url, also?: [{ source, url }] }.
 */
export function trustedMatch(item, list = []) {
  if (!item || !list.length) return null;
  const sources = [{ source: item.source, url: item.url }, ...(item.sourceUrl ? [{ source: "", url: item.sourceUrl }] : []), ...(item.also ?? [])];
  for (const entry of list) {
    if (sources.some((s) => matches(entry, s.source, s.url))) return entry;
  }
  return null;
}

/** The text shown on hover: the user's own note, or the name. */
export const trustNote = (entry) => entry?.note || entry?.name || "";

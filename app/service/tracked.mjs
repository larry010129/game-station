// The sources the user chooses to track: an X account, a YouTube channel, a subreddit or a website.
// One list is kept in config.json (`feed.tracked`); this file checks each entry and turns the list into
// what the feed, the AI search and the "Trusted" badge read.

export const PLATFORMS = ["x", "youtube", "reddit", "website"];
export const MAX_TRACKED = 60;

/** Source role tags shown in Vault > Sources and on feed cards. */
export const SOURCE_KINDS = {
  x: ["official", "leak", "news"],
  youtube: ["leak", "video"],
  reddit: ["community", "leak"],
};

const DEFAULT_KIND = { x: "leak", youtube: "leak", reddit: "community" };

const hostOf = (text) => {
  try {
    return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
};

const firstSegment = (u) => u.pathname.split("/").filter(Boolean)[0] ?? "";

function normalizeKind(platform, raw) {
  const allowed = SOURCE_KINDS[platform];
  if (!allowed) return undefined;
  return allowed.includes(raw) ? raw : DEFAULT_KIND[platform];
}

/**
 * Checks one entry: { platform, value, note?, kind? }. `value` may be a name or a link; it is reduced to the
 * short form that is stored (an X handle without @, a YouTube @handle or UC id, a subreddit name, a domain).
 * Returns { platform, value, note, kind? } or { error } with a message fit to show the user.
 */
export function normalizeTracked(entry) {
  if (!entry || typeof entry !== "object") return { error: "That is not a source." };
  const { platform } = entry;
  if (!PLATFORMS.includes(platform)) return { error: "Choose X, YouTube, Reddit or Website." };
  const raw = String(entry.value ?? "").trim();
  if (!raw) return { error: "Type a name or paste a link." };
  const note = String(entry.note ?? "").trim().slice(0, 120);
  const kind = normalizeKind(platform, entry.kind);
  const ok = (value) => ({ platform, value, note, ...(kind ? { kind } : {}) });

  if (platform === "x") {
    let h = raw;
    if (/[./]/.test(raw)) {
      const u = hostOf(raw);
      if (!u || !/^(www\.|mobile\.)?(x|twitter)\.com$/i.test(u.hostname)) return { error: "Paste an x.com link or type the @handle." };
      h = firstSegment(u);
    }
    h = h.replace(/^@/, "");
    return /^\w{1,15}$/.test(h) ? ok(h) : { error: "An X handle has letters, numbers and _ only, up to 15 characters." };
  }

  if (platform === "youtube") {
    let v = raw;
    if (/[./]/.test(raw)) {
      const u = hostOf(raw);
      if (!u || !/(^|\.)youtube\.com$/i.test(u.hostname)) return { error: "Paste a youtube.com channel link or type the @handle." };
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && /^UC[\w-]{20,}$/.test(parts[1] ?? "")) return ok(parts[1]);
      if (!parts[0]?.startsWith("@")) return { error: "Use a channel link that has the @handle, or the channel's own page." };
      v = parts[0];
    }
    if (/^UC[\w-]{20,}$/.test(v)) return ok(v);
    v = v.replace(/^@/, "");
    return /^[\w.-]{2,60}$/.test(v) ? ok(`@${v}`) : { error: "A YouTube handle has letters, numbers, . - and _ only." };
  }

  if (platform === "reddit") {
    let s = raw;
    if (/\//.test(raw) && !/^r\//i.test(raw)) {
      const u = hostOf(raw);
      const parts = u?.pathname.split("/").filter(Boolean) ?? [];
      if (!u || !/(^|\.)reddit\.com$/i.test(u.hostname) || parts[0]?.toLowerCase() !== "r") return { error: "Paste a reddit.com/r/... link or type the subreddit name." };
      s = parts[1] ?? "";
    }
    s = s.replace(/^r\//i, "");
    return /^\w{2,30}$/.test(s) ? ok(s) : { error: "A subreddit name has letters, numbers and _ only." };
  }

  // website
  const u = hostOf(raw);
  const host = u?.hostname.toLowerCase().replace(/^www\./, "") ?? "";
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? ok(host) : { error: "Type a website like pcgamer.com." };
}

/** Normalises a whole list: drops repeats, keeps order, throws nothing. `errors` collects the messages. */
export function normalizeTrackedList(list, errors = []) {
  const out = [];
  const seen = new Set();
  for (const e of Array.isArray(list) ? list : []) {
    const n = normalizeTracked(e);
    if (n.error) {
      errors.push(n.error);
      continue;
    }
    const key = `${n.platform}:${n.value.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= MAX_TRACKED) break;
  }
  return out;
}

const LISTS = ["x", "youtube", "reddit", "trusted"];
const LABEL = { x: "X account", youtube: "YouTube channel", reddit: "Subreddit", website: "Website" };

/** The built-in lists, kept aside (not saved, not listed) so tracked entries can be added and removed on top of them. */
function base(feed) {
  if (!feed.baseLists) {
    Object.defineProperty(feed, "baseLists", {
      value: Object.fromEntries(LISTS.map((k) => [k, [...(feed[k] ?? [])]])),
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }
  return feed.baseLists;
}

/** Rebuilds feed.x / youtube / reddit / trusted as the built-in lists plus everything in feed.tracked. Edits `feed` in place. */
export function applyTracked(feed) {
  const b = base(feed);
  const add = { x: [], youtube: [], reddit: [], trusted: [] };
  for (const t of feed.tracked ?? []) {
    const note = t.note || LABEL[t.platform];
    if (t.platform === "x") add.x.push({ handle: t.value, kind: normalizeKind("x", t.kind) });
    if (t.platform === "youtube") add.youtube.push({ ...(t.value.startsWith("@") ? { handle: t.value } : { channelId: t.value }), name: t.value, kind: normalizeKind("youtube", t.kind) === "leak" ? "leak" : "video" });
    if (t.platform === "reddit") add.reddit.push({ sub: t.value, kind: normalizeKind("reddit", t.kind) });
    add.trusted.push({ name: t.value, note });
  }
  const merge = (k, keyOf) => {
    const seen = new Set();
    return [...b[k], ...add[k]].filter((i) => {
      const key = String(keyOf(i)).replace(/^[@]/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  feed.x = merge("x", (i) => i.handle);
  feed.youtube = merge("youtube", (i) => i.channelId ?? i.handle ?? i.url ?? i.name);
  feed.reddit = merge("reddit", (i) => i.sub);
  feed.trusted = merge("trusted", (i) => i.name);
  return feed;
}

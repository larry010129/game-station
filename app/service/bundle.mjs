// Folds repeats of the same leak into one entry that lists every source that reported it.

const STOP = new Set(
  ("a an the of to in on for and or is are was will be been with from by at as it its this that new next " +
    "overwatch ow ow2 2 leak leaks leaked leaker leakers datamine datamined datamines rumor rumour rumors rumoured rumored " +
    "reportedly report reports allegedly possible possibly apparently seemingly may might could first look details more " +
    "about after before into out up how what who when why").split(" "),
);

const RANK = { rumor: 0, leak: 1, confirmed: 2 };

/** The words that identify what a headline is about: no filler, no "leak"/"overwatch". */
export function tokens(title) {
  const words = String(title ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  return new Set(words);
}

/** Same story if they share at least two identifying words and most of the shorter headline. */
export function similar(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  const min = Math.min(A.size, B.size);
  if (min === 0) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared >= 2 && shared / min >= 0.6;
}

const isX = (url) => /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\//i.test(String(url ?? ""));
const sameUrl = (a, b) => Boolean(a && b && a === b);

function addSource(entry, item) {
  const name = item.source || "";
  const url = item.url || "";
  if (!name && !url) return;
  if (sameUrl(entry.url, url) && (!name || name === entry.source)) return;
  // The same publisher again (a feed headline from the site the AI already cited) is not another source.
  if (name && name.trim().toLowerCase() === String(entry.source ?? "").trim().toLowerCase()) return;
  if (entry.also.some((s) => sameUrl(s.url, url) && s.source === name)) return;
  if (!url && entry.also.some((s) => s.source === name)) return;
  entry.also.push({ source: name, url });
}

/**
 * `items`: the AI's answer, in order. Repeats among them are merged (the strongest status wins; a real
 * x.com post becomes the main link). `extra`: other headlines (Reddit, news search) that only join an
 * existing entry as another source; they never add new entries, so junk headlines cannot get in.
 */
export function bundleItems(items, extra = []) {
  const out = [];
  for (const item of items) {
    const hit = out.find((e) => sameUrl(e.url, item.url) || similar(e.title, item.title));
    if (!hit) {
      out.push({ ...item, also: [...(item.also ?? [])] });
      continue;
    }
    if (isX(item.url) && !isX(hit.url)) {
      const old = { source: hit.source, url: hit.url };
      hit.url = item.url;
      hit.source = item.source || hit.source;
      addSource(hit, old);
    } else {
      addSource(hit, item);
    }
    if ((RANK[item.status] ?? 0) > (RANK[hit.status] ?? 0)) hit.status = item.status;
    if (item.upcoming) hit.upcoming = true;
    if ((item.summary ?? "").length > (hit.summary ?? "").length) hit.summary = item.summary;
    if (!hit.date && item.date) hit.date = item.date;
  }
  for (const x of extra) {
    const hit = out.find((e) => sameUrl(e.url, x.url) || similar(e.title, x.title));
    if (hit) addSource(hit, x);
  }
  return out.map((e) => ({ ...e, also: e.also.slice(0, 12) }));
}

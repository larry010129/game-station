import { WEAPON_ALS_ICONS } from "./apex-meta-parse.mjs";

const IMG_SLUG = /^[a-z0-9][a-z0-9_-]{0,40}$/i;
const imgCache = new Map();

/** Tracker Network portraits for Apex legends/weapons. Fixed host + slug allowlist — not an open proxy.
 *  A few weapons have no Tracker CDN PNG; those slugs map to ALS DGS SVG icons instead. */
export async function proxyApexImg(kind, slug) {
  const k = kind === "weapon" ? "weapon" : kind === "legend" ? "legend" : null;
  if (!k || !IMG_SLUG.test(String(slug ?? ""))) {
    const err = new Error("Bad image request");
    err.status = 400;
    throw err;
  }
  const key = `${k}:${slug}`;
  const hit = imgCache.get(key);
  if (hit) return hit;
  const alsIcon = k === "weapon" ? WEAPON_ALS_ICONS[String(slug).toLowerCase()] : null;
  const upstream = alsIcon
    ? `https://apexlegendsstatus.com/dgs/assets/icons/${alsIcon}`
    : k === "legend"
      ? `https://trackercdn.com/cdn/apex.tracker.gg/legends/${slug}-tile.png`
      : `https://trackercdn.com/cdn/apex.tracker.gg/weapons/${slug}.png`;
  const res = await fetch(upstream, {
    headers: { "User-Agent": "CommandStation/0.2 (personal dashboard; Windows)", Accept: "image/*" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const err = new Error(`Image unavailable (${res.status})`);
    err.status = 404;
    throw err;
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const out = {
    __bytes: buf,
    __type: res.headers.get("content-type") || (alsIcon ? "image/svg+xml" : "image/png"),
    __cache: "public, max-age=86400",
  };
  if (imgCache.size > 200) imgCache.clear();
  imgCache.set(key, out);
  return out;
}

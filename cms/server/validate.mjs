/**
 * Publish-gate validation — same spirit as app validateContent (gachaContent.ts)
 * and cms/src/types/draft.ts validateDraftForPublish:
 * drop tables total 100%, prices positive, referenced items exist.
 */

import { REGION_KEYS, brandPoolOf, draftToContentBundle, isCmsDraft, regionPackOf, specialQueueOf } from "./convert.mjs";

/**
 * The Brand Pack's featured queue: each run has a start Monday, 1 to 8 weeks and 2 different Brand themes from the
 * pool; no two runs share a day. With `themes`, each featured theme must also be Available.
 */
function specialQueueErrors(queue, pool, themes) {
  if (queue == null) return [];
  if (!Array.isArray(queue)) return ["specialQueue must be a list"];
  const errors = [];
  const spans = [];
  queue.forEach((s, i) => {
    const at = `Featured run ${i + 1}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s?.weekOf || "")) {
      errors.push(`${at}: the start must be a YYYY-MM-DD date`);
      return;
    }
    const weeks = s.weeks ?? 1;
    if (!(Number.isInteger(weeks) && weeks >= 1 && weeks <= 8)) errors.push(`${at}: the duration must be 1 to 8 weeks`);
    const ids = Array.isArray(s.brandIds) ? s.brandIds : [];
    if (ids.length !== 2 || ids[0] === ids[1]) errors.push(`${at} (${s.weekOf}) needs 2 different Brand themes`);
    for (const id of ids) {
      if (!pool.includes(id)) errors.push(`${at}: ${id} is not in brandThemeIds`);
      else if (themes && themes.find((t) => t.id === id)?.status !== "Available") errors.push(`${at}: ${id} must be Available`);
    }
    const [y, m, d] = s.weekOf.split("-").map(Number);
    const start = Date.UTC(y, m - 1, d) / 86_400_000;
    spans.push({ start, end: start + 7 * weeks, weekOf: s.weekOf });
  });
  spans.sort((a, b) => a.start - b.start);
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) errors.push(`Featured runs starting ${spans[i - 1].weekOf} and ${spans[i].weekOf} overlap`);
  }
  return errors;
}

/** Shared check for a Region Pack week (draft and bundle use the same shape). */
function regionWeekErrors(rw) {
  if (!rw) return [];
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rw.weekOf || "")) errors.push("regionWeek.weekOf must be a YYYY-MM-DD date");
  if (rw.kind === "region") {
    if (!REGION_KEYS.includes(rw.value)) errors.push(`regionWeek: unknown region "${rw.value}"`);
  } else if (rw.kind === "country") {
    if (!/^[A-Z]{2}$/.test(rw.value || "")) errors.push(`regionWeek: country must be a 2-letter code (got "${rw.value}")`);
  } else errors.push('regionWeek.kind must be "region" or "country"');
  if (rw.weeks !== undefined && !(Number.isInteger(rw.weeks) && rw.weeks >= 1 && rw.weeks <= 8)) {
    errors.push("regionWeek.weeks must be a whole number of weeks from 1 to 8");
  }
  return errors;
}

/** `regionPackEnabled` is optional; when present it must be a boolean (absent means the pack is on). */
function regionPackFlagErrors(v) {
  return v === undefined || typeof v === "boolean" ? [] : ["regionPackEnabled must be true or false"];
}

const PACK_IDS = ["regular", "brand", "region"];

/** `packTickets` is optional; each entry maps a known pack to "regular" or "special". */
function packTicketErrors(v) {
  if (v === undefined || v === null) return [];
  if (typeof v !== "object" || Array.isArray(v)) return ["packTickets must be an object"];
  const errors = [];
  for (const [k, kind] of Object.entries(v)) {
    if (!PACK_IDS.includes(k)) errors.push(`packTickets: "${k}" is not a pack`);
    else if (kind !== "regular" && kind !== "special") errors.push(`packTickets.${k} must be "regular" or "special"`);
  }
  return errors;
}

/** `rainbowThemeIds` is optional; unique ids, and (when themes are known) each one an existing non-Brand theme. */
function rainbowErrors(v, themes) {
  if (v === undefined) return [];
  if (!Array.isArray(v) || !v.every((id) => typeof id === "string" && id)) return ["rainbowThemeIds must be a list of theme ids"];
  const errors = [];
  if (new Set(v).size !== v.length) errors.push("rainbowThemeIds has duplicate ids");
  if (themes) {
    for (const id of v) {
      const t = themes.find((x) => x?.id === id);
      if (!t) errors.push(`rainbowThemeIds: ${id} is not a theme`);
      else if (t.group === "Brand") errors.push(`rainbowThemeIds: ${id} is a Brand theme; rainbow is for Regular themes`);
    }
  }
  return errors;
}

/** `regularExtraIds` is optional; unique ids, and (when themes are known) each one an existing theme. */
function regularExtraErrors(v, themes) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || !v.every((id) => typeof id === "string" && id)) return ["regularExtraIds must be a list of theme ids"];
  const errors = [];
  if (new Set(v).size !== v.length) errors.push("regularExtraIds has duplicate ids");
  if (themes) for (const id of v) if (!themes.some((t) => t?.id === id)) errors.push(`regularExtraIds: ${id} is not a theme`);
  return errors;
}

/** `wikiHiddenIds` is optional: unique non-empty ids (themes, card skins or items). An id that no longer exists is harmless. */
function wikiHiddenErrors(v) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || !v.every((id) => typeof id === "string" && id)) return ["wikiHiddenIds must be a list of ids"];
  return new Set(v).size !== v.length ? ["wikiHiddenIds has duplicate ids"] : [];
}

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** `checkinEvent` is optional; when set, both local date-times are given and the end is after the start. */
function checkinEventErrors(e) {
  if (e == null) return [];
  if (typeof e !== "object") return ["checkinEvent must be an object"];
  if (!LOCAL_DATETIME.test(e.start || "") || !LOCAL_DATETIME.test(e.end || "")) return ["Check-in event: start and end must be YYYY-MM-DDTHH:mm"];
  if (e.start >= e.end) return ["Check-in event: the end must be after the start"];
  return [];
}

/** The two card packs share every setting; only the prize list and its statuses differ. */
const CARD_PACK_KIND = { key: "cardPack", label: "Card Pack", listKey: "skins", noun: "skin", statuses: ["Hidden", "Available", "Archived"] };
const WIDGET_PACK_KIND = { key: "widgetPack", label: "Widget Pack", listKey: "widgets", noun: "widget", statuses: ["Free", "Hidden", "Available", "Archived"] };

/**
 * `cardPack` / `widgetPack` are optional. `scale` is 100 for a draft (percent rows) and 1 for a release (fractions).
 * Mirrors app validCardPack (gachaContent.ts) and cms/src/types/draft.ts cardAndCheckinErrors / widgetPackErrors.
 * The Card Pack needs an Available skin while on; the Widget Pack may be on with none (the app just shows no tab),
 * but an Available widget while it is off is a block: no one could win it, and it would stay locked.
 */
function packErrors(cp, scale, kind) {
  const { key, label, listKey, noun, statuses } = kind;
  if (cp == null) return [];
  if (typeof cp !== "object") return [`${key} must be an object`];
  const errors = [];
  if (typeof cp.enabled !== "boolean") errors.push(`${key}.enabled must be true or false`);
  if (cp.ticket !== "regular" && cp.ticket !== "special") errors.push(`${key}.ticket must be "regular" or "special"`);
  // Numbers must be real numbers, as the app checks them (validCardPack): a "0.01" string would pass here and fail there.
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  if (!isNum(cp.priceOne) || !isNum(cp.priceTen) || !(cp.priceOne > 0) || !(cp.priceTen > 0)) errors.push(`${label} prices must be positive numbers`);
  const w = cp.weights || {};
  const rows = ["five", "four", "better", "common"].map((k) => w[k]);
  if (rows.some((v) => !isNum(v) || v < 0)) errors.push(`${label}: row chances must be numbers from 0`);
  const sum = rows.reduce((s, v) => s + (isNum(v) ? v : 0), 0);
  // Exact (within rounding) at both scales, so a draft that passes here also passes as a release.
  if (Math.abs(sum - scale) > scale * 1e-9) errors.push(`${label} row chances must total ${scale === 100 ? "100%" : "1"} (got ${sum})`);
  for (const k of ["fourPityAfter", "fivePityAfter"]) if (!(Number.isInteger(cp[k]) && cp[k] >= 0)) errors.push(`${key}.${k} must be a whole number from 0`);
  const sp = cp.softPity;
  if (sp !== undefined) {
    if (!sp || typeof sp !== "object") errors.push(`${label}: softPity must be an object or left out`);
    else {
      if (!(Number.isInteger(sp.from) && sp.from >= 1)) errors.push(`${label}: soft pity must start at draw 1 or later`);
      else if (Number.isInteger(cp.fivePityAfter) && sp.from > cp.fivePityAfter) errors.push(`${label}: soft pity must start before the guaranteed draw ${cp.fivePityAfter + 1}`);
      if (!(typeof sp.curve === "number" && sp.curve >= 0.2 && sp.curve <= 5)) errors.push(`${label}: the soft pity curve must be 0.2 to 5`);
    }
  }
  if (cp.buy !== undefined) {
    const b = cp.buy;
    const price = (v) => v === null || (Number.isInteger(v) && v > 0);
    if (!b || typeof b !== "object") errors.push(`${key}.buy must be an object`);
    else {
      if (!price(b.fourPrice) || !price(b.fivePrice)) errors.push(`${label}: buy prices must be whole numbers above 0, or null for draw-only`);
      if (typeof b.crystalPick !== "boolean") errors.push(`${key}.buy.crystalPick must be true or false`);
    }
  }
  const cv = cp.crystalValues || {};
  if (!(Number.isInteger(cv.four) && cv.four >= 0) || !(Number.isInteger(cv.five) && cv.five >= 0)) errors.push(`${label}: repeat crystals must be whole numbers from 0`);
  const list = cp[listKey];
  const at = `${key}.${listKey}`;
  if (!Array.isArray(list)) errors.push(`${at} must be a list`);
  else {
    const seen = new Set();
    for (const s of list) {
      if (!s || typeof s.id !== "string" || !s.id) errors.push(`${at}: every ${noun} needs an id`);
      else if (seen.has(s.id)) errors.push(`${at}: ${s.id} is listed twice`);
      else seen.add(s.id);
      if (s && s.stars !== 4 && s.stars !== 5) errors.push(`${at}: ${s?.id} must be 4 or 5 stars`);
      if (s && !statuses.includes(s.status)) errors.push(`${at}: ${s?.id} has an unknown status`);
    }
    const available = list.filter((s) => s?.status === "Available");
    if (kind === CARD_PACK_KIND && cp.enabled === true && available.length === 0) errors.push("Card Pack is on but no skin is Available");
    if (kind === WIDGET_PACK_KIND && cp.enabled === false && available.length > 0) {
      errors.push(`Widget Pack is off but ${available.map((s) => s.id).join(", ")} ${available.length === 1 ? "is" : "are"} Available (drawable)`);
    }
    for (const s of list) if (s && s.locked !== undefined && typeof s.locked !== "boolean") errors.push(`${at}: ${s.id} locked must be true or false`);
  }
  return errors;
}

const cardPackErrors = (cp, scale) => packErrors(cp, scale, CARD_PACK_KIND);
const widgetPackErrors = (wp, scale) => packErrors(wp, scale, WIDGET_PACK_KIND);

/**
 * `checkinPrizes` is optional: exactly 7 boxes, each tickets ("regular"/"special") or an item from `items`, with an
 * amount from 1 to 99 (a one-time item pays exactly 1). Mirrors app validCheckinPrizes (gachaContent.ts).
 */
function checkinPrizeErrors(list, items) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return ["checkinPrizes must be a list"];
  const errors = [];
  if (list.length !== 7) errors.push(`Check-in prizes: there must be exactly 7 days (has ${list.length})`);
  list.forEach((p, i) => {
    const at = `Check-in Day ${i + 1}`;
    if (!p || typeof p !== "object") return void errors.push(`${at}: missing`);
    if (!(Number.isInteger(p.count) && p.count >= 1 && p.count <= 99)) errors.push(`${at}: the amount must be a whole number from 1 to 99`);
    if (p.kind === "item") {
      const item = Array.isArray(items) ? items.find((x) => x?.id === p.id) : null;
      if (!item) errors.push(`${at}: "${p.id}" is not an item`);
      else if (!item.stackable && p.count !== 1) errors.push(`${at}: ${p.id} is a one-time item, so the amount must be 1`);
    } else if (p.kind !== "regular" && p.kind !== "special") errors.push(`${at}: kind must be "regular", "special" or "item"`);
  });
  return errors;
}

/** Brand list must hold 2+ unique ids. */
function brandListErrors(ids) {
  if (!Array.isArray(ids)) return ["brandThemeIds must be an array"];
  if (ids.length < 2) return [`brandThemeIds needs at least 2 themes tagged Brand (got ${ids.length})`];
  if (new Set(ids).size !== ids.length) return ["brandThemeIds has duplicate ids"];
  return [];
}

const WEIGHT_KEYS = ["regularTheme", "brandTheme", "rainbowRegular", "pick", "customUpload", "better", "common"];

/** Soft pity: each kind present starts at draw 1 or later and has a curve from 0.2 to 5. */
function softPityErrors(sp) {
  if (sp == null) return [];
  if (typeof sp !== "object") return ["softPity must be an object"];
  const errors = [];
  for (const key of ["regular", "company"]) {
    const v = sp[key];
    if (v == null) continue;
    if (!(Number.isInteger(v.from) && v.from >= 1)) errors.push(`softPity.${key}.from must be a draw number from 1`);
    if (!(typeof v.curve === "number" && v.curve >= 0.2 && v.curve <= 5)) errors.push(`softPity.${key}.curve must be 0.2 to 5`);
  }
  return errors;
}

function nearly(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

function nearly100(sum, eps = 0.05) {
  return Math.abs(sum - 100) <= eps;
}

/**
 * Validate editor CmsDraft (weights as percentages).
 * @param {Record<string, any>} draft
 * @returns {string[]}
 */
export function validateCmsDraft(draft) {
  const errors = [];
  if (!draft?.packs?.regular || !draft?.packs?.brand) {
    return ["packs.regular and packs.brand are required"];
  }
  if (!draft.economy) errors.push("economy is required");
  else if (!(draft.economy.lookCost > 0)) errors.push("lookCost must be > 0");

  for (const pack of [draft.packs.regular, draft.packs.brand, regionPackOf(draft)]) {
    const sum = WEIGHT_KEYS.reduce((s, k) => s + (Number(pack.weights?.[k]) || 0), 0);
    if (!nearly100(sum)) {
      errors.push(`${pack.id} pack row chances sum to ${sum.toFixed(2)}% (need 100%)`);
    }

    if (!(pack.priceOne > 0) || !(pack.priceTen > 0)) {
      errors.push(`${pack.id} pack prices must be positive`);
    }
    const bi = pack.betterInner || {};
    if (!nearly100((bi.wallpaper || 0) + (bi.boot || 0) + (bi.layout || 0))) {
      errors.push(`${pack.id} Better-item inner weights must sum to 100%`);
    }
    const ci = pack.commonInner || {};
    if (!nearly100((ci.streakFreeze || 0) + (ci.alert || 0) + (ci.font || 0) + (ci.flair || 0))) {
      errors.push(`${pack.id} Common-item inner weights must sum to 100%`);
    }
  }

  if (!Array.isArray(draft.items)) errors.push("items must be an array");
  else {
    const ids = new Set(draft.items.map((i) => i?.id).filter(Boolean));
    if (!ids.has("streak-freeze")) errors.push('items must include "streak-freeze"');
    if (!ids.has("custom-upload")) errors.push('items must include "custom-upload"');
  }

  const brandPool = brandPoolOf(draft);
  errors.push(...brandListErrors(brandPool));
  for (const t of draft.themes || []) {
    if (t?.group !== "Brand" || !t.tags) continue;
    const tg = t.tags;
    if (!Array.isArray(tg.packs) || tg.packs.some((p) => p !== "brand" && p !== "region")) errors.push(`${t.id}: tags.packs may only hold "brand" and "region"`);
    if (!/^[A-Z]{2}$/.test(tg.country || "")) errors.push(`${t.id}: tags.country must be a 2-letter code`);
    if (!REGION_KEYS.includes(tg.region)) errors.push(`${t.id}: tags.region "${tg.region}" is not a known region`);
  }
  errors.push(...regionWeekErrors(draft.regionWeek));
  errors.push(...regionPackFlagErrors(draft.regionPackEnabled));
  errors.push(...packTicketErrors(draft.packTickets));
  errors.push(...regularExtraErrors(draft.regularExtraIds, draft.themes || []));
  errors.push(...wikiHiddenErrors(draft.wikiHiddenIds));
  errors.push(...rainbowErrors(draft.rainbowThemeIds, draft.themes || []));
  const e = draft.economy || {};
  if (e.rainbowPityAfter !== undefined && !(e.rainbowPityAfter >= 0)) errors.push("rainbowPityAfter must be >= 0");
  if (e.creditBigAmount !== undefined && !(Number.isFinite(e.creditBigAmount) && e.creditBigAmount >= 0)) errors.push("creditBigAmount must be >= 0");
  errors.push(...softPityErrors(e.softPity));
  for (const [key, label, after] of [
    ["regular", "Regular Pack", e.rainbowPityAfter ?? 89],
    ["company", "Brand and Region packs", e.brandPityAfter],
  ]) {
    const sp = e.softPity?.[key];
    if (sp && Number.isInteger(sp.from) && sp.from > after) errors.push(`${label}: soft pity must start before the guaranteed draw ${after + 1}`);
  }

  errors.push(...specialQueueErrors(specialQueueOf(draft), brandPool, draft.themes || []));
  errors.push(...cardPackErrors(draft.cardPack, 100));
  errors.push(...widgetPackErrors(draft.widgetPack, 100));
  errors.push(...checkinEventErrors(draft.checkinEvent));
  errors.push(...checkinPrizeErrors(draft.checkinPrizes, draft.items));

  return errors;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function validateGacha(raw) {
  const errors = [];
  if (!raw || typeof raw !== "object") return ["gacha must be an object"];
  const c = /** @type {Record<string, any>} */ (raw);

  if (!(c.lookCost > 0)) errors.push("lookCost must be > 0");
  if (!(c.lookPityAfter >= 0)) errors.push("lookPityAfter must be >= 0");
  if (!(c.brandPityAfter >= 0)) errors.push("brandPityAfter must be >= 0");
  if (c.rainbowPityAfter !== undefined && !(c.rainbowPityAfter >= 0)) errors.push("rainbowPityAfter must be >= 0");
  if (c.creditBigAmount !== undefined && !(Number.isFinite(c.creditBigAmount) && c.creditBigAmount >= 0)) errors.push("creditBigAmount must be >= 0");
  errors.push(...softPityErrors(c.softPity));
  if (!(c.weeklyPickCap >= 0)) errors.push("weeklyPickCap must be >= 0");
  if (!(c.regularCrystalCost > 0)) errors.push("regularCrystalCost must be > 0");
  if (!(c.brandPrismCost > 0)) errors.push("brandPrismCost must be > 0");

  if (!c.packs?.regular || !c.packs?.brand) errors.push("packs.regular and packs.brand are required");
  if (!Array.isArray(c.items)) errors.push("items must be an array");
  errors.push(...brandListErrors(c.brandThemeIds));
  errors.push(...regionWeekErrors(c.regionWeek));
  errors.push(...specialQueueErrors(c.specialQueue, Array.isArray(c.brandThemeIds) ? c.brandThemeIds : [], null));
  errors.push(...regionPackFlagErrors(c.regionPackEnabled));
  errors.push(...packTicketErrors(c.packTickets));
  errors.push(...regularExtraErrors(c.regularExtraIds, null));
  errors.push(...wikiHiddenErrors(c.wikiHiddenIds));
  errors.push(...rainbowErrors(c.rainbowThemeIds, null));
  errors.push(...cardPackErrors(c.cardPack, 1));
  errors.push(...widgetPackErrors(c.widgetPack, 1));
  errors.push(...checkinEventErrors(c.checkinEvent));
  errors.push(...checkinPrizeErrors(c.checkinPrizes, c.items));
  if (Array.isArray(c.rainbowThemeIds) && Array.isArray(c.brandThemeIds)) {
    for (const id of c.rainbowThemeIds) if (c.brandThemeIds.includes(id)) errors.push(`rainbowThemeIds: ${id} is a Brand theme`);
  }

  if (Array.isArray(c.items)) {
    const ids = new Set(c.items.map((i) => i?.id).filter(Boolean));
    if (!ids.has("streak-freeze")) errors.push('items must include "streak-freeze"');
    if (!ids.has("custom-upload")) errors.push('items must include "custom-upload"');
  }

  for (const packId of ["regular", "brand", "region"]) {
    const pack = c.packs?.[packId];
    if (!pack) continue;
    if (!(pack.priceOne > 0)) errors.push(`${packId}.priceOne must be > 0`);
    if (!(pack.priceTen > 0)) errors.push(`${packId}.priceTen must be > 0`);
    const sum = WEIGHT_KEYS.reduce((s, k) => s + (Number(pack.weights?.[k]) || 0), 0);
    if (!nearly(sum, 1)) errors.push(`${packId} drop table weights must total 1 (got ${sum})`);
    const bi = pack.betterInner;
    if (!bi || !nearly((bi.wallpaper || 0) + (bi.boot || 0) + (bi.layout || 0), 1)) {
      errors.push(`${packId}.betterInner must total 1`);
    }
    const ci = pack.commonInner;
    if (
      !ci ||
      !nearly((ci.streakFreeze || 0) + (ci.alert || 0) + (ci.font || 0) + (ci.flair || 0), 1)
    ) {
      errors.push(`${packId}.commonInner must total 1`);
    }
  }

  return errors;
}

/**
 * Accept CmsDraft or ContentBundle.
 * @param {unknown} raw
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateBundle(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["body must be an object"] };
  }
  if (isCmsDraft(raw)) {
    const errors = validateCmsDraft(raw);
    if (errors.length) return { ok: false, errors };
    // Also check converted gacha fractions round-trip cleanly
    const bundle = draftToContentBundle(raw);
    const gErr = validateGacha(bundle.gacha);
    return { ok: gErr.length === 0, errors: gErr };
  }
  const b = /** @type {Record<string, unknown>} */ (raw);
  const errors = [];
  if (typeof b.notes !== "string") errors.push("notes must be a string");
  if (!b.gacha) errors.push("gacha is required");
  else errors.push(...validateGacha(b.gacha));
  return { ok: errors.length === 0, errors };
}

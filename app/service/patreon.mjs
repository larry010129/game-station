import crypto from "node:crypto";
import path from "node:path";
import { DATA_DIR, readJson, writeJson } from "./paths.mjs";
import { spawnDetached } from "./spawn.mjs";

// "Log in with Patreon": the person signs in on Patreon's own site, and the service asks Patreon which tier that
// account is paying. Nothing is stored on a server of ours; Patreon is the account check. Internet is required for the
// check. The exe only decides two things from the answer: Basic (all preset looks) and Brand (the brand-colour editor).
// Discord, the design-request channel and beta access are Patreon benefits that the exe does not check.
const FILE = path.join(DATA_DIR, "patreon.json");
const APP_FILE = path.join(DATA_DIR, "patreon-app.json");
const AUTH = "https://www.patreon.com/oauth2/authorize";
const TOKEN = "https://www.patreon.com/api/oauth2/token";
const IDENTITY =
  "https://www.patreon.com/api/oauth2/v2/identity?include=memberships.currently_entitled_tiers,memberships.campaign" +
  "&fields%5Bmember%5D=patron_status&fields%5Btier%5D=title,amount_cents";
const SCOPES = "identity identity.memberships";
/** How long the last good answer keeps counting when Patreon cannot be reached. */
export const OFFLINE_GRACE_MS = 14 * 24 * 3600_000;
/** The unlocks are re-checked at this interval while the app runs, and whenever it starts. */
export const RECHECK_MS = 12 * 3600_000;

const b64url = (buf) => buf.toString("base64url");
const bad = (message, status = 400) => Object.assign(new Error(message), { status });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** The four public tiers by price, plus the hidden Creator tier the owner gifts. Order is lowest to highest. */
export const TIERS = [
  { id: "bronze", name: "Bronze", cents: 299, basic: true, brand: false },
  { id: "silver", name: "Silver", cents: 599, basic: true, brand: true },
  { id: "gold", name: "Gold", cents: 999, basic: true, brand: true },
  { id: "diamond", name: "Diamond", cents: 1199, basic: true, brand: true },
];
export const CREATOR = { id: "creator", name: "Creator", basic: true, brand: true };

/** Which tier one Patreon tier object stands for: by title first (the owner names them), then by price. */
export function tierOf(t) {
  const title = String(t?.attributes?.title ?? "").trim().toLowerCase();
  if (/\bcreator\b/.test(title)) return CREATOR;
  const byName = TIERS.find((x) => title.includes(x.id));
  if (byName) return byName;
  const cents = Number(t?.attributes?.amount_cents);
  if (Number.isFinite(cents) && cents > 0) {
    // The highest public tier whose price this one reaches.
    return [...TIERS].reverse().find((x) => cents >= x.cents) ?? null;
  }
  return null;
}

const rank = (t) => (t === CREATOR ? 99 : TIERS.indexOf(t));

/**
 * Reads Patreon's identity answer (members with their entitled tiers). Only memberships to the owner's campaign count
 * when a campaign id is given, so a patron of somebody else's page unlocks nothing. Returns the best tier the account
 * is entitled to right now, or null when there is none (cancelled, declined, or not a member).
 */
export function entitlementFrom(json, campaignId) {
  const included = Array.isArray(json?.included) ? json.included : [];
  const tiers = new Map(included.filter((i) => i?.type === "tier").map((i) => [String(i.id), i]));
  let best = null;
  for (const m of included) {
    if (m?.type !== "member") continue;
    const camp = m.relationships?.campaign?.data?.id;
    if (campaignId && String(camp) !== String(campaignId)) continue;
    const status = m.attributes?.patron_status;
    // A member who declined or was never active is not entitled; Patreon also lists former members.
    if (status && status !== "active_patron") continue;
    for (const ref of m.relationships?.currently_entitled_tiers?.data ?? []) {
      const t = tierOf(tiers.get(String(ref.id)));
      if (t && (!best || rank(t) > rank(best))) best = t;
    }
  }
  return best ? { tier: best.id, name: best.name, basic: best.basic, brand: best.brand } : null;
}

/** What the dashboard sees. `basic` and `brand` are false unless the last good check says so and it is recent enough. */
export function viewOf(saved, configured, now = Date.now()) {
  if (!configured) return { configured: false, signedIn: false, basic: false, brand: false, tier: null };
  if (!saved?.refresh) return { configured: true, signedIn: false, basic: false, brand: false, tier: null };
  const fresh = saved.checkedAt && now - saved.checkedAt < OFFLINE_GRACE_MS;
  const e = fresh ? saved.entitled : null;
  return {
    configured: true,
    signedIn: true,
    name: saved.name ?? null,
    tier: e?.tier ?? null,
    tierName: e?.name ?? null,
    basic: Boolean(e?.basic),
    brand: Boolean(e?.brand),
    checkedAt: saved.checkedAt ?? null,
    stale: !fresh,
    error: saved.error ?? null,
  };
}

export function createPatreon(log, getPort) {
  // { access, expires, refresh, name, entitled, checkedAt, error }
  let saved = readJson(FILE, {});
  let pending = null; // { state, at }
  let busy = null;
  let timer = null;

  // The owner's app: from the environment, or from a file the owner puts in the data folder. Without it sign-in is off.
  const app = () => {
    const file = readJson(APP_FILE, {});
    return {
      clientId: process.env.PATREON_CLIENT_ID || file.clientId || "",
      clientSecret: process.env.PATREON_CLIENT_SECRET || file.clientSecret || "",
      campaignId: process.env.PATREON_CAMPAIGN_ID || file.campaignId || "",
    };
  };
  const configured = () => {
    const a = app();
    return Boolean(a.clientId && a.clientSecret);
  };
  const redirectUri = () => `http://127.0.0.1:${getPort()}/api/patreon/callback`;
  const persist = () => {
    try {
      writeJson(FILE, saved);
    } catch (e) {
      log(`patreon: could not save login: ${e.message}`);
    }
  };

  async function tokenRequest(params) {
    const a = app();
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: a.clientId, client_secret: a.clientSecret, ...params }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.error_description || json.error || `token request failed (${res.status})`), { auth: true });
    saved = { ...saved, access: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000, refresh: json.refresh_token ?? saved.refresh };
    persist();
  }

  async function accessToken() {
    if (!saved.refresh) throw Object.assign(new Error("Not signed in"), { auth: true });
    if (!saved.access || Date.now() > (saved.expires ?? 0) - 60_000) {
      try {
        await tokenRequest({ grant_type: "refresh_token", refresh_token: saved.refresh });
      } catch (e) {
        // Patreon said the login is no longer valid (access revoked): sign in again.
        if (e.auth) {
          saved = {};
          persist();
        }
        throw e;
      }
    }
    return saved.access;
  }

  /** Asks Patreon which tier this account pays now. A network failure keeps the last good answer (see OFFLINE_GRACE_MS). */
  async function check() {
    if (!configured() || !saved.refresh) return view();
    if (busy) return busy;
    busy = (async () => {
      try {
        const token = await accessToken();
        const res = await fetch(IDENTITY, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
        if (res.status === 401) {
          saved = { ...saved, access: null };
          throw new Error("Patreon asked to sign in again.");
        }
        if (!res.ok) throw new Error(`Patreon answered ${res.status}.`);
        const json = await res.json();
        saved = { ...saved, name: json?.data?.attributes?.full_name ?? saved.name ?? null, entitled: entitlementFrom(json, app().campaignId), checkedAt: Date.now(), error: null };
        persist();
      } catch (e) {
        if (saved.refresh) {
          saved = { ...saved, error: "Could not reach Patreon. The last answer stays for now." };
          persist();
        }
        log(`patreon: check failed: ${e.message}`);
      }
      return view();
    })().finally(() => {
      busy = null;
    });
    return busy;
  }

  const view = () => viewOf(saved, configured());

  function openBrowser(url) {
    spawnDetached("rundll32.exe", ["url.dll,FileProtocolHandler", url], { windowsHide: true }, log, "patreon: open browser");
  }

  const page = (title, body) => ({
    __html: `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><body style="font:16px system-ui;background:#0e0e10;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-weight:500">${esc(title)}</h1><p style="color:#aaa">${esc(body)}</p></div>`,
  });

  return {
    status: () => view(),
    check,

    login() {
      if (!configured()) throw bad("Patreon sign-in is not set up in this build.", 501);
      pending = { state: b64url(crypto.randomBytes(16)), at: Date.now() };
      const url = new URL(AUTH);
      url.search = new URLSearchParams({ response_type: "code", client_id: app().clientId, redirect_uri: redirectUri(), scope: SCOPES, state: pending.state }).toString();
      openBrowser(url.toString());
      return { url: url.toString() };
    },

    async callback(url) {
      const p = pending;
      if (!p || url.searchParams.get("state") !== p.state) return page("Sign-in expired", "Close this tab and press Log in with Patreon again in Command Station.");
      pending = null;
      const err = url.searchParams.get("error");
      if (err) return page("Patreon not connected", err === "access_denied" ? "You cancelled the sign-in. Close this tab and try again." : err);
      if (Date.now() - p.at > 10 * 60_000) return page("Sign-in expired", "Close this tab and press Log in with Patreon again in Command Station.");
      try {
        await tokenRequest({ grant_type: "authorization_code", code: url.searchParams.get("code") ?? "", redirect_uri: redirectUri() });
        await check();
        return page("Patreon connected", "You can close this tab and go back to Command Station.");
      } catch (e) {
        log(`patreon: sign-in failed: ${e.message}`);
        return page("Patreon sign-in failed", e.message);
      }
    },

    logout() {
      saved = {};
      persist();
      return view();
    },

    /** Re-checks at start and every RECHECK_MS, so a cancelled membership stops unlocking on the next check. */
    start() {
      void check();
      timer = setInterval(() => void check(), RECHECK_MS);
      timer.unref?.();
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}

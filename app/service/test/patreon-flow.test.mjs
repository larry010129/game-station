// The Log in with Patreon flow, end to end, against a stand-in Patreon that speaks the real OAuth shapes
// (authorize redirect, code to token exchange, refresh, and the v2 identity answer with members and tiers).
// It cannot prove Patreon itself accepts our app; it proves every step of our side of the conversation.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cs-patreon-flow-"));
process.env.COMMAND_STATION_DATA = dir;
process.env.PATREON_CLIENT_ID = "client-id-123";
process.env.PATREON_CLIENT_SECRET = "client-secret-456";
process.env.PATREON_CAMPAIGN_ID = "campaign-1";

const GOOD_CODE = "good-code";
const mock = {
  identity: null, // the JSON the identity route answers with, or a number for an error status
  refreshOk: true,
  expiresIn: 3600,
  tokenCalls: [],
  identityAuth: [],
};

const tier = (id, title, cents) => ({ type: "tier", id, attributes: { title, amount_cents: cents } });
const member = (campaign, tierIds, status = "active_patron") => ({
  type: "member",
  id: `m-${campaign}`,
  attributes: { patron_status: status },
  relationships: { campaign: { data: { id: campaign } }, currently_entitled_tiers: { data: tierIds.map((id) => ({ id, type: "tier" })) } },
});
const identity = (name, ...included) => ({ data: { attributes: { full_name: name } }, included });

let server;
let patreon;
let opened;

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const json = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "POST" && url.pathname === "/api/oauth2/token") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const p = new URLSearchParams(body);
        mock.tokenCalls.push(Object.fromEntries(p));
        if (p.get("client_id") !== "client-id-123" || p.get("client_secret") !== "client-secret-456") return json(401, { error: "invalid_client" });
        if (p.get("grant_type") === "authorization_code") {
          if (p.get("code") !== GOOD_CODE) return json(400, { error: "invalid_grant", error_description: "bad code" });
          return json(200, { access_token: "access-1", refresh_token: "refresh-1", expires_in: mock.expiresIn });
        }
        if (p.get("grant_type") === "refresh_token") {
          if (!mock.refreshOk) return json(401, { error: "invalid_grant", error_description: "token revoked" });
          return json(200, { access_token: "access-2", refresh_token: "refresh-2", expires_in: mock.expiresIn });
        }
        return json(400, { error: "unsupported_grant_type" });
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/oauth2/v2/identity") {
      mock.identityAuth.push(req.headers.authorization);
      if (typeof mock.identity === "number") return json(mock.identity, { errors: ["nope"] });
      return json(200, mock.identity);
    }
    json(404, {});
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  process.env.PATREON_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const { createPatreon } = await import("../patreon.mjs");
  opened = [];
  patreon = createPatreon(() => {}, () => 8787, { open: (u) => opened.push(u) });
});

after(async () => {
  patreon?.stop();
  await new Promise((r) => server.close(r));
  fs.rmSync(dir, { recursive: true, force: true });
});

const stateOf = (u) => new URL(u).searchParams.get("state");
const callbackUrl = (state, code = GOOD_CODE) => new URL(`http://127.0.0.1:8787/api/patreon/callback?state=${state}&code=${code}`);

test("before anyone signs in: set up, but signed out and nothing unlocked", () => {
  const s = patreon.status();
  assert.equal(s.configured, true);
  assert.equal(s.signedIn, false);
  assert.equal(s.basic, false);
  assert.equal(s.brand, false);
});

test("login opens the Patreon authorize page with our app, the local redirect and the identity scopes", () => {
  const { url } = patreon.login();
  assert.deepEqual(opened, [url]);
  const u = new URL(url);
  assert.equal(u.pathname, "/oauth2/authorize");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.equal(u.searchParams.get("client_id"), "client-id-123");
  assert.equal(u.searchParams.get("redirect_uri"), "http://127.0.0.1:8787/api/patreon/callback");
  assert.match(u.searchParams.get("scope"), /identity/);
  assert.match(u.searchParams.get("scope"), /identity\.memberships/);
  assert.ok(u.searchParams.get("state").length >= 16);
});

test("a callback with the wrong state is refused and signs nobody in", async () => {
  const page = await patreon.callback(callbackUrl("forged"));
  assert.match(page.__html, /Sign-in expired/);
  assert.equal(patreon.status().signedIn, false);
  assert.equal(mock.tokenCalls.length, 0, "no token was requested for a forged callback");
});

test("a cancelled sign-in on Patreon leaves nobody signed in", async () => {
  const { url } = patreon.login();
  const page = await patreon.callback(new URL(`http://127.0.0.1:8787/api/patreon/callback?state=${stateOf(url)}&error=access_denied`));
  assert.match(page.__html, /cancelled/);
  assert.equal(patreon.status().signedIn, false);
});

test("a good callback exchanges the code, asks identity with the token, and unlocks Basic and Brand for Silver", async () => {
  mock.identity = identity("Pat Example", tier("t-silver", "Silver", 599), member("campaign-1", ["t-silver"]));
  const { url } = patreon.login();
  const page = await patreon.callback(callbackUrl(stateOf(url)));
  assert.match(page.__html, /Patreon connected/);
  const exchange = mock.tokenCalls.find((c) => c.grant_type === "authorization_code");
  assert.equal(exchange.code, GOOD_CODE);
  assert.equal(exchange.redirect_uri, "http://127.0.0.1:8787/api/patreon/callback");
  assert.equal(mock.identityAuth.at(-1), "Bearer access-1");
  const s = patreon.status();
  assert.equal(s.signedIn, true);
  assert.equal(s.name, "Pat Example");
  assert.equal(s.tier, "silver");
  assert.equal(s.basic, true);
  assert.equal(s.brand, true);
});

test("a state can be used only once", async () => {
  const { url } = patreon.login();
  await patreon.callback(callbackUrl(stateOf(url)));
  const again = await patreon.callback(callbackUrl(stateOf(url)));
  assert.match(again.__html, /Sign-in expired/);
});

test("Bronze turns on Basic only", async () => {
  mock.identity = identity("Pat Example", tier("t-bronze", "Bronze", 299), member("campaign-1", ["t-bronze"]));
  const s = await patreon.check();
  assert.equal(s.tier, "bronze");
  assert.equal(s.basic, true);
  assert.equal(s.brand, false);
});

test("the hidden Creator tier turns on Basic and Brand", async () => {
  mock.identity = identity("Pat Example", tier("t-creator", "Creator", 0), member("campaign-1", ["t-creator"]));
  const s = await patreon.check();
  assert.equal(s.tier, "creator");
  assert.equal(s.basic && s.brand, true);
});

test("a patron of someone else's page unlocks nothing", async () => {
  mock.identity = identity("Pat Example", tier("t-d", "Diamond", 1199), member("another-campaign", ["t-d"]));
  const s = await patreon.check();
  assert.equal(s.signedIn, true);
  assert.equal(s.basic, false);
  assert.equal(s.brand, false);
});

test("cancelling: the next check finds no entitled tier and both unlocks go off", async () => {
  mock.identity = identity("Pat Example", tier("t-gold", "Gold", 999), member("campaign-1", ["t-gold"]));
  assert.equal((await patreon.check()).brand, true);
  mock.identity = identity("Pat Example", tier("t-gold", "Gold", 999), member("campaign-1", [], "former_patron"));
  const s = await patreon.check();
  assert.equal(s.basic, false);
  assert.equal(s.brand, false);
  assert.equal(s.signedIn, true, "still signed in, just not paying");
});

test("an outage keeps the last good answer and says so, instead of locking a paying patron out", async () => {
  mock.identity = identity("Pat Example", tier("t-gold", "Gold", 999), member("campaign-1", ["t-gold"]));
  assert.equal((await patreon.check()).tier, "gold");
  mock.identity = 503;
  const s = await patreon.check();
  assert.equal(s.tier, "gold");
  assert.equal(s.basic, true);
  assert.match(s.error, /Could not reach Patreon/);
});

test("a revoked login (the refresh is refused) signs the person out", async () => {
  // Make the next token the service holds already expired, then refuse the refresh.
  mock.expiresIn = 1;
  mock.identity = identity("Pat Example", tier("t-gold", "Gold", 999), member("campaign-1", ["t-gold"]));
  const { url } = patreon.login();
  await patreon.callback(callbackUrl(stateOf(url)));
  mock.refreshOk = false;
  const s = await patreon.check();
  assert.equal(s.signedIn, false);
  assert.equal(s.basic, false);
  assert.equal(s.brand, false);
});

test("logout forgets the sign-in", async () => {
  mock.expiresIn = 3600;
  mock.refreshOk = true;
  mock.identity = identity("Pat Example", tier("t-silver", "Silver", 599), member("campaign-1", ["t-silver"]));
  const { url } = patreon.login();
  await patreon.callback(callbackUrl(stateOf(url)));
  assert.equal(patreon.status().signedIn, true);
  const s = patreon.logout();
  assert.equal(s.signedIn, false);
  assert.equal(s.basic, false);
});

test("without the owner's Patreon app, login is refused with a clear 501 and nothing opens", async () => {
  const saved = [process.env.PATREON_CLIENT_ID, process.env.PATREON_CLIENT_SECRET];
  delete process.env.PATREON_CLIENT_ID;
  delete process.env.PATREON_CLIENT_SECRET;
  try {
    const before = opened.length;
    assert.equal(patreon.status().configured, false);
    assert.throws(() => patreon.login(), (e) => e.status === 501 && /not set up/.test(e.message));
    assert.equal(opened.length, before);
  } finally {
    [process.env.PATREON_CLIENT_ID, process.env.PATREON_CLIENT_SECRET] = saved;
  }
});

import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";
import { createServer } from "../server.mjs";

let srv;
let port;

before(async () => {
  srv = createServer({
    host: "127.0.0.1",
    port: 0,
    log: () => {},
    handlers: {
      "GET /api/ping": async () => ({ ok: true }),
      "POST /api/echo": async (body) => ({ body }),
    },
  });
  await srv.listen();
  port = srv.port();
});
after(() => srv.close());

function req(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: "127.0.0.1", port, method, path, headers: { Host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on("error", reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}

test("no Origin is allowed", async () => {
  assert.equal((await req("GET", "/api/ping")).status, 200);
});

test("allowlisted origins get CORS headers", async () => {
  for (const o of ["http://localhost:1420", "http://127.0.0.1:1420", "http://tauri.localhost", "tauri://localhost"]) {
    const r = await req("GET", "/api/ping", { headers: { Origin: o } });
    assert.equal(r.status, 200);
    assert.equal(r.headers["access-control-allow-origin"], o);
  }
});

test("foreign and null origins are rejected", async () => {
  for (const o of ["http://evil.example", "null", "http://localhost:9999"]) {
    assert.equal((await req("GET", "/api/ping", { headers: { Origin: o } })).status, 403);
  }
  const post = await req("POST", "/api/echo", { headers: { Origin: "http://evil.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(post.status, 403);
});

test("POST needs application/json", async () => {
  assert.equal((await req("POST", "/api/echo", { headers: { "Content-Type": "text/plain" }, body: "{}" })).status, 415);
  assert.equal((await req("POST", "/api/echo", { body: "{}" })).status, 415);
  const ok = await req("POST", "/api/echo", { headers: { "Content-Type": "application/json; charset=utf-8" }, body: '{"a":1}' });
  assert.equal(ok.status, 200);
  assert.deepEqual(JSON.parse(ok.body), { body: { a: 1 } });
});

test("foreign Host header is rejected (DNS rebinding)", async () => {
  assert.equal((await req("GET", "/api/ping", { headers: { Host: "evil.example" } })).status, 403);
  assert.equal((await req("GET", "/api/ping", { headers: { Host: `localhost:${port}` } })).status, 200);
});

test("an oversized body is answered with 413 before the connection is cut", async () => {
  const big = JSON.stringify({ pad: "x".repeat(1_100_000) });
  const r = await req("POST", "/api/echo", { headers: { "Content-Type": "application/json" }, body: big }).catch((e) => ({ status: 0, error: e }));
  assert.equal(r.status, 413);
  assert.match(r.body, /too large/i);
});

test("a browser request marked cross-site is rejected, even with no Origin", async () => {
  const r = await req("GET", "/api/ping", { headers: { "Sec-Fetch-Site": "cross-site" } });
  assert.equal(r.status, 403);
  assert.match(r.body, /cross-site/);
  assert.equal((await req("POST", "/api/echo", { headers: { "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" }, body: "{}" })).status, 403);
});

test("an allowlisted Origin is let through even though browsers label it cross-site", async () => {
  // localhost:1420 and tauri.localhost calling 127.0.0.1:8787 are cross-site in Chromium/WebView2.
  for (const origin of ["http://localhost:1420", "http://tauri.localhost", "tauri://localhost"]) {
    const r = await req("GET", "/api/ping", { headers: { Origin: origin, "Sec-Fetch-Site": "cross-site" } });
    assert.equal(r.status, 200, origin);
  }
  const bad = await req("GET", "/api/ping", { headers: { Origin: "http://evil.example", "Sec-Fetch-Site": "cross-site" } });
  assert.equal(bad.status, 403);
});

test("browser return callbacks may arrive cross-site with no Origin", async () => {
  const spotify = await req("GET", "/api/spotify/callback?code=x&state=y", { headers: { "Sec-Fetch-Site": "cross-site" } });
  assert.notEqual(spotify.status, 403);
});

test("same-origin, same-site, none and a missing Sec-Fetch-Site header are all allowed", async () => {
  for (const v of ["same-origin", "same-site", "none"]) {
    assert.equal((await req("GET", "/api/ping", { headers: { "Sec-Fetch-Site": v } })).status, 200, v);
  }
  assert.equal((await req("GET", "/api/ping")).status, 200);
});

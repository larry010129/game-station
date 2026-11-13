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

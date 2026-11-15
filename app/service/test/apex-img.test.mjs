import test from "node:test";
import assert from "node:assert/strict";
import { proxyApexImg } from "../apex-img.mjs";

test("rejects an unknown kind or a slug outside the allowlist pattern", async () => {
  for (const [kind, slug] of [["other", "wraith"], ["legend", "../etc"], ["weapon", ""], ["legend", undefined]]) {
    await assert.rejects(() => proxyApexImg(kind, slug), (e) => e.status === 400);
  }
});

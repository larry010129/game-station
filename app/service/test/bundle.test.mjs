import test from "node:test";
import assert from "node:assert/strict";
import { bundleItems, similar } from "../bundle.mjs";

test("similar: same leak worded differently matches, different heroes do not", () => {
  assert.ok(similar("Anran voice lines datamined in Overwatch 2", "Anran voice lines leaked, Hero 46 may arrive Season 21"));
  assert.ok(!similar("Anran voice lines datamined", "Vendetta leak reveals character death"));
  assert.ok(!similar("Overwatch leak", "Overwatch 2 leak"));
});

test("bundleItems merges repeats, keeps the strongest status and an x.com link", () => {
  const out = bundleItems([
    { title: "Anran voice lines found in game files", status: "rumor", summary: "short", source: "SiteA", url: "https://a.example/1", date: "" },
    { title: "Anran voice lines found in files, Season 21", status: "leak", summary: "a longer summary here", source: "@OverFire", url: "https://x.com/OverFire/status/1", date: "2026-01-14" },
    { title: "Vendetta leak", status: "leak", summary: "", source: "Reddit", url: "https://r.example/2", date: "" },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].status, "leak");
  assert.equal(out[0].url, "https://x.com/OverFire/status/1");
  assert.deepEqual(out[0].also.map((s) => s.source), ["SiteA"]);
  assert.equal(out[0].date, "2026-01-14");
});

test("bundleItems: feed headlines only join a matching leak, never add one", () => {
  const out = bundleItems(
    [{ title: "Anran voice lines found in game files", status: "leak", summary: "", source: "SiteA", url: "https://a.example/1", date: "" }],
    [
      { title: "Anran voice lines in game files, reddit thread", source: "r/OverwatchLeaks", url: "https://reddit.com/x" },
      { title: "Overwatch shop rotation countdown", source: "Junk", url: "https://j.example" },
    ],
  );
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].also.map((s) => s.source), ["r/OverwatchLeaks"]);
});

test("bundleItems: the same publisher is not listed again as another source", () => {
  const out = bundleItems(
    [{ title: "Season 6 hero name slipped by director", status: "leak", summary: "", source: "PC Gamer", url: "https://www.pcgamer.com/a", date: "" }],
    [{ title: "Overwatch creative director leaks the name of season 6 hero", source: "PC Gamer", url: "https://news.google.com/rss/articles/9" }],
  );
  assert.deepEqual(out[0].also, []);
});

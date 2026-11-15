import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTracked, applyTracked } from "../tracked.mjs";
import { DEFAULTS, validateFeed } from "../config.mjs";
import { createSettings } from "../settings.mjs";

const n = (platform, value) => normalizeTracked({ platform, value });

test("normalizeTracked: names and links reduce to the stored short form", () => {
  assert.equal(n("x", "@SkaVorah").value, "SkaVorah");
  assert.equal(n("x", "https://x.com/SkaVorah/status/123").value, "SkaVorah");
  assert.ok(n("x", "not a handle!").error);
  assert.ok(n("x", "https://evil.example/Ska").error);
  assert.equal(n("youtube", "https://www.youtube.com/@SomeChannel/videos").value, "@SomeChannel");
  assert.equal(n("youtube", "SomeChannel").value, "@SomeChannel");
  assert.equal(n("youtube", "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv").value, "UCabcdefghijklmnopqrstuv");
  assert.equal(n("reddit", "r/Overwatch").value, "Overwatch");
  assert.equal(n("reddit", "https://www.reddit.com/r/CompetitiveOverwatch/").value, "CompetitiveOverwatch");
  assert.equal(n("website", "https://www.PCGamer.com/news").value, "pcgamer.com");
  assert.ok(n("website", "nodots").error);
  assert.ok(normalizeTracked({ platform: "tiktok", value: "a" }).error);
  assert.ok(n("x", "  ").error);
});

test("applyTracked: tracked sources go on top of the built-in lists, without repeats", () => {
  const f = { ...DEFAULTS.feed, tracked: [{ platform: "x", value: "NewLeaker", note: "" }, { platform: "x", value: "skavorah", note: "" }, { platform: "youtube", value: "@Chan", note: "n" }, { platform: "reddit", value: "OverwatchUniversity", note: "" }, { platform: "website", value: "pcgamer.com", note: "" }] };
  applyTracked(f);
  assert.equal(f.x.filter((x) => x.handle.toLowerCase() === "skavorah").length, 1);
  assert.ok(f.x.some((x) => x.handle === "NewLeaker" && x.kind === "leak"));
  assert.ok(f.youtube.some((y) => y.handle === "@Chan" && y.kind === "leak"));
  assert.ok(f.reddit.some((r) => r.sub === "OverwatchUniversity"));
  assert.ok(f.trusted.some((t) => t.name === "pcgamer.com") && f.trusted.some((t) => t.name === "Blizzard"));
  // removing everything puts the built-in lists back
  f.tracked = [];
  applyTracked(f);
  assert.ok(!f.x.some((x) => x.handle === "NewLeaker"));
});

test("normalizeTracked and applyTracked: kind tags Official / Leak / News", () => {
  assert.equal(normalizeTracked({ platform: "x", value: "@NewsDesk", kind: "news" }).kind, "news");
  assert.equal(normalizeTracked({ platform: "x", value: "@Blizz", kind: "official" }).kind, "official");
  assert.equal(normalizeTracked({ platform: "x", value: "@Someone", kind: "nope" }).kind, "leak");
  assert.equal(normalizeTracked({ platform: "youtube", value: "@Vid", kind: "video" }).kind, "video");
  assert.equal(normalizeTracked({ platform: "reddit", value: "Overwatch", kind: "leak" }).kind, "leak");
  assert.equal(normalizeTracked({ platform: "website", value: "pcgamer.com", kind: "news" }).kind, undefined);

  const f = {
    ...DEFAULTS.feed,
    tracked: [
      { platform: "x", value: "NewsDesk", note: "", kind: "news" },
      { platform: "x", value: "OfficialFan", note: "", kind: "official" },
      { platform: "youtube", value: "@Analysis", note: "", kind: "video" },
      { platform: "reddit", value: "OWNews", note: "", kind: "community" },
    ],
  };
  applyTracked(f);
  assert.ok(f.x.some((x) => x.handle === "NewsDesk" && x.kind === "news"));
  assert.ok(f.x.some((x) => x.handle === "OfficialFan" && x.kind === "official"));
  assert.ok(f.youtube.some((y) => y.handle === "@Analysis" && y.kind === "video"));
  assert.ok(f.reddit.some((r) => r.sub === "OWNews" && r.kind === "community"));
});

test("settings: tracked kind is saved and builtins expose role tags", () => {
  const config = { closeApps: [], games: ["Overwatch.exe"], disabledSteps: [], feed: validateFeed(undefined, []) };
  let disk = { games: ["Overwatch.exe"], feed: { refreshMs: 120000 } };
  const s = createSettings(config, () => {}, { file: "c.json", readText: () => JSON.stringify(disk), readJson: () => disk, writeJson: (_f, d) => (disk = d) });
  const v = s.update({ tracked: [{ platform: "x", value: "@NewsDesk", note: "OW news", kind: "news" }] });
  assert.deepEqual(disk.feed.tracked, [{ platform: "x", value: "NewsDesk", note: "OW news", kind: "news" }]);
  assert.ok(config.feed.x.some((x) => x.handle === "NewsDesk" && x.kind === "news"));
  assert.ok(v.builtinX.some((x) => x.handle === "OWCavalry" && x.kind === "news"));
  assert.ok(v.builtinX.some((x) => x.handle === "PlayOverwatch" && x.kind === "official" && x.trusted));
  assert.ok(v.builtinX.some((x) => x.handle === "wiki_ow" && x.kind === "leak" && x.trusted));
  assert.ok(v.builtinYoutube.some((y) => y.name === "PlayOverwatch" && y.kind === "video" && y.trusted));
  assert.ok(v.builtinYoutube.some((y) => y.name === "YourOverwatch" && y.kind === "video"));
  assert.ok(v.builtinYoutube.some((y) => y.name === "Stylosa" && y.kind === "video"));
  assert.ok(v.builtinReddit.some((r) => r.sub === "Overwatch" && r.kind === "community"));
  assert.ok(v.builtinReddit.some((r) => r.sub === "Overwatch_Leaks" && r.kind === "leak"));
  assert.ok(v.builtin.every((t) => t.name !== "_FireMonkey"));
  assert.deepEqual(
    v.builtin.map((t) => t.name),
    ["Blizzard", "PlayOverwatch", "wiki_ow", "SkaVorah"],
  );
});

test("validateFeed reads feed.tracked and reports a bad entry", () => {
  const problems = [];
  const f = validateFeed({ tracked: [{ platform: "x", value: "@Ska" }, { platform: "x", value: "bad handle" }] }, problems);
  assert.deepEqual(f.tracked.map((t) => t.value), ["Ska"]);
  assert.ok(f.x.some((x) => x.handle === "Ska"));
  assert.equal(problems.length, 1);
});

test("settings: tracked sources are saved to feed.tracked, apply live, and keep the rest of config.json", () => {
  const config = { closeApps: [], games: ["Overwatch.exe"], disabledSteps: [], feed: validateFeed(undefined, []) };
  let disk = { games: ["Overwatch.exe"], feed: { refreshMs: 120000 } };
  const s = createSettings(config, () => {}, { file: "c.json", readText: () => JSON.stringify(disk), readJson: () => disk, writeJson: (_f, d) => (disk = d) });
  const v = s.update({ tracked: [{ platform: "x", value: "@NewLeaker", note: "datamines" }] });
  assert.deepEqual(disk.feed, { refreshMs: 120000, tracked: [{ platform: "x", value: "NewLeaker", note: "datamines", kind: "leak" }] });
  assert.ok(config.feed.x.some((x) => x.handle === "NewLeaker"));
  assert.ok(config.feed.trusted.some((t) => t.name === "NewLeaker" && t.note === "datamines"));
  assert.equal(v.tracked.length, 1);
  assert.ok(v.builtin.length > 0);
  assert.throws(() => s.update({ tracked: [{ platform: "x", value: "bad handle!" }] }), /X handle/);
  s.update({ tracked: [] });
  assert.ok(!config.feed.x.some((x) => x.handle === "NewLeaker"));
});

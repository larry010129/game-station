import test from "node:test";
import assert from "node:assert/strict";
import { trustedMatch } from "../trusted.mjs";
import { parseYouTubeAtom, parseYouTubeChannelId } from "../parsers.mjs";
import { validateFeed } from "../config.mjs";

const list = [{ name: "SkaVorah" }, { name: "PlayOverwatch" }, { name: "pcgamer.com" }, { name: "Blizzard" }];

test("trustedMatch: by x.com link, @source, site domain, or a bundled extra source", () => {
  assert.equal(trustedMatch({ source: "someone", url: "https://x.com/SkaVorah/status/1" }, list)?.name, "SkaVorah");
  assert.equal(trustedMatch({ source: "@skavorah", url: "" }, list)?.name, "SkaVorah");
  assert.equal(trustedMatch({ source: "PC Gamer", url: "https://www.pcgamer.com/a" }, list)?.name, "pcgamer.com");
  assert.equal(trustedMatch({ source: "x", url: "https://a.example", also: [{ source: "Blizzard", url: "" }] }, list)?.name, "Blizzard");
  assert.equal(trustedMatch({ source: "randomleaker", url: "https://x.com/randomleaker/status/1" }, list), null);
  assert.equal(trustedMatch({ source: "x", url: "https://x.com/SkaVorahFake/status/1" }, list), null);
});

test("YouTube: channel id from a page, leak channels and leak titles are tagged leak", () => {
  assert.equal(parseYouTubeChannelId('x"channelId":"UCabcdefghijklmnopqrstuv"y'), "UCabcdefghijklmnopqrstuv");
  const xml = (t) => `<feed><entry><yt:videoId>v1</yt:videoId><title>${t}</title><published>2026-11-10T19:16:02+00:00</published></entry></feed>`;
  assert.equal(parseYouTubeAtom(xml("Hero 47 datamine"), "C", "video")[0].kind, "leak");
  assert.equal(parseYouTubeAtom(xml("Gameplay montage"), "C", "video")[0].kind, "video");
  assert.equal(parseYouTubeAtom(xml("Gameplay montage"), "C", "leak")[0].kind, "leak");
});

test("config: youtube accepts a @handle or link, and trusted entries are validated", () => {
  const problems = [];
  const f = validateFeed({ youtube: [{ handle: "@SomeChannel", kind: "leak" }, { url: "https://www.youtube.com/@Other" }, { url: "https://evil.example/@x" }, {}], trusted: [{ name: "A", note: "n" }, { name: "" }, { x: 1 }] }, problems);
  assert.deepEqual(f.youtube.map((y) => [y.name, y.kind]), [["@SomeChannel", "leak"], ["https://www.youtube.com/@Other", "video"]]);
  assert.deepEqual(f.trusted, [{ name: "A", note: "n" }]);
  assert.equal(problems.length, 4);
});

test("trustedMatch: a trusted name inside a longer source line counts, a partial word does not", () => {
  const l = [{ name: "SkaVorah" }, { name: "Blizzard" }];
  assert.equal(trustedMatch({ source: "Gfinity Esports, citing SkaVorah on X", url: "" }, l)?.name, "SkaVorah");
  assert.equal(trustedMatch({ source: "Blizzard News", url: "" }, l)?.name, "Blizzard");
  assert.equal(trustedMatch({ source: "NotSkaVorahFan", url: "" }, l), null);
  assert.equal(trustedMatch({ source: "Dexerto", url: "" }, l), null);
});

test("trustedMatch: a site that only mentions a trusted name is not trusted", () => {
  const l = [{ name: "Blizzard" }, { name: "SkaVorah" }];
  assert.equal(trustedMatch({ source: "esportnow.gg (reporting Blizzard's announcement)", url: "" }, l), null);
  assert.equal(trustedMatch({ source: "GGRecon (reporting Blizzard's Director)", url: "" }, l), null);
  assert.equal(trustedMatch({ source: "SkaVorah on X, via Gfinity Esports", url: "" }, l)?.name, "SkaVorah");
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { machineName } from "../sensors.mjs";
import { createSettings } from "../settings.mjs";
import { DEFAULTS, validateFeed } from "../config.mjs";
import { createFeed } from "../feed.mjs";
import { killTree, spawnDetached, spawnSafe } from "../spawn.mjs";
import { VERSION } from "../constants.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const service = path.join(here, "..");
const readme = fs.readFileSync(path.join(service, "..", "README.md"), "utf8");

// ---- README stays in step with the handlers ---------------------------------------------

const handlerKeys = [...fs.readFileSync(path.join(service, "routes.mjs"), "utf8").matchAll(/^\s*"((?:GET|POST) \/api\/[^"]+)":/gm)].map((m) => m[1]);

test("routes.mjs registers handlers the test can see", () => {
  assert.ok(handlerKeys.length > 20, `found only ${handlerKeys.length} handler keys`);
});

test("every handler key is documented in README.md", () => {
  const missing = handlerKeys.filter((k) => !readme.includes(`\`${k}\``));
  assert.deepEqual(missing, [], `add these to the Service API table in README.md: ${missing.join(", ")}`);
});

test("README.md documents no endpoint that no longer exists", () => {
  const table = readme.slice(readme.indexOf("## Service API"), readme.indexOf("## Config"));
  const documented = [...table.matchAll(/`((?:GET|POST) \/api\/[^`]+)`/g)].map((m) => m[1]);
  const stale = documented.filter((k) => !handlerKeys.includes(k));
  assert.deepEqual(stale, [], `remove these from README.md: ${stale.join(", ")}`);
});

test("version comes from package.json", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(service, "..", "package.json"), "utf8"));
  assert.equal(VERSION, pkg.version);
});

// ---- settings.mjs -----------------------------------------------------------------------

function settingsEnv(overrides = {}, rawText = null) {
  const config = { closeApps: ["OneDrive.exe"], games: ["Overwatch.exe"], disabledSteps: [], corrupt: false, ...overrides };
  const disk = { file: { port: 9999, extra: "keep me", games: ["Overwatch.exe"] }, writes: 0 };
  const s = createSettings(config, () => {}, {
    file: "config.json",
    readJson: () => disk.file,
    readText: () => rawText,
    writeJson: (_f, v) => {
      disk.file = v;
      disk.writes++;
    },
  });
  return { config, disk, s };
}

const status = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return null;
};

test("settings: saves a valid change, keeps unknown keys, applies it live", () => {
  const { config, disk, s } = settingsEnv();
  const v = s.update({ closeApps: ["Foo", "bar.exe", "foo.exe"], disabledSteps: ["gpu", "gpu"] });
  assert.deepEqual(v.closeApps, ["Foo.exe", "bar.exe"]);
  assert.deepEqual(v.disabledSteps, ["gpu"]);
  assert.deepEqual(config.closeApps, ["Foo.exe", "bar.exe"]);
  assert.equal(disk.file.extra, "keep me");
  assert.equal(disk.file.port, 9999);
});

test("settings: refuses protected programs, bad names, unknown steps and an empty game list", () => {
  const { disk, s } = settingsEnv();
  assert.equal(status(() => s.update({ closeApps: ["explorer.exe"] })), 400);
  assert.equal(status(() => s.update({ closeApps: ["bad;name"] })), 400);
  assert.equal(status(() => s.update({ closeApps: "nope" })), 400);
  assert.equal(status(() => s.update({ disabledSteps: ["nuke"] })), 400);
  assert.equal(status(() => s.update({ games: [] })), 400);
  assert.equal(status(() => s.update(null)), 400);
  assert.equal(disk.writes, 0);
});

test("settings: a corrupt config.json is never overwritten", () => {
  const { disk, s } = settingsEnv({ corrupt: true });
  assert.equal(s.view().corrupt, true);
  assert.equal(status(() => s.update({ closeApps: ["Foo.exe"] })), 409);
  assert.equal(disk.writes, 0);
});

test("settings: a config.json damaged after startup is refused with 409 and not overwritten", () => {
  const { config, disk, s } = settingsEnv({}, "{ not json");
  assert.equal(config.corrupt, false);
  assert.equal(status(() => s.update({ closeApps: ["Foo.exe"] })), 409);
  assert.equal(disk.writes, 0);
  assert.equal(s.view().corrupt, true);
});

test("settings: a valid raw file and a missing file both allow saving", () => {
  assert.equal(status(() => settingsEnv({}, '{"port":1}').s.update({ closeApps: ["Foo.exe"] })), null);
  assert.equal(status(() => settingsEnv({}, null).s.update({ closeApps: ["Foo.exe"] })), null);
});

// ---- feed config ------------------------------------------------------------------------

test("validateFeed: no feed block gives the defaults", () => {
  const problems = [];
  assert.deepEqual(validateFeed(undefined, problems), DEFAULTS.feed);
  assert.deepEqual(problems, []);
});

test("validateFeed: unusable values fall back to defaults and are reported", () => {
  const problems = [];
  for (const refreshMs of [0, "30m", -5, 1000, NaN, Infinity]) {
    assert.equal(validateFeed({ refreshMs }, problems).refreshMs, DEFAULTS.feed.refreshMs, String(refreshMs));
  }
  assert.equal(validateFeed({ redditGapMs: "x" }, problems).redditGapMs, DEFAULTS.feed.redditGapMs);
  assert.equal(validateFeed({ newsUrl: "javascript:alert(1)" }, problems).newsUrl, DEFAULTS.feed.newsUrl);
  assert.deepEqual(validateFeed({ reddit: "Overwatch" }, problems).reddit, DEFAULTS.feed.reddit);
  assert.deepEqual(validateFeed("nope", problems), DEFAULTS.feed);
  assert.ok(problems.length >= 10);
});

test("validateFeed: keeps good values, drops bad list entries", () => {
  const problems = [];
  const f = validateFeed(
    {
      refreshMs: 120_000,
      redditGapMs: 0,
      reddit: [{ sub: "Overwatch2" }, { sub: "a/b" }, { sub: "x y" }, null],
      youtube: [{ channelId: "UCabc-_1", name: "Chan" }, { channelId: "bad id" }, { name: "none" }],
    },
    problems,
  );
  assert.equal(f.refreshMs, 120_000);
  assert.equal(f.redditGapMs, 0);
  assert.deepEqual(f.reddit, [{ sub: "Overwatch2", kind: "community" }]);
  assert.deepEqual(f.youtube, [{ channelId: "UCabc-_1", name: "Chan", kind: "video" }]);
  assert.equal(problems.length, 5);
});

test("validateFeed: older built-in-only lists pick up new default sources", () => {
  const problems = [];
  const f = validateFeed(
    {
      reddit: [
        { sub: "Overwatch", kind: "community" },
        { sub: "CompetitiveOverwatch", kind: "community" },
      ],
      youtube: [{ channelId: "UClOf1XXinvZsy4wKPAkro2A", name: "PlayOverwatch" }],
      newsSearch: ["Overwatch leak", "Overwatch season leak", "Overwatch rumor"],
      x: [
        { handle: "PlayOverwatch", kind: "official" },
        { handle: "wiki_ow", kind: "leak" },
        { handle: "SkaVorah", kind: "leak" },
      ],
      tracked: [{ platform: "x", value: "MyLeaker", note: "keep me" }],
    },
    problems,
  );
  assert.ok(f.reddit.some((r) => r.sub === "Overwatch_Leaks" && r.kind === "leak"));
  assert.ok(f.youtube.some((y) => y.handle === "@YourOverwatch"));
  assert.ok(f.youtube.some((y) => y.handle === "@stylosa"));
  assert.deepEqual(f.newsSearch, DEFAULTS.feed.newsSearch);
  assert.ok(f.tracked.some((t) => t.value === "MyLeaker"));
  assert.ok(f.x.some((x) => x.handle === "MyLeaker"));
  assert.ok(f.x.some((x) => x.handle === "OWCavalry" && x.kind === "news"));
  assert.ok(f.x.some((x) => x.handle === "OmnicPost" && x.kind === "news"));
  assert.deepEqual(problems, []);
});

test("validateFeed: built-in-only x list picks up news accounts and keeps role kinds", () => {
  const problems = [];
  const f = validateFeed(
    {
      x: [
        { handle: "PlayOverwatch" },
        { handle: "wiki_ow", kind: "leak" },
        { handle: "SkaVorah", kind: "leak" },
      ],
    },
    problems,
  );
  assert.equal(f.x.find((x) => x.handle === "PlayOverwatch")?.kind, "official");
  assert.equal(f.x.find((x) => x.handle === "wiki_ow")?.kind, "leak");
  assert.equal(f.x.find((x) => x.handle === "SkaVorah")?.kind, "leak");
  assert.ok(f.x.some((x) => x.handle === "OWCavalry" && x.kind === "news"));
  assert.ok(f.x.some((x) => x.handle === "OmnicPost" && x.kind === "news"));
  assert.ok(!f.x.some((x) => x.handle === "_FireMonkey" || x.handle === "Naeri"));
  assert.deepEqual(problems, []);
});

test("validateFeed: retires Fortnite-primary handles and soft-merges trusted", () => {
  const problems = [];
  const f = validateFeed(
    {
      x: [
        { handle: "PlayOverwatch", kind: "official" },
        { handle: "wiki_ow", kind: "leak" },
        { handle: "SkaVorah", kind: "leak" },
        { handle: "_FireMonkey", kind: "leak" },
        { handle: "Naeri", kind: "leak" },
      ],
      trusted: [
        { name: "Blizzard" },
        { name: "PlayOverwatch" },
        { name: "SkaVorah" },
        { name: "_FireMonkey" },
      ],
    },
    problems,
  );
  assert.ok(!f.x.some((x) => x.handle === "_FireMonkey" || x.handle === "Naeri"));
  assert.ok(f.x.some((x) => x.handle === "OWCavalry" && x.kind === "news"));
  assert.ok(f.x.some((x) => x.handle === "OmnicPost" && x.kind === "news"));
  assert.ok(!f.trusted.some((t) => t.name === "_FireMonkey"));
  assert.ok(f.trusted.some((t) => t.name === "wiki_ow"));
  assert.deepEqual(problems, []);
});

test("validateFeed: custom x list is left alone (no wipe, no forced append)", () => {
  const problems = [];
  const f = validateFeed({ x: [{ handle: "OnlyMine", kind: "news" }] }, problems);
  assert.deepEqual(
    f.x.map((x) => [x.handle, x.kind]),
    [["OnlyMine", "news"]],
  );
  assert.deepEqual(problems, []);
});

test("feed: the subreddit is URL-encoded and a missing reddit list does not crash", async () => {
  const urls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u) => {
    urls.push(String(u));
    throw new Error("offline");
  };
  try {
    const cfg = { ...DEFAULTS.feed, youtube: [], redditGapMs: 0, reddit: [{ sub: "a/b?x", kind: "community" }] };
    await createFeed({ feed: cfg }, () => {}).refresh();
    assert.ok(urls.some((u) => u === "https://www.reddit.com/r/a%2Fb%3Fx/.rss"), JSON.stringify(urls));
    const { reddit: _r, ...noReddit } = cfg;
    await createFeed({ feed: noReddit }, () => {}).refresh();
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ---- spawn helpers ----------------------------------------------------------------------

test("spawnDetached and spawnSafe survive a program that does not exist", async () => {
  const logs = [];
  const missing = "command-station-no-such-program-xyz";
  assert.doesNotThrow(() => spawnDetached(missing, [], {}, (m) => logs.push(m), "ghost"));
  const child = spawnSafe(missing, [], { stdio: "ignore" }, (m) => logs.push(m), "ghost2");
  // The async "error" event would be an uncaught exception without the listener.
  await new Promise((resolve) => (child ? child.once("error", resolve) : resolve()));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(logs.some((l) => l.startsWith("ghost")), `expected a log line, got ${JSON.stringify(logs)}`);
});

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test("killTree ends the grandchildren too (Windows)", { skip: process.platform !== "win32" }, async () => {
  const grand = "setInterval(() => {}, 1000)";
  const parent = `const { spawn } = require("node:child_process"); const g = spawn(process.execPath, ["-e", ${JSON.stringify(grand)}], { stdio: "ignore" }); console.log(g.pid); setInterval(() => {}, 1000)`;
  const logs = [];
  const child = spawnSafe(process.execPath, ["-e", parent], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true }, (m) => logs.push(m), "tree test");
  const grandPid = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("grandchild pid never printed")), 8000);
    child.stdout.once("data", (d) => {
      clearTimeout(t);
      resolve(Number(String(d).trim()));
    });
  });
  assert.ok(grandPid > 0 && alive(grandPid), "grandchild is running");
  killTree(child, (m) => logs.push(m));
  const deadline = Date.now() + 8000;
  while (alive(grandPid) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  const stillAlive = alive(grandPid);
  if (stillAlive) process.kill(grandPid); // do not leave it running if the assertion is about to fail
  assert.equal(stillAlive, false, `grandchild survived; logs: ${JSON.stringify(logs)}`);
});

test("killTree on a null or already-exited child does nothing", () => {
  assert.doesNotThrow(() => killTree(null));
  assert.doesNotThrow(() => killTree({ exitCode: 0 }));
});

// ---- machine name -----------------------------------------------------------------------

test("machineName: tidies maker, model, CPU and GPU", () => {
  const m = machineName({
    maker: "ASUSTeK COMPUTER INC.",
    model: "ASUS TUF Gaming A16 FA608WI_FA608WI",
    cpuModel: "AMD Ryzen 9 8940HX with Radeon Graphics",
    gpuName: "NVIDIA GeForce RTX 5060 Laptop GPU",
    hostname: "PC",
  });
  assert.deepEqual(m, { name: "ASUS TUF Gaming A16", cpu: "Ryzen 9 8940HX", gpu: "RTX 5060" });
});

test("machineName: a brand with regex characters cannot throw, and blanks fall back", () => {
  assert.doesNotThrow(() => machineName({ maker: "(Evil [Corp] +*?", model: "(Evil [Corp] +*? Box", gpuName: null }));
  const m = machineName({ maker: "", model: "", cpuModel: "", gpuName: null, hostname: "MYPC" });
  assert.deepEqual(m, { name: "MYPC", cpu: "CPU", gpu: "GPU" });
});

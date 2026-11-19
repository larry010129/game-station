import assert from "node:assert/strict";
import test from "node:test";
import {
  WEAPON_CATALOG,
  catalogGunsFallback,
  parseAlsPickRates,
  parseAlsWeaponsMeta,
  slugifyLegend,
} from "../apex-meta-parse.mjs";
import { createApexMeta } from "../apex-meta.mjs";

const SAMPLE = `
<h5>Legend popularity - <i>based on 35 M players in our API database</i></h5>
<div class="legends-banner">
Pathfinder<br /><span style="font-size: 36px;">12.9%</span><br /><span style="font-size: 16px;"><span style="font-size: 12px;"><span style="color: green";>▲</span>9.38%</span></span><br /><span style="font-size: 12px; font-weight: 500;">Avg rank <span style="font-weight: 600; color: gold;">Gold 1</span> | level <span style="font-weight: 600; color: #af56e3;">802</span></span>
Gibraltar<br /><span style="font-size: 36px;">2%</span><br /><span style="font-size: 16px;"><span style="font-size: 12px;"><span style="color: green";>▲</span>4.11%</span></span><br /><span style="font-size: 12px; font-weight: 500;">Avg rank <span style="font-weight: 600; color: gold;">Gold 2</span> | level <span style="font-weight: 600; color: #af56e3;">717</span></span>
Newcastle<br /><span style="font-size: 36px;">0.8%</span><br /><span style="font-size: 16px;"><span style="font-size: 12px;"><span style="color: green";>▲</span>5.54%</span></span><br /><span style="font-size: 12px; font-weight: 500;">Avg rank <span style="font-weight: 600; color: gold;">Gold 3</span> | level <span style="font-weight: 600; color: #af56e3;">681</span></span>
Revenant<br /><span style="font-size: 36px;">7.9%</span><br /><span style="font-size: 16px;"><span style="font-size: 12px;"><span style="color: red";>▼</span>19.77%</span></span><br /><span style="font-size: 12px; font-weight: 500;">Avg rank <span style="font-weight: 600; color: gold;">Gold 1</span> | level <span style="font-weight: 600; color: #af56e3;">804</span></span>
</div>
`;

const WEAPONS_SAMPLE = {
  builds: [
    {
      game_count: 63,
      parsed: { season: 30.1, build: "J65", build_date: "2026_10_02" },
      weapons: [
        { weapon: "Nemesis", usage_count: 120, encounter_win_rate: 70.22, total_kills: 547, total_damage: 1, down_share: 17.63 },
        { weapon: "Prowler", usage_count: 119, encounter_win_rate: 52.59, total_kills: 1686, total_damage: 1, down_share: 45.58 },
        { weapon: "C.A.R.", usage_count: 117, encounter_win_rate: 46.97, total_kills: 363, total_damage: 1, down_share: 10.38 },
        { weapon: "Melee", usage_count: 0, encounter_win_rate: 0, total_kills: 0, total_damage: 0, down_share: 0 },
        { weapon: "R-99", usage_count: 50, encounter_win_rate: 45.54, total_kills: 38, total_damage: 1, down_share: 1.04 },
        { weapon: "Kraber", usage_count: 40, encounter_win_rate: 68.35, total_kills: 31, total_damage: 1, down_share: 1.22 },
        { weapon: "EVA-8", usage_count: 3, encounter_win_rate: 50, total_kills: 3, total_damage: 1, down_share: 0.07 },
      ],
    },
  ],
};

test("slugifyLegend hyphenates Mad Maggie", () => {
  assert.equal(slugifyLegend("Mad Maggie"), "mad-maggie");
});

test("parseAlsPickRates reads pick %, 7d delta, avg rank", () => {
  const { legends, sampleLabel } = parseAlsPickRates(SAMPLE);
  assert.equal(sampleLabel, "35 M");
  assert.equal(legends.length, 4);
  const pf = legends.find((h) => h.slug === "pathfinder");
  assert.ok(pf);
  assert.equal(pf.role, "Skirmisher");
  assert.equal(pf.pickRate, 0.129);
  assert.equal(pf.pickDeltaDir, "up");
  assert.equal(pf.avgRank, "Gold 1");
  const gib = legends.find((h) => h.slug === "gibraltar");
  assert.equal(gib.role, "Support");
  assert.equal(gib.pickRate, 0.02);
  const nc = legends.find((h) => h.slug === "newcastle");
  assert.equal(nc.pickRate, 0.008);
  const rev = legends.find((h) => h.slug === "revenant");
  assert.equal(rev.pickDeltaDir, "down");
});

test("weapon catalog covers full BR floor arsenal", () => {
  assert.equal(Object.keys(WEAPON_CATALOG).length, 29);
  assert.equal(catalogGunsFallback().length, 29);
  for (const key of ["R-99", "Hemlok", "Nemesis", "Kraber", "Spitfire", "RE-45", "30-30"]) {
    assert.ok(WEAPON_CATALOG[key], `missing ${key}`);
  }
});

test("parseAlsWeaponsMeta uses usage share and skips Melee", () => {
  const { guns, patchLabel, gameCount } = parseAlsWeaponsMeta(WEAPONS_SAMPLE);
  assert.equal(gameCount, 63);
  assert.match(patchLabel, /ALGS S30\.1/);
  assert.equal(guns.length, Object.keys(WEAPON_CATALOG).length);
  assert.ok(!guns.some((g) => g.alsKey === "Melee"));
  const nem = guns.find((g) => g.slug === "nemesis");
  assert.ok(nem);
  assert.equal(nem.imgSlug, "nemesis");
  assert.ok(Math.abs(nem.pickRate - 120 / 449) < 1e-9);
  assert.ok(Math.abs(nem.winRate - 0.7022) < 1e-9);
  assert.equal(guns[0].slug, "nemesis");
  const car = guns.find((g) => g.slug === "car");
  assert.equal(car.name, "CAR SMG");
  const flat = guns.find((g) => g.slug === "flatline");
  assert.equal(flat.pickRate, null);
});

test("createApexMeta heroDetail does not fabricate combat or counters", async () => {
  const meta = createApexMeta(null, {
    fetch: async (url) => {
      if (String(url).includes("weaponsmeta")) {
        return { ok: true, json: async () => WEAPONS_SAMPLE };
      }
      return { ok: true, text: async () => SAMPLE };
    },
    file: `${process.env.TEMP}/apex-meta-test-${Date.now()}.json`,
  });
  await meta.refresh();
  const d = await meta.heroDetail("gibraltar", { mode: "br" });
  assert.equal(d.name, "Gibraltar");
  assert.equal(d.role, "Support");
  assert.equal(d.pickRate, 0.02);
  assert.equal(d.winRate, null);
  assert.equal(d.stats.kills, null);
  // Kit axes are POKE/DIVE/SUSTAIN (class heuristic stubs — not ALS combat stats).
  assert.equal(d.archetype.RUSH, undefined);
  assert.equal(d.archetype.SUSTAIN, 0.85);
  assert.equal(d.archetype.DIVE, 0.3);
  assert.equal(d.lean, "SUSTAIN");
  assert.match(d.leanBlurb, /heuristic/i);
  assert.equal(d.counters.losesTo.length, 0);
  assert.equal(d.topMaps.length, 0);
  assert.match(d.img, /kind=legend&slug=gibraltar/);
  const pf = await meta.heroDetail("pathfinder", { mode: "br" });
  assert.equal(pf.popularityRank, 1);
  assert.equal(pf.lean, "DIVE");
  assert.ok(pf.classPeers.every((p) => p.role === "Skirmisher"));

  const snap = meta.snapshot("br");
  assert.equal(snap.guns.length, Object.keys(WEAPON_CATALOG).length);
  assert.ok(snap.gunTiers.length >= 3);
  assert.equal(snap.gunTiers[0].heroes[0].slug, "nemesis");
  assert.match(snap.note, /ALGS usage share/i);
  assert.match(snap.guns.find((g) => g.slug === "r-99").img, /slug=r99/);
  assert.ok(snap.picks.some((p) => p.role === "SMG" && p.top?.slug === "prowler"));
});

test("createApexMeta keeps full catalog when weapons scrape fails", async () => {
  const meta = createApexMeta(null, {
    fetch: async (url) => {
      if (String(url).includes("weaponsmeta")) {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      return { ok: true, text: async () => SAMPLE };
    },
    file: `${process.env.TEMP}/apex-meta-guns-fallback-${Date.now()}.json`,
  });
  await meta.refresh();
  const snap = meta.snapshot("br");
  assert.equal(snap.guns.length, 29);
  assert.match(snap.note, /full BR roster catalog|rates omitted/i);
  assert.equal(snap.guns.every((g) => g.pickRate == null), true);
});

const sampleFetch = (calls) => async (url) => {
  calls?.push(String(url));
  if (String(url).includes("weaponsmeta")) return { ok: true, json: async () => WEAPONS_SAMPLE };
  return { ok: true, text: async () => SAMPLE };
};

test("C3: Apex has no per-rank pick rates, so a chosen rank answers empty instead of showing all ranks under its name", async () => {
  const meta = createApexMeta(null, { fetch: sampleFetch(), file: `${process.env.TEMP}/apex-meta-rank-${Date.now()}.json` });
  await meta.refresh();
  const all = await meta.rank("All");
  assert.equal(all.empty, false);
  const diamond = await meta.rank("Diamond");
  assert.equal(diamond.empty, true);
  assert.deepEqual(diamond.tiers, []);
});

test("C9: Apex meta re-scrapes once its data is a day old while the app stays open", async () => {
  const calls = [];
  let clock = Date.parse("2026-11-16T12:00:00Z");
  const ticks = [];
  const meta = createApexMeta(null, {
    fetch: sampleFetch(calls),
    file: `${process.env.TEMP}/apex-meta-stale-${Date.now()}.json`,
    now: () => clock,
    setInterval: (fn) => (ticks.push(fn), { unref() {} }),
    clearInterval: () => {},
  });
  await meta.refresh();
  meta.start();
  assert.equal(ticks.length, 1, "start() sets up a staleness check");
  const before = calls.length;
  clock += 2 * 3600_000;
  await ticks[0]();
  assert.equal(calls.length, before, "two hours old: no new scrape");
  clock += 24 * 3600_000;
  await ticks[0]();
  assert.ok(calls.length > before, "a day old: scraped again");
  meta.stop();
});

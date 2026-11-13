import test from "node:test";
import assert from "node:assert/strict";
import { createCounterwatch, buildHeroFromRankRows, buildRankView, canonRole, cleanGameMode, confidenceFromMatches, displayableRankRow, extractJson, heroCountersReady, modeChoice, parseHeroPage, parseMapHeroes, parseMaps, parsePicks, parseTierList, rankChoice, rscText, tierLetter } from "../counterwatch.mjs";

test("extractJson finds a nested array and ignores brackets inside strings", () => {
  const text = `junk "other":[1] "rows":[{"a":"x]y","b":[1,2,{"c":"\\"]"}]},{"a":2}] tail`;
  assert.deepEqual(extractJson(text, "rows"), [{ a: "x]y", b: [1, 2, { c: '"]' }] }, { a: 2 }]);
  assert.equal(extractJson(text, "missing"), undefined);
});

test("rscText joins the streamed chunks", () => {
  const html = `<script>self.__next_f.push([1,"{\\"a\\":"])</script><script>self.__next_f.push([1,"[1,2]}"])</script>`;
  assert.equal(rscText(html), '{"a":[1,2]}');
});

test("tier list, maps and picks are trimmed to what the dashboard needs", () => {
  const h = { heroId: 6, displayName: "Torbjörn", roleName: "Damage", shrunkWinRate: 0.5648, winRate: 0.565, pickrate: 0.06, totalMatches: 77926.5, kills: 16, deaths: 8, heroHref: "/stats/overwatch/heroes/torbjorn", imageUrl: "https://x/y.webp" };
  const tier = parseTierList(`"canonicalTiers":[{"tier":"S","heroes":[${JSON.stringify(h)}]}] "windows":[{"kind":"patch","name":"P","startsOn":"2026-11-06"},{"kind":"season","name":"A Grim Doctrine","seasonNumber":5,"startsOn":"2026-10-07","endsOn":null}]`);
  assert.equal(tier.tiers[0].tier, "S");
  assert.equal(tier.tiers[0].heroes[0].slug, "torbjorn");
  assert.equal(tier.tiers[0].heroes[0].kd, 2);
  assert.equal(tier.patch.name, "P");
  assert.equal(tier.season.since, "2026-10-07");
  assert.equal(tier.season.until, null);
  const dated = parseTierList(`"canonicalTiers":[{"tier":"S","heroes":[${JSON.stringify(h)}]}] "windows":[{"kind":"season","name":"S","seasonNumber":1,"startsOn":"2026-01-01","endsOn":"2026-03-05"}]`);
  assert.equal(dated.season.until, "2026-03-05");
  const maps = parseMaps(`"rows":[{"cleanedMapName":"Rialto","mapSlug":"rialto","gameModeName":"Escort","sharePct":"4.6%","totalMatches":10,"topHeroes":{"mostPlayed":[{"hero_id":1,"displayName":"Ana","role_name":"Support","shrunk_win_rate":0.5,"map_share":0.05,"total_matches":9}],"bestPerforming":[]}}]`);
  assert.equal(maps[0].share, 0.046);
  assert.equal(maps[0].mostPlayed[0].name, "Ana");
  const picks = parsePicks(`"canonicalPicks":[{"role":"Tank","top":{"hero":${JSON.stringify(h)},"why":["w"]},"mentions":[]}]`);
  assert.equal(picks[0].top.why[0], "w");
  assert.throws(() => parseTierList("nothing here"));
});

test("parseMapHeroes keeps each role with a win rate and a share of picks", () => {
  const text = `"heroes":[{"heroId":7,"heroRawName":"REINHARDT","roleName":"Tank","shrunkWinRate":0.54,"winRate":0.55,"totalMatches":100,"pickMatches":40},{"heroId":3,"heroRawName":"TRACER","roleName":"Damage","shrunkWinRate":0.51,"winRate":0.52,"totalMatches":80,"pickMatches":60}]`;
  const heroes = parseMapHeroes(text);
  assert.equal(heroes[0].name, "Reinhardt");
  assert.equal(heroes[0].role, "Tank");
  assert.equal(heroes[0].winRate, 0.54);
  assert.equal(heroes[0].pickRate, 0.4);
  assert.equal(heroes[1].pickRate, 0.6);
  assert.throws(() => parseMapHeroes("nothing here"));
});

test("parseHeroPage reads combat, archetype and lean blurb", () => {
  const text = `
    "hero":{"heroId":3,"heroRawName":"TRACER","roleName":"Damage","winRate":0.5059,"shrunkWinRate":0.5059,"totalMatches":99534.1,"kills":15.99,"deaths":7.17,"assists":0.01,"damage":6044.1,"healing":57.4,"mitigation":77.9}
    "roleAvg":{"kills":16.12,"deaths":7.73,"assists":1.54,"damage":8054.8,"healing":294.6,"mitigation":458.3,"heroCount":23}
    "roleMax":{"kills":17.7,"deaths":9.6,"assists":5.6,"damage":9592.2,"healing":1512.5,"mitigation":3551.6}
    "archetypeScore":{"POKE":0.6,"RUSH":0.6,"DIVE":1}
    "otpStatus":{"kind":"mention","mention":{"contextLabel":"Counters the meta","contextDetail":"50.8% against S-tier"}}
    "bestMaps":[{"mapName":"Aatlis","mapSlug":"aatlis","winRate":0.535,"shrunkWinRate":0.531,"totalMatches":2865}]
    "heroMeta":{"3":{"name":"Tracer","image":"https://x/tracer.webp","role":"Damage","rawName":"TRACER"}}
    "heroImageUrl":"https://x/full/tracer.webp"
    "roleColor":"#e25050"
    "children":"Tracer leans dive, and can flex into poke comps when the team shape calls for it."
  `;
  const d = parseHeroPage(text, "tracer");
  assert.equal(d.name, "Tracer");
  assert.equal(d.lean, "DIVE");
  assert.equal(d.stats.kills, 16);
  assert.equal(d.roleAvg.heroCount, 23);
  assert.equal(d.archetype.DIVE, 1);
  assert.match(d.leanBlurb, /leans dive/i);
  assert.equal(d.mention?.why, "Counters the meta");
  assert.equal(d.bestMaps[0].name, "Aatlis");
  assert.equal(confidenceFromMatches(99534).label, "Very high");
});

test("parseHeroPage keeps the full counter and map lists", () => {
  const threats = Array.from({ length: 8 }, (_, i) => ({
    heroId: 10 + i,
    heroRawName: `THREAT_${i}`,
    roleName: i % 2 ? "Tank" : "Damage",
    counterScore: 8 - i,
    counterType: "pressure",
  }));
  const targets = Array.from({ length: 7 }, (_, i) => ({
    heroId: 30 + i,
    heroRawName: `TARGET_${i}`,
    roleName: "Support",
    counterScore: 7 - i,
    counterType: "duel",
  }));
  const meta = Object.fromEntries(
    [...threats, ...targets].map((c) => [c.heroId, { name: titleName(c.heroRawName), image: null, role: c.roleName }]),
  );
  const text = `
    "hero":{"heroId":3,"heroRawName":"TRACER","roleName":"Damage","winRate":0.5,"shrunkWinRate":0.5,"totalMatches":1000,"kills":1,"deaths":1,"assists":0,"damage":1,"healing":0,"mitigation":0}
    "roleAvg":{"kills":1,"deaths":1,"assists":0,"damage":1,"healing":0,"mitigation":0,"heroCount":1}
    "roleMax":{"kills":1,"deaths":1,"assists":0,"damage":1,"healing":0,"mitigation":0}
    "archetypeScore":{"POKE":1,"RUSH":0,"DIVE":0}
    "counterScoreData":${JSON.stringify({ threats, targets })}
    "heroMeta":${JSON.stringify({ 3: { name: "Tracer", image: null, role: "Damage" }, ...meta })}
    "splitsByMode":${JSON.stringify({
      Control: {
        bestMaps: [
          { mapName: "Busan", mapSlug: "busan", shrunkWinRate: 0.55, totalMatches: 100 },
          { mapName: "Ilios", mapSlug: "ilios", shrunkWinRate: 0.52, totalMatches: 90 },
          { mapName: "Lijiang", mapSlug: "lijiang", shrunkWinRate: 0.51, totalMatches: 80 },
        ],
        worstMaps: [{ mapName: "Nepal", mapSlug: "nepal", shrunkWinRate: 0.45, totalMatches: 70 }],
      },
      Hybrid: {
        bestMaps: [
          { mapName: "King's Row", mapSlug: "kings-row", shrunkWinRate: 0.54, totalMatches: 110 },
          { mapName: "Hollywood", mapSlug: "hollywood", shrunkWinRate: 0.53, totalMatches: 95 },
        ],
        worstMaps: [{ mapName: "Numbani", mapSlug: "numbani", shrunkWinRate: 0.44, totalMatches: 60 }],
      },
    })}
  `;
  const d = parseHeroPage(text, "tracer");
  assert.equal(d.counters.losesTo.length, 8);
  assert.equal(d.counters.beats.length, 7);
  assert.equal(d.counters.losesTo[0].score, 8);
  // Role tabs use dedicated buckets from the full embedded list (not a filter of a top-4 overall slice).
  assert.equal(d.counters.byRole.Damage.losesTo.length, 4);
  assert.equal(d.counters.byRole.Tank.losesTo.length, 4);
  assert.equal(d.counters.byRole.Support.beats.length, 7);
  assert.equal(d.counters.byRole.Tank.beats.length, 0);
  assert.equal(d.topMaps.length, 7);
  assert.equal(d.topMaps[0].slug, "busan");
});

test("canonRole maps DPS aliases and heroCountersReady rejects truncated caches", () => {
  assert.equal(canonRole("DPS"), "Damage");
  assert.equal(canonRole("dmg"), "Damage");
  assert.equal(canonRole("Tank"), "Tank");
  assert.equal(canonRole(null), null);
  assert.equal(heroCountersReady({ counters: { losesTo: [1, 2, 3, 4], beats: [1, 2, 3, 4] } }), false);
  assert.equal(
    heroCountersReady({
      counters: {
        losesTo: Array(12).fill({ role: "Damage" }),
        beats: Array(12).fill({ role: "Tank" }),
        byRole: { Tank: { losesTo: [], beats: [] }, Damage: { losesTo: [], beats: [] }, Support: { losesTo: [], beats: [] } },
      },
    }),
    true,
  );
  const text = `
    "hero":{"heroId":3,"heroRawName":"TRACER","roleName":"DPS","winRate":0.5,"shrunkWinRate":0.5,"totalMatches":1000,"kills":1,"deaths":1,"assists":0,"damage":1,"healing":0,"mitigation":0}
    "roleAvg":{"kills":1,"deaths":1,"assists":0,"damage":1,"healing":0,"mitigation":0,"heroCount":1}
    "roleMax":{"kills":1,"deaths":1,"assists":0,"damage":1,"healing":0,"mitigation":0}
    "archetypeScore":{"POKE":1,"RUSH":0,"DIVE":0}
    "counterScoreData":{"threats":[{"heroId":10,"heroRawName":"SOMBRA","roleName":"DPS","counterScore":5,"counterType":"duel"}],"targets":[{"heroId":11,"heroRawName":"REAPER","roleName":"dmg","counterScore":4,"counterType":"duel"}]}
    "heroMeta":{"3":{"name":"Tracer","image":null,"role":"DPS"},"10":{"name":"Sombra","image":null,"role":"DPS"},"11":{"name":"Reaper","image":null,"role":"Damage"}}
  `;
  const d = parseHeroPage(text, "tracer");
  assert.equal(d.role, "Damage");
  assert.equal(d.counters.byRole.Damage.losesTo.length, 1);
  assert.equal(d.counters.byRole.Damage.beats.length, 1);
  assert.equal(d.counters.losesTo[0].role, "Damage");
});

function titleName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

test("a rank view uses that rank's rows and stays empty when there are none", () => {
  assert.deepEqual(rankChoice("Grandmaster+")?.divisions, ["Grandmaster", "Champion"]);
  assert.equal(rankChoice("emerald")?.value, "Emerald");
  assert.equal(rankChoice("Champion"), null);
  assert.equal(tierLetter(0.53), "S");
  assert.equal(tierLetter(0.529), "A");
  assert.equal(tierLetter(0.469), "F");
  const empty = buildRankView([]);
  assert.equal(empty.empty, true);
  assert.deepEqual(empty.tiers, []);
  assert.deepEqual(empty.maps, []);
  const rows = [
    { map_name: "Practice Range", game_mode_name: "Control", hero_raw_name: "ANA", role_name: "Support", hero_id: 4, win_rate: 0.9, total_matches: 500, pick_matches: 100 },
    { map_name: "Busan (Stadium)", game_mode_name: "Control", hero_raw_name: "ANA", role_name: "Support", hero_id: 4, win_rate: 0.9, total_matches: 500, pick_matches: 100 },
    { map_name: "Busan", game_mode_name: "Control", hero_raw_name: "UNKNOWN", role_name: "Support", hero_id: 0, win_rate: 0.9, total_matches: 500, pick_matches: 100 },
    { map_name: "Busan", game_mode_name: "Control", hero_raw_name: "ANA", role_name: "Support", hero_id: 4, win_rate: 0.6, total_matches: 800, pick_matches: 200 },
    { map_name: "Ilios", game_mode_name: "Control", hero_raw_name: "ANA", role_name: "Support", hero_id: 4, win_rate: 0.5, total_matches: 200, pick_matches: 50 },
    { map_name: "Ilios", game_mode_name: "Control", hero_raw_name: "REINHARDT", role_name: "Tank", hero_id: 7, win_rate: 0.8, total_matches: 5, pick_matches: 5 },
  ];
  assert.equal(displayableRankRow(rows[0]), false);
  const view = buildRankView(rows, new Map([[4, { name: "Ana", img: "https://x/ana.webp", slug: "ana" }]]));
  assert.equal(view.empty, false);
  assert.equal(view.tiers[0].tier, "S");
  assert.equal(view.tiers[0].heroes.length, 1);
  assert.equal(view.tiers[0].heroes[0].name, "Ana");
  assert.equal(view.tiers[0].heroes[0].slug, "ana");
  assert.equal(view.tiers[0].heroes[0].winRate, 0.5571);
  assert.equal(view.tiers.some((t) => t.heroes.some((h) => h.id === 7)), false);
  assert.equal(view.maps.find((m) => m.slug === "busan")?.heroes[0].name, "Ana");
  assert.equal(view.maps.find((m) => m.slug === "ilios")?.heroes.some((h) => h.name === "Reinhardt"), true);
});

test("modeChoice and cleanGameMode map Counterwatch 5V5/6V6 labels", () => {
  assert.equal(modeChoice(null)?.value, "5v5");
  assert.equal(modeChoice("6v6")?.category, "6V6");
  assert.equal(modeChoice("6V6")?.value, "6v6");
  assert.equal(modeChoice("5V5")?.path, "");
  assert.equal(modeChoice("stadium"), null);
  assert.equal(cleanGameMode("6V6: Flashpoint"), "Flashpoint");
  assert.equal(cleanGameMode("Escort"), "Escort");
});

test("buildRankView strips 6V6 mode prefixes and buildHeroFromRankRows aggregates combat", () => {
  const rows = [
    {
      map_name: "Busan",
      game_mode_name: "6V6: Control",
      hero_raw_name: "TRACER",
      role_name: "Damage",
      hero_id: 3,
      win_rate: 0.52,
      total_matches: 200,
      pick_matches: 80,
      avg_kills_per_10: 16,
      avg_deaths_per_10: 7,
      avg_assists_per_10: 0.5,
      avg_damage_per_10: 6000,
      avg_healing_per_10: 50,
      avg_mitigation_per_10: 80,
    },
    {
      map_name: "Ilios",
      game_mode_name: "6V6: Control",
      hero_raw_name: "TRACER",
      role_name: "Damage",
      hero_id: 3,
      win_rate: 0.48,
      total_matches: 100,
      pick_matches: 40,
      avg_kills_per_10: 15,
      avg_deaths_per_10: 8,
      avg_assists_per_10: 0.2,
      avg_damage_per_10: 5800,
      avg_healing_per_10: 40,
      avg_mitigation_per_10: 70,
    },
    {
      map_name: "Busan",
      game_mode_name: "6V6: Control",
      hero_raw_name: "SOLDIER76",
      role_name: "Damage",
      hero_id: 5,
      win_rate: 0.5,
      total_matches: 150,
      pick_matches: 50,
      avg_kills_per_10: 14,
      avg_deaths_per_10: 6,
      avg_assists_per_10: 1,
      avg_damage_per_10: 7000,
      avg_healing_per_10: 0,
      avg_mitigation_per_10: 100,
    },
  ];
  const view = buildRankView(rows);
  assert.equal(view.maps[0].mode, "Control");
  const hero = buildHeroFromRankRows(rows, "tracer", new Map([[3, { name: "Tracer", img: null, slug: "tracer" }]]));
  assert.equal(hero.name, "Tracer");
  assert.equal(hero.matches, 300);
  assert.equal(hero.stats.kills, 15.7);
  assert.equal(hero.topMaps.length, 2);
  assert.equal(hero.counters.losesTo.length, 0);
  assert.match(hero.leanBlurb, /6v6/i);
});

test("a hero cached while a refresh is running survives the refresh commit", async () => {
  const rsc = (text) => `<script>self.__next_f.push([1,${JSON.stringify(text)}])</script>`;
  const h = { heroId: 3, displayName: "Tracer", roleName: "Damage", shrunkWinRate: 0.5, winRate: 0.5, pickrate: 0.05, totalMatches: 1000, kills: 10, deaths: 5, heroHref: "/stats/overwatch/heroes/tracer" };
  const tierText = `"canonicalTiers":[{"tier":"S","heroes":[${JSON.stringify(h)}]}] "windows":[]`;
  const mapsText = `"rows":[{"cleanedMapName":"Rialto","mapSlug":"rialto","gameModeName":"Escort","sharePct":"4.6%","totalMatches":10,"topHeroes":{"mostPlayed":[],"bestPerforming":[]}}]`;
  const picksText = `"canonicalPicks":[{"role":"Tank","top":{"hero":${JSON.stringify(h)},"why":["w"]},"mentions":[]}]`;
  const heroText = `
    "hero":{"heroId":3,"heroRawName":"TRACER","roleName":"Damage","winRate":0.5059,"shrunkWinRate":0.5059,"totalMatches":99534.1,"kills":15.99,"deaths":7.17,"assists":0.01,"damage":6044.1,"healing":57.4,"mitigation":77.9}
    "roleAvg":{"kills":16.12,"deaths":7.73,"assists":1.54,"damage":8054.8,"healing":294.6,"mitigation":458.3,"heroCount":23}
    "roleMax":{"kills":17.7,"deaths":9.6,"assists":5.6,"damage":9592.2,"healing":1512.5,"mitigation":3551.6}
    "heroMeta":{"3":{"name":"Tracer","image":"https://x/tracer.webp","role":"Damage","rawName":"TRACER"}}
  `;
  let disk = null;
  let cw;
  let heroCachedDuringRun = false;
  const respond = (body) => ({ ok: true, status: 200, text: async () => rsc(body), json: async () => ({}) });
  const fakeFetch = async (url) => {
    const u = String(url);
    if (u.endsWith("/maps")) {
      // The scrape is mid-way: another request caches a hero page right now.
      await cw.heroDetail("tracer");
      heroCachedDuringRun = true;
      return respond(mapsText);
    }
    if (u.includes("/heroes/tracer")) return respond(heroText);
    if (u.includes("best-onetricks")) return respond(picksText);
    if (u.includes("tier-list")) return respond(tierText);
    return { ok: false, status: 500, text: async () => "", json: async () => ({}) }; // rank source: the 6v6 maps slice fails, which run() tolerates
  };
  cw = createCounterwatch({}, () => {}, {
    file: "fake-counterwatch.json",
    fetch: fakeFetch,
    pause: async () => {},
    readJson: () => null,
    writeJson: (_f, v) => {
      disk = JSON.parse(JSON.stringify(v));
    },
  });
  const snap = await cw.refresh({ force: true });
  assert.equal(heroCachedDuringRun, true);
  assert.equal(snap.error, null);
  assert.ok(snap.tiers.length, "refresh committed the tier list");
  assert.equal(snap.heroes.tracer?.name, "Tracer", "hero cached during run() is still there");
  assert.equal(disk.heroes.tracer?.name, "Tracer", "and it is in the file that was written");
});

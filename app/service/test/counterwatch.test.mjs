import test from "node:test";
import assert from "node:assert/strict";
import { confidenceFromMatches, extractJson, parseHeroPage, parseMaps, parsePicks, parseTierList, rscText } from "../counterwatch.mjs";

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
  const tier = parseTierList(`"canonicalTiers":[{"tier":"S","heroes":[${JSON.stringify(h)}]}] "windows":[{"kind":"patch","name":"P","startsOn":"2026-11-06"}]`);
  assert.equal(tier.tiers[0].tier, "S");
  assert.equal(tier.tiers[0].heroes[0].slug, "torbjorn");
  assert.equal(tier.tiers[0].heroes[0].kd, 2);
  assert.equal(tier.patch.name, "P");
  const maps = parseMaps(`"rows":[{"cleanedMapName":"Rialto","mapSlug":"rialto","gameModeName":"Escort","sharePct":"4.6%","totalMatches":10,"topHeroes":{"mostPlayed":[{"hero_id":1,"displayName":"Ana","role_name":"Support","shrunk_win_rate":0.5,"map_share":0.05,"total_matches":9}],"bestPerforming":[]}}]`);
  assert.equal(maps[0].share, 0.046);
  assert.equal(maps[0].mostPlayed[0].name, "Ana");
  const picks = parsePicks(`"canonicalPicks":[{"role":"Tank","top":{"hero":${JSON.stringify(h)},"why":["w"]},"mentions":[]}]`);
  assert.equal(picks[0].top.why[0], "w");
  assert.throws(() => parseTierList("nothing here"));
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

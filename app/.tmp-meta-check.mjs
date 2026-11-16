import { rscText, parseTierList, parseMaps, parsePicks } from "./service/counterwatch-parse.mjs";

async function get(path) {
  const html = await (
    await fetch(`https://www.counterwatch.gg/stats/overwatch/${path}`, {
      headers: { "User-Agent": "CommandStation/0.2", Accept: "text/html" },
      signal: AbortSignal.timeout(30_000),
    })
  ).text();
  return rscText(html);
}

const tierText = await get("tier-list");
const tiers = parseTierList(tierText);
console.log(
  "tiers",
  tiers.tiers.length,
  tiers.tiers.map((t) => `${t.tier}:${t.heroes.length}`).join(","),
  "season",
  tiers.season?.name,
  tiers.season?.number,
);

try {
  const maps = parseMaps(await get("maps"));
  console.log("maps", maps.length, maps[0]?.name);
} catch (e) {
  console.log("maps FAIL", e.message);
}

try {
  const picks = parsePicks(await get("best-onetricks"));
  console.log("picks", picks.length, picks[0]?.role ?? picks[0]);
} catch (e) {
  console.log("picks FAIL", e.message);
}

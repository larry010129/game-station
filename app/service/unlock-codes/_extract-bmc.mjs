import fs from "node:fs";
const h = fs.readFileSync(process.env.TEMP + "/bmc-webhooks.html", "utf8");
const urls = [...h.matchAll(/https?:[^"'\\\s<>]+/g)].map((m) => m[0]);
const interesting = [...new Set(urls.filter((u) => /json|openapi|webhook|spec|download|intercom/i.test(u)))];
console.log(interesting.join("\n"));
const idx = h.toLowerCase().indexOf("openapi");
console.log("---idx", idx);
if (idx >= 0) console.log(h.slice(Math.max(0, idx - 500), idx + 1200));

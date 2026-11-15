import fs from "node:fs";
const j = JSON.parse(fs.readFileSync(process.env.TEMP + "/bmc-webhooks-openapi.json", "utf8"));
const s = j.components.schemas;
console.log(JSON.stringify({
  info: j.info,
  security: j.components.securitySchemes ?? j.security,
  webhook: j.webhooks ?? j["x-webhooks"],
  EventEnvelope: s.EventEnvelope,
  ExtraData: s.ExtraData,
  SupporterFields: s.SupporterFields,
  EventType: s.EventType,
}, null, 2).slice(0, 20000));
const text = JSON.stringify(j);
for (const key of ["signature", "x-signature", "hmac", "purchase_id", "extra_id", "transaction"]) {
  const i = text.toLowerCase().indexOf(key);
  console.log("\n---", key, i);
  if (i >= 0) console.log(text.slice(Math.max(0, i - 120), i + 400));
}

import crypto from "node:crypto";
import fs from "node:fs";
import { KEYS_DIR, PRIVATE_KEY_PATH, PUBLIC_KEY_PATH } from "./paths.mjs";

/** Ensure throwaway Ed25519 keypair exists under data/keys/ (dev only). */
export function ensureKeypair() {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    return loadKeypair();
  }
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  fs.writeFileSync(
    PRIVATE_KEY_PATH,
    privateKey.export({ type: "pkcs8", format: "pem" }),
    { mode: 0o600 },
  );
  fs.writeFileSync(
    PUBLIC_KEY_PATH,
    publicKey.export({ type: "spki", format: "pem" }),
    { mode: 0o644 },
  );
  return { publicKey, privateKey };
}

export function loadKeypair() {
  const privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH));
  const publicKey = crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY_PATH));
  return { publicKey, privateKey };
}

export function publicKeyPem() {
  ensureKeypair();
  return fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
}

/** Stable JSON for signing (sorted object keys, no whitespace). */
export function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeys(value[k]);
    return out;
  }
  return value;
}

/** @returns {string} base64 signature */
export function signManifest(manifest) {
  const { privateKey } = ensureKeypair();
  const payload = Buffer.from(canonicalJson(manifest), "utf8");
  return crypto.sign(null, payload, privateKey).toString("base64");
}

/** @returns {boolean} */
export function verifyManifest(manifest, signatureB64) {
  const { publicKey } = ensureKeypair();
  const payload = Buffer.from(canonicalJson(manifest), "utf8");
  return crypto.verify(null, payload, publicKey, Buffer.from(signatureB64, "base64"));
}

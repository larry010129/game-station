import { trustedPublicKeys } from "./contentSettings.ts";
import { canonicalJson, type SignedManifest } from "./releaseTypes.ts";

function b64ToBytes(b64: string): Uint8Array {
  const Buf = (globalThis as { Buffer?: { from(s: string, enc: string): Uint8Array } }).Buffer;
  if (Buf) return new Uint8Array(Buf.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexOf(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto?.subtle;
  if (!c) throw new Error("Web Crypto unavailable");
  return c;
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function importPublicKey(spkiB64: string): Promise<CryptoKey> {
  return subtle().importKey("spki", asArrayBuffer(b64ToBytes(spkiB64)), { name: "Ed25519" }, false, ["verify"]);
}

/** SHA-256 hex of UTF-8 text or raw bytes. */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return hexOf(await subtle().digest("SHA-256", asArrayBuffer(bytes)));
}

/** True when the SignedManifest Ed25519 signature matches one of the trusted public keys (production; dev too in dev runs). */
export async function verifySignedManifest(signed: SignedManifest): Promise<boolean> {
  if (!signed || signed.alg !== "ed25519" || !signed.signature || !signed.manifest) return false;
  try {
    const payload = new TextEncoder().encode(canonicalJson(signed.manifest));
    const sig = asArrayBuffer(b64ToBytes(signed.signature));
    for (const spki of trustedPublicKeys()) {
      if (await subtle().verify({ name: "Ed25519" }, await importPublicKey(spki), sig, payload)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

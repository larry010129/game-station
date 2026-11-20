/**
 * Dev-only Ed25519 public key (SPKI, base64) for verifying CMS content releases.
 *
 * Mirrored from `cms/data/keys/ed25519-public.pem` (throwaway test key).
 * The CMS also serves `GET /releases/public-key` (PEM); production host/key are TBD.
 *
 * Never ship this as the production trust root.
 */
export const DEV_CONTENT_PUBLIC_KEY_SPKI_B64 =
  "MCowBQYDK2VwAyEAFYDIQBKJomeplAkRNeg7pQ7IiO9N0VkkLSpuNA5vW7E=";

/** Same key as PEM (for parity with GET /releases/public-key). */
export const DEV_CONTENT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAFYDIQBKJomeplAkRNeg7pQ7IiO9N0VkkLSpuNA5vW7E=
-----END PUBLIC KEY-----
`;

/**
 * Production Ed25519 public key (SPKI, base64): the trust root for releases from the Cloudflare release host.
 * The private half stays with the CMS (Worker secret SIGNING_KEY and the owner's PC). Safe to ship: it only verifies.
 */
export const PROD_CONTENT_PUBLIC_KEY_SPKI_B64 = "MCowBQYDK2VwAyEAan8+LuhMQE917GeaCqJisDHujxEMg7KDXtsufefwP4g=";

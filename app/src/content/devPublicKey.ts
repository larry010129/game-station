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

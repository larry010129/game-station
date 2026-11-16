/**
 * Creator codes for this install. Alphabet leaves out 0/O, 1/I/L, 2/Z, 5/S, and 8/B.
 * Compared after trim, ignoring case. Not read from the environment.
 */
export const CREATOR_UNLOCK_CODE = "CREATOR-HNWC-6DVV";
export const CREATOR_RESET_CODE = "RESET-9WMG-J69N";

export type CreatorCodeResult = "unlock" | "reset" | "bad";

/** Which code this is, if either. A blank or unknown code is `bad`. */
export function classifyCreatorCode(raw: string): CreatorCodeResult {
  const code = raw.trim().toUpperCase();
  if (code === CREATOR_UNLOCK_CODE) return "unlock";
  if (code === CREATOR_RESET_CODE) return "reset";
  return "bad";
}

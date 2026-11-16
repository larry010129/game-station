// Creator codes: trim and case do not matter. A wrong code does not unlock or reset.
import test from "node:test";
import assert from "node:assert/strict";
import { CREATOR_RESET_CODE, CREATOR_UNLOCK_CODE, classifyCreatorCode } from "../../src/state/creatorCodes.ts";

test("unlock and reset codes match after trim, in any case", () => {
  assert.equal(classifyCreatorCode(`  ${CREATOR_UNLOCK_CODE.toLowerCase()}  `), "unlock");
  assert.equal(classifyCreatorCode(CREATOR_RESET_CODE.toLowerCase()), "reset");
});

test("a wrong or empty code does not match", () => {
  assert.equal(classifyCreatorCode("CREATOR-AAAA-AAAA"), "bad");
  assert.equal(classifyCreatorCode("not-a-code"), "bad");
  assert.equal(classifyCreatorCode("   "), "bad");
});

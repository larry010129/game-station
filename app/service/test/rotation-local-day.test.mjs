// Round 5, B6: Brand and Region rotations turn over at local Monday midnight, like quest weeks and "days left".
// Node applies a TZ set at runtime; run the boundary in a zone ahead of UTC and one behind it.
import test from "node:test";
import assert from "node:assert/strict";
import { brandDaysLeft, featuredBrand, resetContent } from "../../src/state/gachaEngine.ts";

const ZONES = ["Asia/Taipei", "America/Los_Angeles"];

for (const tz of ZONES) {
  test(`B6: the Brand pair changes at local Monday 00:00 in ${tz}`, () => {
    const was = process.env.TZ;
    process.env.TZ = tz;
    try {
      resetContent();
      // brandEpoch 2024-01-01 is a Monday; fortnights start on 2024-01-15, 2024-01-29, ...
      const sunLate = new Date(2024, 0, 28, 23, 30);
      const monEarly = new Date(2024, 0, 29, 0, 30);
      const monLate = new Date(2024, 0, 29, 23, 30);
      assert.notDeepEqual([...featuredBrand(monEarly)], [...featuredBrand(sunLate)], "new pair right after local midnight");
      assert.deepEqual([...featuredBrand(monEarly)], [...featuredBrand(monLate)], "same pair all of local Monday");
      assert.equal(brandDaysLeft(monEarly), 14, "a fresh fortnight has 14 days left on its first local day");
    } finally {
      process.env.TZ = was;
    }
  });
}

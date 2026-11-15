import { useState } from "react";
import { buyDraws, useGacha } from "../state/gacha";
import { DRAW_COST, DRAW_TEN_COST } from "../state/gachaEngine";
import { CREDIT_NAME, formatCredits, useStationCredits } from "../state/stationCredits";
import { UNLOCKABLES } from "../state/themeCatalog";

const NAMES = new Map(UNLOCKABLES.map((t) => [t.id, t.name]));

/**
 * The gacha: earned Credits for a random preset look the user does not own, or a coupon. Credits cannot be bought,
 * and brand colours are never in the pool. Choosing one specific look costs 120 Credits and is a separate purchase.
 */
export function DrawPanel({ owned, onWin }: { owned: readonly string[]; onWin: (id: string) => void }) {
  const balance = useStationCredits();
  const gacha = useGacha();
  const [summary, setSummary] = useState<string | null>(null);

  const draw = (count: 1 | 10) => {
    const r = buyDraws(count, owned, UNLOCKABLES.map((t) => t.id), onWin);
    if (!r.ok) {
      setSummary(r.reason === "short" ? `Not enough ${CREDIT_NAME.toLowerCase()} for that.` : "That bundle is not sold.");
      return;
    }
    const looks = r.results.flatMap((x) => (x.kind === "look" ? [NAMES.get(x.id) ?? x.id] : []));
    const coupons = r.results.length - looks.length;
    const parts = [];
    if (looks.length) parts.push(`Unlocked ${looks.join(", ")}.`);
    if (coupons) parts.push(`${coupons} coupon${coupons === 1 ? "" : "s"}.`);
    setSummary(parts.join(" "));
  };

  return (
    <section className="vault-card" aria-labelledby="draw-title">
      <h3 id="draw-title">Draw</h3>
      <p className="hint">
        Spend earned {CREDIT_NAME.toLowerCase()} on a random preset look you do not own, or a coupon. Picking one specific look costs 120 and is separate.
      </p>
      <p className="hint">
        Balance <strong>{formatCredits(balance)}</strong>
      </p>
      <div className="draw-actions">
        <button type="button" className="pill-btn" disabled={balance < DRAW_COST} onClick={() => draw(1)}>
          Draw once, {formatCredits(DRAW_COST)}
        </button>
        <button type="button" className="pill-btn" disabled={balance < DRAW_TEN_COST} onClick={() => draw(10)}>
          Draw ten, {formatCredits(DRAW_TEN_COST)}
        </button>
      </div>
      <p className="hint" role="status" aria-live="polite">
        {summary ?? "No draws yet."}
      </p>
      <p className="hint">
        Coupons: <strong>{gacha.coupons}</strong>. Their value and a redeem shop are not set yet.
      </p>
    </section>
  );
}

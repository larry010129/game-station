import { useState } from "react";
import { readJson, writeJson } from "../lib/storage";
import { applyResults, cleanGacha, drawMany, priceOf, type DrawResult, type GachaState } from "../state/gachaEngine";
import { usePatreonEntitlement } from "../state/patreon";
import { CREDIT_NAME, formatCredits, spendCredits, useStationCredits } from "../state/stationCredits";
import { LOCKED_PRESETS } from "../state/themeCatalog";

const KEY = "cs.gacha";
const nameOf = (id: string) => LOCKED_PRESETS.find((t) => t.id === id)?.name ?? id;

/** Spends earned Credits on random draws: a preset look you do not own, or a placeholder coupon. Never brand colours. */
export function GachaPanel({ owned, onWin }: { owned: readonly string[]; onWin: (id: string) => void }) {
  const balance = useStationCredits();
  const { basic } = usePatreonEntitlement();
  const [state, setState] = useState<GachaState>(() => cleanGacha(readJson<unknown>(KEY, null)));
  const [last, setLast] = useState<DrawResult[] | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const draw = (count: number) => {
    const price = priceOf(count);
    if (price == null) return;
    if (spendCredits(price) == null) {
      setNote(`Not enough ${CREDIT_NAME.toLowerCase()}: need ${price}, you have ${balance}.`);
      return;
    }
    // Patreon Basic already opens every preset, so nothing is left to win and each draw is a coupon.
    const have = basic ? LOCKED_PRESETS.map((t) => t.id) : owned;
    const results = drawMany(count, have, LOCKED_PRESETS.map((t) => t.id), Math.random);
    for (const r of results) if (r.kind === "look") onWin(r.id);
    const next = applyResults(state, results);
    writeJson(KEY, next);
    setState(next);
    setLast(results);
    setNote(null);
  };

  return (
    <section className="vault-card" aria-label="Draw a look">
      <h3>Draw</h3>
      <p className="hint">
        Spend earned {CREDIT_NAME.toLowerCase()} on a random preset look you do not own, or a coupon. Coupon value and drop rates are not set yet.
      </p>
      <div className="theme-form-actions">
        <button type="button" className="pill-btn" disabled={balance < 100} onClick={() => draw(1)}>
          1 draw, {formatCredits(100)}
        </button>
        <button type="button" className="pill-btn" disabled={balance < 900} onClick={() => draw(10)}>
          10 draws, {formatCredits(900)}
        </button>
      </div>
      {note && (
        <p className="hint" role="alert">
          {note}
        </p>
      )}
      {last && (
        <p className="hint" role="status">
          {last.filter((r) => r.kind === "look").map((r) => (r.kind === "look" ? nameOf(r.id) : "")).join(", ") || "No new look"}
          {last.some((r) => r.kind === "coupon") ? `${last.some((r) => r.kind === "look") ? ", plus " : ": "}${last.filter((r) => r.kind === "coupon").length} coupon(s)` : ""}
        </p>
      )}
      <p className="hint">Coupons held: {state.coupons}</p>
    </section>
  );
}

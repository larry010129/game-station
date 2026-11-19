import { useState } from "react";
import { CARD_SKINS } from "../state/cardSkins";
import { equipSkin, grantSkin, useCardSkins } from "../state/cardSkinStore";
import { useCreatorUnlock } from "../state/creatorAccess";
import { cardPackSkins, skinPrice, skinStars } from "../state/gachaContent";
import { addCredits, CREDIT_NAME, readCredits, spendCredits, useStationCredits } from "../state/stationCredits";
import { SkinSample } from "./SkinSample";
import { StarTag } from "./StarTag";

/**
 * Card skins on the Themes page. Skins start locked: the player wins them from the Card Pack or buys one outright
 * (the CMS sets the price per tier; a tier with no price is draw-only). Only skins the CMS has made Available show
 * as locked here, so not every skin exists on day one. Picking an owned skin dresses every dashboard card at once,
 * on top of whichever theme is active.
 */
export function CardSkinPicker({ onOpenDraw }: { onOpenDraw: () => void }) {
  const { owned, equipped } = useCardSkins();
  const creator = useCreatorUnlock();
  const balance = useStationCredits();
  const [note, setNote] = useState<string | null>(null);
  // 5-star skins first; catalog order keeps the grid stable within a tier.
  const byStars = (a: { id: string }, b: { id: string }) => skinStars(b.id) - skinStars(a.id);
  const available = new Set(cardPackSkins().filter((s) => s.status === "Available").map((s) => s.id));
  // The creator unlock opens every Available skin (like locked themes, Hidden ones stay out unless owned).
  const wearable = (id: string) => owned.includes(id) || (creator && available.has(id));
  const mine = CARD_SKINS.filter((s) => wearable(s.id)).sort(byStars);
  const locked = CARD_SKINS.filter((s) => available.has(s.id) && !wearable(s.id)).sort(byStars);

  const buy = (id: string, name: string) => {
    const price = skinPrice(id);
    if (price == null) return;
    if (readCredits() < price) {
      setNote(`Not enough ${CREDIT_NAME}: ${name} costs ${price}, you have ${readCredits()}.`);
      return;
    }
    if (spendCredits(price) == null) {
      setNote("The payment couldn't be saved, so nothing was spent.");
      return;
    }
    // Credits are taken first; a skin that cannot be saved hands them straight back.
    if (!grantSkin(id)) {
      addCredits(price);
      setNote(`Couldn't save ${name} (storage is full or blocked). Your ${CREDIT_NAME} was returned.`);
      return;
    }
    setNote(`${name} unlocked for ${price} ${CREDIT_NAME}. Pick it below to put it on.`);
  };

  return (
    <section className="theme-section skin-picker" aria-labelledby="themes-skins">
      <h3 id="themes-skins" className="theme-section-title">
        Card skins <span>{mine.length} of {mine.length + locked.length}</span>
      </h3>
      <p className="hint">
        A skin dresses every card on your dashboard and works with any theme. Win skins in the Card Pack, or buy a 4-star
        one outright where it has a price.
      </p>
      <div className="skin-grid" role="radiogroup" aria-label="Card skin">
        <button type="button" role="radio" aria-checked={equipped === null} className="skin-option" onClick={() => equipSkin(null)}>
          <span className="skin-option-art skin-option-plain" aria-hidden="true">
            <span className="skin-swatch-bars">
              <i />
              <i />
            </span>
          </span>
          <span className="skin-option-name">Theme cards</span>
          <small>No skin</small>
        </button>
        {mine.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={equipped === s.id} className="skin-option" onClick={() => equipSkin(s.id)}>
            <SkinSample id={s.id} className="skin-option-art" />
            <span className="skin-option-name">{s.name}</span>
            <small>
              <StarTag stars={skinStars(s.id)} />
            </small>
          </button>
        ))}
      </div>

      {locked.length > 0 ? (
        <>
          <h4 className="skin-locked-title">Locked</h4>
          <div className="skin-grid">
            {locked.map((s) => {
              const price = skinPrice(s.id);
              return (
                <div key={s.id} className="skin-option skin-option-locked">
                  <SkinSample id={s.id} className="skin-option-art" />
                  <span className="skin-option-name">{s.name}</span>
                  <small>
                    <StarTag stars={skinStars(s.id)} />
                    {price != null ? (
                      <button
                        type="button"
                        className="pill-btn skin-buy"
                        disabled={balance < price}
                        onClick={() => buy(s.id, s.name)}
                        aria-label={`Buy ${s.name} for ${price} ${CREDIT_NAME}`}
                      >
                        {price} {CREDIT_NAME}
                      </button>
                    ) : (
                      <button type="button" className="link skin-draw" onClick={onOpenDraw}>
                        Draw only
                      </button>
                    )}
                  </small>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
      {note ? (
        <p className="hint" role="status">
          {note}
        </p>
      ) : null}
    </section>
  );
}

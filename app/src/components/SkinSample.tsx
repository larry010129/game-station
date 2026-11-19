import { cardSkinById } from "../state/cardSkins";

/**
 * A stand-in dashboard card wearing a card skin: a header, one reading and two bars. The skin's look comes from
 * styles/cardskins.css through `data-skin`, the same rules that dress real dashboard cards.
 */
export function SkinSample({ id, className = "" }: { id: string; className?: string }) {
  const name = cardSkinById(id)?.name ?? id;
  return (
    <div className={`skin-swatch skin-sample ${className}`.trim()} data-skin={id} role="img" aria-label={`${name} card skin on a sample card`}>
      <span className="skin-swatch-head" aria-hidden="true">
        <span>GPU</span>
        <span>Live</span>
      </span>
      <b className="skin-sample-big" aria-hidden="true">
        62<small>°C</small>
      </b>
      <span className="skin-swatch-bars" aria-hidden="true">
        <i />
        <i />
      </span>
    </div>
  );
}

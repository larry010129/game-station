import { CARDS, type CardId } from "../layout/layouts";
import { WIDGET_COST } from "../state/widgets";

/** A dashboard card as a Widget Pack prize: its name, group and what it does, in a card frame, plus what it costs to run. */
export function WidgetSample({ id, className = "" }: { id: string; className?: string }) {
  const card = CARDS[id as CardId];
  if (!card) return null;
  return (
    <div className={`widget-sample ${className}`.trim()} role="img" aria-label={`${card.name} dashboard card`}>
      <span className="widget-sample-head">
        <b>{card.name}</b>
        <small>{card.group}</small>
      </span>
      <span className="widget-sample-blurb">{card.blurb}</span>
      <span className="widget-sample-use">{WIDGET_COST[id]?.use}</span>
    </div>
  );
}

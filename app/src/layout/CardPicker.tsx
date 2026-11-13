import { CARDS, CARD_IDS, tabOf, type CardId, type CardInstance, type TabId } from "./layouts";
import { CARD_MIME, dragging } from "./dragCard";

interface Props {
  tab: TabId;
  instances: CardInstance[];
  /** Cards that exist in this build. Others are listed as coming soon. */
  ready: CardId[];
  onAdd: (type: CardId) => void;
  onClose: () => void;
}

const GROUPS = ["This PC", "Connection", "Overwatch", "Meta", "Game", "Media", "Tools"];

/** Every card you can add. Drag one onto the dashboard (or press +). You can add the same card as many times as you like. */
export function CardPicker({ tab, instances, ready, onAdd, onClose }: Props) {
  const count = (t: CardId) => instances.filter((i) => i.type === t).length;
  return (
    <div className="picker" role="dialog" aria-label="Add cards">
      <div className="pk-head">
        <b>Add cards</b>
        <span>Drag onto this page</span>
        <button className="eb-btn" onClick={onClose} aria-label="Close the card list">
          Close
        </button>
      </div>
      <div className="pk-body">
        {GROUPS.map((g) => {
          const ids = CARD_IDS.filter((id) => CARDS[id].group === g && tabOf(id) === tab);
          if (!ids.length) return null;
          return (
            <section key={g}>
              <h3>{g}</h3>
              <div className="pk-grid">
                {ids.map((id) => {
                  const ok = ready.includes(id);
                  const n = count(id);
                  return (
                    <div
                      key={id}
                      className={`pk-tile${ok ? "" : " off"}`}
                      draggable={ok}
                      onDragStart={(e) => {
                        dragging.type = id;
                        e.dataTransfer.setData(CARD_MIME, id);
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => (dragging.type = null)}
                      title={ok ? "Drag onto the dashboard" : "Coming soon"}
                    >
                      <span className="pk-grip" aria-hidden="true">
                        ⋮⋮
                      </span>
                      <span className="pk-txt">
                        <b>
                          {CARDS[id].name}
                          {n > 0 && <em>{n === 1 ? "on" : `×${n}`}</em>}
                        </b>
                        <small>{ok ? CARDS[id].blurb : "Coming soon"}</small>
                      </span>
                      <button className="pk-add" disabled={!ok} aria-label={`Add ${CARDS[id].name}`} title="Add another copy" onClick={() => onAdd(id)}>
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

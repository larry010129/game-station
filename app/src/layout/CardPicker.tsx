import { useState } from "react";
import { CARDS, CARD_IDS, tabOf, type CardId, type CardInstance, type TabId } from "./layouts";
import { CARD_MIME, dragging } from "./dragCard";
import { widgetStatus } from "../state/gachaContent";
import { buyWidget, useWidgetLock } from "../state/widgetStore";
import { widgetPrice } from "../state/widgets";
import { useToast } from "../state/Toast";

interface Props {
  tab: TabId;
  /** Offer every card, not just the ones that belong to this tab by default. */
  all?: boolean;
  instances: CardInstance[];
  onAdd: (type: CardId) => void;
  onClose: () => void;
}

const GROUPS = ["This PC", "Connection", "Overwatch", "Meta", "Game", "Media", "Tools"];

function matchesQuery(id: CardId, q: string): boolean {
  if (!q) return true;
  const c = CARDS[id];
  const hay = `${c.name} ${c.group} ${c.blurb}`.toLowerCase();
  return hay.includes(q);
}

/** Every card you can add. Drag one onto the dashboard (or press +). You can add the same card as many times as you like. */
export function CardPicker({ tab, all = false, instances, onAdd, onClose }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const count = (t: CardId) => instances.filter((i) => i.type === t).length;
  const isLocked = useWidgetLock();
  const toast = useToast();

  const sections = GROUPS.map((g) => {
    const ids = CARD_IDS.filter(
      (id) =>
        CARDS[id].group === g &&
        (all || tab === "home" || tabOf(id) === tab) &&
        matchesQuery(id, q) &&
        // A Hidden card is not announced yet: not listed unless the player already has it.
        !(widgetStatus(id) === "Hidden" && isLocked(id)),
    );
    return { g, ids };
  }).filter((s) => s.ids.length > 0);

  return (
    <div className="picker" role="dialog" aria-label="Add cards">
      <div className="pk-head">
        <b>Add cards</b>
        <span>Drag onto this page</span>
        <button className="eb-btn" onClick={onClose} aria-label="Close the card list">
          Close
        </button>
      </div>
      <div className="pk-search">
        <input
          type="search"
          value={query}
          placeholder="Search cards"
          aria-label="Search cards"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (query) {
                e.preventDefault();
                e.stopPropagation();
                setQuery("");
              }
            }
          }}
        />
      </div>
      <div className="pk-body">
        {sections.length === 0 ? (
          <p className="pk-empty">No cards match</p>
        ) : (
          sections.map(({ g, ids }) => (
            <section key={g}>
              <h3>{g}</h3>
              <div className="pk-grid">
                {ids.map((id) => {
                  const n = count(id);
                  const locked = isLocked(id);
                  return (
                    <div
                      key={id}
                      className="pk-tile"
                      data-locked={locked || undefined}
                      draggable={!locked}
                      onDragStart={(e) => {
                        if (locked) return e.preventDefault();
                        dragging.type = id;
                        e.dataTransfer.setData(CARD_MIME, id);
                        e.dataTransfer.setData("text/plain", id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onDragEnd={() => (dragging.type = null)}
                      title={locked ? "Win this card in the Widget Pack on the Draw page" : "Drag onto the dashboard"}
                    >
                      <span className="pk-grip" aria-hidden="true">
                        ⋮⋮
                      </span>
                      <span className="pk-txt">
                        <b>
                          {CARDS[id].name}
                          {n > 0 && <em className="used" title="On your dashboard">{n === 1 ? "on" : `×${n}`}</em>}
                        </b>
                        <small>{CARDS[id].blurb}</small>
                      </span>
                      {locked && widgetPrice(id) != null ? (
                        <button
                          type="button"
                          className="pk-buy"
                          aria-label={`Buy ${CARDS[id].name} for ${widgetPrice(id)} Income`}
                          onClick={() => toast(buyWidget(id, CARDS[id].name).message)}
                        >
                          Buy · {widgetPrice(id)}
                        </button>
                      ) : locked ? (
                        <em className="pk-lock">Widget Pack</em>
                      ) : (
                        <button className="pk-add" aria-label={`Add ${CARDS[id].name}`} title="Add another copy" onClick={() => onAdd(id)}>
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { CARDS, CARD_IDS, type CardId, type TabId } from "../layout/layouts";

export interface NavTab {
  id: TabId;
  label: string;
  /** Added by the user, so it can be renamed and deleted. */
  custom: boolean;
}

export interface NavTabsApi {
  tabs: readonly NavTab[];
  /** The card types a tab shows now. */
  typesOn: (id: TabId) => CardId[];
  setTabCard: (id: TabId, type: CardId, on: boolean) => void;
  addTab: (label: string) => string | null;
  renameTab: (id: TabId, label: string) => void;
  removeTab: (id: TabId) => void;
  resetCards: (id: TabId) => void;
  canAdd: boolean;
}

const GROUPS = ["This PC", "Connection", "Overwatch", "Meta", "Game", "Media", "Tools"];

/** Vault section: add or delete navigation tabs and choose which cards each one shows. */
export function NavSettings({ api }: { api: NavTabsApi }) {
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState<TabId | null>(null);

  const add = () => {
    const id = api.addTab(label);
    if (!id) return;
    setLabel("");
    setOpen(id);
  };

  return (
    <section className="vault-card" aria-label="Navigation">
      <h3>Navigation</h3>
      <div className="vault-row">
        <div>
          <h3>New tab</h3>
          <p className="hint">Adds a page to the top bar. Home always shows every card.</p>
        </div>
        <div className="vault-field btns">
          <input value={label} placeholder="Tab name" maxLength={20} aria-label="New tab name" onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button type="button" className="pill-btn" disabled={!label.trim() || !api.canAdd} onClick={add}>
            Add tab
          </button>
        </div>
      </div>
      {api.tabs.map((t) => {
        const on = new Set(api.typesOn(t.id));
        const isOpen = open === t.id;
        return (
          <div className="vault-row navtab" key={t.id}>
            <div>
              {t.custom ? (
                <input className="navtab-name" defaultValue={t.label} maxLength={20} aria-label={`Name of ${t.label}`} onBlur={(e) => api.renameTab(t.id, e.target.value || t.label)} />
              ) : (
                <h3>{t.label}</h3>
              )}
              <p className="hint">
                {on.size} {on.size === 1 ? "card" : "cards"}
              </p>
            </div>
            <div className="vault-field btns">
              <button type="button" className="pill-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)}>
                {isOpen ? "Hide cards" : "Choose cards"}
              </button>
              {!t.custom && (
                <button type="button" className="pill-btn" onClick={() => api.resetCards(t.id)}>
                  Default
                </button>
              )}
              {t.custom && (
                <button type="button" className="pill-btn" onClick={() => api.removeTab(t.id)}>
                  Delete
                </button>
              )}
            </div>
            {isOpen && (
              <div className="navtab-cards">
                {GROUPS.map((g) => {
                  const ids = CARD_IDS.filter((id) => CARDS[id].group === g);
                  return (
                    <fieldset key={g}>
                      <legend>{g}</legend>
                      {ids.map((id) => (
                        <label key={id} title={CARDS[id].blurb}>
                          <input type="checkbox" checked={on.has(id)} onChange={(e) => api.setTabCard(t.id, id, e.target.checked)} />
                          {CARDS[id].name}
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

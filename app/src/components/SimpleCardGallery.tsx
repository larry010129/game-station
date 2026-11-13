import { Backdrop } from "./Backdrop";
import { CARDS, CARD_IDS } from "../layout/layouts";

// Simple card preview that doesn't use hooks or API calls
function CardPreview({ name, group, blurb, size }: { name: string; group: string; blurb: string; size: [number, number] }) {
  return (
    <section className="t kcard" style={{ minHeight: `${size[1] * 20 + 30}px` }}>
      <div className="th">
        <div>
          <h2>{name}</h2>
          <small>{blurb}</small>
        </div>
      </div>
      <div className="kbody">
        <div className="empty" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ marginBottom: '12px', fontSize: '32px', opacity: 0.3 }}>■</div>
          <div style={{ color: 'var(--dim)', fontSize: '12px' }}>
            {name} card<br />
            {size[0]} × {size[1]} grid units<br />
            Group: {group}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SimpleCardGallery() {
  // Group cards by their group
  const cardGroups = new Map<string, typeof CARD_IDS[number][]>();
  CARD_IDS.forEach((id) => {
    const card = CARDS[id];
    if (!cardGroups.has(card.group)) {
      cardGroups.set(card.group, []);
    }
    cardGroups.get(card.group)!.push(id);
  });

  return (
    <>
      <Backdrop image={null} />
      <div className="page gallery-page">
        <div className="gallery-header">
          <h1>Command Station Dashboard Cards</h1>
          <p>All {CARD_IDS.length} cards • Placeholder previews</p>
        </div>

        {Array.from(cardGroups.entries()).map(([group, cards]) => (
          <div key={group} className="gallery-group">
            <h2 className="gallery-group-title">{group}</h2>
            <div className="gallery-grid">
              {cards.map((id) => {
                const card = CARDS[id];
                return (
                  <div key={id} className="gallery-item">
                    <div className="gallery-item-name">{card.name}</div>
                    <div className="gallery-item-card">
                      <CardPreview
                        name={card.name}
                        group={card.group}
                        blurb={card.blurb}
                        size={card.size}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

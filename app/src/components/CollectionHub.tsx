import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export interface HubNode {
  id: string;
  name: string;
  icon: LucideIcon;
  owned: number;
  total: number;
  /** "owned" for prizes, "pages" for reading such as the draw rules (no owned count). */
  unit: "owned" | "unlocked" | "pages" | "taken";
  /** Short breakdown under the count, e.g. "5★ 2/8 · 4★ 3/60". */
  detail?: string;
}

/** Where each node sits on the map, in percent of the map. The first node is the large one in the middle. */
const SPOTS: readonly [number, number][] = [
  [50, 60],
  [19, 27],
  [81, 25],
  [23, 79],
  [78, 77],
  [50, 18],
  [91, 52],
];

/**
 * The collection at a glance: each collection as an emblem on a star map, with how much of it you own. Picking one
 * opens it.
 */
export function CollectionHub({ nodes, onOpen }: { nodes: HubNode[]; onOpen: (id: string) => void }) {
  const prizes = nodes.filter((n) => n.unit === "owned");
  const owned = prizes.reduce((s, n) => s + n.owned, 0);
  const total = prizes.reduce((s, n) => s + n.total, 0);
  return (
    <div className="hub">
      <p className="hub-sum">
        You own <b>{owned}</b> of <b>{total}</b> prizes{total ? ` (${Math.floor((100 * owned) / total)}%)` : ""}. Pick a collection to open it.
      </p>
      <div className="hub-map">
        <svg className="hub-orbits" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
          <ellipse cx="500" cy="300" rx="430" ry="190" transform="rotate(-8 500 300)" pathLength={100} />
          <ellipse cx="500" cy="300" rx="300" ry="250" transform="rotate(14 500 300)" pathLength={100} />
          <ellipse cx="500" cy="300" rx="170" ry="120" pathLength={100} />
          <circle className="hub-moon" cx="74" cy="352" r="4" />
          <circle className="hub-moon" cx="790" cy="106" r="3" />
          <circle className="hub-moon" cx="618" cy="532" r="3.5" />
        </svg>
        <ul className="hub-nodes">
          {nodes.map((n, i) => {
            const [x, y] = SPOTS[i] ?? SPOTS[SPOTS.length - 1];
            const share = n.unit !== "pages" && n.total ? n.owned / n.total : 0;
            const Icon = n.icon;
            const style = { "--x": `${x}%`, "--y": `${y}%`, "--i": i, "--share": share } as CSSProperties;
            return (
              <li key={n.id} className="hub-node" data-main={i === 0 || undefined} data-unit={n.unit} data-empty={share === 0 || undefined} style={style}>
                <button type="button" className="hub-btn" onClick={() => onOpen(n.id)}>
                  <span className="hub-emblem" aria-hidden="true">
                    <svg viewBox="0 0 100 100">
                      <circle className="hub-ring" cx="50" cy="50" r="46" />
                      <circle className="hub-fill" cx="50" cy="50" r="46" pathLength={100} />
                      <circle className="hub-core" cx="50" cy="50" r="34" />
                    </svg>
                    <Icon strokeWidth={1.3} />
                  </span>
                  <span className="hub-name">{n.name}</span>
                  <span className="hub-count">{n.unit === "pages" ? `${n.total} pages` : `${n.owned}/${n.total}`}</span>
                  {n.detail && <span className="hub-detail">{n.detail}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

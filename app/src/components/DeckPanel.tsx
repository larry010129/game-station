import { useDeck } from "../state/useDeck";
import type { Sample } from "../lib/types";

interface Props {
  history: Sample[];
  gameModeOn: boolean;
  hasNews: boolean;
  stopped: boolean;
  profileName: string;
}

const R = 15;
const C = 2 * Math.PI * R;

export function DeckPanel(props: Props) {
  const { keys, dials, strip } = useDeck(props);
  return (
    <section className="t deck" id="devices" aria-label="Stream Deck preview">
      <div className="th">
        <div>
          <h2>Stream Deck +</h2>
          <small>Preview · plugin arrives in Phase 3</small>
        </div>
      </div>
      <div className="keys">
        {keys.map((k) => (
          <div key={k.id} className={`key${k.state === "idle" ? "" : ` ${k.state}`}`}>
            <small>{k.label}</small>
            <b>{k.value}</b>
          </div>
        ))}
      </div>
      <div className="strip" aria-label="Touch strip">
        {strip.map((s) => (
          <div key={s.label} className={`seg-cell${s.state === "idle" ? "" : ` ${s.state}`}`}>
            <small>{s.label}</small>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
      <div className="dials" aria-label="Dials">
        {dials.map((d) => (
          <div key={d.id} className={`dial${d.state === "idle" ? "" : ` ${d.state}`}`}>
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle className="trk" cx="18" cy="18" r={R} />
              <circle className="val" cx="18" cy="18" r={R} strokeDasharray={`${(d.fill * C).toFixed(1)} ${C.toFixed(1)}`} />
            </svg>
            <b>
              {d.value}
              <small>{d.unit}</small>
            </b>
            <small>{d.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

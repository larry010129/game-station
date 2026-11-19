import { Icon } from "./Icon";
import type { Tweaks } from "../state/tweaks";

interface Props {
  tweaks: Tweaks;
  /** What the active theme itself uses, shown until a slider is moved. */
  base: { radius: number; opacity: number; accent: string };
  onTweak: (patch: Partial<Tweaks>) => void;
  onClear: () => void;
  hover: boolean;
  onHover: (on: boolean) => void;
}

/**
 * Fine-tune: personal adjustments over the active theme. Locked for now, so the card shows none of its controls:
 * only its name, a blurred empty panel and a "Coming soon" badge in the middle of the whole card. The props stay so
 * the controls can come back (see git history for the sliders) without touching the Themes page.
 */
export function ThemeTune(_props: Props) {
  return (
    <section className="vault-card theme-tune locked" aria-label="Fine-tune the theme, coming soon">
      <h3>
        Fine-tune
        <span className="theme-tune-soon">
          <Icon name="lock" small />
          Coming soon
        </span>
      </h3>
      <p className="hint">Personal adjustments on top of any theme are locked for now.</p>
      <div className="theme-tune-veil" aria-hidden="true" />
      <span className="theme-tune-soon theme-tune-soon-center" aria-hidden="true">
        <Icon name="lock" small />
        Coming soon
      </span>
    </section>
  );
}

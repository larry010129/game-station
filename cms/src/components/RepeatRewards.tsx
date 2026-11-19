import { useDraft } from "../state/DraftContext";
import type { EconomyDraft } from "../types/draft";
import { Field, Input, Panel } from "../ui/primitives";

type CrystalKey = keyof EconomyDraft["crystalValues"];

/** What a repeat of each kind is worth. A featured theme pays Special crystals; everything else pays Regular crystals. */
const ROWS: { key: CrystalKey; label: string; hint: string }[] = [
  { key: "common", label: "Common item", hint: "Regular crystals · alert sound, font, name flair" },
  { key: "better", label: "Better item", hint: "Regular crystals · wallpaper, boot screen, layout slot" },
  { key: "regularTheme", label: "Regular theme (4-star)", hint: "Regular crystals · a standard Regular theme" },
  { key: "rainbowTheme", label: "Rainbow Regular theme (5-star)", hint: "Regular crystals · defaults to the 4-star value" },
  { key: "customUpload", label: "Custom upload unlock", hint: "Regular crystals · Brand and Region packs only" },
  { key: "brandTheme", label: "Featured theme (5-star)", hint: "Special crystals · a featured Brand or company theme" },
];

const whole = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

/**
 * Repeat rewards: drawing something already owned pays crystals, which buy a pick. A featured theme pays Special
 * crystals; every other repeat pays Regular crystals, whichever pack it came from. Stackables never repeat.
 */
export function RepeatRewards() {
  const { draft, setDraft } = useDraft();
  if (!draft) return null;
  const cv = draft.economy.crystalValues;

  const setValue = (key: CrystalKey, value: number) =>
    setDraft((d) => ({ ...d, economy: { ...d.economy, crystalValues: { ...d.economy.crystalValues, [key]: value } } }));
  const setCost = (key: "regularCrystalCost" | "brandPrismCost", value: number) =>
    setDraft((d) => ({ ...d, economy: { ...d.economy, [key]: Math.max(1, value) } }));

  return (
    <Panel className="p-4">
      <h2 className="mb-1 text-sm font-semibold">Repeat rewards</h2>
      <p className="mb-3 text-xs text-muted">
        What a repeat (something already owned) pays, in any pack: a featured theme pays Special crystals; everything
        else pays Regular crystals. Streak freezes stack, so they never repeat.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ROWS.map(({ key, label, hint }) => (
          <Field key={key} label={label} hint={hint}>
            <Input
              type="number"
              min={0}
              step={1}
              value={key === "rainbowTheme" ? (cv.rainbowTheme ?? cv.regularTheme) : cv[key]}
              onChange={(e) => setValue(key, whole(e.target.value))}
              className="tabular-nums"
            />
          </Field>
        ))}
      </div>
      <h3 className="mb-2 mt-4 text-xs font-semibold">What they buy</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Regular crystals for a Regular theme" hint="Pick any standard Regular theme you do not own">
          <Input type="number" min={1} step={1} value={draft.economy.regularCrystalCost} onChange={(e) => setCost("regularCrystalCost", whole(e.target.value))} />
        </Field>
        <Field label="Special crystals for a featured theme" hint="Pick one of the featured themes now">
          <Input type="number" min={1} step={1} value={draft.economy.brandPrismCost} onChange={(e) => setCost("brandPrismCost", whole(e.target.value))} />
        </Field>
      </div>
    </Panel>
  );
}

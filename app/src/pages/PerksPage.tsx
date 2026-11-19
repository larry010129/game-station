import { PerkSection } from "../components/PerkTree";

/** The perk tree as a page of its own in the top bar: the tree, with its details panel on the right. */
export function PerksPage() {
  return (
    <section className="pfp pt-page" aria-label="Perk tree">
      <PerkSection />
    </section>
  );
}

# 6. Looks

A **look** is another way to draw the same card from the same data. The World clock card has five (`rulers`, `ring`, `curve`, `levels`, `headline`). The user picks one per copy; it is saved on the `CardInstance`, not in the card's own storage.

Looks are optional. Most cards have none.

## 1. Declare the looks

In `app/src/layout/layouts.ts`, next to `CLOCK_LOOKS`:

```ts
export const PINGGOAL_LOOKS = [
  { id: "meter", name: "Meter" },
  { id: "number", name: "Big number" },
] as const;

pinggoal: { ..., looks: PINGGOAL_LOOKS },
```

The **first** look is the default (`defaultLook()`). Look ids follow the card id rules: lower case, stable, never renamed after release.

## 2. Pass `look` and `onLook` through the registry

The world clock uses a small wrapper so the card gets a callback that already knows its instance id:

```tsx
const ClockView = memo(function ClockView({ id, look, onLook }: { id: string; look: string | undefined; onLook: (id: string, look: string) => void }) {
  return <WorldClockCard look={look} onLook={(l) => onLook(id, l)} />;
});
...
clocks: (c, inst) => <ClockView id={inst.id} look={inst.look} onLook={c.onLook} />,
```

## 3. Draw by look, with a safe fallback

```tsx
const LOOKS = { meter: MeterView, number: NumberView };

export function PingGoalCard({ look, onLook }: Props) {
  // An unknown look (an old save, a removed look) falls back to the first one
  const View = LOOKS[(look as keyof typeof LOOKS) in LOOKS ? (look as keyof typeof LOOKS) : "meter"];
  ...
}
```

## 4. Let the user switch

The world clock shows its looks as `.klink` toggles inside a `.wc-looks` wrapper, with `aria-pressed`. The highlighted `.klink.on` style is scoped to `.wc-looks`, so give your own wrapper the same rule (see [guide 7](07-styling-themes-skins.md#your-own-css)):

```tsx
{PINGGOAL_LOOKS.map((l) => (
  <button key={l.id} className={`klink${l.id === current ? " on" : ""}`} aria-pressed={l.id === current} onClick={() => onLook(l.id)}>
    {l.name}
  </button>
))}
```

The look box in **Edit layout** also lists `looks` for any card that declares them.

## Rules

- Every look draws **all three states** (loading, empty, data). See [guide 2](02-card-component.md).
- Every look fits the card's `min` size. If one needs more room, raise `min` for the card.
- Looks share data and storage. A look must not need its own endpoint.

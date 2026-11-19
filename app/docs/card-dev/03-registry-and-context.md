# 3. Registry and context

`app/src/layout/registry.tsx` connects card ids to views. The dashboard never imports your card directly; it calls `CARD_VIEWS[inst.type](ctx, inst)`.

## Adding your card

Three lines:

```tsx
// 1. Import
import { PingGoalCard } from "../cards/PingGoalCard";

// 2. Memoise (next to the other `…M` constants)
const PingGoalCardM = memo(PingGoalCard);

// 3. Map the id to the view
export const CARD_VIEWS: Record<CardId, (c: CardCtx, inst: CardInstance) => ReactNode> = {
  ...
  pinggoal: (_c, inst) => <PingGoalCardM instanceId={inst.id} />,
};
```

`CARD_VIEWS` is typed `Record<CardId, …>`, so once your id is in `CARDS`, `tsc` fails until it is here too.

## What a view gets

The view function receives two arguments.

### `c: CardCtx`: the app around the card

| Field | What it is | Used by |
| --- | --- | --- |
| `info` | Start-up info (`StationInfo`): machine, profiles | `gpu` |
| `store` | Live sensor sample store; read with `useSample` | `gpu`, `load`, `uplink`, `power` |
| `players` | `{ data, failed }` shared players-online data | `chart`, `trend`, `queue` |
| `feed` | `{ items, error, checking, checkNow }` shared news feed | `feed`, `patch` |
| `events` | This session's alerts and events | `alerts` |
| `gm` | Game mode profiles, phase, step status, start/stop | `gamemode` |
| `stopped` | Kill switch on: disable actions | `gamemode` |
| `toasts` | Discord toast settings | `discord` |
| `onOpenCalendar(date?)` | Opens the Calendar page | `calendar` |
| `onOpenDraw()` | Opens the Draw page | locked cards |
| `onLook(id, look)` | Saves the look the user picked for one card copy | `clocks` |

**Pass only what you draw.** Pick fields out of `c` and pass them as plain props. Don't pass `c` itself: the card would then re-render on every reading and event.

### `inst: CardInstance`: this copy of the card

```ts
interface CardInstance {
  id: string;      // unique per copy; equals the type for the first copy
  type: CardId;    // your card id
  look?: string;   // chosen look id, if the card has looks
  locked?: boolean;// held in place on the grid (layout only; not the Widget Pack lock)
}
```

Pass `inst.id` when the card **saves anything per copy** (see [guide 5](05-storage-and-reset.md)). Pass `inst.look` when it has looks ([guide 6](06-looks.md)).

## Cards that follow live sensor readings

If your card reads the per-second sample (`store`), subscribe inside a small memoised wrapper so only your card re-renders on each reading:

```tsx
const PowerView = memo(function PowerView({ store }: { store: StationStore }) {
  const game = useSample(store, (s) => s.game);
  return <PowerCard game={game} />;
});
...
power: (c) => <PowerView store={c.store} />,
```

Select the smallest value you need (`s.game`, not `s`); `useSample` only re-renders when the selected value changes.

## Locked cards

`CardView` checks `useWidgetLock()` first. When the card is locked, your view is **not mounted**. `LockedCard` shows the card's `name` and a way to get it. Your card needs no lock code of its own (see [guide 8](08-widget-pack-and-locking.md)).

## Adding a field to `CardCtx`

Avoid it. A new field means changes in `App.tsx` where the context is built, and every card shares the cost. Read data with `useApi` inside your card instead. Only add a field when the data is already owned by `App.tsx` (like `events` or `gm`) and cannot be read from the service.

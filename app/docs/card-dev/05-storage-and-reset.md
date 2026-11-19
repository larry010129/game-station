# 5. Storage and reset

Cards save settings and user input in the PC's local storage. Two rules: **validate everything you read**, and **register every key you write** so the card's reset button can clear it.

## `useStoredJson`

From `app/src/lib/storage.ts`:

```ts
const [value, setValue] = useStoredJson<T>(key, fallback, legacyKey?, validate?);
```

| Argument | Meaning |
| --- | --- |
| `key` | Storage key. Always starts with `cs.` |
| `fallback` | Used when nothing is saved, or the saved value fails `validate` |
| `legacyKey` | Old key to migrate from once; removed after the value is saved under `key` |
| `validate` | Type guard `(v: unknown) => v is T`. **Always pass one.** Saved data can be hand-edited, restored from an old backup, or broken |

It never throws. A blocked or full store keeps the value in memory until the app closes.

For one-off reads and writes outside React, use `readJson(key, fallback)` / `writeJson(key, value)` from the same file.

## Declaring keys

Add your key to `KEYS` in `app/src/lib/storageKeys.ts`, so the card that writes it and the reset list share one spelling:

```ts
export const KEYS = {
  ...
  pingGoal: "cs.pinggoal",
} as const;
```

## Per copy or shared?

The same card type can be placed more than once. Decide for each key:

| Kind | Key | Example |
| --- | --- | --- |
| **Per copy**: each copy keeps its own | `` `${KEYS.x}.${instanceId}` `` | Checklist items in each Pre-game checklist |
| **Shared**: one value for all copies | `KEYS.x` | The world clock's city list |

For a per-copy key, take `instanceId` as a prop (the registry passes `inst.id`). The first copy's id equals the card id, which is how `NotesCard` migrates the old shared key:

```ts
const primary = instanceId === "notes";
const [items, setItems] = useStoredJson<Item[]>(
  `${KEYS.checklist}.${instanceId}`, DEFAULT_LIST,
  primary ? KEYS.checklist : undefined,   // only the first copy inherits the old value
  isItems,
);
```

## Registering for reset: `cardKeys.ts`

`app/src/layout/cardKeys.ts` has two lists:

- `instanceKeys(id, type)`: **per-copy keys**. They are deleted when that copy is removed from the dashboard.
- `SHARED[type]`: **shared keys**. Kept when a copy is removed. Cleared by "Reset this card's data".

```ts
export function instanceKeys(id: string, type: CardId): string[] {
  if (type === "notes") return [`${KEYS.checklist}.${id}`, `${KEYS.note}.${id}`];
  if (type === "pinggoal") return [`${KEYS.pingGoal}.${id}`];
  return [];
}
```

### Why it matters

If your card throws while drawing, `CardBoundary` shows *"It could not be drawn. Its saved data may be damaged."* with a **Reset this card's data** button. That button removes exactly `resetKeys(inst.id, inst.type)`: the per-copy keys plus `SHARED`. An unregistered key cannot be reset, and the card stays broken until the user does a full factory reset.

## Don'ts

- No `localStorage` calls directly. Use the helpers; they handle restore-in-progress and blocked storage.
- No secrets or tokens in storage. Service credentials belong in the service's settings.
- Keep it small. Storage is shared with the whole app; a card should save kilobytes, not megabytes.
- No keys outside `cs.`. Factory reset (`state/factoryReset.ts`) clears only `cs.` keys.
- A few older cards keep a key outside `KEYS` (`cs.leak.hourly`, `cs.wavelink.view`). Don't copy that; declare yours in `KEYS`.

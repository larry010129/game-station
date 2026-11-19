# 1. Card definition

The definition is the card's **data**: everything the dashboard needs to list, place and size the card before any of its code runs. It lives in `CARDS` in `app/src/layout/layouts.ts`.

## The `CardDef` shape

```ts
export interface CardDef {
  name: string;                 // Shown on the card list, the locked card and the Draw page
  group: string;                // Decides the default tab and the list section
  blurb: string;                // One line for the Cards list
  size: [number, number];       // Default [width, height] in grid units
  min: [number, number];        // Smallest readable [width, height]
  on?: boolean;                 // true = placed on a fresh install
  looks?: readonly { id: string; name: string }[]; // Optional alternate drawings
}
```

A real entry:

```ts
wifi: { name: "Wi-Fi signal", group: "Connection", blurb: "Strength, band and network name", size: [6, 7], min: [4, 6] },
```

The object key (`wifi`) is the **card id**. `CardId` is derived from the keys of `CARDS`, so adding a key adds the id everywhere TypeScript checks it.

## Id rules

- Lower case, letters only, short: `wifi`, `regionping`, `heroprofile`. Existing ids use no dashes or capitals; follow that.
- Never reuse or rename an id that has shipped. Saved layouts, owned widgets (`cs.widgets`) and CMS releases all store ids.
- The id is also the **instance id of the first copy** (`{ id: "wifi", type: "wifi" }`). Extra copies get their own ids.

## Grid units

| Breakpoint | Columns | Notes |
| --- | --- | --- |
| `lg` (≥ 1280 px) | 24 | `size[0]` used as is |
| `md` (≥ 760 px, ≥ 560 px in split view) | 12 | Width capped at 12; `min[0]` halved (rounded up) |
| `sm` (phone) | 1 | One fixed column, height from `size[1]` |

- `ROW_HEIGHT` is 20 px and `MARGIN` is 12 px, so a card `h` rows tall is about `h × 20 + (h − 1) × 12` px.
- Most cards are 6 wide (a quarter of the desktop grid). Tall list cards go to 9–20 rows.
- `min` is the smallest size where everything still reads. Test at `min`, not only at `size`.

### Size presets

The S / M / L size buttons come from `presetBox()`: M is `size`, S is × 0.75, L is × 1.4, never below `min` and never wider than the grid. If `min` equals `size`, the card has no S.

## Groups and tabs

`group` places the card on a default tab (`tabOf()`):

| Group | Tab |
| --- | --- |
| This PC, Connection, Media, Tools | Station |
| Overwatch, Meta | Overwatch |
| Game | Game mode |

An unknown group falls back to Station. Prefer an existing group; a new group needs an entry in `TAB_OF_GROUP` and shows as its own section in the Cards list (`CardPicker.tsx`, `NavSettings.tsx`).

## `on`

`on: true` puts the card on a fresh install's Home. Leave it off for new cards; the default Home layout (`LG_CORE` / `MD_CORE`) is hand-placed and a submitted card should not change it.

## Mirrors you must update

The CMS cannot import app code, so it keeps its own list. When you add to `CARDS`, also add:

- `WIDGET_COST` in `app/src/state/widgets.ts` (see [guide 8](08-widget-pack-and-locking.md))
- `WIDGET_CATALOG` in `cms/src/types/draft.ts`: `{ id, name, group }`, same values as `CARDS`

`npm run test:service` fails if either list is out of step with `CARDS`.

## Checklist

- [ ] Id is new, lower case, letters only
- [ ] `name` is short (it is also the card's title on the locked card)
- [ ] `blurb` is one plain line saying what the user sees
- [ ] `size` and `min` tested on `lg` and `md`
- [ ] `group` is an existing group
- [ ] Mirrored in `WIDGET_COST` and the CMS `WIDGET_CATALOG`

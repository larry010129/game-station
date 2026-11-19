# 8. Widget Pack and locking

Every dashboard card is also a **Widget Pack** prize. A release from the CMS can lock a card so it has to be won, and each card has a star rating. Your card's code does not handle any of this. You only supply its entry in two lists.

## `WIDGET_COST` (app)

In `app/src/state/widgets.ts`:

```ts
pinggoal: { stars: 4, use: "/api/net every 2 s, shared by the network cards; stops during a game." },
```

| Field | Meaning |
| --- | --- |
| `stars` | `4` or `5`, the card's default rarity (a release can change it) |
| `use` | One plain line on what the card costs to run. Shown in the Wiki and the Draw preview |

### The star rule

Stars follow **resource use**, not how good the card looks:

| Stars | When |
| --- | --- |
| **5** | Polls every few seconds and keeps going during a game, calls an outside service, or does heavy drawing (maps, live scraping) |
| **4** | Everything else: shares an existing poller, polls slowly, stops during a game, or has no polling at all |

Today's 5-star cards: `chart`, `media`, `spotify`, `wavelink`, `airesearch`, `heroprofile`, `discord`.

Write `use` the way the existing lines do: endpoint, interval, what happens during a game.

## `WIDGET_CATALOG` (CMS)

In `cms/src/types/draft.ts`, add `{ id, name, group }` with the same values as `CARDS`. For a 5-star card, also add the id to `WIDGET_FIVE_STAR_IDS`. This is what lets the CMS **Widgets** page list, star and lock your card.

## How locking works

In `app/src/state/widgets.ts` → `isWidgetLocked()`:

| Release status | Player owns it? | Result |
| --- | --- | --- |
| `Free` (or not listed in the release) | — | Usable |
| `Available` | No | Locked; "Win it in the Widget Pack" with an **Open Draw** button |
| `Hidden` | No | Locked; "coming soon" |
| `Archived` | No | Locked; "has left the Widget Pack" |
| any | Yes, or Patreon Basic, or a test unlock | Usable |

- A card placed while it was `Free` is recorded as owned (`recordFreePlaced`), so a later lock never takes it away from that player.
- Owned cards are saved under `cs.widgets`.
- When locked, `CardView` mounts `LockedCard` **instead of** your view. Your card never sees a locked state, and polls nothing while locked.

## What this means for a new card

- A new card ships **Free** unless a release lists it. Locking it is a CMS decision, not part of your code.
- Set `stars` honestly by the rule above, and make `use` match your real intervals. Players read it in the Wiki and on the Draw page.

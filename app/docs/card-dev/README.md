# Card developer guide

How to design and build your own dashboard card for Command Station, and what to hand in when card submissions open.

> **Status:** Card submissions are **planned, not open yet**. For now these guides describe how built-in cards work and how to build one in a local checkout. [10-submission.md](10-submission.md) says what a submission will need to contain. Nothing here describes a live review or upload flow.

## What a card is

A card is one tile on the dashboard grid (Home, Station, Overwatch, Game mode and user tabs). Every card has three parts:

| Part | Where it lives | What it is |
| --- | --- | --- |
| **Definition** (card data) | `app/src/layout/layouts.ts` → `CARDS` | Id, name, group, blurb, default and minimum size, optional looks |
| **View** (card code) | `app/src/cards/*.tsx` (or `app/src/components/*.tsx` for a few core tiles) | A React component that draws inside the shared `Card` shell |
| **Wiring** | `app/src/layout/registry.tsx` → `CARD_VIEWS` | Maps the id to the view and passes it what it needs from the app |

Most cards also have **data** (a service endpoint polled through `useApi`), and some have **saved state** (per-card storage keys). Every card is also a **Widget Pack prize** with a star rating and a lock status.

## The guides

| # | Guide | Read it when |
| --- | --- | --- |
| 1 | [Card definition](01-card-definition.md) | Choosing the id, size, group and tab |
| 2 | [Card component](02-card-component.md) | Writing the view: the `Card` shell and shared parts |
| 3 | [Registry and context](03-registry-and-context.md) | Wiring the view into the dashboard |
| 4 | [Data and polling](04-data-and-polling.md) | Reading live data, or adding a service endpoint |
| 5 | [Storage and reset](05-storage-and-reset.md) | Saving settings or user input on the PC |
| 6 | [Looks](06-looks.md) | Offering more than one way to draw the card |
| 7 | [Styling, themes and skins](07-styling-themes-skins.md) | Making it look right on every theme and skin |
| 8 | [Widget Pack and locking](08-widget-pack-and-locking.md) | Setting stars and how the card is unlocked |
| 9 | [Preview and testing](09-preview-and-testing.md) | Seeing it run and checking it before you hand it in |
| 10 | [Submission (planned)](10-submission.md) | Packaging your card for review |
| 11 | [Worked example](11-worked-example.md) | Building a complete card end to end |

Reference:

- [Card reference](CARD-REFERENCE.md) — every built-in card: size, data source, props, storage, stars. Use it to find a card close to yours and copy its pattern.
- [Card spec template](card-spec.template.md) — the "card data" sheet to fill in for your own card.

## The 10-minute path

1. Fill in [card-spec.template.md](card-spec.template.md) for your idea.
2. Find the closest built-in card in [CARD-REFERENCE.md](CARD-REFERENCE.md) and read its source.
3. Follow [11-worked-example.md](11-worked-example.md), swapping in your own id, data and drawing.
4. Run it with `npm run live` and check it against the [submission checklist](10-submission.md#checklist).

## Touch-point checklist

Every new card touches these places. The last column says what fails if you forget one.

| # | File | What to add | Caught by |
| --- | --- | --- | --- |
| 1 | `app/src/layout/layouts.ts` | Entry in `CARDS` | — (defines `CardId`) |
| 2 | `app/src/layout/registry.tsx` | Entry in `CARD_VIEWS` (plus a `memo` wrapper) | `npm run build` (`CARD_VIEWS` is `Record<CardId, …>`) |
| 3 | `app/src/cards/<YourCard>.tsx` | The view component | — |
| 4 | `app/src/state/widgets.ts` | Entry in `WIDGET_COST` (stars and run cost) | `npm run test:service` (`widget-pack.test.mjs`) |
| 5 | `cms/src/types/draft.ts` | Entry in `WIDGET_CATALOG` (and `WIDGET_FIVE_STAR_IDS` if 5-star) | `npm run test:service` (`cms-widgets.test.mjs`) |
| 6 | `app/src/lib/storageKeys.ts` + `app/src/layout/cardKeys.ts` | Only if the card saves anything | Nothing: check by hand |
| 7 | `app/src/boot/bootSteps.ts` | Only if it reads an endpoint a boot step already checks | Nothing: optional |
| 8 | `app/service/<name>.mjs`, `app/service/index.mjs`, `app/service/routes.mjs` + a test | Only if it needs a new endpoint | Your own test |

The maintainer's view of the same steps, with themes, skins and items, is in [../ADDING-CONTENT.md](../ADDING-CONTENT.md).

## Ground rules

Scope: these guides cover **dashboard cards** (widgets). Card skins, themes and items are covered in [../ADDING-CONTENT.md](../ADDING-CONTENT.md).

- **Read-only toward the PC by default.** A card that changes system state (like Game mode or Memory clean) must say so on the button and go through a service `POST` route.
- **Cheap when hidden.** Poll through `useApi` + `useEvery`. Never `setInterval` a `fetch` yourself (see [guide 4](04-data-and-polling.md)).
- **Never crash on saved data.** Validate what you read from storage (see [guide 5](05-storage-and-reset.md)).
- **Theme-neutral.** Use the CSS variables, never hard-coded colours (see [guide 7](07-styling-themes-skins.md)).
- **Plain words.** Card text follows the app's style: short sentences, no jargon, says what the user can do.

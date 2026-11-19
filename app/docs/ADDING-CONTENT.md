# Adding content: cards, themes, card skins, items

How a new thing gets from code to players. Two rules hold throughout:

- **Code ships with the app; switches ship with a release.** A new card, card skin or item kind needs an app update.
  The CMS then decides whether it can be drawn, and how often, and publishes that in a signed release. A new theme
  needs no app update, because a theme is data.
- **The app ignores ids it does not know.** You can list a prize in the CMS before the app update that brings it;
  older apps skip it. The CMS marks such rows "Needs app update".

Paths are relative to the repo root.

## A new dashboard card

1. **Write the card** in `app/src/cards/` (copy the shape of a card nearby). Wrap it in `Card` from
   `app/src/cards/ui.tsx`.
2. **Pace its polling through the limiter.** Fetch with `useApi(path, useEvery(normalMs, slowMs))` (`useEvery` is in
   `app/src/cards/ui.tsx`). `slowMs` is used while a game runs; `0` stops it. Never poll on your own timer, or the
   limiter cannot hold the card back.
3. **Register it.**
   - Add an entry to `CARDS` in `app/src/layout/layouts.ts`: `name`, `group`, `blurb`, `size` and `min`. Add `on: true`
     only if a fresh install should show it.
   - Add its view to `CARD_VIEWS` in `app/src/layout/registry.tsx`.
4. **Give it a rarity and a cost line** in `WIDGET_COST` in `app/src/state/widgets.ts`.
   - **5-star:** it polls every few seconds, calls an outside service, or keeps working during a game.
   - **4-star:** anything lighter.
   - The `use` text is what players read in the Wiki and on the Draw poster, so state the real poll rate.
5. **Add it to the CMS catalog**: `WIDGET_CATALOG` in `cms/src/types/draft.ts` (id, name, group).
6. **Run the checks** (see the end of this page). `app/service/test/widget-pack.test.mjs` fails if `WIDGET_COST` and
   `CARDS` list different ids.
7. **Ship the app update.**
8. **In the CMS, go to Widgets.**
   - The card is **Free** until you change it.
   - Set it to **Drawable** to put it in the Widget Pack, or **Hidden** to tease it without anyone being able to get
     it.
   - **Buying cards** (same panel as the Cards page) sets the Credit price for a 4-star or 5-star card. Leave a price
     empty to make that tier draw-only. The switch lets Regular crystals pick a 4-star card. Players buy from the
     locked card itself or from Edit layout → Add cards, and crystal-pick from the Draw page's Exchange tab.
   - Push a release from the top bar.

**Locking a card that is already out:** a card someone has placed on their dashboard while it was Free stays theirs
(`recordFreePlaced` in `app/src/state/widgetStore.ts`). A locked card that turns up some other way, such as a restored
backup or an imported layout, shows a "Win it in the Widget Pack" placeholder instead of the card.

## A new theme

No app update is needed.

1. **Create it.** In the CMS, go to **Themes → Add theme** (or duplicate one close to what you want) and set the
   palette.
2. **Set its status.**
   - **Hidden:** not shown anywhere until announced.
   - **Available:** can be drawn or bought.
   - **Archived:** owners keep it, but it is no longer offered.
3. **Choose where it drops.**
   - **Regular theme:** that's all.
   - **Rainbow (5-star):** tick *Rainbow (5-star), draw only*.
   - **Company theme:** use the group *Brand*, then tick *Brand Pack* and/or *Region Pack* and set its country and
     region.
4. **Optionally keep it off the Wiki** until you announce it: untick **Show in Wiki**.
5. **Push a release.**

To bundle a theme into the app instead, which is only for themes every install should have offline:
- add it to `LOOKS` in `app/src/state/themeCatalog.ts`;
- for company themes, add its tags to `BRAND_TAGS` in `app/src/content/brandTags.ts`;
- for a rainbow theme, add its id to `RAINBOW_THEME_IDS` in `app/src/state/gachaContent.ts`.

## A new card skin (style)

1. **Add it to the skin list:** an entry in `CARD_SKINS` in `app/src/state/cardSkins.ts` (id, name, stars, blurb).
2. **Draw it** in `app/src/styles/cardskins.css` with one rule that covers both the dashboard and the swatch:
   `:root[data-card-skin="your-id"] .cell > .t, .skin-swatch[data-skin="your-id"] { … }`. Copy the shape of
   `holo-foil` for a moving (5-star) skin, or `carbon-weave` for a still (4-star) one.
3. **Add it to the CMS catalog:** `CARD_SKIN_CATALOG` in `cms/src/types/draft.ts`.
4. **Ship the app update.** Then in the CMS, go to **Cards**, set it to **Available**, and push a release.

## A new item

- **More of an existing kind**, such as another wallpaper or alert sound:
  - add it in the CMS on the **Items** page (it gets the next id, such as `wallpaper-26`);
  - add the file it points at to the release;
  - push.
- **A new kind of item** needs app code:
  - add the kind to `ItemKind` and `ITEMS` in `app/src/state/gachaContent.ts`, and to the pack tables' inner weights;
  - add its Wiki text to `ITEM_INFO` in `app/src/state/wikiData.ts`;
  - write the code that makes it do something. Until that code exists, keep its status `"not-yet"` in `ITEM_INFO`, so
    the Wiki says "Not usable yet".

## Keeping something unannounced

- **Hidden status:** nobody can get it, and it is not listed. This works for themes, skins and cards.
- **Show in Wiki switch** (CMS Themes, Cards, Widgets and Items pages): it can still be drawn, but the Wiki leaves it
  out (search, lists, Featured now) until you switch it back on. A player who already owns it still sees it.
- The release field is `gacha.wikiHiddenIds`. Themes, skins and items go in by their own id; cards go in as
  `widget:<id>`, because a card id can match a theme id (both have `discord`).

## Checks before publishing

```bash
cd app && npm run test:service
```

```bash
cd app && npx tsc --noEmit -p .
```

```bash
cd cms && npx tsc --noEmit -p .
```

Then:
- the CMS shows no validation messages on Push;
- in the app, the Draw page, the Wiki and Edit layout → Add cards show what you expect.

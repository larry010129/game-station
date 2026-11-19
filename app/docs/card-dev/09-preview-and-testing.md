# 9. Preview and testing

## Run it

From `app/`:

```bash
npm install
npm run live
```

`npm run live` starts the service on `:8787` and the dashboard on `http://localhost:1420` in your browser. Then:

1. Click **Edit layout** → **Add cards**, find your card under its group and drag it onto the dashboard.
2. Resize it to S, M, L and drag it to its minimum size.
3. Add a second copy if it saves anything per copy; check the two copies keep separate data.
4. Remove a copy and confirm its per-copy keys are gone (DevTools → Application → Local Storage).

For work on the full desktop shell, use `npm run tauri dev` (see [../DEVELOPMENT.md](../DEVELOPMENT.md)).

### Pointing at a test service

`?svc=8799` in the URL makes the dashboard talk to a service on another port. Use it to run a stub service that returns fixed data, so you can see empty, error and extreme states on demand.

## States to check

| State | How to get it |
| --- | --- |
| Loading | Stop the service (`Ctrl+C`), reload the page |
| Service down after data | Stop the service while the card shows data. The last data should stay |
| Empty / not set up | Feed it an empty response from a stub service |
| Quiet mode | Start a game the app tracks (quiet mode is on while it runs). Polling should slow or stop |
| Off-screen | Scroll the card out of view. Its requests should stop (DevTools → Network) |
| Damaged storage | Set your key to `"oops"` in Local Storage, reload. The card must fall back, not crash |
| Locked | Mark it `Available` in a local CMS release (see [../content-updates.md](../content-updates.md)) |

## Themes and skins

Themes page → pick one dark and one light theme. For Card Pack skins you don't own, set the skin on the page root from the DevTools console, for example `document.documentElement.dataset.cardSkin = "holo-foil"` (a 5-star moving skin) or `"carbon-weave"` (4-star). Skin ids are in `app/src/state/cardSkins.ts`. See [guide 7](07-styling-themes-skins.md#check-it).

## Automated checks

From `app/`:

```bash
npm run build
```

Type-checks (`tsc --noEmit`) and builds. This catches a missing `CARD_VIEWS` entry and wrong prop types.

```bash
npm run test:service
```

Runs the service tests (`node --test service/test/*.test.mjs`). These include `widget-pack.test.mjs` and `cms-widgets.test.mjs`, which fail when `WIDGET_COST` or the CMS `WIDGET_CATALOG` does not list the same cards as `CARDS`. Add a test for any endpoint or parser you wrote.

## Card gallery (static)

`app/gallery.html` + `src/components/SimpleCardGallery.tsx` build a single-file page listing every card in `CARDS` as a placeholder tile (name, blurb, size, group), with no live data:

```bash
npx vite build -c vite.gallery.config.ts
```

Output goes to `app/dist-gallery/`. Use it to check that your definition (name, blurb, size, group) reads well next to the others. It does not render your card's real view.

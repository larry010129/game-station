# Game Station CMS

Stand-alone Operate-mode admin for content publishing (themes, items, odds, banners, releases). Owner-only; **no login yet**.

Sibling of `app/` (game on port **1420**). See `GACHA REDESIGN.md` → *Content updates and the CMS*, *Testing the CMS locally*.

## Start

```bash
cd cms
npm install
npm run seed    # optional: rebuild cms/data/draft.json from app themeCatalog + gacha defaults
npm run dev
```

Open **http://localhost:1430**

| Script          | Port | Notes                                               |
| --------------- | ---- | --------------------------------------------------- |
| `dev`           | 1430 | Vite + signed release host + `/api/*`               |
| `seed`          | —    | Regenerates `data/draft.json` from the app          |
| `publish:check` | —    | CLI publish smoke test (API agent store)            |
| `build`         | —    | `tsc --noEmit` + Vite build                         |
| `preview`       | 1430 | Production preview (API plugin still mounts)        |

## Routes

| Path         | Page      | What you edit                                              |
| ------------ | --------- | ---------------------------------------------------------- |
| `/`          | Dashboard | Draft health, jump links                                   |
| `/themes`    | Themes    | Name, Regular\|Brand, Hidden\|Available\|Archived, palette |
| `/items`     | Items     | Wallpapers/boots/sounds/fonts/flairs/freeze/upload         |
| `/odds`      | Odds      | Pack chances (must sum 100%), prices, pity                 |
| `/banners`   | Banners   | Title, subtitle, pack, dates, featured ids + fixed disclaimer |
| `/preview`   | Preview   | Mock draw odds table as the app would show                 |
| `/releases`  | Releases  | Notes + **Publish** (blocked if odds ≠ 100%)               |

## Edit → publish flow

1. Edit any screen; draft **autosaves** (~800ms) via `PUT /api/draft` → `cms/data/draft.json`.
2. Keep both pack row sums at **100%** (Better/Common inner tables too) on **Odds**.
3. Check **Preview** for the odds table mock.
4. On **Releases**, write notes and click **Publish**.
5. UI calls `POST /api/publish` (API agent). On success the signed host serves:
   - `GET /releases/current`
   - `GET /releases/{n}/manifest.json`
   - `GET /releases/{n}/content.json`
   - `GET /releases/public-key`

If `/api/*` is unreachable, the UI falls back to **localStorage** (`gs.cms.draft`) with a sidebar badge — see `src/api/contentApi.ts`.

## Theme seed / import

- Source: `app/src/state/themeCatalog.ts` (`look()` / `brand()`).
- Rebuild: `npm run seed` → `cms/data/draft.json`.
- Items/odds seeded from `gachaContent.ts` defaults (CMS stores **percent** weights; publish converts to 0–1 fractions).

## Company themes, tags and packs

Every company (Brand-group) theme has tags: **Brand Pack** and/or **Region Pack**, a **country** (ISO code) and a **region** (continents, with Europe and Asia split into West / Central / East / South and East / Southeast / South / West). Edit them in the theme's **Tags** section on **Themes**; filter the list by pack or region there.

- **Brand Pack:** every theme tagged Brand Pack is in the rotation (`brandThemeIds` is built from tags on publish; 2+ needed). Drag to reorder: the order changes which themes are paired each fortnight.
- **Region Pack:** on **Odds & prices → Region Pack**, set a **Region week** or a **Country week** for one Monday-to-Sunday week. The pack features two of that week's Available companies. With no week set it rotates through regions by itself. The Region Pack has its own prices and odds (starting as a copy of the Brand Pack's) and its own pity count.
- `node cms/scripts/seed-draft.mjs [out.json]` rebuilds a draft from the app (tags included). Without a path it **overwrites** `data/draft.json`.

## API contracts (with publish/signing agent)

Implemented in `server/http.mjs` + `server/store.mjs`. UI adapter: `src/api/contentApi.ts`.

| Method | Path              | Notes                                                |
| ------ | ----------------- | ---------------------------------------------------- |
| `GET`  | `/api/draft`      | CmsDraft (percent weights)                           |
| `PUT`  | `/api/draft`      | Persist draft.json                                   |
| `POST` | `/api/validate`   | Server-side publish checks                           |
| `POST` | `/api/publish`    | `{ notes? }` → `{ ok, number?, errors?, manifestPath? }` |
| `GET`  | `/api/releases`   | `{ current, releases }`                              |
| `POST` | `/api/rollback`   | `{ to }` re-publish older release as newer number    |

Draft editor type: `src/types/draft.ts`. Bundle conversion: `server/convert.mjs`.

## Folder map

```
cms/
  data/draft.json
  data/releases/           # signed numbered releases (API agent)
  scripts/seed-draft.mjs
  server/                  # draft API + signing host
  shared/releaseTypes.ts
  src/
    api/contentApi.ts
    state/DraftContext.tsx
    types/draft.ts
    ui/primitives.tsx
    pages/*Page.tsx
    layout/AdminLayout.tsx
```

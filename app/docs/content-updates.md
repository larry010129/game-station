# Content updates (Phase 3)

At start-up the app can download a signed content release from a CMS host, verify it, and swap gacha tables without rebuilding the EXE.

## Where releases come from

- Dev run (Vite): `http://localhost:1430/releases` (local CMS), trusts the dev key and the production key.
- Built app / installer: `https://command-station-releases.yuzi010129.workers.dev/releases` (read-only Cloudflare Worker fed by the CMS Worker), trusts the production key only.
- Both live in `app/src/content/contentSettings.ts`; keys in `app/src/content/devPublicKey.ts`. The installer's CSP (`src-tauri/tauri.conf.json`, `connect-src`) must list the release host.

## Contract (with CMS)

| Request | Response |
| --- | --- |
| `GET /releases/current` | `{ number, publishedAt, effectiveAt, manifestPath }` (`effectiveAt` is the go-live time, or null for an older release) |
| `GET /releases/<n>/manifest.json` | `SignedManifest` (`{ manifest, signature, alg: "ed25519" }`) |
| `GET /releases/<n>/content.json` | `ContentBundle` (`{ notes, gacha, themes?, banners? }`) |
| `GET /releases/blobs/<sha256>` | File bytes by content hash |
| `GET /releases/public-key` | PEM (dev) |

Signature: Ed25519 over UTF-8 of `canonicalJson(manifest)` (sorted keys, no whitespace). Invalid signature, hash, or `validateContent(gacha)` → reject and keep current content.

Types: `cms/shared/releaseTypes.ts` / `app/src/content/releaseTypes.ts`.

## Themes in a release

`content.json.themes` is the CMS theme list (id, name, group Regular|Brand, status, palette). On a successful apply / hydrate the app **replaces the listed catalog** with that array via `setReleaseThemes` (`themeCatalog.ts`). Owned unlocks (`cs.themeUnlocks`) and user modules stay local.

- Empty or missing `themes` → keep the bundled catalog (offline demo).
- Known ids keep bundled author / colour-group / url when CMS says Regular; Brand group maps to `group: "Brand"`.
- Status Hidden / Available / Archived drives Themes page listing and gacha pools (`isListedTheme` / `isDrawableTheme`).
- Company (Brand-group) themes carry `tags: { packs, country, region }`. `packs` holds `"brand"` (Brand Pack rotation) and/or `"region"` (Region Pack). Bundled tags live in `src/content/brandTags.ts` (150 themes: 68 Brand + Region, 82 Region only).
- `gacha.brandThemeIds` is the Brand Pack rotation list. The CMS builds it on publish from the themes tagged Brand (any size of 2+ unique ids; the saved order sets the pairing). A full rotation shows every pair once: 68 ids = 34 fortnights.
- `gacha.packs.region` is the Region Pack table (a release without it reuses the Brand table). `gacha.regionWeek` (`{ weekOf, kind: "region" | "country", value }`) sets one week's focus; with none for the current week, the app rotates through regions that have 2+ Available Region looks. Each week the pack features two of that focus's Available companies. `gacha.regionPackEnabled: false` (the CMS switch in the Region week card) hides the Region Pack: its Draw tab disappears and it cannot be bought. Absent or `true` means the pack is on.

## Check-in in a release

- `gacha.checkinPrizes`: seven prizes, Day 1 to Day 7. Each is a Draw Ticket (`regular` or `special`) or an item from the release's `items`, with a count. Absent: every box pays Special Tickets (1, 1, 2, 1, 1, 1, 3).
- `gacha.checkinEvent` (`{ start, end }`, local `YYYY-MM-DDTHH:mm`): runs the board as an event. Outside it nothing can be claimed and the page says so; tickets already held still work on Draw. Absent or null: the board is always on.
- Set both in the CMS Calendar page. The app shows them on the Check-in page.

## Production

Host and production public key are set (see above). The private key signs releases in the CMS Worker (secret `SIGNING_KEY`). Rotating it means shipping a new app build with the new public key.

## Local check

1. `cd cms && npm run dev` (port 1430) — publish a release from the Releases page if needed.
2. Start the app in Vite dev (`localhost:1420`).
3. Boot shows **Updating content**; Themes → What's new lists the release notes after a successful apply.
4. Stop the CMS and reload: app keeps stored / bundled content with no crash.

Fixtures: `app/src/content/fixtures/`.

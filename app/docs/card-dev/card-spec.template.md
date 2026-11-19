# Card spec: `<your-card-id>`

Copy this file, rename it `card-spec.<your-card-id>.md`, and fill in every field. This is the **card data** half of a submission ([10-submission.md](10-submission.md)). Leave a field as "none" rather than deleting it.

## Identity

| Field | Value | Rule |
| --- | --- | --- |
| id | | Lower case, letters only, not in [CARD-REFERENCE.md](CARD-REFERENCE.md) |
| name | | Short; shown as the card title |
| group | | One of: This PC, Connection, Media, Tools, Overwatch, Meta, Game |
| blurb | | One plain line: what the user sees |
| author | | Your display name, for credit if the card ships |

## Size

| Field | Value | Rule |
| --- | --- | --- |
| size `[w, h]` | | Grid units on the 24-column desktop grid. Most cards are 6 wide |
| min `[w, h]` | | Smallest size where everything still reads |
| looks | | none, or a list of `{ id, name }`. First is the default |

## Data

| Field | Value |
| --- | --- |
| Endpoint(s) read | e.g. `/api/net` (existing) or `/api/<new>` (new) |
| Interval normal / during a game | e.g. `2000` / `0` (stops) |
| From the dashboard context (`CardCtx`) | none, or the fields used (e.g. `players.data`) |
| Live sample fields (`useSample`) | none, or e.g. `gpuTemp` |
| Actions (`POST`) | none, or the route and what it changes on the PC |
| Outside sites the service calls | none, or each site and why |

### New endpoint (only if needed)

| Field | Value |
| --- | --- |
| Route | `GET /api/<name>` |
| Response type | Paste the TypeScript interface |
| Cache / refresh | How often the service refreshes it |
| Test file | `app/service/test/<name>.test.mjs` |

## Saved state

| Key | Per copy or shared | Type | Fallback | Validator |
| --- | --- | --- | --- | --- |
| `cs.<…>` | | | | |

## Widget Pack

| Field | Value | Rule |
| --- | --- | --- |
| stars | 4 / 5 | 5 only for fast polling that keeps going in a game, outside services, or heavy drawing |
| use | | One line: endpoint, interval, what happens during a game |

## States

Describe in one line what the card shows in each:

| State | Shows |
| --- | --- |
| Loading (no data yet) | |
| Empty / not set up | |
| Normal | |
| Service down after data | |

## Assets and licences

| Asset | Source | Licence |
| --- | --- | --- |
| | | |

## Screenshots

- [ ] Default size, dark theme
- [ ] Default size, light theme
- [ ] `min` size
- [ ] Loading state

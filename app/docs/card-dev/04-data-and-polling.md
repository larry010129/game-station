# 4. Data and polling

Cards get live data from the **local service** (`app/service`, a Node process on `127.0.0.1:8787`). The dashboard never calls outside websites directly; the service does, and caches the results.

## Reading an endpoint: `useApi`

From `app/src/state/useApi.ts`:

```ts
const ms = useEvery(5000, 30000);                       // every 5 s; every 30 s during a match
const { data, error, reload } = useApi<SystemData>("/api/system", ms);
```

| Returns | Meaning |
| --- | --- |
| `data` | Latest response, or `null` before the first one. Kept on a later error. |
| `error` | `true` when the last request failed |
| `reload()` | Fetch again now |

What `useApi` does for you:

- **One poller per path.** Every card reading `/api/net` shares one request, at the fastest interval any of them asks for.
- **Stops off-screen.** A card scrolled out of view stops asking (`useOnScreen`). It still gets one reading so it is never blank.
- **No flash on remount.** The last result is kept, so a remounted card starts with data.

The path is the cache key. `/api/feed?game=apex` and `/api/feed?game=overwatch` are separate pollers.

## Choosing the interval: `useEvery`

```ts
useEvery(normal, slow = 0)
```

Returns `normal` normally, and `slow` while **quiet mode** is on (a game is running). `slow = 0` stops polling during a match. That is the default, and the right choice for anything that does not matter mid-game.

Intervals the built-in cards use:

| Kind of data | `normal` | `slow` |
| --- | --- | --- |
| Network probes (`/api/net`) | 2 s | 0 (stop) |
| Media now playing | 2 s | 15 s |
| Memory | 5 s | 30 s |
| Sessions | 10 s | 60 s |
| Steam news, meta | 10 min | 0 |

Interval sets the card's **star rating** (see [guide 8](08-widget-pack-and-locking.md)). Anything under about 5 s, or anything that keeps running during a game, is a 5-star card.

## Existing endpoints you can read

All `GET` routes in `app/service/routes.mjs`. Response types are in `app/src/lib/types.ts` where they exist.

| Path | Returns |
| --- | --- |
| `/api/sample` | Latest sensor sample (`Sample`). Prefer `useSample(store, …)` via the registry |
| `/api/machine` | Hardware (`Machine`) |
| `/api/net` | Region pings, jitter, Wi-Fi (`NetData`) |
| `/api/system` | Memory and battery (`SystemData`) |
| `/api/players?game=` | Players online (`PlayersData`) |
| `/api/feed?game=` | News items (`FeedItem[]`) |
| `/api/meta?game=&mode=`, `/api/meta/hero`, `/api/meta/map`, `/api/meta/rank` | Hero meta |
| `/api/steam?game=` | Steam news |
| `/api/sessions` | Play sessions |
| `/api/gamemode/history` | Past game mode runs |
| `/api/cost` | This app's CPU and memory |
| `/api/library` | Installed games |
| `/api/media`, `/api/spotify`, `/api/wavelink`, `/api/discord` | Media and app integrations |
| `/api/ai` | Leak research status |

**Reuse first.** If an endpoint already returns what you need, read it. Your card then costs nothing extra, because the poller is shared.

## Actions: `POST`

For a button that changes something, call `api(path, body)` from `app/src/lib/api.ts`:

```ts
await api("/api/memory/clean", {});   // body is required for POST; use {} for "none"
```

Passing `undefined` as the body turns it into a `GET` and a 404. Disable the button while the request runs and confirm with `useToast()`.

## Adding a new endpoint

Only when no existing endpoint has the data.

1. **Module** in `app/service/<name>.mjs` that exports a `snapshot()` (and `set()` / actions if needed). Cache results; never block on a slow outside site per request.
2. **Wire the module in** `app/service/index.mjs`: create it there and add it to the object passed to `createRoutes({ … })`.
3. **Route** in `createRoutes()` in `app/service/routes.mjs`: take your module out of `d` in the destructuring line at the top, then add `"GET /api/<name>": async () => mod.snapshot(),`.
4. **Type** for the response in `app/src/lib/types.ts`.
5. **Test** in `app/service/test/<name>.test.mjs` (Node's built-in `node:test`). Test the parsing with fixed input, like `cards.test.mjs` does for `parseWifi`.
6. **Boot step (optional).** If the endpoint should be checked while the app starts, list it in `app/src/boot/bootSteps.ts`, with your card id in `cards`.

Service rules (see `app/README.md`): it binds to localhost and accepts only JSON `POST` bodies up to 1 MB. Long-running child processes go through `app/service/spawn.mjs`. Put a timeout on every outside request and child process you add.

## Live sensor readings

The per-second `Sample` (GPU temp, CPU/GPU load, pings, battery, running game) is pushed into a store, not polled per card. Read it through the registry with `useSample` (see [guide 3](03-registry-and-context.md)).

## Don't

- Don't `setInterval(fetch…)` in a card. It ignores quiet mode, off-screen pausing and sharing.
- Don't call outside URLs from the card. Add them to the service.
- Don't read another card's private state. Share through an endpoint or a `KEYS` entry.

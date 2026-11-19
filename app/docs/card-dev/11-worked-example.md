# 11. Worked example: "Ping goal" card

A complete card, end to end. It shows your region ping against a goal you set, and keeps the goal per copy. It uses:

- an **existing endpoint** (`/api/net`), so it adds no new polling
- **per-copy storage** with validation and reset
- the shared `Card`, `Bar`, `Empty` and status tones

Copy this, then swap in your own id, data and drawing.

## 0. Spec

| Field | Value |
| --- | --- |
| id | `pinggoal` |
| name | Ping goal |
| group | Connection (→ Station tab) |
| blurb | Your region ping against a goal you set |
| size / min | `[6, 7]` / `[4, 6]` |
| data | `/api/net` every 2 s, stops during a game (shared with the network cards) |
| storage | `cs.pinggoal.<instanceId>`: the goal in ms (per copy) |
| stars | 4 (shares an existing poller) |

## 1. Definition: `app/src/layout/layouts.ts`

Add to `CARDS`, near the other Connection cards:

```ts
pinggoal: { name: "Ping goal", group: "Connection", blurb: "Your region ping against a goal you set", size: [6, 7], min: [4, 6] },
```

## 2. Storage key: `app/src/lib/storageKeys.ts`

```ts
export const KEYS = {
  ...
  pingGoal: "cs.pinggoal",
} as const;
```

## 3. Reset registration: `app/src/layout/cardKeys.ts`

```ts
export function instanceKeys(id: string, type: CardId): string[] {
  if (type === "notes") return [`${KEYS.checklist}.${id}`, `${KEYS.note}.${id}`];
  if (type === "heroprofile") return [...GAME_IDS.map((g) => `${KEYS.metaHero}.${g}.${id}`), `${KEYS.metaHero}.${id}`];
  if (type === "pinggoal") return [`${KEYS.pingGoal}.${id}`];
  return [];
}
```

## 4. The view: `app/src/cards/PingGoalCard.tsx`

```tsx
import { memo } from "react";
import type { NetData } from "../lib/types";
import { useStoredJson } from "../lib/storage";
import { KEYS } from "../lib/storageKeys";
import { useApi } from "../state/useApi";
import { Bar, Card, Empty, useEvery, type Tone } from "./ui";

const GOALS = [40, 60, 80, 120] as const;
const isGoal = (v: unknown): v is number => typeof v === "number" && (GOALS as readonly number[]).includes(v);

export const PingGoalCard = memo(function PingGoalCard({ instanceId = "pinggoal" }: { instanceId?: string }) {
  // Same path and interval as the network cards, so this shares their one request.
  const ms = useEvery(2000, 0);
  const { data } = useApi<NetData>("/api/net", ms);
  const [goal, setGoal] = useStoredJson<number>(`${KEYS.pingGoal}.${instanceId}`, 60, undefined, isGoal);

  const picker = (
    <div role="group" aria-label="Ping goal">
      {GOALS.map((g) => (
        <button key={g} type="button" className={`klink${g === goal ? " on" : ""}`} aria-pressed={g === goal} onClick={() => setGoal(g)}>
          {g}
        </button>
      ))}
    </div>
  );

  // Loading: same title, nothing invented.
  if (!data) {
    return (
      <Card title="Ping goal" sub={`Goal ${goal} ms`} right={picker}>
        <Empty>Measuring ping...</Empty>
      </Card>
    );
  }

  // Lowest region ping we have right now.
  const pings = data.regions.map((r) => r.ms).filter((v): v is number => v != null);
  if (!pings.length) {
    return (
      <Card title="Ping goal" sub={`Goal ${goal} ms`} right={picker}>
        <Empty>No region answered. Check your connection.</Empty>
      </Card>
    );
  }
  const best = Math.min(...pings);
  const tone: Tone = best <= goal ? "ok" : best <= goal * 1.5 ? "or" : "red";
  const word = tone === "ok" ? "On goal" : tone === "or" ? "A bit high" : "Too high";

  return (
    <Card title="Ping goal" sub={`Goal ${goal} ms · ${word}`} right={picker} label={`Ping ${best} ms, goal ${goal} ms, ${word}`} className="kpg">
      <div className={`big${tone === "ok" ? " good" : ` ${tone}`}`}>
        {best}
        <small>ms</small>
      </div>
      <Bar pct={Math.min(100, (best / (goal * 2)) * 100)} tone={tone} label="Ping against goal" />
    </Card>
  );
});
```

Give the picked goal its "on" style. `.klink.on` is only styled inside the world clock (`.wc-looks`), so scope your own rule to the card's class, in `app/src/styles/extras.css`:

```css
.kpg .klink.on { background: var(--text); color: var(--on-text); }
```

Points to notice:

- **Title stays "Ping goal"** in every state.
- **`isGoal`** rejects a damaged or hand-edited value, so the fallback `60` is used instead of crashing.
- **Tone and word together**: the status reads without colour.
- **No own polling**: same path and interval as `useNet()` in `NetCards.tsx`.

## 5. Registry: `app/src/layout/registry.tsx`

```tsx
import { PingGoalCard } from "../cards/PingGoalCard";
...
const PingGoalCardM = memo(PingGoalCard);
...
  pinggoal: (_c, inst) => <PingGoalCardM instanceId={inst.id} />,
```

## 6. Widget Pack entry: `app/src/state/widgets.ts`

```ts
pinggoal: { stars: 4, use: NET },
```

`NET` is the existing shared line: "/api/net every 2 s, shared by the four network cards; stops during a game."

## 7. CMS catalog: `cms/src/types/draft.ts`

```ts
{ id: "pinggoal", name: "Ping goal", group: "Connection" },
```

4-star, so leave `WIDGET_FIVE_STAR_IDS` alone.

## 8. Boot step (optional): `app/src/boot/bootSteps.ts`

The `net` step lists the cards that wait on `/api/net`. Add yours so start-up reports it with them:

```ts
sources: [{ path: "/api/net", cards: ["regionping", "jitter", "wifi", "verdict", "pinggoal"] }],
```

## 9. Check

```bash
cd app
npm run build
npm run live
```

Then go through [guide 9](09-preview-and-testing.md#states-to-check): add two copies with different goals, reload (each keeps its own), remove one (its key goes), set `cs.pinggoal.pinggoal` to `"oops"` (falls back to 60), stop the service (the last reading stays).

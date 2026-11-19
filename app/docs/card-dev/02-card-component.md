# 2. Card component

The view is a React component that draws **inside the shared `Card` shell**. Using the shell is what makes your card match the built-in ones, take theme colours and wear card skins.

## The `Card` shell

From `app/src/cards/ui.tsx`:

```tsx
<Card
  title="Wi-Fi signal"        // h2 at the top left (required)
  sub="Home Wi-Fi"             // small line under the title (optional)
  right={<span className="chip">5 GHz</span>} // top-right slot: a chip, a toggle, a button (optional)
  label="Wi-Fi signal 82%"     // aria-label for the whole card; defaults to title (optional)
  className="my-card"          // extra class on the section (optional)
>
  {/* body: scrolls if taller than the card */}
</Card>
```

It renders `section.t.kcard > div.th + div.kbody`. The body is a flex column with a 10 px gap that scrolls when the content is taller than the card.

## Shared parts

All from `app/src/cards/ui.tsx` unless noted.

| Part | Use |
| --- | --- |
| `Empty` | One muted line for "loading", "nothing yet" or "not set up": `<Empty>Reading Wi-Fi...</Empty>` |
| `Bar` | Thin meter: `<Bar pct={82} tone="ok" label="Wi-Fi signal" />`. `Tone` is `"ok" \| "or" \| "red" \| "dim"` |
| `Sparkline` | Small line chart; `null` values draw a drop marker: `<Sparkline values={samples} height={56} />` |
| `useEvery(normal, slow)` | Poll interval that slows (or stops, with `0`) during a match. See [guide 4](04-data-and-polling.md) |
| `span(ms)` | Duration as `45 min` / `2 h 05 min` |
| `gb(mb)` | Megabytes as gigabytes with one decimal |
| `StatMeter` (`components/Tiles.tsx`) | Larger meter with `"ok" \| "good" \| "mid" \| "or" \| "red"` tones |
| `useToast()` (`state/Toast.tsx`) | Short message after an action: `toast("Memory cleaned.")` |

Common body classes (defined in `styles/app.css`):

| Class | Draws |
| --- | --- |
| `.big` (+ `.good` `.mid` `.or` `.red`) | The large headline number; put the unit in a `<small>` |
| `.chip` (+ tone classes, `.accent`) | Rounded pill, usually in the `right` slot |
| `.klist` > `.krow` > `.kname` / `.kval` | A list of label / bar / value rows |
| `.klink` | Small pill button (toggles, "Untick all"). Its selected `.on` style exists only inside the world clock (`.wc-looks`); scope your own `.yourcard .klink.on` rule |
| `.eb-btn` (+ `.primary`) | Full button |

## The three states every card draws

Draw something useful in each state. Never render nothing.

```tsx
export const WifiCard = memo(function WifiCard() {
  const { data } = useNet();
  // 1. Waiting for the first reading
  if (!data) return <Card title="Wi-Fi signal"><Empty>Reading Wi-Fi...</Empty></Card>;
  // 2. Data says there is nothing to show; tell the user why and what to do
  if (!data.wifi?.connected) {
    return (
      <Card title="Wi-Fi signal" sub="Not on Wi-Fi">
        <Empty>This PC is wired, or Wi-Fi is off. A cable is the steadiest for ranked.</Empty>
      </Card>
    );
  }
  // 3. The real view
  ...
});
```

Keep the **title the same in every state**, so the card does not jump.

## Rules

- **Wrap in `memo`.** Most built-in cards are memoised in their own file, and the registry memoises every view again, so props that did not change do not re-render it.
- **No global side effects.** Don't add `window` listeners, timers or `fetch` calls outside the hooks in guide 4. If you must, clean them up in the effect's return.
- **Accessible.** Buttons are `<button type="button">` with visible text or an `aria-label`. Meters pass a `label`. Toggles set `aria-pressed`.
- **Text fits at `min` size.** Long names use `.kname` (ellipsis) or wrap. Test at the smallest size.
- **Errors are caught for you.** Each card sits in a `CardBoundary` (`components/ErrorBoundary.tsx`). If your card throws, the user sees "could not be drawn" with a reset button (see [guide 5](05-storage-and-reset.md)), and the rest of the dashboard keeps running. Still, don't rely on it: guard against `null` fields from the service.

## Where to put the file

- One card, or a small family that shares a data hook: `app/src/cards/<Name>Card.tsx` or `<Topic>Cards.tsx` (for example, `NetCards.tsx` holds the four network cards and their shared `useNet()`).
- A family with shared charts: a folder, like `app/src/cards/meta/`.
- Export the component by name (`export const PingGoalCard = memo(...)`).

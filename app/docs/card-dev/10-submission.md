# 10. Submission (planned)

> **Not open yet. Proposed draft.** There is no upload page, review queue or PR process for community cards today. This page proposes **what a submission should contain** so you can prepare one now. The contents list, the credits line and the "will not be accepted" rules below are a draft and may change. How and where to send a card will be added here when submissions open.

## What a submission contains

| # | Item | Format |
| --- | --- | --- |
| 1 | **Card spec** | A filled-in [card-spec.template.md](card-spec.template.md) |
| 2 | **Card code** | The view file(s) under `app/src/cards/`, plus any CSS file |
| 3 | **Wiring changes** | The lines added to `layouts.ts`, `registry.tsx`, `widgets.ts`, `cms/src/types/draft.ts`, and (if used) `storageKeys.ts`, `cardKeys.ts`, `bootSteps.ts` |
| 4 | **Service changes** (only if a new endpoint) | The module, the route line, the response type, and a test |
| 5 | **Screenshots** | Your card at `min` and default size, on a dark and a light theme, in the loading and data states |
| 6 | **Credits** | Your display name (proposed: for credit if the card ships), and the licence of any art, font or data you used |

## Checklist

### Definition
- [ ] New id, lower case, letters only; not used before
- [ ] `name`, `blurb`, `group`, `size`, `min` filled in; `on` left off
- [ ] Same `id` / `name` / `group` in `WIDGET_CATALOG` (CMS)
- [ ] `WIDGET_COST` entry with honest `stars` and a `use` line

### Code
- [ ] Draws inside `Card`; same title in every state
- [ ] Loading, empty and data states all drawn
- [ ] Wrapped in `memo`; registry passes only the fields it uses
- [ ] Data through `useApi` + `useEvery`; no `setInterval` + `fetch`; no calls to outside URLs
- [ ] Every storage read validated; every key in `KEYS` and registered in `cardKeys.ts`
- [ ] Buttons have text or `aria-label`; meters have `label`

### Look and feel
- [ ] Only theme tokens, no hard-coded colours
- [ ] No `background`, `border`, `box-shadow` or `::after` on the card section (skins own those)
- [ ] Reads at `min` size and at L size
- [ ] Looping motion stops under reduced motion and `.calm`

### Checks
- [ ] `npm run build` passes
- [ ] `npm run test:service` passes (and has a new test, if you added an endpoint)
- [ ] All states in [guide 9](09-preview-and-testing.md#states-to-check) checked by hand

## What will not be accepted (proposed)

- Cards that send data off the PC, or call outside sites from the dashboard
- Cards that change system settings without a clear button and a way to undo
- Tracking, ads, or links that earn the author money
- Art, logos, fonts or data you don't have the rights to share
- Copies of another product's widget (its name, art or layout)

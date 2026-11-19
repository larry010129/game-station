# 7. Styling, themes and skins

Your card is drawn on top of two layers the user controls:

1. **Theme**: the palette (`--bg`, `--text`, `--accent`, …) from the Themes page. Many themes, light and dark.
2. **Card skin**: a frame and surface laid over every card (`styles/cardskins.css`), won from the Card Pack.

A card that only uses the shared classes and the CSS variables below works with all of them automatically.

## Colour tokens

Defined on `:root` in `app/src/styles/app.css` and overridden by each theme:

| Token | Use |
| --- | --- |
| `--text` | Main text and default bars |
| `--dim`, `--mute` | Secondary text, units, hints |
| `--accent` | The theme's highlight colour. Use it sparingly |
| `--good`, `--mid`, `--orange`, `--red` | Status: fine / getting busy / high / bad |
| `--edge`, `--edge-2` | Borders and dividers |
| `--glass`, `--glass-hi`, `--wash` | Surfaces and hover fills |
| `--on-text` | Text placed on a `--text` fill (a primary button) |
| `--r` | Corner radius |
| `--ui` | UI font stack |

**Never hard-code colours.** `#fff` disappears on a light theme. Mix from tokens instead: `color-mix(in srgb, var(--text) 10%, transparent)`.

## Status tones

Tones mean the same thing on every card. Map your values onto them:

| Tone | Meaning | Classes |
| --- | --- | --- |
| good / ok | Fine, nothing to do | `.big.good`, `.chip.good`, `Bar tone="ok"` |
| mid | Worth a look | `.big.mid`, `.chip.mid` |
| or | High, act soon | `.big.or`, `.chip.or`, `Bar tone="or"` |
| red | Bad, act now | `.big.red`, `.chip.red`, `Bar tone="red"` |
| dim | No data / not relevant | `Bar tone="dim"` |

Don't use colour alone: put the number or a word next to it, so the card also reads without colour.

## Your own CSS

Use built-in classes first (see [guide 2](02-card-component.md)). If you need your own:

- Prefix every class with a short card prefix: `.kpg-…` for "ping goal". Built-in examples: `.kmem-list`, `.kmem-clean`.
- Scope under your card: `.kcard.kpg .kpg-ring { … }` (pass `className="kpg"` to `Card`).
- Put it in `app/src/styles/extras.css` or a new file imported from `main.tsx`. Don't edit the shared `.t`, `.th`, `.kcard`, `.kbody` rules.
- Size with the container: the card can be any width from `min` up. Use flex/grid and `min-width: 0`, not fixed pixel widths.

## Working with skins

Skins style the **card frame**: `:root[data-card-skin] .cell > .t`. They set `background` (via `--sk-layers` over `--glass`), `border-color` and `box-shadow`, and draw a ring in `::after`. To stay compatible:

- **Don't set `background`, `border` or `box-shadow` on the `.t` / `.kcard` section.** Style elements inside `.kbody` instead.
- Don't use `::after` on the section. The skin ring lives there.
- Keep content off the outer 2 px. The ring is masked to the border band.
- Keep inner panels translucent (`--wash`, `--glass-hi`) so the skin's surface shows through.

## Motion

- Animate only `transform` and `opacity`.
- Respect reduced motion. The app sets `.calm` for its own Reduce motion setting, and the OS sets `prefers-reduced-motion`. Stop any loop under both:

```css
@media (prefers-reduced-motion: reduce) { .kpg-pulse { animation: none; } }
.calm .kpg-pulse { animation: none; }
```

- Nothing should move all the time while a game is running. Pause looping animation when the data is not changing.

## Check it

Before you hand it in, look at your card on at least: one dark theme, one light theme, one 4-star skin and one 5-star (moving) skin, at `min` size and at L size.

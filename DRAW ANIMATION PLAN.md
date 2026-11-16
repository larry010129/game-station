# Draw animation plan: scribble, pull, badge

A 2D, character-free draw ritual for Draw Theme. The player scribbles on an ink pad, pulls a lanyard, and the result drops onto a rail as a badge that swings, then flips to show what they won. It replaces the capsule machine and the painter idea in [GACHA REDESIGN.md](GACHA REDESIGN.md) ("Capsule machine and reveal"). Everything else in that plan (packs, odds, pity, crystals, CMS, banners) stays.

## Assumptions to confirm

1. **"Bag style" means the badge style** of the pasted component: badges hanging from lanyards on a rail that swing, stretch when pulled, and flip. If you meant something else, say so.
2. **The scribble is only for fun.** It never changes what you win. The result is decided when the Credits are spent, as it is today. The pad says so in one line.
3. **No characters.** Ink, cord, rail and badges only.
4. **The app stays plain CSS React.** The pasted file needs shadcn and Tailwind, which the app does not use. We do not add either. We port the component to the app's own CSS and tokens.
5. **Blue Archive is the interaction idea only** (touch the screen before the pull). No art, layout or wording from that game.

## The sequence

| Step | What the player does | What happens on screen |
| --- | --- | --- |
| 1. Scribble | Draws or writes anything on the ink pad with mouse, finger or pen. Optional. | Orange ink follows the pointer. A small ink bar fills. "Clear" wipes it. |
| 2. Pull | Drags the lanyard cord down and lets go, or presses the Pull button (or Space). | The cord stretches like a spring reel and snaps back on release. The Credits are spent on release. |
| 3. Drop | Watches. | The scribble retracts into a thread, becomes the badge's strap, and the badge drops from the rail with a pendulum swing. |
| 4. Flip | Does nothing (it flips itself) or clicks to flip sooner. | The badge turns on its hinge and the face shows the result. |
| 5. Keep | Clicks Keep, or draws again. | The badge flies to Unlocked, or the pad clears for the next draw. |

**Skip is always there.** One press jumps to the flipped result. Single draw: about 3 seconds from release to the face. Ten-draw: about 5 seconds.

**Ten-draw.** Ten badges hang along the rail (the component's rail layout, with its carousel fallback on a narrow window). They drop one after another and flip in order. Each can be flipped sooner by clicking, and "Flip all" is a button. The scribble becomes the strap of the first badge only.

## What the badge shows

No portrait. The face is the theme itself:
- **Colour band** in the pack colour: accent orange for the Regular Pack, gold for the Brand Pack.
- **The result:** for a theme, a swatch of the real colours with "Aa" and the three dots, and its name. For an item, a drawn icon and its name. For a weekly pick, the pick icon.
- **A repeat** says "Repeat: +N crystals" or "+N Brand prisms".
- **The back** shows the pack, the draw number, and the player's scribble as a signature. The scribble is not saved when the pop-up closes.
- **Small details kept from the component:** the punch hole, the barcode strip and the glint across the face. The QR code, bio, tags and links are dropped.

## What we take from the pasted component

Keep: the spring and pendulum physics, the pull-stretch cord, the flip with perspective, the rail and carousel layout, the keyboard handling (arrows, Home, End, Escape, one focusable badge at a time), and the reduced-motion path.

Drop: the team content, autoplay, the portrait, the bio and links, the shadcn and Tailwind classes, and the `"use client"` line.

Port: rewrite its class names as a plain CSS file using the app's tokens (`--accent`, `--glass`, `--edge`, `--dim`, `--text`). Keep the physics code as it is. Do not rewrite what already works.

## The ink pad

- A dark glass panel with the app's rounded corners. Strokes in orange, smoothed, thin when the pointer is fast. A pen's pressure sets the width if the device sends it.
- Capped at about 2,000 points, after which the ink bar is full and the pad stops taking ink.
- Touch scrolling is switched off over the pad only.
- The pad is optional. With no scribble, the strap is a plain accent-colour strap.

## Fit with the current style

Dark glass panels, accent orange, Outfit, the existing pill buttons. A brushed-grey rail and metal reel, with straps in the pack colour. No gradient text, no decorative glow, and no emoji. The motion is the physics itself, not extra effects.

## States and rules

| Case | Behaviour |
| --- | --- |
| Reduced motion | No swing or stretch. The badges appear flipped with a fade. The scribble still works. |
| Keyboard only | Pull button and Space start the draw. Arrow keys move between badges, Enter flips, Escape flips back. Scribbling is optional, so no keyboard drawing is needed. |
| Screen reader | The result is announced in a live region (for example "Violet Hour, new look"). |
| Not enough Credits | The Pull button and cord are disabled with the usual message. |
| Closing mid-animation | The result is already saved. Closing shows it in the history, never loses it. |
| A pack is disabled | Same disabled message as the plan. |

## Phases, each with its check

1. **Ink pad and Pull button** feeding the existing result cards. Check: scribble, pull, see the result, with no physics yet.
2. **One badge on a rail**, ported from the component, flipping to the result. Check: it drops, swings, flips, and the result matches what was spent.
3. **Ten-draw rail** and the Flip all button. Check: ten badges, no overlap at the window's narrowest width, carousel on narrow.
4. **Ink-to-strap animation**, the cord pull, and Skip. Check: the scribble visibly becomes the strap, and Skip lands on the right result.
5. **Reduced motion and keyboard.** Check: a full draw with keyboard only, and with reduced motion on.

Verify each phase in the running app before starting the next.

## Minimal build

Three new files: the ink pad, the badge rail (with the ported physics), and one CSS file. No new libraries.

## Open decisions

- Is "bag style" the badge style (assumption 1)?
- Pull gesture: cord drag, button, or both? The plan does both.
- Should the scribble be remembered (for example, kept in the draw history)? The plan says no.
- Ten-draw: auto-flip in order, as planned, or leave them all face-down until clicked?
- The CMS banner could hang on the same rail as a wider badge. Not in this plan unless you want it.

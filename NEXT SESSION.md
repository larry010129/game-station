# Next session: design (written 2026-11-18)

## The design pages

Open these straight in a browser.

- [Perk tree simulator](design/perk-tree-sample/perk-tree-sample.html): the full tree to click through, with the slot
  board, starting classes and a rank / Pass-level picker. Built by `python build.py`; its source is
  [template.html](design/perk-tree-sample/template.html), so edit that, not the built page.
- [Player level curve](design/perk-tree-sample/level-curve.html): set a curve and see the times, or set target times and
  get the curve. "Decided design" is the agreed pacing, rebuilt from the tree by `build.py`.
- [Perk node icons](design/perk-tree-sample/perk-node-icons.html): every node icon, in its class colour. New icons are
  drawn here and copied into the tree by `build.py`.

## To decide

1. **Player levels.** The pacing is decided (see "Player level pacing" in `UI REFERENCE PLAN.md`); now design how it
   looks and feels: where the level and XP bar live, what a level-up moment shows, and whether a locked or idle PC
   still counts as app time.
2. **Boosts.** Design the real event and item boosts: how strong, how long, how often a season, and how players get
   boost items. Item boosts are the lever for keeping light players close to heavy ones.
3. **Which nodes come alive first.** Review the Specials, pentagons, keystone rules and the two Key passives still
   marked "later": keep the strong ones, rewrite or cut the weak ones, and pick the first batch to make real.
4. **Visual review in the real app window.** The 2,953-node tree, the slot board when full, the tooltips and status
   colours, and all of it in a light theme.
5. **Ranks' replacement.** The Patreon-based idea that replaces ranks (set aside to discuss later).
6. **Icons still open.** The Credits currency icon, and whether the class emblems need a pass.

## Done since

- **Traditional Chinese (2026-11-18):** language system and Vault switch; top bar, tabs, Check-in and Quests translated.
  Still English: every other page, item and theme names, CMS content. Proposed way to finish: a script that pulls the
  remaining strings out of the components into the dictionaries, then one batch translation, then a review of `zhTW.ts`.

- Daily check-in is its own page (slice 8 in `UI REFERENCE PLAN.md`); the Quests UI and the Wiki were updated and the docs were brought in line (root and app READMEs, `PLAN.md`, `content-updates.md`).
- Done: the Special Ticket label and tone on the board are now the 5-star rainbow, not gold.

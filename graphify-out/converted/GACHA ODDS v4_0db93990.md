<!-- converted from GACHA ODDS v4.xlsx -->

## Sheet: Read me
| Draw Theme gacha: odds workbook (v4) |  |
| --- | --- |
| What this is | The numbers from GACHA REDESIGN.md in one place. Change a yellow cell and every table and chart updates. |
| Yellow cells, blue text | Inputs you can edit. Everything else is a formula. |
| Black text | Formulas. Do not type over them. |
| Inputs | Chance per row, the weights inside Better item and Common item, item counts and prices. |
| Odds | Chance of each kind and of each single item, with a doughnut chart per pack. |
| Collection time | How many draws and Credits it takes to finish a set, and boot screen scenarios. |
| Crystals | Crystal values per repeat and what each crystal kind buys. |
| Items | The item catalog and which list each item is in. |
| Rules | Pity, guarantees, rotation and prices side by side. |
| Box (earlier) | The Box odds from the earlier proposal. It is not in the current plan. |
| Assumptions | Counts (25 wallpapers, 12 boot screens, 20 alert sounds) are estimates: midpoints of the ranges you gave. Regular looks now come from the catalog via the Rainbow themes sheet. Every chance is a proposal. What the Custom upload unlock covers was not specified, so it is an assumption. |
| Rainbow themes | Every drawable Regular theme with its tier (Rainbow 5-star or Standard), why, and its chance. Change a Tier cell to move a theme. |
| Changed in v4 |  |
| Rainbow tier | Inputs rows 45 to 52: rainbow share per pack, rainbow pity, counts. The rainbow share is taken out of the Regular theme row, so pack totals do not change. |
| Odds | Kind row 6 is now Standard Regular theme; row 17 is the rainbow slice; Total moved to row 18. Single items: standard and rainbow each (rows 21 to 22); the rest moved down one row. Both charts include the rainbow slice. |
| Inputs B31 | Was a typed 64. Now counts the Regular pool on the Rainbow themes sheet (61). |
| Bug fix | Inputs B11/C11 and B12/C12: Brand Pack Common item subtracted Custom upload twice (56.5%, pack total 99.5%). Now 57% and 100%, matching the app. |
| Crystals B15/C15 | Rainbow repeats count as Regular theme repeats (same crystals). |
| Collection time row 9 | Rainbow Regular themes, without pity. |
| Rules rows 14 to 20 | Rainbow rows and how each other way to get a Regular theme treats rainbow (proposal: draws only). |
| Not updated | Inputs B36 still says 28 Brand themes (now 68, plus 82 Region-only), and there is no Region Pack column yet. |
## Sheet: Inputs
| Inputs |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Yellow cells with blue text are yours to change. Black cells are formulas. Chances are shares of all draws in that pack. |  |  |  |  |  |
| Row chances (share of draws) |  |  |  |  |  |
| Outcome | Regular Pack | Brand Pack | Note |  |  |
| Regular theme | 0.15 | 0.135 | Shared across all Regular looks. Rainbow themes take their share out of this row (row 47) |  |  |
| Brand theme | 0 | 0.01 | Shared across the featured Brand themes. Brand Pack only |  |  |
| Weekly unlock pick | 0.03 | 0.03 |  |  |  |
| Custom upload unlock | 0 | 0.005 | Brand Pack only. Taken from Common item. Not available in the Regular Pack |  |  |
| Better item | 0.25 | 0.25 | Wallpaper, boot screen, layout slot |  |  |
| Common item | 0.5700000000000001 | 0.57 | Balances the pack to 100%. Streak freeze, alert sound, font, name flair. (v4 fix: Custom upload is no longer subtracted twice) |  |  |
| Total | 1 | 1 | OK: both packs total 100% |  |  |
| Inside Better item (weights) |  |  |  |  |  |
| Kind | Regular Pack | Brand Pack | Note |  |  |
| Wallpaper | 0.7 | 0.55 |  |  |  |
| Boot screen style | 0.2 | 0.3 | Rarer than wallpapers |  |  |
| Layout slot | 0.10000000000000003 | 0.14999999999999997 | Balances to 100% |  |  |
| Total | 1 | 1 |  |  |  |
| Inside Common item (weights) |  |  |  |  |  |
| Kind | Regular Pack | Brand Pack | Note |  |  |
| Streak freeze | 0.3 | 0.3 | Stackable, never repeats |  |  |
| Alert sound (all of them) | 0.5 | 0.5 | About 20 sounds share this weight |  |  |
| Font unlock | 0.1 | 0.1 |  |  |  |
| Name flair | 0.09999999999999998 | 0.09999999999999998 | Balances to 100% |  |  |
| Total | 1 | 1 |  |  |  |
| Counts |  |  |  |  |  |
| Item | Count |  | Note |  |  |
| Regular looks in the pool | 61 |  | From the Rainbow themes sheet: the catalog's drawable Regular looks (WhatsApp moved to Brand) |  |  |
| Wallpapers | 25 |  | Midpoint of 20 to 30 being designed |  |  |
| Boot screen styles | 12 |  | Between 10 and 15 being designed |  |  |
| Alert sounds | 20 |  | About 20 being designed |  |  |
| Featured Brand themes at a time | 2 |  | Changes every 14 days |  |  |
| Brand themes in the set | 28 |  | Spotify Night through Airbnb Coral |  |  |
| Prices (Credits) |  |  |  |  |  |
| Pack | One draw | Ten draws | Note |  |  |
| Regular Pack | 100 | 900 | Unchanged from the current game |  |  |
| Brand Pack | 150 | 1350 | Proposal. Change freely |  |  |
| Brand Pack special items (share of draws) |  |  |  |  |  |
| Item | Regular Pack | Brand Pack | Note |  |  |
| Rainbow Regular themes (5-star) |  |  |  |  |  |
| Item | Regular Pack | Brand Pack | Note |  |  |
| Rainbow theme (share of draws) | 0.01 | 0.009 | All rainbow themes share this. Taken out of the Regular theme row (row 6), not added on top |  |  |
| Standard Regular theme (share of draws) | 0.13999999999999999 | 0.126 | What is left of row 6 for the Standard themes |  |  |
| Rainbow pity after (draws) | 90 | 90 | Proposal: a rainbow theme is guaranteed within this many draws without one, in that pack |  |  |
| Rainbow themes in the pool | 8 |  | From the Rainbow themes sheet (Tier column) |  |  |
| Standard Regular themes in the pool | 53 |  |  |  |  |
| Check |  |  | OK: rainbow fits inside the Regular theme row |  |  |
## Sheet: Rainbow themes
| Rainbow themes (5-star) |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Every Regular theme that can be drawn, its tier, and its chance per draw. Change a yellow Tier cell to move a theme between Rainbow and Standard; the counts, the Inputs sheet and every chance follow. |  |  |  |  |  |  |  |  |  |  |
| Count |  | Themes |  | Share of draws (Regular) | Share of draws (Brand) |  |  |  |  |  |
| Rainbow (5-star) |  | 8 |  | 0.01 | 0.009 |  |  |  |  |  |
| Standard |  | 53 |  | 0.13999999999999999 | 0.126 |  |  |  |  |  |
| All in the Regular pool |  | 61 |  | 0.15 | 0.135 |  |  |  |  |  |
| Theme | Id | Colour group | Light twin | Tier | In Regular pool | Why rainbow / note | Regular Pack: chance | Regular: 1 in N | Brand Pack: chance | Brand: 1 in N |
| Retro Arcade | retro-arcade | Pink | No | Rainbow | Yes | Mono type, 0.25rem corners, magenta accent #d33682. No light twin. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| Neon Magenta | neon-magenta | Pink | No | Rainbow | Yes | Grotesk type, pure magenta accent #ff00c8. No light twin. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| Purple Rain | purple-rain | Violet | No | Rainbow | Yes | Grotesk type, violet accent hsl(263, 70%, 60%), 0.75rem corners. No light twin. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| Claymorphism | claymorphism | Violet | No | Rainbow | Yes | Soft drop shadow (one of two Regular looks with a shadow) and 1.25rem corners. No light twin. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| Pine Terminal | pine-terminal | Green | No | Rainbow | Yes | Mono type, square corners and a hard offset shadow. Its light twin stays Standard. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| Emerald Dark | emerald-dark | Teal | No | Rainbow | Yes | Grotesk type, teal accent hsl(171, 90%, 50%) on near-black, 1rem corners. No light twin. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| Rosé Pine | rose-pine | Pink | No | Rainbow | Yes | Serif type (one of three serif looks in the pool), lavender accent #c4a7e7. No light twin. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| AJ Cybernetics | aj-cybernetics | Amber | No | Rainbow | Yes | Mono type, orange accent #ea580c. Its light twin stays Standard. | 0.00125 | 800 | 0.001125 | 888.8888888888889 |
| T3 Chat | t3-chat | Pink | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Sakura Dawn | sakura-dawn | Pink | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Sakura Dawn light | sakura-dawn-light | Pink | Yes | Standard | Yes | Light twin of Sakura Dawn. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Catppuccin | catppuccin | Violet | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Catppuccin Latte | catppuccin-latte | Violet | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Graphite | graphite | Neutral | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Discord | discord | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Discord light | discord-light | Blue | Yes | Standard | Yes | Light twin of Discord. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| VS Code | vs-code | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| VS Code light | vs-code-light | Blue | Yes | Standard | Yes | Light twin of VS Code. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Twitter Azure | twitter-azure | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Twitter Azure light | twitter-azure-light | Blue | Yes | Standard | Yes | Light twin of Twitter Azure. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Claude Azure | claude-azure | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Claude Azure light | claude-azure-light | Blue | Yes | Standard | Yes | Light twin of Claude Azure. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Supabase Sage | supabase-sage | Green | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Supabase Sage light | supabase-sage-light | Green | Yes | Standard | Yes | Light twin of Supabase Sage. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Coral Teal | coral-teal | Red | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Coral Teal light | coral-teal-light | Red | Yes | Standard | Yes | Light twin of Coral Teal. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Advent of Code | advent-of-code | Amber | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Advent of Code light | advent-of-code-light | Amber | Yes | Standard | Yes | Light twin of Advent of Code. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| NXTBET | nxtbet | Amber | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| NXTBET light | nxtbet-light | Amber | Yes | Standard | Yes | Light twin of NXTBET. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| AJ Cybernetics light | aj-cybernetics-light | Amber | Yes | Standard | Yes | Light twin of AJ Cybernetics. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| OpenProfile Noir | openprofile-noir | Neutral | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| OpenProfile Noir light | openprofile-noir-light | Neutral | Yes | Standard | Yes | Light twin of OpenProfile Noir. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Mint Signal | mint-signal | Green | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Mint Signal light | mint-signal-light | Green | Yes | Standard | Yes | Light twin of Mint Signal. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Pine Terminal light | pine-terminal-light | Green | Yes | Standard | Yes | Light twin of Pine Terminal. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Verdant Sky | verdant-sky | Green | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Verdant Sky light | verdant-sky-light | Green | Yes | Standard | Yes | Light twin of Verdant Sky. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| WhatsApp | whatsapp | Teal | No | Standard | No: now a Brand theme in the CMS draft | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. | 0 | not in pool | 0 | not in pool |
| WhatsApp light | whatsapp-light | Teal | Yes | Standard | No: now a Brand theme in the CMS draft | Light twin of WhatsApp. Rainbow is the dark original only. | 0 | not in pool | 0 | not in pool |
| Teal Mist | teal-mist | Teal | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Teal Mist light | teal-mist-light | Teal | Yes | Standard | Yes | Light twin of Teal Mist. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Graphite Mono | graphite-mono | Neutral | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Graphite Mono light | graphite-mono-light | Neutral | Yes | Standard | Yes | Light twin of Graphite Mono. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Coral Noir | coral-noir | Neutral | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Coral Noir light | coral-noir-light | Neutral | Yes | Standard | Yes | Light twin of Coral Noir. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Slate Linen | slate-linen | Neutral | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Slate Linen light | slate-linen-light | Neutral | Yes | Standard | Yes | Light twin of Slate Linen. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Amber Minimal | amber-minimal | Amber | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Amber Minimal light | amber-minimal-light | Amber | Yes | Standard | Yes | Light twin of Amber Minimal. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Ember Dawn | ember-dawn | Amber | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Ember Dawn light | ember-dawn-light | Amber | Yes | Standard | Yes | Light twin of Ember Dawn. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Solar Dusk | solar-dusk | Amber | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Tangerine | tangerine | Red | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Tangerine light | tangerine-light | Red | Yes | Standard | Yes | Light twin of Tangerine. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Scarlet Snow | scarlet-snow | Red | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Scarlet Snow light | scarlet-snow-light | Red | Yes | Standard | Yes | Light twin of Scarlet Snow. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Quantum Rose | quantum-rose | Pink | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Quantum Rose light | quantum-rose-light | Pink | Yes | Standard | Yes | Light twin of Quantum Rose. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Graphite Signal | graphite-signal | Neutral | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Graphite Signal light | graphite-signal-light | Neutral | Yes | Standard | Yes | Light twin of Graphite Signal. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Crimson Noir | crimson-noir | Red | No | Standard | Yes |  | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Crimson Noir light | crimson-noir-light | Red | Yes | Standard | Yes | Light twin of Crimson Noir. Rainbow is the dark original only. | 0.002641509433962264 | 378.5714285714286 | 0.002377358490566038 | 420.6349206349206 |
| Picks follow 5-star gacha logic: about one theme in eight is rainbow, each one half as likely as a Standard theme, and only dark originals (their light twins stay Standard). The WhatsApp looks moved to Brand in the CMS draft, so they are out of the Regular pool here. 'Why' lists facts from the theme catalog (type, corners, shadow, accent). All picks are proposals. |  |  |  |  |  |  |  |  |  |  |
## Sheet: Odds
| Odds by kind and by single item |  |  |  |  |
| --- | --- | --- | --- | --- |
| All formulas. Edit the Inputs sheet to change them. |  |  |  |  |
| Share of draws, by kind |  |  |  |  |
| Kind | Regular Pack | Brand Pack |  |  |
| Regular theme (standard) | 0.13999999999999999 | 0.126 |  |  |
| Brand theme | 0 | 0.01 |  |  |
| Weekly pick | 0.03 | 0.03 |  |  |
| Wallpaper | 0.175 | 0.1375 |  |  |
| Boot screen | 0.05 | 0.075 |  |  |
| Layout slot | 0.02500000000000001 | 0.03749999999999999 |  |  |
| Streak freeze | 0.171 | 0.17099999999999999 |  |  |
| Alert sound | 0.28500000000000003 | 0.285 |  |  |
| Font unlock | 0.05700000000000001 | 0.056999999999999995 |  |  |
| Name flair | 0.056999999999999995 | 0.05699999999999998 |  |  |
| Custom upload unlock | 0 | 0.005 |  |  |
| Rainbow Regular theme | 0.01 | 0.009 |  |  |
| Total | 1 | 0.9999999999999998 |  |  |
| Chance of each single item |  |  |  |  |
| Item | Regular Pack | Brand Pack | Regular: 1 in N draws | Brand: 1 in N draws |
| Regular theme, standard (each) | 0.002641509433962264 | 0.002377358490566038 | 378.5714285714286 | 420.6349206349206 |
| Rainbow Regular theme (each) | 0.00125 | 0.001125 | 800 | 888.8888888888889 |
| Brand theme (each featured) | 0 | 0.005 | not in pack | 200 |
| Weekly unlock pick | 0.03 | 0.03 | 33.333333333333336 | 33.333333333333336 |
| Wallpaper (each) | 0.006999999999999999 | 0.0055000000000000005 | 142.85714285714286 | 181.8181818181818 |
| Boot screen (each) | 0.004166666666666667 | 0.0062499999999999995 | 240 | 160 |
| Layout slot | 0.02500000000000001 | 0.03749999999999999 | 39.999999999999986 | 26.66666666666667 |
| Streak freeze | 0.171 | 0.17099999999999999 | 5.847953216374268 | 5.847953216374269 |
| Alert sound (each) | 0.014250000000000002 | 0.014249999999999999 | 70.17543859649122 | 70.17543859649123 |
| Font unlock | 0.05700000000000001 | 0.056999999999999995 | 17.543859649122805 | 17.54385964912281 |
| Name flair | 0.056999999999999995 | 0.05699999999999998 | 17.54385964912281 | 17.543859649122812 |
| Custom upload unlock | 0 | 0.005 | not in pack | 200 |
| Brand theme is shared by the featured themes only. Owned items stay in the pool and a repeat turns into crystals, so these chances do not change as you collect. Pity and the ten-draw guarantee sit on top of these chances. |  |  |  |  |
## Sheet: Collection time
| How long a set takes to finish |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Because repeats stay in the pool, finishing a set of n items takes about n x H(n) item hits, where H(n) is the harmonic number. Draws = hits / chance per draw of that kind. H(n) is approximated as LN(n) + 0.5772 + 1/(2n), which is accurate to a fraction of a percent. These are averages, not guarantees. |  |  |  |  |  |  |  |  |
| Set | Items | Hits to finish | Regular: chance of the kind | Regular: draws to finish | Regular: Credits | Brand: chance of the kind | Brand: draws to finish | Brand: Credits |
| Wallpapers | 25 | 95.40228812170501 | 0.175 | 545.1559321240287 | 54515.59321240287 | 0.1375 | 693.8348227033091 | 104075.22340549636 |
| Boot screens | 12 | 37.245468197456006 | 0.05 | 744.9093639491201 | 74490.93639491202 | 0.075 | 496.6062426327468 | 74490.93639491202 |
| Alert sounds | 20 | 71.95895947107982 | 0.28500000000000003 | 252.48757709150811 | 25248.75770915081 | 0.285 | 252.48757709150817 | 37873.13656372623 |
| Rainbow Regular themes (no pity) | 8 | 21.753257933438686 | 0.01 | 2175.3257933438686 | 217532.57933438686 | 0.009 | 2417.0286592709654 | 362554.2988906448 |
| Row references: wallpapers use the Wallpaper kind, boot screens the Boot screen kind, alert sounds the Alert sound kind on the Odds sheet. |  |  |  |  |  |  |  |  |
| Boot screen scenarios (Regular Pack) |  |  |  |  |  |  |  |  |
| Boot screen chance (all together) | One boot screen about every (draws) | Credits for one | Draws to finish all | Credits to finish all |  |  |  |  |
| 0.05 | 20 | 2000 | 744.9093639491201 | 74490.93639491202 |  |  |  |  |
| 0.02 | 50 | 5000 | 1862.2734098728004 | 186227.34098728004 |  |  |  |  |
| 0.01 | 100 | 10000 | 3724.5468197456007 | 372454.6819745601 |  |  |  |  |
| 0.005 | 200 | 20000 | 7449.093639491201 | 744909.3639491202 |  |  |  |  |
| The first row is the current 5%. Change any yellow chance to test another. Boot screens have no pity and no crystal route, so a low chance has nothing to soften bad luck. |  |  |  |  |  |  |  |  |
## Sheet: Crystals
| Crystals |  |  |
| --- | --- | --- |
| A repeat turns into crystals in the Regular Pack and into Brand prisms in the Brand Pack. They are different currencies and never become Credits. Values and costs are proposals. |  |  |
| What repeated | Crystals |  |
| Common item (font, name flair, alert sound) | 1 |  |
| Better item (wallpaper, boot screen, layout slot) | 2 |  |
| Regular theme (Standard or Rainbow) | 3 |  |
| Brand theme | 5 |  |
| Custom upload unlock (Brand Pack only) | 5 |  |
| Weekly picks and streak freezes stack, so they never repeat and never give crystals. |  |  |
|  | Regular crystals | Brand prisms |
| Earned from | Repeats in the Regular Pack | Repeats in the Brand Pack |
| Spent on | Only a Regular theme of your choice | Only one of the featured Brand themes |
| Cost of one pick (crystals / prisms) | 10 | 5 |
| Approx. late-game draws per pick | 7.412898443291327 | 3.625815808556925 |
| Approx. Credits per pick | 741.2898443291327 | 543.8723712835388 |
| Late game means every look and one-time item is a repeat. Crystals per draw = Regular theme chance x 3, plus Brand theme chance x 5 in the Brand Pack, plus Better item kinds x 2, plus one-time Common kinds (alert sound, font, flair) x 1. Streak freeze and weekly pick give none. A chosen Regular look costs 120 Credits directly, so 10 Regular crystals is a poor deal. 5 Brand prisms is far cheaper than the 70-draw Brand pity. |  |  |
## Sheet: Items
| Item catalog |  |  |  |  |
| --- | --- | --- | --- | --- |
| Item | Kind | What it does in the app | Needs art? | List |
| Streak freeze | stackable | Counts as a check-in on a missed day, protecting the weekly quest | Item icon | Common |
| Font unlock | one-time | Adds a font to the theme editor's font list | Font file only | Common |
| Alert sound (about 20) | one-time, each | Each sound is its own unlock, chosen as the tone for station alerts | About 20 sounds | Common |
| Name flair | one-time | A colour or small mark on your name in the top bar | No | Common |
| Layout slot | one-time | One more saved dashboard layout | No | Better |
| Wallpaper (20 to 30) | one-time, each | Each wallpaper is its own unlock, usable as the dashboard background | 20 to 30 wallpapers | Better |
| Boot screen style (10 to 15) | one-time, each | Each style is its own unlock, usable as the start-up screen. Rarer than wallpapers | 10 to 15 boot animations | Better |
| Custom upload unlock | one-time | Lets you upload your own custom file. What it covers (wallpaper, theme or boot image) is an assumption to confirm. Brand Pack only | No | Brand Pack only |
| No item may open the brand-colour editor or any Patreon benefit, add Credits, or give a draw or free pull. A one-time item you already own turns into crystals. |  |  |  |  |
## Sheet: Rules
| Rules side by side |  |  |
| --- | --- | --- |
| Rule | Regular Pack | Brand Pack |
| Price per draw (Credits) | 100 | 150 |
| Price for ten (Credits) | 900 | 1350 |
| Every ten-draw contains | At least 1 Regular theme | At least 1 Regular theme |
| Look pity | A new Regular theme after 9 draws with no look | Same |
| Brand theme pity | None | A Brand theme within 70 draws |
| Brand themes you can win | None | 2 of 28, changing every 14 days |
| Brand Pack only item | None | Custom upload unlock: 0.5% per draw |
| A repeat gives | Regular crystals | Brand prisms |
| Crystal cost of one pick | 10 Regular crystals: a Regular theme of your choice | 5 Brand prisms: one of the featured Brand themes |
| Disabled when | Everything in the pack is owned | Everything in the pack is owned |
| Rainbow Regular themes | 8 of 61 Regular themes, 1.0% of draws together | 8 of 61 Regular themes, 0.9% of draws together |
| Rainbow pity | A rainbow theme within 90 draws without one. Checked before look pity | A rainbow theme within 90 draws without one. Checked after Brand pity, before look pity |
| Card back and front | Rainbow, like company looks | Rainbow, like company looks |
| Buy with Credits (Themes page) | Standard themes only. Rainbow: draws only (proposal) | Same |
| Weekly unlock pick | Standard themes only (proposal) | Same |
| Regular crystal pick | Standard themes only (proposal) | Same |
| Look pity and ten-draw guarantee | Give a Standard theme (proposal) | Same |
| A chosen look still costs 120 Credits. The Brand rotation is worked out from the date, so it is the same on every PC. Pity numbers (9 and 70) are proposals. Rainbow rows are proposals: rainbow themes are draw-only, like Brand looks, so their odds hold. |  |  |
## Sheet: Box (earlier)
| Box (earlier proposal, not in the current plan) |  |  |
| --- | --- | --- |
| The Box was dropped when crystals were split into two kinds. It is kept here to compare. Edit the yellow chances to test other odds. |  |  |
| Box prize | Chance | What the player gets |
| Brand theme | 0.12 | A new one of the featured Brand themes |
| Regular theme of your choice | 0.25 | Pick any Regular look you do not own |
| Free draw | 0.15 | One free single draw in the Regular Pack |
| Wallpaper | 0.2 | A new wallpaper |
| Boot screen style | 0.1 | A new boot screen |
| Weekly unlock pick | 0.08 | +1 weekly unlock |
| Streak freeze x3 | 0.1 | 3 streak freezes |
| Total | 0.9999999999999999 | OK: totals 100% |
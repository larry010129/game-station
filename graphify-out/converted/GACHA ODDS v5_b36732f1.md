<!-- converted from GACHA ODDS v5.xlsx -->

## Sheet: Read me
| Draw Theme gacha: odds workbook (v5) |  |
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
| Changed in v5 |  |
| Rainbow 50/50 | Inputs rows 54 to 63 and the 50-50 sheet. Brand Pack has one rainbow rate (1.5%); a rainbow is a featured Brand theme 50% of the time, and after a miss the next rainbow is one for sure. |
| Inputs C7 and C47 | Were typed (1.0% and 0.9%). Now worked out by the 50/50: 1.0% featured Brand theme and 0.5% rainbow Regular theme. |
| Inputs C49 | Brand Pack rainbow pity is 70, taking over from the old Brand theme pity. Worst case to a Brand theme: 140 draws. |
| Rules | Row 8 (Brand theme pity) and new row 21 (Rainbow 50/50). |
## Sheet: Inputs
| Inputs |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Yellow cells with blue text are yours to change. Black cells are formulas. Chances are shares of all draws in that pack. |  |  |  |  |  |
| Row chances (share of draws) |  |  |  |  |  |
| Outcome | Regular Pack | Brand Pack | Note |  |  |
| Regular theme | 0.15 | 0.135 | Shared across all Regular looks. Rainbow themes take their share out of this row (row 47) |  |  |
| Brand theme | 0 |  | Promoted (featured) Brand themes. Brand Pack: worked out by the 50/50 below (row 59) |  |  |
| Weekly unlock pick | 0.03 | 0.03 |  |  |  |
| Custom upload unlock | 0 | 0.005 | Brand Pack only. Taken from Common item. Not available in the Regular Pack |  |  |
| Better item | 0.25 | 0.25 | Wallpaper, boot screen, layout slot |  |  |
| Common item |  |  | Balances the pack to 100%. Streak freeze, alert sound, font, name flair. (v4 fix: Custom upload is no longer subtracted twice) |  |  |
| Total |  |  |  |  |  |
| Inside Better item (weights) |  |  |  |  |  |
| Kind | Regular Pack | Brand Pack | Note |  |  |
| Wallpaper | 0.7 | 0.55 |  |  |  |
| Boot screen style | 0.2 | 0.3 | Rarer than wallpapers |  |  |
| Layout slot |  |  | Balances to 100% |  |  |
| Total |  |  |  |  |  |
| Inside Common item (weights) |  |  |  |  |  |
| Kind | Regular Pack | Brand Pack | Note |  |  |
| Streak freeze | 0.3 | 0.3 | Stackable, never repeats |  |  |
| Alert sound (all of them) | 0.5 | 0.5 | About 20 sounds share this weight |  |  |
| Font unlock | 0.1 | 0.1 |  |  |  |
| Name flair |  |  | Balances to 100% |  |  |
| Total |  |  |  |  |  |
| Counts |  |  |  |  |  |
| Item | Count |  | Note |  |  |
| Regular looks in the pool |  |  | From the Rainbow themes sheet: the catalog's drawable Regular looks (WhatsApp moved to Brand) |  |  |
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
| Rainbow theme (share of draws) | 0.01 |  | Regular Pack: typed. Brand Pack: what lost 50/50s give (row 60). Taken out of the Regular theme row, not added on top |  |  |
| Standard Regular theme (share of draws) |  |  | What is left of row 6 for the Standard themes |  |  |
| Rainbow pity after (draws) | 90 | 70 | A rainbow within this many draws without one. Brand Pack: replaces the old 70-draw Brand pity; a Brand theme within row 61 at worst |  |  |
| Rainbow themes in the pool |  |  | From the Rainbow themes sheet (Tier column) |  |  |
| Standard Regular themes in the pool |  |  |  |  |  |
| Check |  |  |  |  |  |
| Rainbow 50/50 (packs with a promoted theme) |  |  |  |  |  |
| Item | Regular Pack | Brand Pack | Note |  |  |
| Rainbow (5-star) rate, all kinds |  | 0.015 | Chance a draw is any rainbow: a promoted theme or a rainbow Regular theme. Regular Pack: rainbow Regular themes only (row 47) |  |  |
| Chance the rainbow is promoted (50/50) | No promoted theme | 0.5 | When not guaranteed. Lose it and the next rainbow is a promoted theme for sure |  |  |
| Promoted share of rainbows, long run |  |  | Each loss is followed by a sure win, so one promoted theme takes 2 - p rainbows on average (p = row 57) |  |  |
| Promoted theme (share of draws), effective |  |  | Feeds the Brand theme row (C7) |  |  |
| Rainbow Regular theme (share of draws), effective |  |  | Feeds the rainbow row (C47): what the lost 50/50s give |  |  |
| Worst case draws to a promoted theme |  |  | Rainbow pity twice: lose the 50/50 at the first pity, win for sure at the second |  |  |
| Average rainbows per promoted theme |  |  |  |  |  |
| Check |  |  |  |  |  |
## Sheet: Rainbow themes
| Rainbow themes (5-star) |  |  |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Every Regular theme that can be drawn, its tier, and its chance per draw. Change a yellow Tier cell to move a theme between Rainbow and Standard; the counts, the Inputs sheet and every chance follow. |  |  |  |  |  |  |  |  |  |  |
| Count |  | Themes |  | Share of draws (Regular) | Share of draws (Brand) |  |  |  |  |  |
| Rainbow (5-star) |  |  |  |  |  |  |  |  |  |  |
| Standard |  |  |  |  |  |  |  |  |  |  |
| All in the Regular pool |  |  |  |  |  |  |  |  |  |  |
| Theme | Id | Colour group | Light twin | Tier | In Regular pool | Why rainbow / note | Regular Pack: chance | Regular: 1 in N | Brand Pack: chance | Brand: 1 in N |
| Retro Arcade | retro-arcade | Pink | No | Rainbow | Yes | Mono type, 0.25rem corners, magenta accent #d33682. No light twin. |  |  |  |  |
| Neon Magenta | neon-magenta | Pink | No | Rainbow | Yes | Grotesk type, pure magenta accent #ff00c8. No light twin. |  |  |  |  |
| Purple Rain | purple-rain | Violet | No | Rainbow | Yes | Grotesk type, violet accent hsl(263, 70%, 60%), 0.75rem corners. No light twin. |  |  |  |  |
| Claymorphism | claymorphism | Violet | No | Rainbow | Yes | Soft drop shadow (one of two Regular looks with a shadow) and 1.25rem corners. No light twin. |  |  |  |  |
| Pine Terminal | pine-terminal | Green | No | Rainbow | Yes | Mono type, square corners and a hard offset shadow. Its light twin stays Standard. |  |  |  |  |
| Emerald Dark | emerald-dark | Teal | No | Rainbow | Yes | Grotesk type, teal accent hsl(171, 90%, 50%) on near-black, 1rem corners. No light twin. |  |  |  |  |
| Rosé Pine | rose-pine | Pink | No | Rainbow | Yes | Serif type (one of three serif looks in the pool), lavender accent #c4a7e7. No light twin. |  |  |  |  |
| AJ Cybernetics | aj-cybernetics | Amber | No | Rainbow | Yes | Mono type, orange accent #ea580c. Its light twin stays Standard. |  |  |  |  |
| T3 Chat | t3-chat | Pink | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| Sakura Dawn | sakura-dawn | Pink | No | Standard | Yes |  |  |  |  |  |
| Sakura Dawn light | sakura-dawn-light | Pink | Yes | Standard | Yes | Light twin of Sakura Dawn. Rainbow is the dark original only. |  |  |  |  |
| Catppuccin | catppuccin | Violet | No | Standard | Yes |  |  |  |  |  |
| Catppuccin Latte | catppuccin-latte | Violet | No | Standard | Yes |  |  |  |  |  |
| Graphite | graphite | Neutral | No | Standard | Yes |  |  |  |  |  |
| Discord | discord | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| Discord light | discord-light | Blue | Yes | Standard | Yes | Light twin of Discord. Rainbow is the dark original only. |  |  |  |  |
| VS Code | vs-code | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| VS Code light | vs-code-light | Blue | Yes | Standard | Yes | Light twin of VS Code. Rainbow is the dark original only. |  |  |  |  |
| Twitter Azure | twitter-azure | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| Twitter Azure light | twitter-azure-light | Blue | Yes | Standard | Yes | Light twin of Twitter Azure. Rainbow is the dark original only. |  |  |  |  |
| Claude Azure | claude-azure | Blue | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| Claude Azure light | claude-azure-light | Blue | Yes | Standard | Yes | Light twin of Claude Azure. Rainbow is the dark original only. |  |  |  |  |
| Supabase Sage | supabase-sage | Green | No | Standard | Yes | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| Supabase Sage light | supabase-sage-light | Green | Yes | Standard | Yes | Light twin of Supabase Sage. Rainbow is the dark original only. |  |  |  |  |
| Coral Teal | coral-teal | Red | No | Standard | Yes |  |  |  |  |  |
| Coral Teal light | coral-teal-light | Red | Yes | Standard | Yes | Light twin of Coral Teal. Rainbow is the dark original only. |  |  |  |  |
| Advent of Code | advent-of-code | Amber | No | Standard | Yes |  |  |  |  |  |
| Advent of Code light | advent-of-code-light | Amber | Yes | Standard | Yes | Light twin of Advent of Code. Rainbow is the dark original only. |  |  |  |  |
| NXTBET | nxtbet | Amber | No | Standard | Yes |  |  |  |  |  |
| NXTBET light | nxtbet-light | Amber | Yes | Standard | Yes | Light twin of NXTBET. Rainbow is the dark original only. |  |  |  |  |
| AJ Cybernetics light | aj-cybernetics-light | Amber | Yes | Standard | Yes | Light twin of AJ Cybernetics. Rainbow is the dark original only. |  |  |  |  |
| OpenProfile Noir | openprofile-noir | Neutral | No | Standard | Yes |  |  |  |  |  |
| OpenProfile Noir light | openprofile-noir-light | Neutral | Yes | Standard | Yes | Light twin of OpenProfile Noir. Rainbow is the dark original only. |  |  |  |  |
| Mint Signal | mint-signal | Green | No | Standard | Yes |  |  |  |  |  |
| Mint Signal light | mint-signal-light | Green | Yes | Standard | Yes | Light twin of Mint Signal. Rainbow is the dark original only. |  |  |  |  |
| Pine Terminal light | pine-terminal-light | Green | Yes | Standard | Yes | Light twin of Pine Terminal. Rainbow is the dark original only. |  |  |  |  |
| Verdant Sky | verdant-sky | Green | No | Standard | Yes |  |  |  |  |  |
| Verdant Sky light | verdant-sky-light | Green | Yes | Standard | Yes | Light twin of Verdant Sky. Rainbow is the dark original only. |  |  |  |  |
| WhatsApp | whatsapp | Teal | No | Standard | No: now a Brand theme in the CMS draft | Brand-inspired look. Company looks are already the rainbow of the Brand and Region packs. |  |  |  |  |
| WhatsApp light | whatsapp-light | Teal | Yes | Standard | No: now a Brand theme in the CMS draft | Light twin of WhatsApp. Rainbow is the dark original only. |  |  |  |  |
| Teal Mist | teal-mist | Teal | No | Standard | Yes |  |  |  |  |  |
| Teal Mist light | teal-mist-light | Teal | Yes | Standard | Yes | Light twin of Teal Mist. Rainbow is the dark original only. |  |  |  |  |
| Graphite Mono | graphite-mono | Neutral | No | Standard | Yes |  |  |  |  |  |
| Graphite Mono light | graphite-mono-light | Neutral | Yes | Standard | Yes | Light twin of Graphite Mono. Rainbow is the dark original only. |  |  |  |  |
| Coral Noir | coral-noir | Neutral | No | Standard | Yes |  |  |  |  |  |
| Coral Noir light | coral-noir-light | Neutral | Yes | Standard | Yes | Light twin of Coral Noir. Rainbow is the dark original only. |  |  |  |  |
| Slate Linen | slate-linen | Neutral | No | Standard | Yes |  |  |  |  |  |
| Slate Linen light | slate-linen-light | Neutral | Yes | Standard | Yes | Light twin of Slate Linen. Rainbow is the dark original only. |  |  |  |  |
| Amber Minimal | amber-minimal | Amber | No | Standard | Yes |  |  |  |  |  |
| Amber Minimal light | amber-minimal-light | Amber | Yes | Standard | Yes | Light twin of Amber Minimal. Rainbow is the dark original only. |  |  |  |  |
| Ember Dawn | ember-dawn | Amber | No | Standard | Yes |  |  |  |  |  |
| Ember Dawn light | ember-dawn-light | Amber | Yes | Standard | Yes | Light twin of Ember Dawn. Rainbow is the dark original only. |  |  |  |  |
| Solar Dusk | solar-dusk | Amber | No | Standard | Yes |  |  |  |  |  |
| Tangerine | tangerine | Red | No | Standard | Yes |  |  |  |  |  |
| Tangerine light | tangerine-light | Red | Yes | Standard | Yes | Light twin of Tangerine. Rainbow is the dark original only. |  |  |  |  |
| Scarlet Snow | scarlet-snow | Red | No | Standard | Yes |  |  |  |  |  |
| Scarlet Snow light | scarlet-snow-light | Red | Yes | Standard | Yes | Light twin of Scarlet Snow. Rainbow is the dark original only. |  |  |  |  |
| Quantum Rose | quantum-rose | Pink | No | Standard | Yes |  |  |  |  |  |
| Quantum Rose light | quantum-rose-light | Pink | Yes | Standard | Yes | Light twin of Quantum Rose. Rainbow is the dark original only. |  |  |  |  |
| Graphite Signal | graphite-signal | Neutral | No | Standard | Yes |  |  |  |  |  |
| Graphite Signal light | graphite-signal-light | Neutral | Yes | Standard | Yes | Light twin of Graphite Signal. Rainbow is the dark original only. |  |  |  |  |
| Crimson Noir | crimson-noir | Red | No | Standard | Yes |  |  |  |  |  |
| Crimson Noir light | crimson-noir-light | Red | Yes | Standard | Yes | Light twin of Crimson Noir. Rainbow is the dark original only. |  |  |  |  |
| Picks follow 5-star gacha logic: about one theme in eight is rainbow, each one half as likely as a Standard theme, and only dark originals (their light twins stay Standard). The WhatsApp looks moved to Brand in the CMS draft, so they are out of the Regular pool here. 'Why' lists facts from the theme catalog (type, corners, shadow, accent). All picks are proposals. |  |  |  |  |  |  |  |  |  |  |
## Sheet: 50-50
| Rainbow 50/50 (Brand Pack) |  |  |  |  |
| --- | --- | --- | --- | --- |
| What each rainbow gives, by the state you are in. The guarantee carries over between draws and between sessions until it is used. |  |  |  |  |
| Your state | Featured Brand theme | Rainbow Regular theme | After it |  |
| No guarantee (start) |  |  | Win: stay in No guarantee. Lose: you hold a Guarantee |  |
| Guarantee (lost the last 50/50) | 1 | 0 | Always a featured Brand theme, then back to No guarantee |  |
| Long run | Value |  |  |  |
| Rainbows per featured Brand theme |  |  |  |  |
| Featured share of all rainbows |  |  |  |  |
| Featured Brand theme, share of draws |  |  |  |  |
| Average draws per featured Brand theme (no pity) |  |  |  |  |
| Worst case draws to a featured Brand theme |  |  |  |  |
| Chance the first rainbow is featured |  |  |  |  |
| Chance one of the first two rainbows is featured |  | A lost 50/50 always makes the second rainbow featured |  |  |
## Sheet: Odds
| Odds by kind and by single item |  |  |  |  |
| --- | --- | --- | --- | --- |
| All formulas. Edit the Inputs sheet to change them. |  |  |  |  |
| Share of draws, by kind |  |  |  |  |
| Kind | Regular Pack | Brand Pack |  |  |
| Regular theme (standard) |  |  |  |  |
| Brand theme |  |  |  |  |
| Weekly pick |  |  |  |  |
| Wallpaper |  |  |  |  |
| Boot screen |  |  |  |  |
| Layout slot |  |  |  |  |
| Streak freeze |  |  |  |  |
| Alert sound |  |  |  |  |
| Font unlock |  |  |  |  |
| Name flair |  |  |  |  |
| Custom upload unlock |  |  |  |  |
| Rainbow Regular theme |  |  |  |  |
| Total |  |  |  |  |
| Chance of each single item |  |  |  |  |
| Item | Regular Pack | Brand Pack | Regular: 1 in N draws | Brand: 1 in N draws |
| Regular theme, standard (each) |  |  |  |  |
| Rainbow Regular theme (each) |  |  |  |  |
| Brand theme (each featured) |  |  |  |  |
| Weekly unlock pick |  |  |  |  |
| Wallpaper (each) |  |  |  |  |
| Boot screen (each) |  |  |  |  |
| Layout slot |  |  |  |  |
| Streak freeze |  |  |  |  |
| Alert sound (each) |  |  |  |  |
| Font unlock |  |  |  |  |
| Name flair |  |  |  |  |
| Custom upload unlock |  |  |  |  |
| Brand theme is shared by the featured themes only. Owned items stay in the pool and a repeat turns into crystals, so these chances do not change as you collect. Pity and the ten-draw guarantee sit on top of these chances. |  |  |  |  |
## Sheet: Collection time
| How long a set takes to finish |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Because repeats stay in the pool, finishing a set of n items takes about n x H(n) item hits, where H(n) is the harmonic number. Draws = hits / chance per draw of that kind. H(n) is approximated as LN(n) + 0.5772 + 1/(2n), which is accurate to a fraction of a percent. These are averages, not guarantees. |  |  |  |  |  |  |  |  |
| Set | Items | Hits to finish | Regular: chance of the kind | Regular: draws to finish | Regular: Credits | Brand: chance of the kind | Brand: draws to finish | Brand: Credits |
| Wallpapers |  |  |  |  |  |  |  |  |
| Boot screens |  |  |  |  |  |  |  |  |
| Alert sounds |  |  |  |  |  |  |  |  |
| Rainbow Regular themes (no pity) |  |  |  |  |  |  |  |  |
| Row references: wallpapers use the Wallpaper kind, boot screens the Boot screen kind, alert sounds the Alert sound kind on the Odds sheet. |  |  |  |  |  |  |  |  |
| Boot screen scenarios (Regular Pack) |  |  |  |  |  |  |  |  |
| Boot screen chance (all together) | One boot screen about every (draws) | Credits for one | Draws to finish all | Credits to finish all |  |  |  |  |
| 0.05 |  |  |  |  |  |  |  |  |
| 0.02 |  |  |  |  |  |  |  |  |
| 0.01 |  |  |  |  |  |  |  |  |
| 0.005 |  |  |  |  |  |  |  |  |
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
| Approx. late-game draws per pick |  |  |
| Approx. Credits per pick |  |  |
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
| Price per draw (Credits) |  |  |
| Price for ten (Credits) |  |  |
| Every ten-draw contains | At least 1 Regular theme | At least 1 Regular theme |
| Look pity | A new Regular theme after 9 draws with no look | Same |
| Brand theme pity | None |  |
| Brand themes you can win | None |  |
| Brand Pack only item | None |  |
| A repeat gives | Regular crystals | Brand prisms |
| Crystal cost of one pick |  |  |
| Disabled when | Everything in the pack is owned | Everything in the pack is owned |
| Rainbow Regular themes |  |  |
| Rainbow pity |  |  |
| Card back and front | Rainbow, like company looks | Rainbow, like company looks |
| Buy with Credits (Themes page) | Standard themes only. Rainbow: draws only (proposal) | Same |
| Weekly unlock pick | Standard themes only (proposal) | Same |
| Regular crystal pick | Standard themes only (proposal) | Same |
| Look pity and ten-draw guarantee | Give a Standard theme (proposal) | Same |
| Rainbow 50/50 | None: there is no promoted theme, every rainbow is a rainbow Regular theme |  |
| A chosen look still costs 120 Credits. The Brand rotation is worked out from the date, so it is the same on every PC. Pity numbers (9 and 70) are proposals. Rainbow rows are proposals: rainbow themes are draw-only, like Brand looks, so their odds hold. The 50/50 is a proposal; the Region Pack would use it the same way with its week's featured companies. |  |  |
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
| Total |  |  |
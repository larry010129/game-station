<!-- converted from GACHA ODDS.xlsx -->

## Sheet: Read me
| Draw Theme gacha: odds workbook |  |
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
| Assumptions | Counts (64 Regular looks, 25 wallpapers, 12 boot screens, 20 alert sounds) are estimates. Regular looks is not verified against the catalog. Wallpapers, boot screens and alert sounds are midpoints of the ranges you gave. Every chance is a proposal. |
## Sheet: Inputs
| Inputs |  |  |  |
| --- | --- | --- | --- |
| Yellow cells with blue text are yours to change. Black cells are formulas. Chances are shares of all draws in that pack. |  |  |  |
| Row chances (share of draws) |  |  |  |
| Outcome | Regular Pack | Brand Pack | Note |
| Regular theme | 0.15 | 0.15 | Shared across all Regular looks |
| Brand theme | 0 | 0.01 | Shared across the featured Brand themes. Brand Pack only |
| Weekly unlock pick | 0.02 | 0.02 | max 2 after that add to common item chance |
| Better item | 0.25 | 0.25 | Wallpaper, boot screen, layout slot |
| Common item | 0.5800000000000001 | 0.5700000000000001 | Balances the pack to 100%. Streak freeze, alert sound, font unlock, name flair |
| Total | 1 | 1 | OK: both packs total 100% |
| Inside Better item (weights) |  |  |  |
| Kind | Regular Pack | Brand Pack | Note |
| Wallpaper | 0.4 | 0.4 |  |
| Boot screen style | 0.08 | 0.08 | Rarer than wallpapers |
| Layout slot | 0.52 | 0.52 | Balances to 100% |
| Total | 1 | 1 |  |
| Inside Common item (weights) |  |  |  |
| Kind | Regular Pack | Brand Pack | Note |
| Streak freeze | 0.5 | 0.5 | Stackable, never repeats |
| Alert sound (all of them) | 0.2 | 0.2 | About 20 sounds share this weight |
| Font unlock | 0.1 | 0.1 |  |
| Name flair | 0.20000000000000007 | 0.20000000000000007 | Balances to 100% |
| Total | 1 | 1 |  |
| Counts |  |  |  |
| Item | Count |  | Note |
| Regular looks in the pool | 64 |  | Estimate. Not checked against the catalog/ the count will get more in future |
| Wallpapers | 25 |  | Midpoint of 20 to 30 being designed |
| Boot screen styles | 15 |  | Between 10 and 15 being designed |
| Alert sounds | 20 |  | About 20 being designed |
| Featured Brand themes at a time | 2 |  | Changes every 14 days |
| Brand themes in the set | 28 |  | Spotify Night through Airbnb Coral and will be more in future |
| Prices (Credits) |  |  |  |
| Pack | One draw | Ten draws | Note |
| Regular Pack | 140 | 1350 | Unchanged from the current game |
| Brand Pack | 160 | 1600 | Proposal. Change freely |
## Sheet: Odds
| Odds by kind and by single item |  |  |  |  |
| --- | --- | --- | --- | --- |
| All formulas. Edit the Inputs sheet to change them. |  |  |  |  |
| Share of draws, by kind |  |  |  |  |
| Kind | Regular Pack | Brand Pack |  |  |
| Regular theme | 0.15 | 0.15 |  |  |
| Brand theme | 0 | 0.01 |  |  |
| Weekly pick | 0.02 | 0.02 |  |  |
| Wallpaper | 0.1 | 0.1 |  |  |
| Boot screen | 0.02 | 0.02 |  |  |
| Layout slot | 0.13 | 0.13 |  |  |
| Streak freeze | 0.29000000000000004 | 0.28500000000000003 |  |  |
| Alert sound | 0.11600000000000002 | 0.11400000000000002 |  |  |
| Font unlock | 0.05800000000000001 | 0.05700000000000001 |  |  |
| Name flair | 0.11600000000000005 | 0.11400000000000005 |  |  |
| Total | 1.0000000000000002 | 1.0000000000000002 |  |  |
| Chance of each single item |  |  |  |  |
| Item | Regular Pack | Brand Pack | Regular: 1 in N draws | Brand: 1 in N draws |
| Regular theme (each look) | 0.00234375 | 0.00234375 | 426.6666666666667 | 426.6666666666667 |
| Brand theme (each featured) | 0 | 0.005 | not in pack | 200 |
| Weekly unlock pick | 0.02 | 0.02 | 50 | 50 |
| Wallpaper (each) | 0.004 | 0.004 | 250 | 250 |
| Boot screen (each) | 0.0013333333333333333 | 0.0013333333333333333 | 750 | 750 |
| Layout slot | 0.13 | 0.13 | 7.692307692307692 | 7.692307692307692 |
| Streak freeze | 0.29000000000000004 | 0.28500000000000003 | 3.4482758620689653 | 3.508771929824561 |
| Alert sound (each) | 0.005800000000000001 | 0.005700000000000001 | 172.41379310344823 | 175.43859649122803 |
| Font unlock | 0.05800000000000001 | 0.05700000000000001 | 17.241379310344826 | 17.543859649122805 |
| Name flair | 0.11600000000000005 | 0.11400000000000005 | 8.620689655172411 | 8.7719298245614 |
| Brand theme is shared by the featured themes only. Owned items stay in the pool and a repeat turns into crystals, so these chances do not change as you collect. Pity and the ten-draw guarantee sit on top of these chances. |  |  |  |  |
## Sheet: Collection time
| How long a set takes to finish |  |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Because repeats stay in the pool, finishing a set of n items takes about n x H(n) item hits, where H(n) is the harmonic number. Draws = hits / chance per draw of that kind. H(n) is approximated as LN(n) + 0.5772 + 1/(2n), which is accurate to a fraction of a percent. These are averages, not guarantees. |  |  |  |  |  |  |  |  |
| Set | Items | Hits to finish | Regular: chance of the kind | Regular: draws to finish | Regular: Credits | Brand: chance of the kind | Brand: draws to finish | Brand: Credits |
| Wallpapers | 25 | 95.40228812170501 | 0.1 | 954.0228812170501 | 133563.20337038703 | 0.1 | 954.0228812170501 | 152643.660994728 |
| Boot screens | 15 | 49.77898851653315 | 0.02 | 2488.9494258266573 | 348452.91961573204 | 0.02 | 2488.9494258266573 | 398231.90813226515 |
| Alert sounds | 20 | 71.95895947107982 | 0.11600000000000002 | 620.3358575093087 | 86847.02005130322 | 0.11400000000000002 | 631.2189427287702 | 100995.03083660324 |
| Row references: wallpapers use the Wallpaper kind, boot screens the Boot screen kind, alert sounds the Alert sound kind on the Odds sheet. |  |  |  |  |  |  |  |  |
| Boot screen scenarios (Regular Pack) |  |  |  |  |  |  |  |  |
| Boot screen chance (all together) | One boot screen about every (draws) | Credits for one | Draws to finish all | Credits to finish all |  |  |  |  |
| 0.05 | 20 | 2800 | 995.5797703306629 | 139381.1678462928 |  |  |  |  |
| 0.02 | 50 | 7000 | 2488.9494258266573 | 348452.91961573204 |  |  |  |  |
| 0.01 | 100 | 14000 | 4977.8988516533145 | 696905.8392314641 |  |  |  |  |
| 0.005 | 200 | 28000 | 9955.797703306629 | 1393811.6784629282 |  |  |  |  |
| The first row is the current 5%. Change any yellow chance to test another. Boot screens have no pity and no crystal route, so a low chance has nothing to soften bad luck. |  |  |  |  |  |  |  |  |
## Sheet: Crystals
| Crystals |  |  |
| --- | --- | --- |
| A repeat turns into crystals of the pack it was drawn in. Crystals never become Credits. Values and costs are proposals. |  |  |
| What repeated | Crystals |  |
| Common item (font, name flair, alert sound) | 1 |  |
| Better item (wallpaper, boot screen, layout slot) | 2 |  |
| Regular theme | 3 |  |
| Brand theme | 5 |  |
| Weekly picks and streak freezes stack, so they never repeat and never give crystals. |  |  |
|  | Regular crystals | Brand crystals |
| Earned from | Repeats in the Regular Pack | Repeats in the Brand Pack |
| Spent on | Only a Regular theme of your choice | Only one of the featured Brand themes |
| Cost of one pick | 10 | 5 |
| Approx. late-game draws per pick | 8.064516129032258 | 3.891050583657587 |
| Approx. Credits per pick | 1129.032258064516 | 622.568093385214 |
| Late game means every look and one-time item is a repeat. Crystals per draw = Regular theme chance x 3, plus Brand theme chance x 5 in the Brand Pack, plus Better item kinds x 2, plus one-time Common kinds (alert sound, font, flair) x 1. Streak freeze and weekly pick give none. A chosen Regular look costs 120 Credits directly, so 10 Regular crystals is a poor deal. 5 Brand crystals is far cheaper than the 70-draw Brand pity. |  |  |
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
| No item may open the brand-colour editor or any Patreon benefit, add Credits, or give a draw or free pull. A one-time item you already own turns into crystals. |  |  |  |  |
## Sheet: Rules
| Rules side by side |  |  |
| --- | --- | --- |
| Rule | Regular Pack | Brand Pack |
| Price per draw (Credits) | 140 | 160 |
| Price for ten (Credits) | 1350 | 1600 |
| Every ten-draw contains | At least 1 Regular theme | At least 1 Regular theme |
| Look pity | A new Regular theme after 9 draws with no look | Same |
| Brand theme pity | None | A Brand theme within 70 draws |
| Brand themes you can win | None | 2 of 28, changing every 14 days |
| A repeat gives | Regular crystals | Brand crystals |
| Crystal cost of one pick | 10 crystals: a Regular theme of your choice | 5 crystals: one of the featured Brand themes |
| Disabled when | Everything in the pack is owned | Everything in the pack is owned |
| A chosen look still costs 120 Credits. The Brand rotation is worked out from the date, so it is the same on every PC. Pity numbers (9 and 70) are proposals. |  |  |
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
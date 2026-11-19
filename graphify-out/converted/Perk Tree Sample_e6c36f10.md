<!-- converted from Perk Tree Sample.xlsx -->

## Sheet: Read me
| Perk Tree Sample |
| --- |
| A branching perk tree for Command Station, drafted here before it is built into the app. |
| Design rule |
| Command Station mostly sits in the background while you game. So the tree rewards gaming time, not clicking around the app. |
| Most nodes pay out from counted play time, finished sessions and days played, or the app simply running beside the game. |
| Only a few need you to act in the app (claiming a quest, making a draw). The 'earned_by' column and the Summary sheet show the split. |
| How the tree works |
| 1. You start on Station Core in the middle. It is free. |
| 2. You can take any node that touches a node you already have. Several paths lead to the same place. |
| 3. Small nodes give small bonuses. Notables (named, larger) give bigger ones. Keystones (outer rim) change a rule and come with a cost. |
| 4. The inner ring (Crosswalk) and three Bridges join neighbouring regions, so you can cross without going back to the middle. |
| 5. Past each inner keystone is an outer band: four hexagon wheels (six small nodes round a notable), two outer notable paths, and a grand keystone on the rim. |
| 6. Perk Points come from rank-ups and Season Pass levels, up to a cap (see the Points sheet). One free full reset per month. |
| How to edit |
| This workbook is tables and lists only. The branching picture is in perk-tree-sample.html. |
| Nodes sheet: change name, effect, stat, value, cost, x, y or notes. Cells you are meant to edit are on a pale yellow fill. |
| Edges sheet: each row joins two node ids. Add or delete rows to change the paths. |
| Points sheet: change the yellow inputs to see how many points a player would have. |
| Summary sheet: counts update by themselves (formulas). |
| Then run:  python build.py   in this folder to rebuild perk-tree-sample.html from this workbook. |
| Columns on the Nodes sheet |
| branch / step: where the node sits (Spoke, Left arm, Right arm, the way to the Keystone, Bridge, Crosswalk) and how many steps out from the middle. Rows are listed region by region, step by step. |
| type: start, small, notable, keystone, ring or bridge. |
| stat / value: what the node adds. Nodes with the same stat add up (see the totals in the HTML sample). |
| earned_by: Play time, Sessions, Background or Always pay out while you game; Quests and Draws need you to act; Rule change is a keystone. |
| hook: Exists means the app can already apply this effect; New work means it needs building first. |
| x / y: position in layout units. The middle is 0,0; up is negative y. |
| Regions |
| Credits, Season Pass, Sessions (sessions and days played), Loot (Tickets, fragments and items from play), Quests, and Background (the app running beside the game). |
| Colours |
| Region colours avoid gold and yellow, following the decision to retire them. Station uses bright silver. |
## Sheet: Nodes
| id | region | branch | step | type | name | effect | stat | value | cost | hook | earned_by | x | y | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| core | core | Start | 0 | start | Station Core | Where every path starts. Free. |  | 0 | 0 | Exists | Start | 0 | 0 |  |
| credits-s1 | credits | Spoke | 1 | small | Credits I | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -140 |  |
| credits-s2 | credits | Spoke | 2 | small | Credits II | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -215 |  |
| credits-fork | credits | Spoke (fork) | 3 | small | Credits III | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -290 |  |
| credits-a1 | credits | Left arm | 4 | small | Credits path | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -124.8 | -343 |  |
| credits-m1 | credits | Middle path | 4 | small | Credits path | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -365 |  |
| credits-b1 | credits | Right arm | 4 | small | Credits path | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 124.8 | -343 |  |
| credits-a2 | credits | Left arm | 5 | small | Credits path | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -150.5 | -413.5 |  |
| credits-m2 | credits | Middle path | 5 | small | Credits path | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -440 |  |
| credits-b2 | credits | Right arm | 5 | small | Credits path | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 150.5 | -413.5 |  |
| background-bi2 | credits | Inner bridge from Background | 6 | bridge | Bridge | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -236.7 | -485.3 |  |
| credits-bi1 | credits | Inner bridge to Season Pass | 6 | bridge | Bridge | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 236.7 | -485.3 |  |
| credits-notA | credits | Left arm | 6 | notable | Overtime | +1 Credit for every counted hour of play | creditsPerHour | 1 | 1 | Exists | Play time | -174.4 | -479.2 |  |
| credits-notM | credits | Middle path | 6 | notable | Steady Hands | +5% Credits from play | playCreditPct | 5 | 1 | Exists | Play time | 0 | -510 |  |
| credits-notB | credits | Right arm | 6 | notable | Long Haul | +15% Credits from sessions longer than 1 hour | longSessionCreditPct | 15 | 1 | New work | Sessions | 174.4 | -479.2 |  |
| credits-cain | credits | Left cluster | 7 | small | Credits cluster | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -210.7 | -548.9 |  |
| credits-k1 | credits | Middle path to keystone | 7 | small | Credits approach | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -610 |  |
| credits-cbin | credits | Right cluster | 7 | small | Credits cluster | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 210.7 | -548.9 |  |
| credits-cal | credits | Left cluster | 8 | small | Credits cluster | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -289.7 | -581.9 |  |
| credits-car | credits | Left cluster | 8 | small | Credits cluster | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -174.1 | -626.3 |  |
| credits-k2 | credits | Middle path to keystone | 8 | small | Credits approach | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -700 |  |
| background-bo2 | credits | Outer bridge from Background | 8 | bridge | Bridge | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -349.6 | -686.1 |  |
| credits-bo1 | credits | Outer bridge to Season Pass | 8 | bridge | Bridge | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 349.6 | -686.1 |  |
| credits-cbl | credits | Right cluster | 8 | small | Credits cluster | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 174.1 | -626.3 |  |
| credits-cbr | credits | Right cluster | 8 | small | Credits cluster | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 289.7 | -581.9 |  |
| credits-notC | credits | Left cluster | 9 | notable | Night Owl | +15% Credits from play after 22:00 | nightCreditPct | 15 | 1 | New work | Play time | -255.2 | -664.7 |  |
| credits-notD | credits | Right cluster | 9 | notable | Weekend Warrior | +15% Credits from play on Saturday and Sunday | weekendCreditPct | 15 | 1 | New work | Play time | 255.2 | -664.7 |  |
| credits-key | credits | Keystone | 10 | keystone | Marathon | Sessions longer than 3 hours pay double Credits, but sessions under 1 hour pay none | keyMarathon | 1 | 1 | New work | Rule change | 0 | -840 |  |
| credits-linka | credits | Left cluster to keystone | 10 | small | Credits approach | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -141.2 | -762 |  |
| credits-linkb | credits | Right cluster to keystone | 10 | small | Credits approach | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 141.2 | -762 |  |
| credits-fl1 | credits | Outer feeder | 11 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -331.5 | -863.6 |  |
| credits-fl2 | credits | Outer feeder | 11 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -356.6 | -928.9 |  |
| credits-fr1 | credits | Outer feeder | 11 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 331.5 | -863.6 |  |
| credits-fr2 | credits | Outer feeder | 11 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 356.6 | -928.9 |  |
| credits-fk1 | credits | Outer feeder | 11 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -925 |  |
| credits-fk2 | credits | Outer feeder | 11 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -995 |  |
| credits-w1n0 | credits | Outer wheel 1 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -375.2 | -977.4 |  |
| credits-w1n1 | credits | Outer wheel 1 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -462.1 | -991.2 |  |
| credits-w1n2 | credits | Outer wheel 1 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -493.6 | -1073.4 |  |
| credits-w1n3 | credits | Outer wheel 1 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -438.2 | -1141.8 |  |
| credits-w1n4 | credits | Outer wheel 1 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -351.3 | -1128 |  |
| credits-w1n5 | credits | Outer wheel 1 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -319.8 | -1045.8 |  |
| credits-w2n0 | credits | Outer wheel 2 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -127.6 | -1039.2 |  |
| credits-w2n1 | credits | Outer wheel 2 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -208.6 | -1073.5 |  |
| credits-w2n2 | credits | Outer wheel 2 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -219.3 | -1160.9 |  |
| credits-w2n3 | credits | Outer wheel 2 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -149 | -1213.8 |  |
| credits-w2n4 | credits | Outer wheel 2 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -68 | -1179.5 |  |
| credits-w2n5 | credits | Outer wheel 2 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -57.3 | -1092.1 |  |
| credits-w3n0 | credits | Outer wheel 3 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 127.6 | -1039.2 |  |
| credits-w3n1 | credits | Outer wheel 3 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 57.3 | -1092.1 |  |
| credits-w3n2 | credits | Outer wheel 3 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 68 | -1179.5 |  |
| credits-w3n3 | credits | Outer wheel 3 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 149 | -1213.8 |  |
| credits-w3n4 | credits | Outer wheel 3 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 219.3 | -1160.9 |  |
| credits-w3n5 | credits | Outer wheel 3 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 208.6 | -1073.5 |  |
| credits-w4n0 | credits | Outer wheel 4 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 375.2 | -977.4 |  |
| credits-w4n1 | credits | Outer wheel 4 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 319.8 | -1045.8 |  |
| credits-w4n2 | credits | Outer wheel 4 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 351.3 | -1128 |  |
| credits-w4n3 | credits | Outer wheel 4 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 438.2 | -1141.8 |  |
| credits-w4n4 | credits | Outer wheel 4 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 493.6 | -1073.4 |  |
| credits-w4n5 | credits | Outer wheel 4 | 12 | small | Credits wheel | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 462.1 | -991.2 |  |
| credits-wl1 | credits | Wheel link | 12 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -264.2 | -1059.7 |  |
| credits-wl2 | credits | Wheel link | 12 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 0 | -1092.1 |  |
| credits-wl3 | credits | Wheel link | 12 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 264.2 | -1059.7 |  |
| credits-w1not | credits | Outer wheel 1 | 13 | notable | Double Shift | +20% Credits from sessions longer than 2 hours | longSessionCreditPct2 | 20 | 1 | New work | Sessions | -406.7 | -1059.6 |  |
| credits-w2not | credits | Outer wheel 2 | 13 | notable | Penny Saver | +5% to all Credits | allCreditPct | 5 | 1 | Exists | Always | -138.3 | -1126.5 |  |
| credits-w3not | credits | Outer wheel 3 | 13 | notable | Bonus Round | +1 Credit for every counted hour of play | creditsPerHour | 1 | 1 | Exists | Play time | 138.3 | -1126.5 |  |
| credits-w4not | credits | Outer wheel 4 | 13 | notable | Clocked In | +10 Credits for every 5 counted hours of play | creditsPer5Hours | 10 | 1 | New work | Play time | 406.7 | -1059.6 |  |
| credits-ol1 | credits | Outer path | 14 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -465.9 | -1213.7 |  |
| credits-ol2 | credits | Outer path | 14 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -492.8 | -1283.7 |  |
| credits-or1 | credits | Outer path | 14 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 465.9 | -1213.7 |  |
| credits-or2 | credits | Outer path | 14 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 492.8 | -1283.7 |  |
| background-bw2 | credits | Wheel bridge from Background | 14 | bridge | Bridge | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -581.8 | -1117.6 |  |
| credits-bw1 | credits | Wheel bridge to Season Pass | 14 | bridge | Bridge | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 581.8 | -1117.6 |  |
| credits-ga1 | credits | Grand keystone approach | 15 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -104 | -1320.9 |  |
| credits-gb1 | credits | Grand keystone approach | 15 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 104 | -1320.9 |  |
| credits-olnot | credits | Outer path | 15 | notable | Early Riser | +15% Credits from play before 09:00 | earlyCreditPct | 15 | 1 | New work | Play time | -523.2 | -1363 |  |
| credits-ornot | credits | Outer path | 15 | notable | Back to Back | +10% Credits from a session that starts within 30 minutes of the last one | backToBackCreditPct | 10 | 1 | New work | Sessions | 523.2 | -1363 |  |
| credits-ga2 | credits | Grand keystone approach | 16 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -61.9 | -1418.6 |  |
| credits-gb2 | credits | Grand keystone approach | 16 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 61.9 | -1418.6 |  |
| credits-xl | credits | Grand keystone approach | 16 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | -275.2 | -1484.7 |  |
| credits-xr | credits | Grand keystone approach | 16 | small | Credits outer | +3% Credits from play | playCreditPct | 3 | 1 | Exists | Play time | 275.2 | -1484.7 |  |
| credits-gkey | credits | Grand keystone | 17 | keystone | Grinder | +30% Credits from play, but quests pay no Credits | keyGrinder | 1 | 1 | New work | Rule change | 0 | -1525 |  |
| pass-s1 | pass | Spoke | 1 | small | Season Pass I | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 121.2 | -70 |  |
| pass-s2 | pass | Spoke | 2 | small | Season Pass II | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 186.2 | -107.5 |  |
| pass-fork | pass | Spoke (fork) | 3 | small | Season Pass III | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 251.1 | -145 |  |
| pass-a1 | pass | Left arm | 4 | small | Season Pass path | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 234.6 | -279.6 |  |
| pass-m1 | pass | Middle path | 4 | small | Season Pass path | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 316.1 | -182.5 |  |
| pass-b1 | pass | Right arm | 4 | small | Season Pass path | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 359.5 | -63.4 |  |
| pass-a2 | pass | Left arm | 5 | small | Season Pass path | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 282.8 | -337.1 |  |
| pass-m2 | pass | Middle path | 5 | small | Season Pass path | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 381.1 | -220 |  |
| pass-b2 | pass | Right arm | 5 | small | Season Pass path | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 433.3 | -76.4 |  |
| credits-bi2 | pass | Inner bridge from Credits | 6 | bridge | Bridge | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 302 | -447.7 |  |
| pass-bi1 | pass | Inner bridge to Sessions | 6 | bridge | Bridge | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 538.7 | -37.7 |  |
| pass-notA | pass | Left arm | 6 | notable | Study Group | +10% Season Pass XP | passXpPct | 10 | 1 | Exists | Play time | 327.8 | -390.7 |  |
| pass-notM | pass | Middle path | 6 | notable | Head Start | Start each season with 1,000 Season Pass XP | passStartXp | 1000 | 1 | New work | Always | 441.7 | -255 |  |
| pass-notB | pass | Right arm | 6 | notable | Extra Shift | +1,000 Season Pass XP allowed each week | passCap | 1000 | 1 | Exists | Play time | 502.3 | -88.6 |  |
| pass-cain | pass | Left cluster | 7 | small | Season Pass cluster | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 370 | -457 |  |
| pass-k1 | pass | Middle path to keystone | 7 | small | Season Pass approach | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 528.3 | -305 |  |
| pass-cbin | pass | Right cluster | 7 | small | Season Pass cluster | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 580.8 | -92 |  |
| pass-cal | pass | Left cluster | 8 | small | Season Pass cluster | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 359.1 | -541.8 |  |
| pass-car | pass | Left cluster | 8 | small | Season Pass cluster | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 455.3 | -463.9 |  |
| pass-k2 | pass | Middle path to keystone | 8 | small | Season Pass approach | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 606.2 | -350 |  |
| credits-bo2 | pass | Outer bridge from Credits | 8 | bridge | Bridge | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 419.4 | -645.8 |  |
| pass-bo1 | pass | Outer bridge to Sessions | 8 | bridge | Bridge | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 768.9 | -40.3 |  |
| pass-cbl | pass | Right cluster | 8 | small | Season Pass cluster | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 629.4 | -162.4 |  |
| pass-cbr | pass | Right cluster | 8 | small | Season Pass cluster | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 648.8 | -40.1 |  |
| pass-notC | pass | Left cluster | 9 | notable | Night Class | +15% Season Pass XP from play after 20:00 | nightPassXpPct | 15 | 1 | New work | Play time | 448.1 | -553.3 |  |
| pass-notD | pass | Right cluster | 9 | notable | Overflow | A quarter of the XP over the weekly cap carries into next week | passOverflowPct | 25 | 1 | New work | Play time | 703.2 | -111.4 |  |
| pass-key | pass | Keystone | 10 | keystone | Crunch | No weekly Season Pass XP cap, but Pass XP from play is 30% lower | keyCrunch | 1 | 1 | New work | Rule change | 727.5 | -420 |  |
| pass-linka | pass | Left cluster to keystone | 10 | small | Season Pass approach | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 589.3 | -503.3 |  |
| pass-linkb | pass | Right cluster to keystone | 10 | small | Season Pass approach | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 730.5 | -258.7 |  |
| pass-fl1 | pass | Outer feeder | 11 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 582.1 | -718.9 |  |
| pass-fl2 | pass | Outer feeder | 11 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 626.2 | -773.3 |  |
| pass-fr1 | pass | Outer feeder | 11 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 913.6 | -144.7 |  |
| pass-fr2 | pass | Outer feeder | 11 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 982.7 | -155.7 |  |
| pass-fk1 | pass | Outer feeder | 11 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 801.1 | -462.5 |  |
| pass-fk2 | pass | Outer feeder | 11 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 861.7 | -497.5 |  |
| pass-w1n0 | pass | Outer wheel 1 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 658.9 | -813.7 |  |
| pass-w1n1 | pass | Outer wheel 1 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 627.4 | -895.9 |  |
| pass-w1n2 | pass | Outer wheel 1 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 682.8 | -964.3 |  |
| pass-w1n3 | pass | Outer wheel 1 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 769.7 | -950.5 |  |
| pass-w1n4 | pass | Outer wheel 1 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 801.2 | -868.3 |  |
| pass-w1n5 | pass | Outer wheel 1 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 745.8 | -799.9 |  |
| pass-w2n0 | pass | Outer wheel 2 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 836.2 | -630.1 |  |
| pass-w2n1 | pass | Outer wheel 2 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 825.5 | -717.5 |  |
| pass-w2n2 | pass | Outer wheel 2 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 895.8 | -770.4 |  |
| pass-w2n3 | pass | Outer wheel 2 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 976.8 | -736.1 |  |
| pass-w2n4 | pass | Outer wheel 2 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 987.5 | -648.7 |  |
| pass-w2n5 | pass | Outer wheel 2 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 917.2 | -595.8 |  |
| pass-w3n0 | pass | Outer wheel 3 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 963.8 | -409.1 |  |
| pass-w3n1 | pass | Outer wheel 3 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 974.5 | -496.5 |  |
| pass-w3n2 | pass | Outer wheel 3 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1055.5 | -530.8 |  |
| pass-w3n3 | pass | Outer wheel 3 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1125.8 | -477.9 |  |
| pass-w3n4 | pass | Outer wheel 3 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1115.1 | -390.5 |  |
| pass-w3n5 | pass | Outer wheel 3 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1034.1 | -356.2 |  |
| pass-w4n0 | pass | Outer wheel 4 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1034.1 | -163.8 |  |
| pass-w4n1 | pass | Outer wheel 4 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1065.6 | -246 |  |
| pass-w4n2 | pass | Outer wheel 4 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1152.5 | -259.8 |  |
| pass-w4n3 | pass | Outer wheel 4 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1207.9 | -191.4 |  |
| pass-w4n4 | pass | Outer wheel 4 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1176.4 | -109.2 |  |
| pass-w4n5 | pass | Outer wheel 4 | 12 | small | Season Pass wheel | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1089.5 | -95.4 |  |
| pass-wl1 | pass | Wheel link | 12 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 785.6 | -758.7 |  |
| pass-wl2 | pass | Wheel link | 12 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 945.9 | -546.1 |  |
| pass-wl3 | pass | Wheel link | 12 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1049.8 | -301.1 |  |
| pass-w1not | pass | Outer wheel 1 | 13 | notable | Cram Session | +20% Season Pass XP from sessions longer than 2 hours | longSessionPassXpPct | 20 | 1 | New work | Sessions | 714.3 | -882.1 |  |
| pass-w2not | pass | Outer wheel 2 | 13 | notable | Quick Learner | +5% Season Pass XP | passXpPct | 5 | 1 | Exists | Play time | 906.5 | -683.1 |  |
| pass-w3not | pass | Outer wheel 3 | 13 | notable | Warm-Up | +50% Season Pass XP in your first hour of play each day | warmupPassXpPct | 50 | 1 | New work | Play time | 1044.8 | -443.5 |  |
| pass-w4not | pass | Outer wheel 4 | 13 | notable | Second Wind | +1,000 Season Pass XP allowed each week | passCap | 1000 | 1 | Exists | Play time | 1121 | -177.6 |  |
| pass-ol1 | pass | Outer path | 14 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 818.1 | -1010.3 |  |
| pass-ol2 | pass | Outer path | 14 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 865.3 | -1068.6 |  |
| pass-or1 | pass | Outer path | 14 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1284 | -203.4 |  |
| pass-or2 | pass | Outer path | 14 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1358.1 | -215.1 |  |
| credits-bw2 | pass | Wheel bridge from Credits | 14 | bridge | Bridge | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 677 | -1062.7 |  |
| pass-bw1 | pass | Wheel bridge to Sessions | 14 | bridge | Bridge | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1258.8 | -55 |  |
| pass-ga1 | pass | Grand keystone approach | 15 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1092 | -750.5 |  |
| pass-gb1 | pass | Grand keystone approach | 15 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1195.9 | -570.4 |  |
| pass-olnot | pass | Outer path | 15 | notable | Valedictorian | Reaching Pass level 30 gives a Special Ticket | level30SpecialTicket | 1 | 1 | New work | Play time | 918.8 | -1134.6 |  |
| pass-ornot | pass | Outer path | 15 | notable | Catch-up | +50% Season Pass XP while you are 5 or more levels behind the season's pace | catchUpPassXpPct | 50 | 1 | New work | Play time | 1442 | -228.4 |  |
| pass-ga2 | pass | Grand keystone approach | 16 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1197.6 | -763 |  |
| pass-gb2 | pass | Grand keystone approach | 16 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1259.6 | -655.7 |  |
| pass-xl | pass | Grand keystone approach | 16 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1148.2 | -980.7 |  |
| pass-xr | pass | Grand keystone approach | 16 | small | Season Pass outer | +3% Season Pass XP | passXpPct | 3 | 1 | Exists | Play time | 1423.4 | -504 |  |
| pass-gkey | pass | Grand keystone | 17 | keystone | Fast Lane | Pass levels need 20% less XP, but Credits on the Free row are halved | keyFastLane | 1 | 1 | New work | Rule change | 1320.7 | -762.5 |  |
| sessions-s1 | sessions | Spoke | 1 | small | Sessions I | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 121.2 | 70 |  |
| sessions-s2 | sessions | Spoke | 2 | small | Sessions II | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 186.2 | 107.5 |  |
| sessions-fork | sessions | Spoke (fork) | 3 | small | Sessions III | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 251.1 | 145 |  |
| sessions-a1 | sessions | Left arm | 4 | small | Sessions path | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 359.5 | 63.4 |  |
| sessions-m1 | sessions | Middle path | 4 | small | Sessions path | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 316.1 | 182.5 |  |
| sessions-b1 | sessions | Right arm | 4 | small | Sessions path | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 234.6 | 279.6 |  |
| sessions-a2 | sessions | Left arm | 5 | small | Sessions path | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 433.3 | 76.4 |  |
| sessions-m2 | sessions | Middle path | 5 | small | Sessions path | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 381.1 | 220 |  |
| sessions-b2 | sessions | Right arm | 5 | small | Sessions path | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 282.8 | 337.1 |  |
| pass-bi2 | sessions | Inner bridge from Season Pass | 6 | bridge | Bridge | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 538.7 | 37.7 |  |
| sessions-bi1 | sessions | Inner bridge to Loot | 6 | bridge | Bridge | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 302 | 447.7 |  |
| sessions-notA | sessions | Left arm | 6 | notable | First Game | Your first session each day gives +10 Credits | firstGameCredits | 10 | 1 | New work | Sessions | 502.3 | 88.6 |  |
| sessions-notM | sessions | Middle path | 6 | notable | Session Bonus | Every session longer than 45 minutes gives +100 Season Pass XP | sessionPassXp | 100 | 1 | New work | Sessions | 441.7 | 255 |  |
| sessions-notB | sessions | Right arm | 6 | notable | Regular Player | Playing on 5 different days in a week gives a Regular Ticket | weekPlayTicket | 1 | 1 | New work | Sessions | 327.8 | 390.7 |  |
| sessions-cain | sessions | Left cluster | 7 | small | Sessions cluster | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 580.8 | 92 |  |
| sessions-k1 | sessions | Middle path to keystone | 7 | small | Sessions approach | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 528.3 | 305 |  |
| sessions-cbin | sessions | Right cluster | 7 | small | Sessions cluster | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 370 | 457 |  |
| sessions-cal | sessions | Left cluster | 8 | small | Sessions cluster | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 648.8 | 40.1 |  |
| sessions-car | sessions | Left cluster | 8 | small | Sessions cluster | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 629.4 | 162.4 |  |
| sessions-k2 | sessions | Middle path to keystone | 8 | small | Sessions approach | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 606.2 | 350 |  |
| pass-bo2 | sessions | Outer bridge from Season Pass | 8 | bridge | Bridge | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 768.9 | 40.3 |  |
| sessions-bo1 | sessions | Outer bridge to Loot | 8 | bridge | Bridge | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 419.4 | 645.8 |  |
| sessions-cbl | sessions | Right cluster | 8 | small | Sessions cluster | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 455.3 | 463.9 |  |
| sessions-cbr | sessions | Right cluster | 8 | small | Sessions cluster | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 359.1 | 541.8 |  |
| sessions-notC | sessions | Left cluster | 9 | notable | Comeback | After 3 or more days without play, your next hour of play pays +50% Credits | comebackCreditPct | 50 | 1 | New work | Sessions | 703.2 | 111.4 |  |
| sessions-notD | sessions | Right cluster | 9 | notable | Regular Face | +5 Credits for every day you play | creditsPerPlayDay | 5 | 1 | New work | Sessions | 448.1 | 553.3 |  |
| sessions-key | sessions | Keystone | 10 | keystone | Ritual | Your first session each day pays double Credits, but later sessions that day pay half | keyRitual | 1 | 1 | New work | Rule change | 727.5 | 420 |  |
| sessions-linka | sessions | Left cluster to keystone | 10 | small | Sessions approach | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 730.5 | 258.7 |  |
| sessions-linkb | sessions | Right cluster to keystone | 10 | small | Sessions approach | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 589.3 | 503.3 |  |
| sessions-fl1 | sessions | Outer feeder | 11 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 913.6 | 144.7 |  |
| sessions-fl2 | sessions | Outer feeder | 11 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 982.7 | 155.7 |  |
| sessions-fr1 | sessions | Outer feeder | 11 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 582.1 | 718.9 |  |
| sessions-fr2 | sessions | Outer feeder | 11 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 626.2 | 773.3 |  |
| sessions-fk1 | sessions | Outer feeder | 11 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 801.1 | 462.5 |  |
| sessions-fk2 | sessions | Outer feeder | 11 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 861.7 | 497.5 |  |
| sessions-w1n0 | sessions | Outer wheel 1 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1034.1 | 163.8 |  |
| sessions-w1n1 | sessions | Outer wheel 1 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1089.5 | 95.4 |  |
| sessions-w1n2 | sessions | Outer wheel 1 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1176.4 | 109.2 |  |
| sessions-w1n3 | sessions | Outer wheel 1 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1207.9 | 191.4 |  |
| sessions-w1n4 | sessions | Outer wheel 1 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1152.5 | 259.8 |  |
| sessions-w1n5 | sessions | Outer wheel 1 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1065.6 | 246 |  |
| sessions-w2n0 | sessions | Outer wheel 2 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 963.8 | 409.1 |  |
| sessions-w2n1 | sessions | Outer wheel 2 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1034.1 | 356.2 |  |
| sessions-w2n2 | sessions | Outer wheel 2 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1115.1 | 390.5 |  |
| sessions-w2n3 | sessions | Outer wheel 2 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1125.8 | 477.9 |  |
| sessions-w2n4 | sessions | Outer wheel 2 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1055.5 | 530.8 |  |
| sessions-w2n5 | sessions | Outer wheel 2 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 974.5 | 496.5 |  |
| sessions-w3n0 | sessions | Outer wheel 3 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 836.2 | 630.1 |  |
| sessions-w3n1 | sessions | Outer wheel 3 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 917.2 | 595.8 |  |
| sessions-w3n2 | sessions | Outer wheel 3 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 987.5 | 648.7 |  |
| sessions-w3n3 | sessions | Outer wheel 3 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 976.8 | 736.1 |  |
| sessions-w3n4 | sessions | Outer wheel 3 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 895.8 | 770.4 |  |
| sessions-w3n5 | sessions | Outer wheel 3 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 825.5 | 717.5 |  |
| sessions-w4n0 | sessions | Outer wheel 4 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 658.9 | 813.7 |  |
| sessions-w4n1 | sessions | Outer wheel 4 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 745.8 | 799.9 |  |
| sessions-w4n2 | sessions | Outer wheel 4 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 801.2 | 868.3 |  |
| sessions-w4n3 | sessions | Outer wheel 4 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 769.7 | 950.5 |  |
| sessions-w4n4 | sessions | Outer wheel 4 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 682.8 | 964.3 |  |
| sessions-w4n5 | sessions | Outer wheel 4 | 12 | small | Sessions wheel | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 627.4 | 895.9 |  |
| sessions-wl1 | sessions | Wheel link | 12 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1049.8 | 301.1 |  |
| sessions-wl2 | sessions | Wheel link | 12 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 945.9 | 546.1 |  |
| sessions-wl3 | sessions | Wheel link | 12 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 785.6 | 758.7 |  |
| sessions-w1not | sessions | Outer wheel 1 | 13 | notable | Routine | +3 Credits for every day you play | creditsPerPlayDay | 3 | 1 | New work | Sessions | 1121 | 177.6 |  |
| sessions-w2not | sessions | Outer wheel 2 | 13 | notable | Lucky Session | 5% chance that a session longer than 1 hour gives a Regular Ticket | luckySessionTicketPct | 5 | 1 | New work | Sessions | 1044.8 | 443.5 |  |
| sessions-w3not | sessions | Outer wheel 3 | 13 | notable | Second Chance | Once a month, a missed day does not break your play streak | streakGraceMonthly | 1 | 1 | New work | Always | 906.5 | 683.1 |  |
| sessions-w4not | sessions | Outer wheel 4 | 13 | notable | Streak Keeper | +1 streak freeze for every 20 counted hours of play | streakFreezePer20h | 1 | 1 | New work | Play time | 714.3 | 882.1 |  |
| sessions-ol1 | sessions | Outer path | 14 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1284 | 203.4 |  |
| sessions-ol2 | sessions | Outer path | 14 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1358.1 | 215.1 |  |
| sessions-or1 | sessions | Outer path | 14 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 818.1 | 1010.3 |  |
| sessions-or2 | sessions | Outer path | 14 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 865.3 | 1068.6 |  |
| pass-bw2 | sessions | Wheel bridge from Season Pass | 14 | bridge | Bridge | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1258.8 | 55 |  |
| sessions-bw1 | sessions | Wheel bridge to Loot | 14 | bridge | Bridge | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 677 | 1062.7 |  |
| sessions-ga1 | sessions | Grand keystone approach | 15 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1195.9 | 570.4 |  |
| sessions-gb1 | sessions | Grand keystone approach | 15 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1092 | 750.5 |  |
| sessions-olnot | sessions | Outer path | 15 | notable | Perfect Week | Playing 7 days in a row gives +30 Credits | perfectWeekCredits | 30 | 1 | New work | Sessions | 1442 | 228.4 |  |
| sessions-ornot | sessions | Outer path | 15 | notable | Long Weekend | 4 hours of play across a weekend gives a Regular Ticket | longWeekendTicket | 1 | 1 | New work | Sessions | 918.8 | 1134.6 |  |
| sessions-ga2 | sessions | Grand keystone approach | 16 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1259.6 | 655.7 |  |
| sessions-gb2 | sessions | Grand keystone approach | 16 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1197.6 | 763 |  |
| sessions-xl | sessions | Grand keystone approach | 16 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1423.4 | 504 |  |
| sessions-xr | sessions | Grand keystone approach | 16 | small | Sessions outer | +2 Credits for every game session longer than 30 minutes | sessionCredits | 2 | 1 | New work | Sessions | 1148.2 | 980.7 |  |
| sessions-gkey | sessions | Grand keystone | 17 | keystone | Iron Streak | Each day in a row you play adds +2% to all Credits (up to +30%), but a missed day resets it and streak freezes do not count | keyIronStreak | 1 | 1 | New work | Rule change | 1320.7 | 762.5 |  |
| loot-s1 | loot | Spoke | 1 | small | Loot I | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 140 |  |
| loot-s2 | loot | Spoke | 2 | small | Loot II | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 215 |  |
| loot-fork | loot | Spoke (fork) | 3 | small | Loot III | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 290 |  |
| loot-a1 | loot | Left arm | 4 | small | Loot path | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 124.8 | 343 |  |
| loot-m1 | loot | Middle path | 4 | small | Loot path | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 365 |  |
| loot-b1 | loot | Right arm | 4 | small | Loot path | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -124.8 | 343 |  |
| loot-a2 | loot | Left arm | 5 | small | Loot path | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 150.5 | 413.5 |  |
| loot-m2 | loot | Middle path | 5 | small | Loot path | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 440 |  |
| loot-b2 | loot | Right arm | 5 | small | Loot path | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -150.5 | 413.5 |  |
| sessions-bi2 | loot | Inner bridge from Sessions | 6 | bridge | Bridge | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 236.7 | 485.3 |  |
| loot-bi1 | loot | Inner bridge to Quests | 6 | bridge | Bridge | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -236.7 | 485.3 |  |
| loot-notA | loot | Left arm | 6 | notable | Loot Drop | +1 Regular fragment for every 2 counted hours of play | fragmentPer2Hours | 1 | 1 | New work | Play time | 174.4 | 479.2 |  |
| loot-notM | loot | Middle path | 6 | notable | Salvage | +1 Regular fragment for every repeat you draw | fragmentPerRepeat | 1 | 1 | New work | Draws | 0 | 510 |  |
| loot-notB | loot | Right arm | 6 | notable | Ticket Drop | +1 Regular Ticket for every 5 counted hours of play | ticketPer5Hours | 1 | 1 | New work | Play time | -174.4 | 479.2 |  |
| loot-cain | loot | Left cluster | 7 | small | Loot cluster | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 210.7 | 548.9 |  |
| loot-k1 | loot | Middle path to keystone | 7 | small | Loot approach | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 610 |  |
| loot-cbin | loot | Right cluster | 7 | small | Loot cluster | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -210.7 | 548.9 |  |
| loot-cal | loot | Left cluster | 8 | small | Loot cluster | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 289.7 | 581.9 |  |
| loot-car | loot | Left cluster | 8 | small | Loot cluster | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 174.1 | 626.3 |  |
| loot-k2 | loot | Middle path to keystone | 8 | small | Loot approach | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 700 |  |
| sessions-bo2 | loot | Outer bridge from Sessions | 8 | bridge | Bridge | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 349.6 | 686.1 |  |
| loot-bo1 | loot | Outer bridge to Quests | 8 | bridge | Bridge | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -349.6 | 686.1 |  |
| loot-cbl | loot | Right cluster | 8 | small | Loot cluster | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -174.1 | 626.3 |  |
| loot-cbr | loot | Right cluster | 8 | small | Loot cluster | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -289.7 | 581.9 |  |
| loot-notC | loot | Left cluster | 9 | notable | Lucky Find | Every 10 counted hours of play gives a random item from the Regular Pack | itemPer10Hours | 1 | 1 | New work | Play time | 255.2 | 664.7 |  |
| loot-notD | loot | Right cluster | 9 | notable | Treasure Hours | +1 Special fragment for every 20 counted hours of play | specialFragmentPer20Hours | 1 | 1 | New work | Play time | -255.2 | 664.7 |  |
| loot-key | loot | Keystone | 10 | keystone | Scavenger | Play gives double fragments, but Credits from play are 25% lower | keyScavenger | 1 | 1 | New work | Rule change | 0 | 840 |  |
| loot-linka | loot | Left cluster to keystone | 10 | small | Loot approach | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 141.2 | 762 |  |
| loot-linkb | loot | Right cluster to keystone | 10 | small | Loot approach | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -141.2 | 762 |  |
| loot-fl1 | loot | Outer feeder | 11 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 331.5 | 863.6 |  |
| loot-fl2 | loot | Outer feeder | 11 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 356.6 | 928.9 |  |
| loot-fr1 | loot | Outer feeder | 11 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -331.5 | 863.6 |  |
| loot-fr2 | loot | Outer feeder | 11 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -356.6 | 928.9 |  |
| loot-fk1 | loot | Outer feeder | 11 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 925 |  |
| loot-fk2 | loot | Outer feeder | 11 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 995 |  |
| loot-w1n0 | loot | Outer wheel 1 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 375.2 | 977.4 |  |
| loot-w1n1 | loot | Outer wheel 1 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 462.1 | 991.2 |  |
| loot-w1n2 | loot | Outer wheel 1 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 493.6 | 1073.4 |  |
| loot-w1n3 | loot | Outer wheel 1 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 438.2 | 1141.8 |  |
| loot-w1n4 | loot | Outer wheel 1 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 351.3 | 1128 |  |
| loot-w1n5 | loot | Outer wheel 1 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 319.8 | 1045.8 |  |
| loot-w2n0 | loot | Outer wheel 2 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 127.6 | 1039.2 |  |
| loot-w2n1 | loot | Outer wheel 2 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 208.6 | 1073.5 |  |
| loot-w2n2 | loot | Outer wheel 2 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 219.3 | 1160.9 |  |
| loot-w2n3 | loot | Outer wheel 2 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 149 | 1213.8 |  |
| loot-w2n4 | loot | Outer wheel 2 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 68 | 1179.5 |  |
| loot-w2n5 | loot | Outer wheel 2 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 57.3 | 1092.1 |  |
| loot-w3n0 | loot | Outer wheel 3 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -127.6 | 1039.2 |  |
| loot-w3n1 | loot | Outer wheel 3 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -57.3 | 1092.1 |  |
| loot-w3n2 | loot | Outer wheel 3 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -68 | 1179.5 |  |
| loot-w3n3 | loot | Outer wheel 3 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -149 | 1213.8 |  |
| loot-w3n4 | loot | Outer wheel 3 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -219.3 | 1160.9 |  |
| loot-w3n5 | loot | Outer wheel 3 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -208.6 | 1073.5 |  |
| loot-w4n0 | loot | Outer wheel 4 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -375.2 | 977.4 |  |
| loot-w4n1 | loot | Outer wheel 4 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -319.8 | 1045.8 |  |
| loot-w4n2 | loot | Outer wheel 4 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -351.3 | 1128 |  |
| loot-w4n3 | loot | Outer wheel 4 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -438.2 | 1141.8 |  |
| loot-w4n4 | loot | Outer wheel 4 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -493.6 | 1073.4 |  |
| loot-w4n5 | loot | Outer wheel 4 | 12 | small | Loot wheel | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -462.1 | 991.2 |  |
| loot-wl1 | loot | Wheel link | 12 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 264.2 | 1059.7 |  |
| loot-wl2 | loot | Wheel link | 12 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 0 | 1092.1 |  |
| loot-wl3 | loot | Wheel link | 12 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -264.2 | 1059.7 |  |
| loot-w1not | loot | Outer wheel 1 | 13 | notable | Keepsake | +5% fragments earned from play | fragmentPlayPct | 5 | 1 | New work | Play time | 406.7 | 1059.6 |  |
| loot-w2not | loot | Outer wheel 2 | 13 | notable | Sharp Eye | +1 Regular fragment for every 4-star repeat | fragmentPer4Star | 1 | 1 | New work | Draws | 138.3 | 1126.5 |  |
| loot-w3not | loot | Outer wheel 3 | 13 | notable | Ticket Stub | +1 Regular Ticket for every 8 counted hours of play | ticketPer8Hours | 1 | 1 | New work | Play time | -138.3 | 1126.5 |  |
| loot-w4not | loot | Outer wheel 4 | 13 | notable | Collector's Eye | +1 Special fragment for every 5-star repeat | specialFragmentPer5Star | 1 | 1 | New work | Draws | -406.7 | 1059.6 |  |
| loot-ol1 | loot | Outer path | 14 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 465.9 | 1213.7 |  |
| loot-ol2 | loot | Outer path | 14 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 492.8 | 1283.7 |  |
| loot-or1 | loot | Outer path | 14 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -465.9 | 1213.7 |  |
| loot-or2 | loot | Outer path | 14 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -492.8 | 1283.7 |  |
| sessions-bw2 | loot | Wheel bridge from Sessions | 14 | bridge | Bridge | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 581.8 | 1117.6 |  |
| loot-bw1 | loot | Wheel bridge to Quests | 14 | bridge | Bridge | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -581.8 | 1117.6 |  |
| loot-ga1 | loot | Grand keystone approach | 15 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 104 | 1320.9 |  |
| loot-gb1 | loot | Grand keystone approach | 15 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -104 | 1320.9 |  |
| loot-olnot | loot | Outer path | 15 | notable | Archivist | +10% fragments earned from play | fragmentPlayPct | 10 | 1 | New work | Play time | 523.2 | 1363 |  |
| loot-ornot | loot | Outer path | 15 | notable | Jackpot Hours | 1% chance that each counted hour of play gives a Special Ticket | jackpotSpecialTicketPct | 1 | 1 | New work | Play time | -523.2 | 1363 |  |
| loot-ga2 | loot | Grand keystone approach | 16 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 61.9 | 1418.6 |  |
| loot-gb2 | loot | Grand keystone approach | 16 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -61.9 | 1418.6 |  |
| loot-xl | loot | Grand keystone approach | 16 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | 275.2 | 1484.7 |  |
| loot-xr | loot | Grand keystone approach | 16 | small | Loot outer | +3% fragments earned from play | fragmentPlayPct | 3 | 1 | New work | Play time | -275.2 | 1484.7 |  |
| loot-gkey | loot | Grand keystone | 17 | keystone | Gambler | Each counted hour has a 5% chance of a Special Ticket, but play gives no Regular Tickets | keyGambler | 1 | 1 | New work | Rule change | 0 | 1525 |  |
| quests-s1 | quests | Spoke | 1 | small | Quests I | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -121.2 | 70 |  |
| quests-s2 | quests | Spoke | 2 | small | Quests II | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -186.2 | 107.5 |  |
| quests-fork | quests | Spoke (fork) | 3 | small | Quests III | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -251.1 | 145 |  |
| quests-a1 | quests | Left arm | 4 | small | Quests path | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -234.6 | 279.6 |  |
| quests-m1 | quests | Middle path | 4 | small | Quests path | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -316.1 | 182.5 |  |
| quests-b1 | quests | Right arm | 4 | small | Quests path | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -359.5 | 63.4 |  |
| quests-a2 | quests | Left arm | 5 | small | Quests path | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -282.8 | 337.1 |  |
| quests-m2 | quests | Middle path | 5 | small | Quests path | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -381.1 | 220 |  |
| quests-b2 | quests | Right arm | 5 | small | Quests path | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -433.3 | 76.4 |  |
| loot-bi2 | quests | Inner bridge from Loot | 6 | bridge | Bridge | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -302 | 447.7 |  |
| quests-bi1 | quests | Inner bridge to Background | 6 | bridge | Bridge | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -538.7 | 37.7 |  |
| quests-notA | quests | Left arm | 6 | notable | Auto-Claim | Play-time quests claim themselves when they finish, so you never have to open the app | autoClaimPlayQuests | 1 | 1 | New work | Always | -327.8 | 390.7 |  |
| quests-notM | quests | Middle path | 6 | notable | Long Game | +25 Credits for every 10 counted hours of play | creditsPer10Hours | 25 | 1 | New work | Play time | -441.7 | 255 |  |
| quests-notB | quests | Right arm | 6 | notable | Busy Hands | Each claimed quest gives +50 Season Pass XP | questPassXp | 50 | 1 | New work | Quests | -502.3 | 88.6 |  |
| quests-cain | quests | Left cluster | 7 | small | Quests cluster | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -370 | 457 |  |
| quests-k1 | quests | Middle path to keystone | 7 | small | Quests approach | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -528.3 | 305 |  |
| quests-cbin | quests | Right cluster | 7 | small | Quests cluster | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -580.8 | 92 |  |
| quests-cal | quests | Left cluster | 8 | small | Quests cluster | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -359.1 | 541.8 |  |
| quests-car | quests | Left cluster | 8 | small | Quests cluster | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -455.3 | 463.9 |  |
| quests-k2 | quests | Middle path to keystone | 8 | small | Quests approach | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -606.2 | 350 |  |
| loot-bo2 | quests | Outer bridge from Loot | 8 | bridge | Bridge | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -419.4 | 645.8 |  |
| quests-bo1 | quests | Outer bridge to Background | 8 | bridge | Bridge | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -768.9 | 40.3 |  |
| quests-cbl | quests | Right cluster | 8 | small | Quests cluster | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -629.4 | 162.4 |  |
| quests-cbr | quests | Right cluster | 8 | small | Quests cluster | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -648.8 | 40.1 |  |
| quests-notC | quests | Left cluster | 9 | notable | Daily Grind | +10% Credits from daily quests | dailyQuestCreditPct | 10 | 1 | New work | Quests | -448.1 | 553.3 |  |
| quests-notD | quests | Right cluster | 9 | notable | Monthly Planner | +20% Credits from monthly quests | monthlyQuestCreditPct | 20 | 1 | New work | Quests | -703.2 | 111.4 |  |
| quests-key | quests | Keystone | 10 | keystone | Specialist | Daily quests pay double, but weekly quests pay nothing | keySpecialist | 1 | 1 | New work | Rule change | -727.5 | 420 |  |
| quests-linka | quests | Left cluster to keystone | 10 | small | Quests approach | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -589.3 | 503.3 |  |
| quests-linkb | quests | Right cluster to keystone | 10 | small | Quests approach | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -730.5 | 258.7 |  |
| quests-fl1 | quests | Outer feeder | 11 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -582.1 | 718.9 |  |
| quests-fl2 | quests | Outer feeder | 11 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -626.2 | 773.3 |  |
| quests-fr1 | quests | Outer feeder | 11 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -913.6 | 144.7 |  |
| quests-fr2 | quests | Outer feeder | 11 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -982.7 | 155.7 |  |
| quests-fk1 | quests | Outer feeder | 11 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -801.1 | 462.5 |  |
| quests-fk2 | quests | Outer feeder | 11 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -861.7 | 497.5 |  |
| quests-w1n0 | quests | Outer wheel 1 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -658.9 | 813.7 |  |
| quests-w1n1 | quests | Outer wheel 1 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -627.4 | 895.9 |  |
| quests-w1n2 | quests | Outer wheel 1 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -682.8 | 964.3 |  |
| quests-w1n3 | quests | Outer wheel 1 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -769.7 | 950.5 |  |
| quests-w1n4 | quests | Outer wheel 1 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -801.2 | 868.3 |  |
| quests-w1n5 | quests | Outer wheel 1 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -745.8 | 799.9 |  |
| quests-w2n0 | quests | Outer wheel 2 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -836.2 | 630.1 |  |
| quests-w2n1 | quests | Outer wheel 2 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -825.5 | 717.5 |  |
| quests-w2n2 | quests | Outer wheel 2 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -895.8 | 770.4 |  |
| quests-w2n3 | quests | Outer wheel 2 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -976.8 | 736.1 |  |
| quests-w2n4 | quests | Outer wheel 2 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -987.5 | 648.7 |  |
| quests-w2n5 | quests | Outer wheel 2 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -917.2 | 595.8 |  |
| quests-w3n0 | quests | Outer wheel 3 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -963.8 | 409.1 |  |
| quests-w3n1 | quests | Outer wheel 3 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -974.5 | 496.5 |  |
| quests-w3n2 | quests | Outer wheel 3 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1055.5 | 530.8 |  |
| quests-w3n3 | quests | Outer wheel 3 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1125.8 | 477.9 |  |
| quests-w3n4 | quests | Outer wheel 3 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1115.1 | 390.5 |  |
| quests-w3n5 | quests | Outer wheel 3 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1034.1 | 356.2 |  |
| quests-w4n0 | quests | Outer wheel 4 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1034.1 | 163.8 |  |
| quests-w4n1 | quests | Outer wheel 4 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1065.6 | 246 |  |
| quests-w4n2 | quests | Outer wheel 4 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1152.5 | 259.8 |  |
| quests-w4n3 | quests | Outer wheel 4 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1207.9 | 191.4 |  |
| quests-w4n4 | quests | Outer wheel 4 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1176.4 | 109.2 |  |
| quests-w4n5 | quests | Outer wheel 4 | 12 | small | Quests wheel | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1089.5 | 95.4 |  |
| quests-wl1 | quests | Wheel link | 12 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -785.6 | 758.7 |  |
| quests-wl2 | quests | Wheel link | 12 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -945.9 | 546.1 |  |
| quests-wl3 | quests | Wheel link | 12 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1049.8 | 301.1 |  |
| quests-w1not | quests | Outer wheel 1 | 13 | notable | Checklist | +5% Credits from quests | questCreditPct | 5 | 1 | New work | Quests | -714.3 | 882.1 |  |
| quests-w2not | quests | Outer wheel 2 | 13 | notable | Session Quest | +10% Credits from play-time quests | playQuestCreditPct | 10 | 1 | New work | Quests | -906.5 | 683.1 |  |
| quests-w3not | quests | Outer wheel 3 | 13 | notable | Side Job | +1 Season Pass XP for every Credit earned from quests | questCreditPassXp | 1 | 1 | New work | Quests | -1044.8 | 443.5 |  |
| quests-w4not | quests | Outer wheel 4 | 13 | notable | Big Week | +15% Credits from weekly quests | weeklyQuestCreditPct | 15 | 1 | New work | Quests | -1121 | 177.6 |  |
| quests-ol1 | quests | Outer path | 14 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -818.1 | 1010.3 |  |
| quests-ol2 | quests | Outer path | 14 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -865.3 | 1068.6 |  |
| quests-or1 | quests | Outer path | 14 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1284 | 203.4 |  |
| quests-or2 | quests | Outer path | 14 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1358.1 | 215.1 |  |
| loot-bw2 | quests | Wheel bridge from Loot | 14 | bridge | Bridge | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -677 | 1062.7 |  |
| quests-bw1 | quests | Wheel bridge to Background | 14 | bridge | Bridge | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1258.8 | 55 |  |
| quests-ga1 | quests | Grand keystone approach | 15 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1092 | 750.5 |  |
| quests-gb1 | quests | Grand keystone approach | 15 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1195.9 | 570.4 |  |
| quests-olnot | quests | Outer path | 15 | notable | Completionist | Claiming every weekly quest gives a Regular Ticket | allWeekliesTicket | 1 | 1 | New work | Quests | -918.8 | 1134.6 |  |
| quests-ornot | quests | Outer path | 15 | notable | Hour Hand | +1 Special fragment for every 25 counted hours of play | hourMilestoneFragment | 1 | 1 | New work | Play time | -1442 | 228.4 |  |
| quests-ga2 | quests | Grand keystone approach | 16 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1197.6 | 763 |  |
| quests-gb2 | quests | Grand keystone approach | 16 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1259.6 | 655.7 |  |
| quests-xl | quests | Grand keystone approach | 16 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1148.2 | 980.7 |  |
| quests-xr | quests | Grand keystone approach | 16 | small | Quests outer | +3% Credits from quests | questCreditPct | 3 | 1 | New work | Quests | -1423.4 | 504 |  |
| quests-gkey | quests | Grand keystone | 17 | keystone | Contractor | Quests pay 50% more Credits, but Credits from play are halved | keyContractor | 1 | 1 | New work | Rule change | -1320.7 | 762.5 |  |
| background-s1 | background | Spoke | 1 | small | Background I | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -121.2 | -70 |  |
| background-s2 | background | Spoke | 2 | small | Background II | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -186.2 | -107.5 |  |
| background-fork | background | Spoke (fork) | 3 | small | Background III | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -251.1 | -145 |  |
| background-a1 | background | Left arm | 4 | small | Background path | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -359.5 | -63.4 |  |
| background-m1 | background | Middle path | 4 | small | Background path | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -316.1 | -182.5 |  |
| background-b1 | background | Right arm | 4 | small | Background path | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -234.6 | -279.6 |  |
| background-a2 | background | Left arm | 5 | small | Background path | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -433.3 | -76.4 |  |
| background-m2 | background | Middle path | 5 | small | Background path | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -381.1 | -220 |  |
| background-b2 | background | Right arm | 5 | small | Background path | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -282.8 | -337.1 |  |
| quests-bi2 | background | Inner bridge from Quests | 6 | bridge | Bridge | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -538.7 | -37.7 |  |
| background-bi1 | background | Inner bridge to Credits | 6 | bridge | Bridge | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -302 | -447.7 |  |
| background-notA | background | Left arm | 6 | notable | Lights On | +1 streak freeze at the start of each month | streakFreezeMonthly | 1 | 1 | New work | Always | -502.3 | -88.6 |  |
| background-notM | background | Middle path | 6 | notable | Game Face | +5% to all Credits while game mode is on | gameModeCreditPct | 5 | 1 | New work | Background | -441.7 | -255 |  |
| background-notB | background | Right arm | 6 | notable | Always On | +10% Credits once the app has been running for 2 hours | alwaysOnCreditPct | 10 | 1 | New work | Background | -327.8 | -390.7 |  |
| background-cain | background | Left cluster | 7 | small | Background cluster | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -580.8 | -92 |  |
| background-k1 | background | Middle path to keystone | 7 | small | Background approach | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -528.3 | -305 |  |
| background-cbin | background | Right cluster | 7 | small | Background cluster | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -370 | -457 |  |
| background-cal | background | Left cluster | 8 | small | Background cluster | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -648.8 | -40.1 |  |
| background-car | background | Left cluster | 8 | small | Background cluster | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -629.4 | -162.4 |  |
| background-k2 | background | Middle path to keystone | 8 | small | Background approach | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -606.2 | -350 |  |
| quests-bo2 | background | Outer bridge from Quests | 8 | bridge | Bridge | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -768.9 | -40.3 |  |
| background-bo1 | background | Outer bridge to Credits | 8 | bridge | Bridge | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -419.4 | -645.8 |  |
| background-cbl | background | Right cluster | 8 | small | Background cluster | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -455.3 | -463.9 |  |
| background-cbr | background | Right cluster | 8 | small | Background cluster | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -359.1 | -541.8 |  |
| background-notC | background | Left cluster | 9 | notable | Cool Running | +5% Credits from play while the GPU stays under 70°C | coolPcCreditPct | 5 | 1 | New work | Background | -703.2 | -111.4 |  |
| background-notD | background | Right cluster | 9 | notable | Good Signal | +5% Credits from play while ping stays under 60 ms | lowPingCreditPct | 5 | 1 | New work | Background | -448.1 | -553.3 |  |
| background-key | background | Keystone | 10 | keystone | Silent Running | +20% to all Credits, but the app shows no alerts or toasts while you play | keySilentRunning | 1 | 1 | New work | Rule change | -727.5 | -420 |  |
| background-linka | background | Left cluster to keystone | 10 | small | Background approach | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -730.5 | -258.7 |  |
| background-linkb | background | Right cluster to keystone | 10 | small | Background approach | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -589.3 | -503.3 |  |
| background-fl1 | background | Outer feeder | 11 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -913.6 | -144.7 |  |
| background-fl2 | background | Outer feeder | 11 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -982.7 | -155.7 |  |
| background-fr1 | background | Outer feeder | 11 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -582.1 | -718.9 |  |
| background-fr2 | background | Outer feeder | 11 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -626.2 | -773.3 |  |
| background-fk1 | background | Outer feeder | 11 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -801.1 | -462.5 |  |
| background-fk2 | background | Outer feeder | 11 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -861.7 | -497.5 |  |
| background-w1n0 | background | Outer wheel 1 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1034.1 | -163.8 |  |
| background-w1n1 | background | Outer wheel 1 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1089.5 | -95.4 |  |
| background-w1n2 | background | Outer wheel 1 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1176.4 | -109.2 |  |
| background-w1n3 | background | Outer wheel 1 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1207.9 | -191.4 |  |
| background-w1n4 | background | Outer wheel 1 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1152.5 | -259.8 |  |
| background-w1n5 | background | Outer wheel 1 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1065.6 | -246 |  |
| background-w2n0 | background | Outer wheel 2 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -963.8 | -409.1 |  |
| background-w2n1 | background | Outer wheel 2 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1034.1 | -356.2 |  |
| background-w2n2 | background | Outer wheel 2 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1115.1 | -390.5 |  |
| background-w2n3 | background | Outer wheel 2 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1125.8 | -477.9 |  |
| background-w2n4 | background | Outer wheel 2 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1055.5 | -530.8 |  |
| background-w2n5 | background | Outer wheel 2 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -974.5 | -496.5 |  |
| background-w3n0 | background | Outer wheel 3 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -836.2 | -630.1 |  |
| background-w3n1 | background | Outer wheel 3 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -917.2 | -595.8 |  |
| background-w3n2 | background | Outer wheel 3 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -987.5 | -648.7 |  |
| background-w3n3 | background | Outer wheel 3 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -976.8 | -736.1 |  |
| background-w3n4 | background | Outer wheel 3 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -895.8 | -770.4 |  |
| background-w3n5 | background | Outer wheel 3 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -825.5 | -717.5 |  |
| background-w4n0 | background | Outer wheel 4 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -658.9 | -813.7 |  |
| background-w4n1 | background | Outer wheel 4 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -745.8 | -799.9 |  |
| background-w4n2 | background | Outer wheel 4 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -801.2 | -868.3 |  |
| background-w4n3 | background | Outer wheel 4 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -769.7 | -950.5 |  |
| background-w4n4 | background | Outer wheel 4 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -682.8 | -964.3 |  |
| background-w4n5 | background | Outer wheel 4 | 12 | small | Background wheel | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -627.4 | -895.9 |  |
| background-wl1 | background | Wheel link | 12 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1049.8 | -301.1 |  |
| background-wl2 | background | Wheel link | 12 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -945.9 | -546.1 |  |
| background-wl3 | background | Wheel link | 12 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -785.6 | -758.7 |  |
| background-w1not | background | Outer wheel 1 | 13 | notable | Tidy Desk | +2% to all Credits | allCreditPct | 2 | 1 | Exists | Always | -1121 | -177.6 |  |
| background-w2not | background | Outer wheel 2 | 13 | notable | Low Profile | +5% Credits from play while the app is minimised | minimisedCreditPct | 5 | 1 | New work | Background | -1044.8 | -443.5 |  |
| background-w3not | background | Outer wheel 3 | 13 | notable | Stable Frame | +5% Credits from play while frame time stays steady | steadyFrameCreditPct | 5 | 1 | New work | Background | -906.5 | -683.1 |  |
| background-w4not | background | Outer wheel 4 | 13 | notable | Collector's Shelf | +1% to all Credits for every 3 card skins you own | creditPctPer3Skins | 1 | 1 | New work | Always | -714.3 | -882.1 |  |
| background-ol1 | background | Outer path | 14 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1284 | -203.4 |  |
| background-ol2 | background | Outer path | 14 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1358.1 | -215.1 |  |
| background-or1 | background | Outer path | 14 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -818.1 | -1010.3 |  |
| background-or2 | background | Outer path | 14 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -865.3 | -1068.6 |  |
| quests-bw2 | background | Wheel bridge from Quests | 14 | bridge | Bridge | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1258.8 | -55 |  |
| background-bw1 | background | Wheel bridge to Credits | 14 | bridge | Bridge | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -677 | -1062.7 |  |
| background-ga1 | background | Grand keystone approach | 15 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1195.9 | -570.4 |  |
| background-gb1 | background | Grand keystone approach | 15 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1092 | -750.5 |  |
| background-olnot | background | Outer path | 15 | notable | Night Light | +5% to all Credits while a dark theme is on | darkThemeCreditPct | 5 | 1 | New work | Always | -1442 | -228.4 |  |
| background-ornot | background | Outer path | 15 | notable | Uptime | +10 Credits for every 10 hours the app runs | uptimeCredits | 10 | 1 | New work | Background | -918.8 | -1134.6 |  |
| background-ga2 | background | Grand keystone approach | 16 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1259.6 | -655.7 |  |
| background-gb2 | background | Grand keystone approach | 16 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1197.6 | -763 |  |
| background-xl | background | Grand keystone approach | 16 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1423.4 | -504 |  |
| background-xr | background | Grand keystone approach | 16 | small | Background outer | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -1148.2 | -980.7 |  |
| background-gkey | background | Grand keystone | 17 | keystone | Monk Mode | +40% to all Credits, but News, Draw and Themes are hidden while game mode is on | keyMonkMode | 1 | 1 | New work | Rule change | -1320.7 | -762.5 |  |
| background-ring | ring | Crosswalk Background to Credits | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -99 | -118 |  |
| background-ring2 | ring | Crosswalk Background to Credits | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -52.7 | -144.7 |  |
| credits-ring | ring | Crosswalk Credits to Season Pass | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | 52.7 | -144.7 |  |
| credits-ring2 | ring | Crosswalk Credits to Season Pass | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | 99 | -118 |  |
| loot-ring | ring | Crosswalk Loot to Quests | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -52.7 | 144.7 |  |
| loot-ring2 | ring | Crosswalk Loot to Quests | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -99 | 118 |  |
| quests-ring | ring | Crosswalk Quests to Background | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -151.7 | 26.7 |  |
| quests-ring2 | ring | Crosswalk Quests to Background | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | -151.7 | -26.7 |  |
| pass-ring | ring | Crosswalk Season Pass to Sessions | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | 151.7 | -26.7 |  |
| pass-ring2 | ring | Crosswalk Season Pass to Sessions | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | 151.7 | 26.7 |  |
| sessions-ring | ring | Crosswalk Sessions to Loot | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | 99 | 118 |  |
| sessions-ring2 | ring | Crosswalk Sessions to Loot | 1 | ring | Crosswalk | +1% to all Credits | allCreditPct | 1 | 1 | Exists | Always | 52.7 | 144.7 |  |
## Sheet: Edges
| from | to | from ok | to ok |
| --- | --- | --- | --- |
| core | credits-s1 | ok | ok |
| credits-s1 | credits-s2 | ok | ok |
| credits-s2 | credits-fork | ok | ok |
| credits-fork | credits-a1 | ok | ok |
| credits-a1 | credits-a2 | ok | ok |
| credits-a2 | credits-notA | ok | ok |
| credits-fork | credits-m1 | ok | ok |
| credits-m1 | credits-m2 | ok | ok |
| credits-m2 | credits-notM | ok | ok |
| credits-fork | credits-b1 | ok | ok |
| credits-b1 | credits-b2 | ok | ok |
| credits-b2 | credits-notB | ok | ok |
| credits-notM | credits-k1 | ok | ok |
| credits-k1 | credits-k2 | ok | ok |
| credits-k2 | credits-key | ok | ok |
| credits-notA | credits-cain | ok | ok |
| credits-cain | credits-cal | ok | ok |
| credits-cain | credits-car | ok | ok |
| credits-cal | credits-notC | ok | ok |
| credits-car | credits-notC | ok | ok |
| credits-notC | credits-linka | ok | ok |
| credits-linka | credits-key | ok | ok |
| credits-notB | credits-cbin | ok | ok |
| credits-cbin | credits-cbl | ok | ok |
| credits-cbin | credits-cbr | ok | ok |
| credits-cbl | credits-notD | ok | ok |
| credits-cbr | credits-notD | ok | ok |
| credits-notD | credits-linkb | ok | ok |
| credits-linkb | credits-key | ok | ok |
| credits-s1 | credits-ring | ok | ok |
| credits-ring | credits-ring2 | ok | ok |
| credits-ring2 | pass-s1 | ok | ok |
| credits-notB | credits-bi1 | ok | ok |
| credits-bi1 | credits-bi2 | ok | ok |
| credits-bi2 | pass-notA | ok | ok |
| credits-notD | credits-bo1 | ok | ok |
| credits-bo1 | credits-bo2 | ok | ok |
| credits-bo2 | pass-notC | ok | ok |
| core | pass-s1 | ok | ok |
| pass-s1 | pass-s2 | ok | ok |
| pass-s2 | pass-fork | ok | ok |
| pass-fork | pass-a1 | ok | ok |
| pass-a1 | pass-a2 | ok | ok |
| pass-a2 | pass-notA | ok | ok |
| pass-fork | pass-m1 | ok | ok |
| pass-m1 | pass-m2 | ok | ok |
| pass-m2 | pass-notM | ok | ok |
| pass-fork | pass-b1 | ok | ok |
| pass-b1 | pass-b2 | ok | ok |
| pass-b2 | pass-notB | ok | ok |
| pass-notM | pass-k1 | ok | ok |
| pass-k1 | pass-k2 | ok | ok |
| pass-k2 | pass-key | ok | ok |
| pass-notA | pass-cain | ok | ok |
| pass-cain | pass-cal | ok | ok |
| pass-cain | pass-car | ok | ok |
| pass-cal | pass-notC | ok | ok |
| pass-car | pass-notC | ok | ok |
| pass-notC | pass-linka | ok | ok |
| pass-linka | pass-key | ok | ok |
| pass-notB | pass-cbin | ok | ok |
| pass-cbin | pass-cbl | ok | ok |
| pass-cbin | pass-cbr | ok | ok |
| pass-cbl | pass-notD | ok | ok |
| pass-cbr | pass-notD | ok | ok |
| pass-notD | pass-linkb | ok | ok |
| pass-linkb | pass-key | ok | ok |
| pass-s1 | pass-ring | ok | ok |
| pass-ring | pass-ring2 | ok | ok |
| pass-ring2 | sessions-s1 | ok | ok |
| pass-notB | pass-bi1 | ok | ok |
| pass-bi1 | pass-bi2 | ok | ok |
| pass-bi2 | sessions-notA | ok | ok |
| pass-notD | pass-bo1 | ok | ok |
| pass-bo1 | pass-bo2 | ok | ok |
| pass-bo2 | sessions-notC | ok | ok |
| core | sessions-s1 | ok | ok |
| sessions-s1 | sessions-s2 | ok | ok |
| sessions-s2 | sessions-fork | ok | ok |
| sessions-fork | sessions-a1 | ok | ok |
| sessions-a1 | sessions-a2 | ok | ok |
| sessions-a2 | sessions-notA | ok | ok |
| sessions-fork | sessions-m1 | ok | ok |
| sessions-m1 | sessions-m2 | ok | ok |
| sessions-m2 | sessions-notM | ok | ok |
| sessions-fork | sessions-b1 | ok | ok |
| sessions-b1 | sessions-b2 | ok | ok |
| sessions-b2 | sessions-notB | ok | ok |
| sessions-notM | sessions-k1 | ok | ok |
| sessions-k1 | sessions-k2 | ok | ok |
| sessions-k2 | sessions-key | ok | ok |
| sessions-notA | sessions-cain | ok | ok |
| sessions-cain | sessions-cal | ok | ok |
| sessions-cain | sessions-car | ok | ok |
| sessions-cal | sessions-notC | ok | ok |
| sessions-car | sessions-notC | ok | ok |
| sessions-notC | sessions-linka | ok | ok |
| sessions-linka | sessions-key | ok | ok |
| sessions-notB | sessions-cbin | ok | ok |
| sessions-cbin | sessions-cbl | ok | ok |
| sessions-cbin | sessions-cbr | ok | ok |
| sessions-cbl | sessions-notD | ok | ok |
| sessions-cbr | sessions-notD | ok | ok |
| sessions-notD | sessions-linkb | ok | ok |
| sessions-linkb | sessions-key | ok | ok |
| sessions-s1 | sessions-ring | ok | ok |
| sessions-ring | sessions-ring2 | ok | ok |
| sessions-ring2 | loot-s1 | ok | ok |
| sessions-notB | sessions-bi1 | ok | ok |
| sessions-bi1 | sessions-bi2 | ok | ok |
| sessions-bi2 | loot-notA | ok | ok |
| sessions-notD | sessions-bo1 | ok | ok |
| sessions-bo1 | sessions-bo2 | ok | ok |
| sessions-bo2 | loot-notC | ok | ok |
| core | loot-s1 | ok | ok |
| loot-s1 | loot-s2 | ok | ok |
| loot-s2 | loot-fork | ok | ok |
| loot-fork | loot-a1 | ok | ok |
| loot-a1 | loot-a2 | ok | ok |
| loot-a2 | loot-notA | ok | ok |
| loot-fork | loot-m1 | ok | ok |
| loot-m1 | loot-m2 | ok | ok |
| loot-m2 | loot-notM | ok | ok |
| loot-fork | loot-b1 | ok | ok |
| loot-b1 | loot-b2 | ok | ok |
| loot-b2 | loot-notB | ok | ok |
| loot-notM | loot-k1 | ok | ok |
| loot-k1 | loot-k2 | ok | ok |
| loot-k2 | loot-key | ok | ok |
| loot-notA | loot-cain | ok | ok |
| loot-cain | loot-cal | ok | ok |
| loot-cain | loot-car | ok | ok |
| loot-cal | loot-notC | ok | ok |
| loot-car | loot-notC | ok | ok |
| loot-notC | loot-linka | ok | ok |
| loot-linka | loot-key | ok | ok |
| loot-notB | loot-cbin | ok | ok |
| loot-cbin | loot-cbl | ok | ok |
| loot-cbin | loot-cbr | ok | ok |
| loot-cbl | loot-notD | ok | ok |
| loot-cbr | loot-notD | ok | ok |
| loot-notD | loot-linkb | ok | ok |
| loot-linkb | loot-key | ok | ok |
| loot-s1 | loot-ring | ok | ok |
| loot-ring | loot-ring2 | ok | ok |
| loot-ring2 | quests-s1 | ok | ok |
| loot-notB | loot-bi1 | ok | ok |
| loot-bi1 | loot-bi2 | ok | ok |
| loot-bi2 | quests-notA | ok | ok |
| loot-notD | loot-bo1 | ok | ok |
| loot-bo1 | loot-bo2 | ok | ok |
| loot-bo2 | quests-notC | ok | ok |
| core | quests-s1 | ok | ok |
| quests-s1 | quests-s2 | ok | ok |
| quests-s2 | quests-fork | ok | ok |
| quests-fork | quests-a1 | ok | ok |
| quests-a1 | quests-a2 | ok | ok |
| quests-a2 | quests-notA | ok | ok |
| quests-fork | quests-m1 | ok | ok |
| quests-m1 | quests-m2 | ok | ok |
| quests-m2 | quests-notM | ok | ok |
| quests-fork | quests-b1 | ok | ok |
| quests-b1 | quests-b2 | ok | ok |
| quests-b2 | quests-notB | ok | ok |
| quests-notM | quests-k1 | ok | ok |
| quests-k1 | quests-k2 | ok | ok |
| quests-k2 | quests-key | ok | ok |
| quests-notA | quests-cain | ok | ok |
| quests-cain | quests-cal | ok | ok |
| quests-cain | quests-car | ok | ok |
| quests-cal | quests-notC | ok | ok |
| quests-car | quests-notC | ok | ok |
| quests-notC | quests-linka | ok | ok |
| quests-linka | quests-key | ok | ok |
| quests-notB | quests-cbin | ok | ok |
| quests-cbin | quests-cbl | ok | ok |
| quests-cbin | quests-cbr | ok | ok |
| quests-cbl | quests-notD | ok | ok |
| quests-cbr | quests-notD | ok | ok |
| quests-notD | quests-linkb | ok | ok |
| quests-linkb | quests-key | ok | ok |
| quests-s1 | quests-ring | ok | ok |
| quests-ring | quests-ring2 | ok | ok |
| quests-ring2 | background-s1 | ok | ok |
| quests-notB | quests-bi1 | ok | ok |
| quests-bi1 | quests-bi2 | ok | ok |
| quests-bi2 | background-notA | ok | ok |
| quests-notD | quests-bo1 | ok | ok |
| quests-bo1 | quests-bo2 | ok | ok |
| quests-bo2 | background-notC | ok | ok |
| core | background-s1 | ok | ok |
| background-s1 | background-s2 | ok | ok |
| background-s2 | background-fork | ok | ok |
| background-fork | background-a1 | ok | ok |
| background-a1 | background-a2 | ok | ok |
| background-a2 | background-notA | ok | ok |
| background-fork | background-m1 | ok | ok |
| background-m1 | background-m2 | ok | ok |
| background-m2 | background-notM | ok | ok |
| background-fork | background-b1 | ok | ok |
| background-b1 | background-b2 | ok | ok |
| background-b2 | background-notB | ok | ok |
| background-notM | background-k1 | ok | ok |
| background-k1 | background-k2 | ok | ok |
| background-k2 | background-key | ok | ok |
| background-notA | background-cain | ok | ok |
| background-cain | background-cal | ok | ok |
| background-cain | background-car | ok | ok |
| background-cal | background-notC | ok | ok |
| background-car | background-notC | ok | ok |
| background-notC | background-linka | ok | ok |
| background-linka | background-key | ok | ok |
| background-notB | background-cbin | ok | ok |
| background-cbin | background-cbl | ok | ok |
| background-cbin | background-cbr | ok | ok |
| background-cbl | background-notD | ok | ok |
| background-cbr | background-notD | ok | ok |
| background-notD | background-linkb | ok | ok |
| background-linkb | background-key | ok | ok |
| background-s1 | background-ring | ok | ok |
| background-ring | background-ring2 | ok | ok |
| background-ring2 | credits-s1 | ok | ok |
| background-notB | background-bi1 | ok | ok |
| background-bi1 | background-bi2 | ok | ok |
| background-bi2 | credits-notA | ok | ok |
| background-notD | background-bo1 | ok | ok |
| background-bo1 | background-bo2 | ok | ok |
| background-bo2 | credits-notC | ok | ok |
| credits-w1n0 | credits-w1n1 | ok | ok |
| credits-w1n1 | credits-w1n2 | ok | ok |
| credits-w1n2 | credits-w1n3 | ok | ok |
| credits-w1n3 | credits-w1n4 | ok | ok |
| credits-w1n4 | credits-w1n5 | ok | ok |
| credits-w1n5 | credits-w1n0 | ok | ok |
| credits-w1n0 | credits-w1not | ok | ok |
| credits-w1n3 | credits-w1not | ok | ok |
| credits-w2n0 | credits-w2n1 | ok | ok |
| credits-w2n1 | credits-w2n2 | ok | ok |
| credits-w2n2 | credits-w2n3 | ok | ok |
| credits-w2n3 | credits-w2n4 | ok | ok |
| credits-w2n4 | credits-w2n5 | ok | ok |
| credits-w2n5 | credits-w2n0 | ok | ok |
| credits-w2n0 | credits-w2not | ok | ok |
| credits-w2n3 | credits-w2not | ok | ok |
| credits-w3n0 | credits-w3n1 | ok | ok |
| credits-w3n1 | credits-w3n2 | ok | ok |
| credits-w3n2 | credits-w3n3 | ok | ok |
| credits-w3n3 | credits-w3n4 | ok | ok |
| credits-w3n4 | credits-w3n5 | ok | ok |
| credits-w3n5 | credits-w3n0 | ok | ok |
| credits-w3n0 | credits-w3not | ok | ok |
| credits-w3n3 | credits-w3not | ok | ok |
| credits-w4n0 | credits-w4n1 | ok | ok |
| credits-w4n1 | credits-w4n2 | ok | ok |
| credits-w4n2 | credits-w4n3 | ok | ok |
| credits-w4n3 | credits-w4n4 | ok | ok |
| credits-w4n4 | credits-w4n5 | ok | ok |
| credits-w4n5 | credits-w4n0 | ok | ok |
| credits-w4n0 | credits-w4not | ok | ok |
| credits-w4n3 | credits-w4not | ok | ok |
| credits-notC | credits-fl1 | ok | ok |
| credits-fl1 | credits-fl2 | ok | ok |
| credits-fl2 | credits-w1n0 | ok | ok |
| credits-notD | credits-fr1 | ok | ok |
| credits-fr1 | credits-fr2 | ok | ok |
| credits-fr2 | credits-w4n0 | ok | ok |
| credits-key | credits-fk1 | ok | ok |
| credits-fk1 | credits-fk2 | ok | ok |
| credits-fk2 | credits-w2n0 | ok | ok |
| credits-fk2 | credits-w3n0 | ok | ok |
| credits-w1n5 | credits-wl1 | ok | ok |
| credits-wl1 | credits-w2n1 | ok | ok |
| credits-w2n5 | credits-wl2 | ok | ok |
| credits-wl2 | credits-w3n1 | ok | ok |
| credits-w3n5 | credits-wl3 | ok | ok |
| credits-wl3 | credits-w4n1 | ok | ok |
| credits-w1n3 | credits-ol1 | ok | ok |
| credits-ol1 | credits-ol2 | ok | ok |
| credits-ol2 | credits-olnot | ok | ok |
| credits-w4n3 | credits-or1 | ok | ok |
| credits-or1 | credits-or2 | ok | ok |
| credits-or2 | credits-ornot | ok | ok |
| credits-w2n3 | credits-ga1 | ok | ok |
| credits-ga1 | credits-ga2 | ok | ok |
| credits-ga2 | credits-gkey | ok | ok |
| credits-w3n3 | credits-gb1 | ok | ok |
| credits-gb1 | credits-gb2 | ok | ok |
| credits-gb2 | credits-gkey | ok | ok |
| credits-olnot | credits-xl | ok | ok |
| credits-xl | credits-gkey | ok | ok |
| credits-ornot | credits-xr | ok | ok |
| credits-xr | credits-gkey | ok | ok |
| pass-w1n0 | pass-w1n1 | ok | ok |
| pass-w1n1 | pass-w1n2 | ok | ok |
| pass-w1n2 | pass-w1n3 | ok | ok |
| pass-w1n3 | pass-w1n4 | ok | ok |
| pass-w1n4 | pass-w1n5 | ok | ok |
| pass-w1n5 | pass-w1n0 | ok | ok |
| pass-w1n0 | pass-w1not | ok | ok |
| pass-w1n3 | pass-w1not | ok | ok |
| pass-w2n0 | pass-w2n1 | ok | ok |
| pass-w2n1 | pass-w2n2 | ok | ok |
| pass-w2n2 | pass-w2n3 | ok | ok |
| pass-w2n3 | pass-w2n4 | ok | ok |
| pass-w2n4 | pass-w2n5 | ok | ok |
| pass-w2n5 | pass-w2n0 | ok | ok |
| pass-w2n0 | pass-w2not | ok | ok |
| pass-w2n3 | pass-w2not | ok | ok |
| pass-w3n0 | pass-w3n1 | ok | ok |
| pass-w3n1 | pass-w3n2 | ok | ok |
| pass-w3n2 | pass-w3n3 | ok | ok |
| pass-w3n3 | pass-w3n4 | ok | ok |
| pass-w3n4 | pass-w3n5 | ok | ok |
| pass-w3n5 | pass-w3n0 | ok | ok |
| pass-w3n0 | pass-w3not | ok | ok |
| pass-w3n3 | pass-w3not | ok | ok |
| pass-w4n0 | pass-w4n1 | ok | ok |
| pass-w4n1 | pass-w4n2 | ok | ok |
| pass-w4n2 | pass-w4n3 | ok | ok |
| pass-w4n3 | pass-w4n4 | ok | ok |
| pass-w4n4 | pass-w4n5 | ok | ok |
| pass-w4n5 | pass-w4n0 | ok | ok |
| pass-w4n0 | pass-w4not | ok | ok |
| pass-w4n3 | pass-w4not | ok | ok |
| pass-notC | pass-fl1 | ok | ok |
| pass-fl1 | pass-fl2 | ok | ok |
| pass-fl2 | pass-w1n0 | ok | ok |
| pass-notD | pass-fr1 | ok | ok |
| pass-fr1 | pass-fr2 | ok | ok |
| pass-fr2 | pass-w4n0 | ok | ok |
| pass-key | pass-fk1 | ok | ok |
| pass-fk1 | pass-fk2 | ok | ok |
| pass-fk2 | pass-w2n0 | ok | ok |
| pass-fk2 | pass-w3n0 | ok | ok |
| pass-w1n5 | pass-wl1 | ok | ok |
| pass-wl1 | pass-w2n1 | ok | ok |
| pass-w2n5 | pass-wl2 | ok | ok |
| pass-wl2 | pass-w3n1 | ok | ok |
| pass-w3n5 | pass-wl3 | ok | ok |
| pass-wl3 | pass-w4n1 | ok | ok |
| pass-w1n3 | pass-ol1 | ok | ok |
| pass-ol1 | pass-ol2 | ok | ok |
| pass-ol2 | pass-olnot | ok | ok |
| pass-w4n3 | pass-or1 | ok | ok |
| pass-or1 | pass-or2 | ok | ok |
| pass-or2 | pass-ornot | ok | ok |
| pass-w2n3 | pass-ga1 | ok | ok |
| pass-ga1 | pass-ga2 | ok | ok |
| pass-ga2 | pass-gkey | ok | ok |
| pass-w3n3 | pass-gb1 | ok | ok |
| pass-gb1 | pass-gb2 | ok | ok |
| pass-gb2 | pass-gkey | ok | ok |
| pass-olnot | pass-xl | ok | ok |
| pass-xl | pass-gkey | ok | ok |
| pass-ornot | pass-xr | ok | ok |
| pass-xr | pass-gkey | ok | ok |
| sessions-w1n0 | sessions-w1n1 | ok | ok |
| sessions-w1n1 | sessions-w1n2 | ok | ok |
| sessions-w1n2 | sessions-w1n3 | ok | ok |
| sessions-w1n3 | sessions-w1n4 | ok | ok |
| sessions-w1n4 | sessions-w1n5 | ok | ok |
| sessions-w1n5 | sessions-w1n0 | ok | ok |
| sessions-w1n0 | sessions-w1not | ok | ok |
| sessions-w1n3 | sessions-w1not | ok | ok |
| sessions-w2n0 | sessions-w2n1 | ok | ok |
| sessions-w2n1 | sessions-w2n2 | ok | ok |
| sessions-w2n2 | sessions-w2n3 | ok | ok |
| sessions-w2n3 | sessions-w2n4 | ok | ok |
| sessions-w2n4 | sessions-w2n5 | ok | ok |
| sessions-w2n5 | sessions-w2n0 | ok | ok |
| sessions-w2n0 | sessions-w2not | ok | ok |
| sessions-w2n3 | sessions-w2not | ok | ok |
| sessions-w3n0 | sessions-w3n1 | ok | ok |
| sessions-w3n1 | sessions-w3n2 | ok | ok |
| sessions-w3n2 | sessions-w3n3 | ok | ok |
| sessions-w3n3 | sessions-w3n4 | ok | ok |
| sessions-w3n4 | sessions-w3n5 | ok | ok |
| sessions-w3n5 | sessions-w3n0 | ok | ok |
| sessions-w3n0 | sessions-w3not | ok | ok |
| sessions-w3n3 | sessions-w3not | ok | ok |
| sessions-w4n0 | sessions-w4n1 | ok | ok |
| sessions-w4n1 | sessions-w4n2 | ok | ok |
| sessions-w4n2 | sessions-w4n3 | ok | ok |
| sessions-w4n3 | sessions-w4n4 | ok | ok |
| sessions-w4n4 | sessions-w4n5 | ok | ok |
| sessions-w4n5 | sessions-w4n0 | ok | ok |
| sessions-w4n0 | sessions-w4not | ok | ok |
| sessions-w4n3 | sessions-w4not | ok | ok |
| sessions-notC | sessions-fl1 | ok | ok |
| sessions-fl1 | sessions-fl2 | ok | ok |
| sessions-fl2 | sessions-w1n0 | ok | ok |
| sessions-notD | sessions-fr1 | ok | ok |
| sessions-fr1 | sessions-fr2 | ok | ok |
| sessions-fr2 | sessions-w4n0 | ok | ok |
| sessions-key | sessions-fk1 | ok | ok |
| sessions-fk1 | sessions-fk2 | ok | ok |
| sessions-fk2 | sessions-w2n0 | ok | ok |
| sessions-fk2 | sessions-w3n0 | ok | ok |
| sessions-w1n5 | sessions-wl1 | ok | ok |
| sessions-wl1 | sessions-w2n1 | ok | ok |
| sessions-w2n5 | sessions-wl2 | ok | ok |
| sessions-wl2 | sessions-w3n1 | ok | ok |
| sessions-w3n5 | sessions-wl3 | ok | ok |
| sessions-wl3 | sessions-w4n1 | ok | ok |
| sessions-w1n3 | sessions-ol1 | ok | ok |
| sessions-ol1 | sessions-ol2 | ok | ok |
| sessions-ol2 | sessions-olnot | ok | ok |
| sessions-w4n3 | sessions-or1 | ok | ok |
| sessions-or1 | sessions-or2 | ok | ok |
| sessions-or2 | sessions-ornot | ok | ok |
| sessions-w2n3 | sessions-ga1 | ok | ok |
| sessions-ga1 | sessions-ga2 | ok | ok |
| sessions-ga2 | sessions-gkey | ok | ok |
| sessions-w3n3 | sessions-gb1 | ok | ok |
| sessions-gb1 | sessions-gb2 | ok | ok |
| sessions-gb2 | sessions-gkey | ok | ok |
| sessions-olnot | sessions-xl | ok | ok |
| sessions-xl | sessions-gkey | ok | ok |
| sessions-ornot | sessions-xr | ok | ok |
| sessions-xr | sessions-gkey | ok | ok |
| loot-w1n0 | loot-w1n1 | ok | ok |
| loot-w1n1 | loot-w1n2 | ok | ok |
| loot-w1n2 | loot-w1n3 | ok | ok |
| loot-w1n3 | loot-w1n4 | ok | ok |
| loot-w1n4 | loot-w1n5 | ok | ok |
| loot-w1n5 | loot-w1n0 | ok | ok |
| loot-w1n0 | loot-w1not | ok | ok |
| loot-w1n3 | loot-w1not | ok | ok |
| loot-w2n0 | loot-w2n1 | ok | ok |
| loot-w2n1 | loot-w2n2 | ok | ok |
| loot-w2n2 | loot-w2n3 | ok | ok |
| loot-w2n3 | loot-w2n4 | ok | ok |
| loot-w2n4 | loot-w2n5 | ok | ok |
| loot-w2n5 | loot-w2n0 | ok | ok |
| loot-w2n0 | loot-w2not | ok | ok |
| loot-w2n3 | loot-w2not | ok | ok |
| loot-w3n0 | loot-w3n1 | ok | ok |
| loot-w3n1 | loot-w3n2 | ok | ok |
| loot-w3n2 | loot-w3n3 | ok | ok |
| loot-w3n3 | loot-w3n4 | ok | ok |
| loot-w3n4 | loot-w3n5 | ok | ok |
| loot-w3n5 | loot-w3n0 | ok | ok |
| loot-w3n0 | loot-w3not | ok | ok |
| loot-w3n3 | loot-w3not | ok | ok |
| loot-w4n0 | loot-w4n1 | ok | ok |
| loot-w4n1 | loot-w4n2 | ok | ok |
| loot-w4n2 | loot-w4n3 | ok | ok |
| loot-w4n3 | loot-w4n4 | ok | ok |
| loot-w4n4 | loot-w4n5 | ok | ok |
| loot-w4n5 | loot-w4n0 | ok | ok |
| loot-w4n0 | loot-w4not | ok | ok |
| loot-w4n3 | loot-w4not | ok | ok |
| loot-notC | loot-fl1 | ok | ok |
| loot-fl1 | loot-fl2 | ok | ok |
| loot-fl2 | loot-w1n0 | ok | ok |
| loot-notD | loot-fr1 | ok | ok |
| loot-fr1 | loot-fr2 | ok | ok |
| loot-fr2 | loot-w4n0 | ok | ok |
| loot-key | loot-fk1 | ok | ok |
| loot-fk1 | loot-fk2 | ok | ok |
| loot-fk2 | loot-w2n0 | ok | ok |
| loot-fk2 | loot-w3n0 | ok | ok |
| loot-w1n5 | loot-wl1 | ok | ok |
| loot-wl1 | loot-w2n1 | ok | ok |
| loot-w2n5 | loot-wl2 | ok | ok |
| loot-wl2 | loot-w3n1 | ok | ok |
| loot-w3n5 | loot-wl3 | ok | ok |
| loot-wl3 | loot-w4n1 | ok | ok |
| loot-w1n3 | loot-ol1 | ok | ok |
| loot-ol1 | loot-ol2 | ok | ok |
| loot-ol2 | loot-olnot | ok | ok |
| loot-w4n3 | loot-or1 | ok | ok |
| loot-or1 | loot-or2 | ok | ok |
| loot-or2 | loot-ornot | ok | ok |
| loot-w2n3 | loot-ga1 | ok | ok |
| loot-ga1 | loot-ga2 | ok | ok |
| loot-ga2 | loot-gkey | ok | ok |
| loot-w3n3 | loot-gb1 | ok | ok |
| loot-gb1 | loot-gb2 | ok | ok |
| loot-gb2 | loot-gkey | ok | ok |
| loot-olnot | loot-xl | ok | ok |
| loot-xl | loot-gkey | ok | ok |
| loot-ornot | loot-xr | ok | ok |
| loot-xr | loot-gkey | ok | ok |
| quests-w1n0 | quests-w1n1 | ok | ok |
| quests-w1n1 | quests-w1n2 | ok | ok |
| quests-w1n2 | quests-w1n3 | ok | ok |
| quests-w1n3 | quests-w1n4 | ok | ok |
| quests-w1n4 | quests-w1n5 | ok | ok |
| quests-w1n5 | quests-w1n0 | ok | ok |
| quests-w1n0 | quests-w1not | ok | ok |
| quests-w1n3 | quests-w1not | ok | ok |
| quests-w2n0 | quests-w2n1 | ok | ok |
| quests-w2n1 | quests-w2n2 | ok | ok |
| quests-w2n2 | quests-w2n3 | ok | ok |
| quests-w2n3 | quests-w2n4 | ok | ok |
| quests-w2n4 | quests-w2n5 | ok | ok |
| quests-w2n5 | quests-w2n0 | ok | ok |
| quests-w2n0 | quests-w2not | ok | ok |
| quests-w2n3 | quests-w2not | ok | ok |
| quests-w3n0 | quests-w3n1 | ok | ok |
| quests-w3n1 | quests-w3n2 | ok | ok |
| quests-w3n2 | quests-w3n3 | ok | ok |
| quests-w3n3 | quests-w3n4 | ok | ok |
| quests-w3n4 | quests-w3n5 | ok | ok |
| quests-w3n5 | quests-w3n0 | ok | ok |
| quests-w3n0 | quests-w3not | ok | ok |
| quests-w3n3 | quests-w3not | ok | ok |
| quests-w4n0 | quests-w4n1 | ok | ok |
| quests-w4n1 | quests-w4n2 | ok | ok |
| quests-w4n2 | quests-w4n3 | ok | ok |
| quests-w4n3 | quests-w4n4 | ok | ok |
| quests-w4n4 | quests-w4n5 | ok | ok |
| quests-w4n5 | quests-w4n0 | ok | ok |
| quests-w4n0 | quests-w4not | ok | ok |
| quests-w4n3 | quests-w4not | ok | ok |
| quests-notC | quests-fl1 | ok | ok |
| quests-fl1 | quests-fl2 | ok | ok |
| quests-fl2 | quests-w1n0 | ok | ok |
| quests-notD | quests-fr1 | ok | ok |
| quests-fr1 | quests-fr2 | ok | ok |
| quests-fr2 | quests-w4n0 | ok | ok |
| quests-key | quests-fk1 | ok | ok |
| quests-fk1 | quests-fk2 | ok | ok |
| quests-fk2 | quests-w2n0 | ok | ok |
| quests-fk2 | quests-w3n0 | ok | ok |
| quests-w1n5 | quests-wl1 | ok | ok |
| quests-wl1 | quests-w2n1 | ok | ok |
| quests-w2n5 | quests-wl2 | ok | ok |
| quests-wl2 | quests-w3n1 | ok | ok |
| quests-w3n5 | quests-wl3 | ok | ok |
| quests-wl3 | quests-w4n1 | ok | ok |
| quests-w1n3 | quests-ol1 | ok | ok |
| quests-ol1 | quests-ol2 | ok | ok |
| quests-ol2 | quests-olnot | ok | ok |
| quests-w4n3 | quests-or1 | ok | ok |
| quests-or1 | quests-or2 | ok | ok |
| quests-or2 | quests-ornot | ok | ok |
| quests-w2n3 | quests-ga1 | ok | ok |
| quests-ga1 | quests-ga2 | ok | ok |
| quests-ga2 | quests-gkey | ok | ok |
| quests-w3n3 | quests-gb1 | ok | ok |
| quests-gb1 | quests-gb2 | ok | ok |
| quests-gb2 | quests-gkey | ok | ok |
| quests-olnot | quests-xl | ok | ok |
| quests-xl | quests-gkey | ok | ok |
| quests-ornot | quests-xr | ok | ok |
| quests-xr | quests-gkey | ok | ok |
| background-w1n0 | background-w1n1 | ok | ok |
| background-w1n1 | background-w1n2 | ok | ok |
| background-w1n2 | background-w1n3 | ok | ok |
| background-w1n3 | background-w1n4 | ok | ok |
| background-w1n4 | background-w1n5 | ok | ok |
| background-w1n5 | background-w1n0 | ok | ok |
| background-w1n0 | background-w1not | ok | ok |
| background-w1n3 | background-w1not | ok | ok |
| background-w2n0 | background-w2n1 | ok | ok |
| background-w2n1 | background-w2n2 | ok | ok |
| background-w2n2 | background-w2n3 | ok | ok |
| background-w2n3 | background-w2n4 | ok | ok |
| background-w2n4 | background-w2n5 | ok | ok |
| background-w2n5 | background-w2n0 | ok | ok |
| background-w2n0 | background-w2not | ok | ok |
| background-w2n3 | background-w2not | ok | ok |
| background-w3n0 | background-w3n1 | ok | ok |
| background-w3n1 | background-w3n2 | ok | ok |
| background-w3n2 | background-w3n3 | ok | ok |
| background-w3n3 | background-w3n4 | ok | ok |
| background-w3n4 | background-w3n5 | ok | ok |
| background-w3n5 | background-w3n0 | ok | ok |
| background-w3n0 | background-w3not | ok | ok |
| background-w3n3 | background-w3not | ok | ok |
| background-w4n0 | background-w4n1 | ok | ok |
| background-w4n1 | background-w4n2 | ok | ok |
| background-w4n2 | background-w4n3 | ok | ok |
| background-w4n3 | background-w4n4 | ok | ok |
| background-w4n4 | background-w4n5 | ok | ok |
| background-w4n5 | background-w4n0 | ok | ok |
| background-w4n0 | background-w4not | ok | ok |
| background-w4n3 | background-w4not | ok | ok |
| background-notC | background-fl1 | ok | ok |
| background-fl1 | background-fl2 | ok | ok |
| background-fl2 | background-w1n0 | ok | ok |
| background-notD | background-fr1 | ok | ok |
| background-fr1 | background-fr2 | ok | ok |
| background-fr2 | background-w4n0 | ok | ok |
| background-key | background-fk1 | ok | ok |
| background-fk1 | background-fk2 | ok | ok |
| background-fk2 | background-w2n0 | ok | ok |
| background-fk2 | background-w3n0 | ok | ok |
| background-w1n5 | background-wl1 | ok | ok |
| background-wl1 | background-w2n1 | ok | ok |
| background-w2n5 | background-wl2 | ok | ok |
| background-wl2 | background-w3n1 | ok | ok |
| background-w3n5 | background-wl3 | ok | ok |
| background-wl3 | background-w4n1 | ok | ok |
| background-w1n3 | background-ol1 | ok | ok |
| background-ol1 | background-ol2 | ok | ok |
| background-ol2 | background-olnot | ok | ok |
| background-w4n3 | background-or1 | ok | ok |
| background-or1 | background-or2 | ok | ok |
| background-or2 | background-ornot | ok | ok |
| background-w2n3 | background-ga1 | ok | ok |
| background-ga1 | background-ga2 | ok | ok |
| background-ga2 | background-gkey | ok | ok |
| background-w3n3 | background-gb1 | ok | ok |
| background-gb1 | background-gb2 | ok | ok |
| background-gb2 | background-gkey | ok | ok |
| background-olnot | background-xl | ok | ok |
| background-xl | background-gkey | ok | ok |
| background-ornot | background-xr | ok | ok |
| background-xr | background-gkey | ok | ok |
| credits-w4n4 | credits-bw1 | ok | ok |
| credits-bw1 | credits-bw2 | ok | ok |
| credits-bw2 | pass-w1n2 | ok | ok |
| pass-w4n4 | pass-bw1 | ok | ok |
| pass-bw1 | pass-bw2 | ok | ok |
| pass-bw2 | sessions-w1n2 | ok | ok |
| sessions-w4n4 | sessions-bw1 | ok | ok |
| sessions-bw1 | sessions-bw2 | ok | ok |
| sessions-bw2 | loot-w1n2 | ok | ok |
| loot-w4n4 | loot-bw1 | ok | ok |
| loot-bw1 | loot-bw2 | ok | ok |
| loot-bw2 | quests-w1n2 | ok | ok |
| quests-w4n4 | quests-bw1 | ok | ok |
| quests-bw1 | quests-bw2 | ok | ok |
| quests-bw2 | background-w1n2 | ok | ok |
| background-w4n4 | background-bw1 | ok | ok |
| background-bw1 | background-bw2 | ok | ok |
| background-bw2 | credits-w1n2 | ok | ok |
## Sheet: Season Math
| Season math: how many nodes a player can light up |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| Yellow cells are inputs. Everything else is a formula. Point rules come from the Points sheet. |  |  |  |  |  |
| Season length (days) | 91 | About 3 months (13 weeks). |  |  |  |
| XP per Pass level | 1000 |  |  |  |  |
| Weekly Pass XP cap | 2500 | Matches the app. |  |  |  |
| Pass levels per season | 30 |  |  |  |  |
| Typical player: Pass levels per season | 18 | Guess for someone who plays a few times a week. |  |  |  |
| Typical player: rank-ups reached | 2 | Out of 3. |  |  |  |
| Max player: rank-ups reached | 3 |  |  |  |  |
| Weeks per season | 13 |  |  |  |  |
| Most XP per season (cap × weeks) | 32500 |  |  |  |  |
| Levels a maxed player can reach | 30 |  |  |  |  |
| Weeks to reach the last level | 12 |  |  |  |  |
| Nodes per season (maxed) | 30 |  |  |  |  |
| Nodes per month (maxed) | 10.035164835164835 |  |  |  |  |
| Nodes per season (typical) | 18 |  |  |  |  |
| Nodes per month (typical) | 6.021098901098902 |  |  |  |  |
| Nodes lit up by the end of each season (1 node = 1 point, never above the cap) |  |  |  |  |  |
| Season | Months in | Maxed player | Typical player | Maxed: share of tree | Typical: share of tree |
| 1 | 2.9894875164257555 | 41 | 26 | 0.0823293172690763 | 0.05220883534136546 |
| 2 | 5.978975032851511 | 71 | 44 | 0.142570281124498 | 0.08835341365461848 |
| 3 | 8.968462549277266 | 101 | 62 | 0.20281124497991967 | 0.12449799196787148 |
| 4 | 11.957950065703022 | 131 | 80 | 0.26305220883534136 | 0.1606425702811245 |
| 5 | 14.947437582128778 | 150 | 98 | 0.30120481927710846 | 0.19678714859437751 |
| 6 | 17.936925098554532 | 150 | 116 | 0.30120481927710846 | 0.23293172690763053 |
| Starting points and rank-ups are counted once, in season 1. Pass levels add every season until the cap. |  |  |  |  |  |
## Sheet: Points
| Perk Points |  |  |
| --- | --- | --- |
| Starting points | 2 | Every player starts with these. |
| Points per rank-up | 3 | Recruit to Regular, Veteran and Night: 3 rank-ups in all. |
| Points per Season Pass level | 1 | Lifetime Pass levels, across every season. |
| Points cap | 150 | The most points anyone can hold: under a third of the tree, so choices matter. |
| Try it: player's rank (1 to 4) | 2 | 1 Recruit, 2 Regular, 3 Veteran, 4 Night. |
| Try it: lifetime Pass levels | 60 | For example two full seasons. |
| Points this player has | 65 | Starting + rank-ups + Pass levels, never above the cap. |
| Nodes in the tree (excluding Station Core) | 498 |  |
| Share of the tree this player can take | 0.13052208835341367 |  |
| Points to fill the whole tree | 498 |  |
## Sheet: Summary
| region | small | notable | keystone | bridge | all nodes | effects that exist | effects needing work |
| --- | --- | --- | --- | --- | --- | --- | --- |
| credits | 62 | 11 | 2 | 6 | 81 | 72 | 9 |
| pass | 62 | 11 | 2 | 6 | 81 | 72 | 9 |
| sessions | 62 | 11 | 2 | 6 | 81 | 0 | 81 |
| loot | 62 | 11 | 2 | 6 | 81 | 0 | 81 |
| quests | 62 | 11 | 2 | 6 | 81 | 0 | 81 |
| background | 62 | 11 | 2 | 6 | 81 | 69 | 12 |
| ring | 0 | 0 | 0 | 0 | 12 | 12 | 0 |
| Total | 372 | 66 | 12 | 36 | 498 | 225 | 273 |
| What earns each node |  |  |  |  |  |  |  |
| earned by | nodes | share | needs you in the app? |  |  |  |  |
| Play time | 231 | 0.463855421686747 | No |  |  |  |  |
| Sessions | 81 | 0.16265060240963855 | No |  |  |  |  |
| Background | 7 | 0.014056224899598393 | No |  |  |  |  |
| Always | 88 | 0.17670682730923695 | No |  |  |  |  |
| Quests | 76 | 0.15261044176706828 | Yes: claim a quest |  |  |  |  |
| Draws | 3 | 0.006024096385542169 | Yes: make a draw |  |  |  |  |
| Rule change | 12 | 0.024096385542168676 | No (keystone) |  |  |  |  |
| Paid out while you game | 419 | 0.8413654618473896 | Play time, Sessions, Background, Always and keystones. |  |  |  |  |
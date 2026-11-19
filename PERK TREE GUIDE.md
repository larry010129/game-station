# Perk tree and player levels: data reference

A plain guide to what is in the tree and why, so nobody has to re-read the code. Numbers are as of 2026-11-18.
Where a number comes from is given under each section, so you know which file to change.

---

## 1. The idea in one minute

- You level up by **leaving the app running**. Levels give **Perk Points**.
- Points are spent on a big branching **tree** of 8 **classes** around **Station Core**.
- Each node gives a small bonus (Income, Season Pass XP, Tickets, fragments, streaks). Some nodes are **trade-offs**: a stronger gain and a smaller loss.
- You can only fully take **2 classes** to their top bands. Every class can be taken up to band III.
- Level **250** pays for everything a player can take. Max level is **300**.

---

## 2. Where everything lives

| What | File | Edit it? |
| --- | --- | --- |
| What each node does | `design/perk-tree-sample/tree_content.py` | Yes |
| Level and XP numbers | `design/perk-tree-sample/player-level-xp.html` (top of its script) | Yes |
| Build script | `design/perk-tree-sample/build.py` | Rarely |
| Design simulator (click the tree) | `design/perk-tree-sample/perk-tree-sample.html` | No, generated |
| App tree data | `app/src/content/perkTreeData.ts` | No, generated |
| App level table | `app/src/content/playerLevelData.ts` | No, generated |
| Level logic | `app/src/state/playerLevel.ts` | Yes |
| Perk logic | `app/src/state/perks.ts` | Yes |

After changing content, run `python build.py` in `design/perk-tree-sample`. It rewrites the generated files.

---

## 3. The tree

| Thing | Count |
| --- | --- |
| Classes | 8 |
| Nodes | 2,953 (counted in `app/src/content/perkTreeData.ts`, 2026-11-18) |
| Total points to fill the tree | 2,992 |
| Points a player can ever take | 2,131 |

### Node types

| Type | Shape | Cost | What it is |
| --- | --- | --- | --- |
| Small circle | small | 1 | Plain bonus, never has a downside |
| Notable | large circle | 2 | Stronger bonus; about a third are trade-offs |
| Keystone | large, ringed | 3 | Changes a rule, always with a catch |
| Bridge | small | 1 | Links classes further out |
| Season Key | diamond | 0 | Opens Season Pass levels 46 to 60, plus a small extra |
| Special | diamond | 0 | Class feature. Hold at most **8** squares |
| Pentagon | pentagon | 0 | Unique class node. Hold at most **3** |

### Bands

Each class has **five bands**, named I to V (the tier word is on the node name: "Grinder III").

- **Bands I to III** are open in every class, reached over the bridges.
- **Bands IV and V** open only in the **2 classes you start in**.
- Each band ends in a **grand keystone**. The V keystone is the "V".

### Starting classes

Your first **2 paths** out of Station Core become your starting classes. After that the core's other links close. Reset is free once a calendar month and also frees the starting classes.

---

## 4. The 8 classes

| Class | Focus | Colour | Plain bonus (small circles) | Season Key |
| --- | --- | --- | --- | --- |
| Tycoon | Payroll | orange | +3% Income from play | +1 Income per counted hour |
| Climber | Season Pass | light blue | +3% Season Pass XP | +5% Season Pass XP |
| Sentinel | Sessions | green | +2 Income per session over 30 min | +3% Income from play |
| Devotee | Streaks | red | +2% Income while streak is 3+ days | +500 weekly Pass XP cap |
| Prospector | Loot | purple | +3% fragments from play | +5% fragments from play |
| Mercenary | Quests | pink | +3% Income from quests | +5% Income from quests |
| Phantom | Background | white | +1% All Income | +2% All Income |
| Gearhead | Rig | teal | +2% Income while PC within safe limits | +3% Income while PC within safe limits |

### Keystones (rule changes)

| Class | Inner keystone | Grand keystone (outer) |
| --- | --- | --- |
| Tycoon | Marathon: 3 h+ sessions pay double, under 1 h pay none | Grinder: +30% Income from play, quests pay no Income |
| Climber | Endless Season: bonus levels never stop, Pass XP before level 30 is 20% lower | All on Free: Free row pays double, quests give no Pass XP |
| Sentinel | Ritual: first session each day pays double, later ones half | Endurance: 2 h+ sessions give double Pass XP, under 30 min give none |
| Devotee | All or Nothing: streak rewards doubled, freezes stop working | Iron Streak: +2% All Income per streak day (max +30%), a miss resets it |
| Prospector | Scavenger: double fragments, Income from play 25% lower | Gambler: 5% Special Ticket per hour, no Regular Tickets from play |
| Mercenary | Specialist: daily quests pay double, weekly pay nothing | Contractor: quests +50% Income, play Income halved |
| Phantom | Silent Running: +20% All Income, no alerts or toasts while playing | Monk Mode: +40% All Income, News, Draw and Themes hidden in game mode |
| Gearhead | Overclock: +25% Income from play, nothing paid while GPU is over 80°C | Redline: +40% Income from play, an overheat alert ends the bonus for the day |

### Specials and pentagons (all free, slot-limited)

| Class | Specials (11) | Pentagons (5) |
| --- | --- | --- |
| Tycoon | Payslip, Savings Vault, Overtime Clock, Bonus Cheque, Tip Jar, Pension Plan, Payday Friday, Shift Bell, Raise Review, Hazard Pay, Ledger | Company Man, Peak Hour, Union Card, Profit Share, Workaholic |
| Climber | Season Archive, Free Row Plus, Fast Track, XP Bank, Encore Pack, Retro Row, Head Start, Midseason Boost, Free Row Ticket, Catch the Wave, Curtain Call | Prodigy, Overachiever, Patron's Gift, Infinite Season, Graduate |
| Sentinel | Watch Post, Last Call, First Light, Marathon Medal, Double Header, Session Log, Warm-up Lap, Second Wind, Night Shift, Weekday Regular, Long Haul Medal | Iron Seat, Speedrunner, Ritualist, Midnight Crown, Marathoner |
| Devotee | Streak Shield, Streak Banner, Comeback Kid, Weekly Ritual, Streak Bank, Eternal Flame, Kindling, Ember Guard, Bonfire, Torchbearer, Rekindle | Unbroken, Phoenix, Devotion, Weekly Flame, Everflame |
| Prospector | Treasure Map, Salvage Kit, Lucky Charm, Fragment Press, Gold Rush, Collector's Eye, Pity Timer, Scrap Heap, Mystery Box, Ticket Stub, Showcase Polish | Lucky Star, Hoarder, Treasure Hunter, High Roller, Curator |
| Mercenary | Bounty Board, Contract Renewal, Weekly Bounty, Clean Sweep, Month's End, Hall of Fame, Field Notes, Reroll Token, Quest Chain, Daily Double, Season Board | Bounty Hunter, Taskmaster, Autopilot, Contractor, Completionist |
| Phantom | Night Watch, Ghost Mode, Morning Report, Low Profile, Auto-Pilot, Uptime Medal, Quiet Hours, Tray Keeper, Dark Room, Startup Ritual, Long Uptime | Night Watchman, Silent Partner, Ghost Protocol, Always On, Caretaker |
| Gearhead | Benchmark, Thermal Badge, Overheat Guard, Ping Master, Stable Build, Rig Report, Fan Curve, Frame Pacer, Plugged In, Driver Day, Clean Bench | Overclocker, Zero Ping, Ice Cold, Tuned Engine, Battle Station |

> Only some effects work in the app today (see section 8). The rest can be taken but say "Not active yet".

---

## 5. Player levels

Source of truth: `player-level-xp.html`. Run `python build.py` to push it into the app.

| Rule | Value |
| --- | --- |
| What earns XP | App running time (open or minimised). No daily cap |
| Sleep | A gap over 3 minutes between ticks counts only 3 minutes |
| Max level | 300 |
| XP needed per level | MapleStory level table (Korean server, not confirmed for TMS), **halved from level 200** |
| Earn rate | MapleStory hunting rates by level; below 200 it is 10億 XP per hour (an assumption) |
| Earn floor | At least **0.5%** of a level per 10 minutes (no level takes over 33.3 h) |
| Earn ceiling | At most **4.2%** of a level per 10 minutes (no level under about 4 h) |
| Fit | Earn is scaled so the reference player (56 h a week) pays everything reachable in **11.2 months** |
| Season length | 90 days |

### Perk Points by level

| Levels | Points per level | Running total |
| --- | --- | --- |
| Start | n/a | 4 |
| 2 to 50 | 12 | 592 |
| 51 to 100 | 10 | 1,092 |
| 101 to 150 | 9 | 1,542 |
| 151 to 200 | 7 | 1,892 |
| 201 to 240 | 5 | 2,092 |
| 241 to 250 | 4 | **2,132** |
| 251 to 300 | 0 | 2,132 |

Level **250** is the first level that covers the 2,131 points a player can take (all classes to band III, plus bands IV and V in 2 classes).

### How long it takes

| Level | 56 h a week | 31 h a week |
| --- | --- | --- |
| 100 | 49 days (0.55 seasons) | 89 days (about 1 season) |
| 200 | 171 days | 309 days |
| 250 | 11.2 months (3.8 seasons) | 20.2 months (6.8 seasons) |
| 300 | 18 months | 2.7 years |

---

## 6. Trade-off nodes

About **96 of 280 notables** have a downside. It is stored as the node's second effect with a **negative** value.

| Rule | Detail |
| --- | --- |
| Where | Notables only. Small circles, squares and pentagons stay plus only |
| Gain | About 35% stronger than a plain notable |
| Loss | About a quarter of the gain, on a **different theme** |
| Cost | Unchanged. The loss is the price |
| Bands | The loss grows with the band (x1, x1.5, x2, x2.5, x3) |
| Floor | Totals never drop below base. The app clamps them |
| App rule | A downside only counts while its gain is active in the app |

Example: *Night Owl*: "+20% Income from play after 22:00, but −5% Income from play before 09:00".

Pairs per class are in `TRADEOFFS` in `tree_content.py`.

---

## 7. How the simulator shows totals

The "What you took" box has two sections.

**Active boosts (always on, added up).** One header per theme with the net percent and the net flat total, for example `Income +397% +35`. A negative total shows in **red**.

**Conditional boosts (only while a condition holds).** Not added into the totals. Headers: Income, Pass XP, Tickets, Fragments, Streaks. Each row is the condition and a value that names what it gives:

```
Income
  sessions over 2 hours            +200% Income
  per session over 30 minutes    +1,155 Income
Tickets
  two sessions in a day         +1 Regular Ticket
```

On/off rules (keystones, pentagons) are not listed as totals.

---

## 8. What works in the app today

Live now: Income per counted hour, Income from play, Income from quests, All Income, Season Pass XP, weekly Pass XP cap, Season Key (opens Pass levels 46 to 60).

Not live yet: nearly every conditional effect, tickets, fragments, streak items, the 48 Specials and the 40 Pentagons.

Player levels are live: the clock, the level table, the Perk Points and a level-up celebration. The level and XP bar has no final design yet. Today it is a text line on the Perks tab.

---

## 9. Known gaps

- The XP table is Korean server data. A TMS table was not found.
- The old "one class in a month" pacing rule is superseded, but `PERK_TREE.pacing` still carries it.
- The workbook (`Perk Tree Sample.xlsx`) does not hold trade-offs or level bands; they are applied by `build.py`.
- A locked or idle PC still counts as running time. The plan leaves this open.
- Testers moved from Pass-based points to level-based points, so their newest nodes may pause.

"""
PROPOSED redesign of bands IV, V and VI (not in the tree yet). Shown as a preview on perk-classes.html so it can be checked first.

- Bands IV and V: every notable is unique to its class (own name, no tier suffix, a stat that appears nowhere in bands I to III).
  Only a class's owner can reach them. About a third carry a downside, written ", −N% what" like the live trade-off nodes.
- Band VI: EVERY class has one, past its band V grand keystone. It is three branches (each: 2 small, 1 mid notable, 2 small)
  that all end on one band VI keystone. A player can take only ONE branch, and band VI in only ONE class: the first node taken
  closes the other branches and the other classes' band VI; the monthly reset frees the choice. The three notables below are the
  mid nodes of the three branches, in order, then each branch's own keystone, in the same order (every branch ends on its
  own keystone, with its own rule). Every mid node MUST carry a downside (", −N% what") and a
  passive (its fourth field): (name, effect, kind, passive).

Every class is written here. The numbers are starting points, to be tuned like the rest.
"""

PROPOSED = {
    "payroll": {
        "IV": [
            ("Corner Office", "+40% Income from your longest session each day"),
            ("Dividend Day", "Every 10th session pays +80 Income"),
            ("Profit Margin", "+25% Income from play while you hold over 500 Income, −6% Season Pass XP"),
            ("Quarterly Report", "On the 1st and 15th, you get 10% of the Income you earned from play in the past 2 weeks"),
            ("Leverage", "Income from play counts double for the first 2 hours each day, −10% Income from quests"),
            ("Golden Parachute", "A broken play streak pays +100 Income instead of nothing"),
        ],
        "V": [
            ("Board Seat", "+60% Income from sessions longer than 3 hours"),
            ("Hostile Takeover", "Your best session each week pays triple Income, −8% Fragments earned from play"),
            ("Compound Interest", "Unspent Income grows 1% a day, up to 30%"),
            ("Blue Chip", "+30% Income from play on every day of a play streak of 7 or more"),
            ("Executive Bonus", "Every 25th counted hour pays +500 Income"),
            ("Empire", "+15% to all Income for each class band you finished (up to 4), −10% Season Pass XP"),
        ],
        "VI": [
            ("Chairman", "Income from play counts double on the first day of each month, −8% Season Pass XP", "notable", "+2% to all Income"),
            ("Golden Share", "+50% Income from play, −12% Season Pass XP", "notable", "+3 Income for every counted hour of play"),
            ("Dynasty", "Each class band you finished adds +5% to all Income, −10% Fragments earned from play", "notable", "+25 Income for every 10 hours of play"),
            ("Boardroom", "The first session each day pays triple Income, but sessions after the third each day pay none", "keystone", ""),
            ("Monopoly", "Every counted hour pays +10 Income, but sessions under 30 minutes pay nothing", "keystone", ""),
            ("Old Money", "Unspent Income over 1,000 grows 3% a week, but Income from quests is halved", "keystone", ""),
        ],
    },
    "pass": {
        "IV": [
            ("Early Bird", "+30% Season Pass XP in the first week of a season"),
            ("Free Lunch", "Every 3rd Free-row level pays double"),
            ("Backstage Pass", "Reaching Pass level 30 gives a Special Ticket each season, −8% Income from play"),
            ("Season Ticket", "+1 Regular Ticket at Pass level 15 and again at level 45"),
            ("Catch-Up Mode", "Pass XP you miss while the app is closed is paid back at 25%"),
            ("Fast Lane", "Pass levels 1 to 10 cost half the XP, −10% Fragments earned from play"),
        ],
        "V": [
            ("Premiere", "+50% Season Pass XP on the first day of each week"),
            ("Encore Season", "A finished season carries 20% of its Pass XP into the next one"),
            ("Gold Ticket", "Reaching Pass level 60 gives 3 Special Tickets"),
            ("Standing Ovation", "+3% Season Pass XP for each Pass level above 45 (up to +45%), −8% Income from play"),
            ("Sponsor", "Free-row Income rewards pay double"),
            ("Hall of Fame", "Each finished season adds +2% Season Pass XP for good (up to +20%)"),
        ],
        "VI": [
            ("Headliner", "+75% Season Pass XP, −15% Income from quests", "notable", "+5% Income from play"),
            ("Eternal Season", "Your Pass level carries into the next season instead of resetting, −10% Income from play", "notable", "Start each season with 500 Season Pass XP"),
            ("Grand Tour", "Every 10th Pass level also gives a Special fragment, −8% Income from quests", "notable", "+1 Regular Ticket at Pass level 30"),
            ("Encore Night", "Season Pass XP from play doubles in the last week of each season, but the first week gives none", "keystone", ""),
            ("Infinity Pass", "Pass levels keep paying past level 60 forever, but the weekly Pass XP cap is halved", "keystone", ""),
            ("Grand Finale", "Reaching Pass level 60 pays every Free-row reward of the season again, but the weekly Pass XP cap is cut by a quarter", "keystone", ""),
        ],
    },
    "sessions": {
        "IV": [
            ("Opening Bell", "The first session each day pays triple Income"),
            ("Double Header", "A second session of 2 hours or more gives a Regular Ticket"),
            ("Long Shift", "+30% Season Pass XP from sessions over 2 hours, −6% Income from quests"),
            ("Roll Call", "+20 Income for each different day you played this week"),
            ("Closing Bell", "The last session each day pays +50 Income"),
            ("Overtime Rule", "Time past 4 hours in a session counts 1.5 times, −8% Fragments earned from play"),
        ],
        "V": [
            ("Iron Seat", "+25% Income from play on days with 3 or more sessions"),
            ("Marathon Medal", "A 6-hour session gives a Special fragment and +200 Income"),
            ("Full Calendar", "Playing on all 7 days of a week gives 2 Regular Tickets"),
            ("Session Chain", "Each session on the same day as the last adds +5% Income to the next (up to +50%), −10% Season Pass XP"),
            ("Prime Time", "+40% Income from sessions that start between 19:00 and 23:00"),
            ("Tournament", "Sessions over 90 minutes have a 10% chance to give a Special Ticket"),
        ],
        "VI": [
            ("Commander", "Every session pays +30 Income, −10% Season Pass XP", "notable", "+2% Income from play"),
            ("Standing Order", "+50% Income from sessions over 1 hour, −12% Season Pass XP", "notable", "+10 Income for your first session each day"),
            ("Full Month", "Playing on every day of a month gives a 5-star skin pick, −8% Income from quests", "notable", "+1 Regular Ticket for a full week of play"),
            ("Front Line", "Every session pays +50 Income, but time past the third hour of a session pays nothing", "keystone", ""),
            ("Sentinel's Oath", "Sessions of 1 hour or more pay double Income, but sessions under 30 minutes pay nothing", "keystone", ""),
            ("Long Watch", "Each day of the month you play adds +2% Income from play for that month, but a missed day resets it", "keystone", ""),
        ],
    },
    "streaks": {
        "IV": [
            ("Daily Rite", "+3% Income from play for each day of your streak (up to +30%)"),
            ("Second Breath", "Once a month, a streak that restarts counts as day 7"),
            ("Sabbath", "Your play streak does not break on Sundays"),
            ("Milestone Ticket", "A 21-day streak gives a Regular Ticket"),
            ("Ironclad", "+1 streak freeze each month, −8% Fragments earned from play"),
            ("Slow Burn", "Each streak day after day 14 pays +10 Income"),
        ],
        "V": [
            ("Unbroken Chain", "A 50-day streak gives a Special Ticket"),
            ("Hot Hand", "+2% Season Pass XP for each streak day (up to +60%), −8% Income from quests"),
            ("Ritual of Return", "After a break of 3 or more days, your next 3 days count as a 5-day streak"),
            ("Flame Keeper", "Each unused streak freeze pays 10 Income on the 1st of the month"),
            ("Centennial", "A 100-day streak gives a 5-star skin pick"),
            ("Pilgrimage", "Every 30 days of streak gives a Special fragment"),
        ],
        "VI": [
            ("Eternal Flame", "Your streak cannot break while you hold a streak freeze, −10% Income from play", "notable", "+1 streak freeze each month"),
            ("Devotion", "+100% Income from play from streak day 30 on, −15% Season Pass XP", "notable", "+5% Season Pass XP while your streak is 7 days or more"),
            ("Vow", "+2 missed days forgiven each month, −8% Fragments earned from play", "notable", "+15 Income for each streak freeze you hold"),
            ("Undying", "A broken streak restarts at 80% of its length instead of half, but streak freezes can no longer be stored", "keystone", ""),
            ("Zealot", "Income from play doubles from streak day 60 on, but a broken streak also loses your streak freezes", "keystone", ""),
            ("Oathkeeper", "Missed days never break your streak, but each missed day costs 50 Income", "keystone", ""),
        ],
    },
    "loot": {
        "IV": [
            ("Magpie", "+1 Regular fragment for every 3 repeats"),
            ("Lucky Tenth", "Every 10th draw gives a Regular fragment"),
            ("Appraisal", "+25% fragments from repeats"),
            ("Dig Site", "+2 Regular fragments for every 5 counted hours of play, −6% Income from play"),
            ("Finder's Fee", "Once a week, a Ticket draw counts as two draws"),
            ("Pawn Shop", "Spare fragments can be sold for 5 Income each, −8% Season Pass XP"),
        ],
        "V": [
            ("Vault Hunter", "+1 Special fragment for every 10 counted hours of play"),
            ("Rare Find", "5-star repeats give 4 Special fragments"),
            ("Treasure Map", "Every 100 counted hours gives an item of your choice"),
            ("Hoard", "+1% fragments earned from play for every 10 fragments you hold (up to +40%), −8% Income from play"),
            ("Free Spin", "Each draw has a 5% chance to cost nothing"),
            ("Museum", "Each new card skin gives 3 Regular fragments"),
        ],
        "VI": [
            ("Dragon's Hoard", "+50% fragments earned from play, −12% Income from play", "notable", "+1 Regular fragment for every 20 counted hours of play"),
            ("Master Collector", "Every card skin you own adds +0.5% to all Income (up to +25%), −10% Income from play", "notable", "+1 Regular fragment for every new card skin"),
            ("Cartographer", "Item drops from play are doubled, −8% Season Pass XP", "notable", "+1 random item for every 25 counted hours of play"),
            ("Midas Touch", "Every fragment you earn is doubled, but you earn no Tickets from play", "keystone", ""),
            ("Curator's Eye", "Every new card skin gives a Special fragment, but repeats give no fragments", "keystone", ""),
            ("Treasure Map", "Every 50 counted hours gives an item of your choice, but random item drops stop", "keystone", ""),
        ],
    },
    "quests": {
        "IV": [
            ("Contract Killer", "+30% Income from weekly quests"),
            ("Bounty Board", "Claiming 3 quests in a day pays +40 Income"),
            ("Overbooked", "+1 daily quest slot, −6% Season Pass XP"),
            ("Paycheck", "Claiming a monthly quest also pays 100 Income"),
            ("Fixer", "Once a week, a quest you finish early pays double"),
            ("Black Ledger", "Quests give 20% of their Income again as Season Pass XP, −8% Fragments earned from play"),
        ],
        "V": [
            ("Taskmaster's Cut", "+25% Income from all quests, −8% Income from play"),
            ("Hit List", "Finishing every daily quest on 5 days of a week gives a Regular Ticket"),
            ("Retainer", "A week with 10 or more claimed quests pays 200 Income"),
            ("Double Duty", "One quest each day pays double"),
            ("Black Market", "Unclaimed quests are kept for one more day"),
            ("Syndicate", "+1 weekly quest slot, −10% Fragments earned from play"),
        ],
        "VI": [
            ("Warlord", "+60% Income from quests, −15% Income from play", "notable", "+5% Income from daily quests"),
            ("Open Contract", "Every quest pays 10 Income more, −10% Fragments earned from play", "notable", "+20 Season Pass XP for each claimed quest"),
            ("Standing Army", "+2 daily quest slots, −12% Income from play", "notable", "+10% Income from weekly quests"),
            ("Kingmaker", "Each claimed quest has a 10% chance to give a Regular Ticket, but quests no longer give Season Pass XP", "keystone", ""),
            ("Free Agent", "Quests refresh twice as often, but each pays half its Income", "keystone", ""),
            ("Legion", "+3 daily quest slots, but weekly quests are gone", "keystone", ""),
        ],
    },
    "background": {
        "IV": [
            ("Night Shift", "+30 Income for every night the app stays open past 03:00"),
            ("Dark Room", "+20% Income from play while a dark theme is on"),
            ("Low Light", "+4 Income for every hour the app runs in the background"),
            ("Lurker", "+25% Income while the app is minimised in play, −6% Season Pass XP"),
            ("Uptime Club", "+1 Regular Ticket for every 3 days the app stays open without a restart"),
            ("Auto Pilot", "Game mode switches on and off by itself"),
        ],
        "V": [
            ("Ghost Mode", "+50% Income while game mode is on and the app is minimised, −8% Income from quests"),
            ("Long Watch", "Every 24 hours the app runs pays 100 Income"),
            ("Tray Dweller", "+1 Regular fragment for every 10 hours the app runs in the background"),
            ("Insomnia", "Nights the app stays open pay 25% more"),
            ("Boot Bonus", "The app starting with Windows pays +10 Income each day"),
            ("Stakeout", "7 days open without a restart gives a Special Ticket"),
        ],
        "VI": [
            ("Eternal Watch", "+75% Income while the app runs in the background, −15% Season Pass XP", "notable", "+5 Income for every hour the app runs in the background"),
            ("Night Collector", "Every night the app stays open gives a Regular fragment, −10% Income from quests", "notable", "+10% Income while game mode is on"),
            ("Deep Cover", "A day with no game still pays half of your average day's Income, −8% Season Pass XP", "notable", "+3% to all Income while the app is minimised"),
            ("Phantom Menace", "Idle hours pay +8 Income each, but active play pays 20% less", "keystone", ""),
            ("Nightwalker", "Each night the app stays open pays a Regular fragment and 20 Income, but daytime idle hours pay nothing", "keystone", ""),
            ("Undercover", "A day with no game pays your average day's Income in full, but game days pay 10% less", "keystone", ""),
        ],
    },
    "rig": {
        "IV": [
            ("Thermal Paste", "+30% Income from play while the GPU stays under 65°C"),
            ("Overclocker's Pride", "+15 Income for each session with no system alert"),
            ("Fibre Dream", "+25% Season Pass XP while ping stays under 30 ms, −6% Income from quests"),
            ("Clean Bench", "A week with no system alert pays 150 Income"),
            ("Cable Management", "+1 Regular Ticket for every 5 alert-free sessions"),
            ("Fan Curve", "+10% Income from play while fans stay under 60% speed, −6% Fragments earned from play"),
        ],
        "V": [
            ("Liquid Cooled", "+50% Income from play while the GPU stays under 55°C, −8% Season Pass XP"),
            ("Perfect Frame", "+40% Income from play while frame time stays within 2 ms of steady"),
            ("Zero Jitter", "+30% Income while jitter stays under 2 ms"),
            ("Stress Test", "A 4-hour session with no alert gives a Special fragment"),
            ("Efficient Rig", "+25% Income from play while power draw stays under 250 W"),
            ("Benchmark Run", "Each new personal-best frame rate reading pays 100 Income, −8% Income from quests"),
        ],
        "VI": [
            ("Overlord", "+80% Income from play while every reading is healthy, −15% Income from quests", "notable", "+5% Income from play while the GPU stays under 70°C"),
            ("Cold Boot Hero", "Each session that starts with the GPU under 40°C pays +100 Income, −10% Fragments earned from play", "notable", "+1 Regular Ticket for every 10 hours of play without an alert"),
            ("Silicon Lottery", "+5% to all Income for each week without an alert (up to +25%), −8% Income from quests", "notable", "+10 Income for each session with no system alert"),
            ("Perfect Health", "+60% Income from play while every reading is healthy, but a session with an alert pays no Income", "keystone", ""),
            ("Redline", "+100% Income from play while the GPU is over 80°C, but sessions with an alert pay nothing", "keystone", ""),
            ("Silicon Crown", "Each week without an alert adds +5% to all Income for good (up to +30%), but an alert resets it", "keystone", ""),
        ],
    },
}


# Band VI small nodes: each path's own name and stat, leading into that path's mid and keystone (a, b, c in VI order).
# (name, stat key from tree_content.STAT_INFO, value per node)
BAND_SIX_SMALL = {
    "payroll": [("Board Seat", "firstSessionIncome", 5), ("Share Ledger", "creditsPerHour", 1), ("Heirloom", "vaultInterestPct", 0.5)],
    "pass": [("Spotlight", "passXpPct", 3), ("Evergreen", "bonusLevelIncome", 5), ("Tour Stop", "freeRowIncomePct", 4)],
    "sessions": [("Muster", "sessionCredits", 4), ("Long Post", "longSessionCreditPct", 3), ("Roll Call", "creditsPerPlayDay", 3)],
    "streaks": [("Ember", "streakDayCredits", 2), ("Fervour", "streakActiveCreditPct", 3), ("Pledge", "perfectWeekCredits", 8)],
    "loot": [("Hoard Coin", "fragmentPlayPct", 3), ("Display Case", "creditPctPer3Skins", 0.2), ("Waymark", "creditsPer5Hours", 3)],
    "quests": [("War Chest", "questCreditPct", 3), ("Bounty Board", "dailyQuestCreditPct", 4), ("Recruit", "weeklyQuestCreditPct", 4)],
    "background": [("Idle Hum", "idleCredits", 1), ("Night Shift", "overnightUptimeCredits", 3), ("Low Profile", "minimisedCreditPct", 3)],
    "rig": [("Clean Bill", "rigCreditPct", 3), ("Cold Start", "coolStartCredits", 4), ("Quiet Week", "silentRigCreditPct", 3)],
}


# Band VI first nodes: every path opens on a notable with a passive (a, b, c in VI order). (name, effect, passive)
BAND_SIX_FIRST = {
    "payroll": [("Board Invitation", "+15 Income for the first session each day", "+1% to all Income"),
                ("First Share", "+2 Income per counted hour", "+2% Income from play"),
                ("Family Vault", "+1% weekly growth on unspent Income", "+10 Income each Monday")],
    "pass": [("Opening Act", "+10% Season Pass XP", "+50 Pass XP at the start of each season"),
             ("Evergreen Ticket", "+10 Income per bonus level past 60", "+2% Season Pass XP"),
             ("Tour Pass", "+10% Income from the Free row", "+1 Regular fragment at Free-row level 30")],
    "sessions": [("Rally Point", "+10 Income per session over 30 minutes", "+2% Income from play"),
                 ("Night Post", "+8% Income from sessions over 1 hour", "+5 Income for your first session each day"),
                 ("Muster Roll", "+8 Income per day you play", "+2% Season Pass XP")],
    "streaks": [("Kindling", "+5 Income per day in a row you play", "+1 streak freeze each season"),
                ("Zeal", "+8% Income while your play streak is 3+ days", "+2% Season Pass XP"),
                ("Sworn Word", "+20 Income for 7 days of play in a row", "+1 missed day forgiven each season")],
    "loot": [("Gilded Claw", "+8% Fragments earned from play", "+1 Regular fragment for every 30 counted hours"),
             ("Glass Cabinet", "+0.5% to all Income per 3 card skins owned", "+1 Regular fragment for every 5 new card skins"),
             ("Compass", "+8 Income per 5 counted hours", "+1 random item for every 50 counted hours")],
    "quests": [("War Banner", "+8% Income from quests", "+10 Pass XP per claimed quest"),
               ("Notice Board", "+10% Income from daily quests", "+5 Income for every daily quest in a day"),
               ("Recruiting Office", "+10% Income from weekly quests", "+1 weekly quest swap"),],
    "background": [("Low Hum", "+3 Income per hour the app runs in the background", "+2% Income while game mode is on"),
                   ("Night Light", "+8 Income per night the app stays open", "+1 Regular fragment for every 10 nights left on"),
                   ("Shadow", "+8% Income while the app is minimised in play", "+2% Income from play")],
    "rig": [("Health Check", "+8% Income while your PC runs within safe limits", "+5 Income for each session with no alert"),
            ("Ice Start", "+10 Income per session started with a cool GPU", "+2% Income while the GPU runs cool"),
            ("Clean Log", "+8% Income while no system alert fires", "+1 Regular Ticket for a month without an alert")],
}

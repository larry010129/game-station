"""
What every node in the perk tree does. Kept apart from build.py so the content can be read and changed on its own.

Design rule: Command Station mostly sits in the background while you game. So the tree rewards gaming time, not
clicking around the app. Nearly every effect is earned by one of:
  Play time   - counted minutes of play (the same minutes that earn Income today)
  Sessions    - finishing a game session, or the days you play
  Background  - the app simply running beside the game (game mode, the PC's readings)
  Always      - a flat bonus that needs nothing at all
A few effects still need you to act in the app (Quests: claiming a quest; Draws: making a draw). They are kept to a
minority on purpose. Keystones change a rule and are tagged "Rule change".
"""

# stat key -> (label in the totals panel, unit: "%" / "" / "×", earned by)
STAT_INFO = {
    # The four newer Special squares of each class.
    "overtimeHourIncome": ("Income per counted hour past 3 a day", "", "Play time"),
    "chequePer1000Income": ("Bonus Income per 1,000 from play", "", "Play time"),
    "tipJarPct": ("Chance of a 25 Income tip per long session", "%", "Sessions"),
    "pensionPct": ("Spent Income paid back each Monday", "%", "Always"),
    "fastTrackLevels": ("Pass levels at half XP each season", "", "Play time"),
    "xpBankCap": ("Over-cap Pass XP banked for next week", "", "Play time"),
    "bonusLevelFragment": ("Regular fragments per bonus level past 60", "", "Play time"),
    "retroRowClaims": ("Missed Free-row rewards claimable", "", "Always"),
    "firstSessionIncome": ("Income for the first session each day", "", "Sessions"),
    "marathonSpecialFragment": ("Special fragment per 4-hour session", "", "Sessions"),
    "doubleHeaderTicket": ("Regular Ticket for two sessions in a day", "", "Sessions"),
    "tenthSessionIncome": ("Income every 10th session", "", "Sessions"),
    "comebackDoubleDays": ("Days counted double after a broken streak", "", "Sessions"),
    "fullWeekTicket": ("Regular Ticket for a full week of play", "", "Sessions"),
    "streak10Income": ("Income per 10 streak days", "", "Sessions"),
    "streak60SkinPick": ("5-star skin pick at a 60-day streak", "×", "Sessions"),
    "luckyFirstDraw": ("First draw each week above the lowest rarity", "×", "Draws"),
    "fragmentPressWeekly": ("Fragment press uses a week", "", "Draws"),
    "specialTicketPer50h": ("Special Tickets per 50 counted hours", "", "Play time"),
    "collectorFragmentDaily": ("Daily fragments per 5 skins owned", "", "Always"),
    "extraWeeklyQuest": ("Extra weekly quest slots", "", "Quests"),
    "allDailiesIncome": ("Income for every daily quest in a day", "", "Quests"),
    "monthlyQuestTicket": ("Regular Ticket per monthly quest", "", "Quests"),
    "quest25SpecialFragment": ("Special fragment per 25 quests", "", "Quests"),
    "morningReportFragment": ("Regular fragment after a night left on", "", "Background"),
    "gameModeStintIncome": ("Income per 2 hours of game mode", "", "Background"),
    "autoGameMode": ("Game mode starts with a watched game", "×", "Background"),
    "uptime30Special": ("Special Ticket for 30 days open", "", "Background"),
    "noOverheatWeekIncome": ("Income for a week with no overheat", "", "Background"),
    "lowPingSessionIncome": ("Income per low-ping session", "", "Background"),
    "stableSessionsTicket": ("Regular Ticket per 10 alert-free sessions", "", "Background"),
    "rigReportFragment": ("Regular fragment per clean rig week", "", "Background"),
    # Special nodes: each unlocks a class feature (drawn as a diamond, like the Season Key).
    "paySlipPct": ("Monday bonus on last week's Income from play", "%", "Play time"),
    "vaultInterestPct": ("Weekly growth on unspent Income", "%", "Always"),
    "seasonArchiveDays": ("Days to claim last season's rewards", "", "Always"),
    "freeRowFragment": ("Regular fragment on every 10th Free-row level", "", "Play time"),
    "longSessionFragment": ("Regular fragment per session over 2 hours", "", "Sessions"),
    "lastCallIncome": ("Income for a session ending after 23:00", "", "Sessions"),
    "streakShieldMonthly": ("Missed days a month that keep your streak", "", "Always"),
    "streak30Special": ("Special Ticket at a 30-day streak", "", "Sessions"),
    "itemChoicePer25h": ("Chosen Regular Pack item per 25 counted hours", "", "Play time"),
    "weeklyDoubleRepeat": ("Double-fragment repeats a week", "", "Draws"),
    "extraDailyQuest": ("Extra daily quest slots", "", "Quests"),
    "dailyQuestSwap": ("Daily quest swaps a day", "", "Quests"),
    "overnightIncome": ("Income per night the app stays open", "", "Background"),
    "ghostGameMode": ("Game mode counts as on while minimised", "×", "Background"),
    "steadyWeekTicket": ("Regular Ticket for a steady-frame session each week", "", "Background"),
    "coolSessionIncome": ("Income per session with the GPU under 70°C", "", "Background"),
    # Income from play
    "playCreditPct": ("Income from play", "%", "Play time"),
    "creditsPerHour": ("Income per counted hour", "", "Play time"),
    "longSessionCreditPct": ("Income from sessions over 1 hour", "%", "Sessions"),
    "longSessionCreditPct2": ("Income from sessions over 2 hours", "%", "Sessions"),
    "nightCreditPct": ("Income from play after 22:00", "%", "Play time"),
    "earlyCreditPct": ("Income from play before 09:00", "%", "Play time"),
    "weekendCreditPct": ("Income from weekend play", "%", "Play time"),
    "creditsPer5Hours": ("Income per 5 counted hours", "", "Play time"),
    "backToBackCreditPct": ("Income from back-to-back sessions", "%", "Sessions"),
    "allCreditPct": ("All Income", "%", "Always"),
    # Season Pass XP from play
    "passXpPct": ("Season Pass XP", "%", "Play time"),
    "passCap": ("Weekly Pass XP cap", "", "Play time"),
    "passStartXp": ("Pass XP at the start of each season", "", "Always"),
    "nightPassXpPct": ("Pass XP from play after 20:00", "%", "Play time"),
    "passOverflowPct": ("Weekly overflow XP carried over", "%", "Play time"),
    "longSessionPassXpPct": ("Pass XP from sessions over 2 hours", "%", "Sessions"),
    "warmupPassXpPct": ("Pass XP in your first hour each day", "%", "Play time"),
    "level60SpecialTicket": ("Special Ticket at Pass level 60", "×", "Play time"),
    # Climber: keeps paying after level 60, and a richer Free row.
    "bonusLevelIncome": ("Income per bonus level past 60", "", "Play time"),
    "bonusLevelTicketPct": ("Chance of a Regular Ticket per bonus level", "%", "Play time"),
    "freeRowIncomePct": ("Income from the Free row", "%", "Play time"),
    "freeRowEvery5Income": ("Income on every 5th Free-row level", "", "Play time"),
    "lateSeasonXpPct": ("Season Pass XP past level 45", "%", "Play time"),
    "milestoneTicket": ("Regular Ticket every 10th Pass level", "", "Play time"),
    "finaleSpecialTickets": ("Extra Special Tickets at Pass level 60", "", "Play time"),
    "passLevelCap": ("Season Pass levels opened past 45", "", "Play time"),
    "catchUpPassXpPct": ("Catch-up Pass XP", "%", "Play time"),
    # Sessions and days played
    "sessionCredits": ("Income per session over 30 minutes", "", "Sessions"),
    "firstGameCredits": ("Income for your first session each day", "", "Sessions"),
    "weekPlayTicket": ("Regular Ticket for playing 5 days in a week", "×", "Sessions"),
    "sessionPassXp": ("Pass XP per session over 45 minutes", "", "Sessions"),
    "comebackCreditPct": ("Comeback Income for an hour", "%", "Sessions"),
    "creditsPerPlayDay": ("Income per day you play", "", "Sessions"),
    "luckySessionTicketPct": ("Chance of a Regular Ticket per long session", "%", "Sessions"),
    "streakGraceMonthly": ("Missed days forgiven each month", "", "Always"),
    "streakFreezePer20h": ("Streak freezes per 20 counted hours", "", "Play time"),
    "perfectWeekCredits": ("Income for 7 days of play in a row", "", "Sessions"),
    "longWeekendTicket": ("Regular Ticket for 4 hours of weekend play", "×", "Sessions"),
    # Loot from play
    "fragmentPlayPct": ("Fragments earned from play", "%", "Play time"),
    "fragmentPer2Hours": ("Regular fragments per 2 counted hours", "", "Play time"),
    "ticketPer5Hours": ("Regular Tickets per 5 counted hours", "", "Play time"),
    "ticketPer8Hours": ("Regular Tickets per 8 counted hours", "", "Play time"),
    "itemPer10Hours": ("Random items per 10 counted hours", "", "Play time"),
    "specialFragmentPer20Hours": ("Special fragments per 20 counted hours", "", "Play time"),
    "jackpotSpecialTicketPct": ("Chance of a Special Ticket per counted hour", "%", "Play time"),
    "fragmentPerRepeat": ("Regular fragments per repeat", "", "Draws"),
    "fragmentPer4Star": ("Regular fragments per 4-star repeat", "", "Draws"),
    "specialFragmentPer5Star": ("Special fragments per 5-star repeat", "", "Draws"),
    # Quests (play quests mostly finish themselves; claiming is the one action)
    "questCreditPct": ("Income from quests", "%", "Quests"),
    "autoClaimPlayQuests": ("Play-time quests claim themselves", "×", "Always"),
    "questPassXp": ("Pass XP per claimed quest", "", "Quests"),
    "creditsPer10Hours": ("Income per 10 counted hours", "", "Play time"),
    "dailyQuestCreditPct": ("Income from daily quests", "%", "Quests"),
    "monthlyQuestCreditPct": ("Income from monthly quests", "%", "Quests"),
    "playQuestCreditPct": ("Income from play-time quests", "%", "Quests"),
    "questCreditPassXp": ("Pass XP per Income from quests", "", "Quests"),
    "weeklyQuestCreditPct": ("Income from weekly quests", "%", "Quests"),
    "allWeekliesTicket": ("Regular Ticket for every weekly quest", "×", "Quests"),
    "hourMilestoneFragment": ("Special fragments per 25 counted hours", "", "Play time"),
    # Background: the app running beside the game
    "streakFreezeMonthly": ("Streak freezes each month", "", "Always"),
    "alwaysOnCreditPct": ("Income once the app has run 2 hours", "%", "Background"),
    "gameModeCreditPct": ("All Income while game mode is on", "%", "Background"),
    "coolPcCreditPct": ("Income while the GPU runs cool", "%", "Background"),
    "lowPingCreditPct": ("Income while ping is low", "%", "Background"),
    "minimisedCreditPct": ("Income while the app is minimised in play", "%", "Background"),
    "steadyFrameCreditPct": ("Income while frame time stays steady", "%", "Background"),
    "creditPctPer3Skins": ("All Income per 3 card skins owned", "%", "Always"),
    "darkThemeCreditPct": ("All Income on a dark theme", "%", "Always"),
    "uptimeCredits": ("Income per 10 hours the app runs", "", "Background"),
    "idleCredits": ("Income per hour the app runs in the background", "", "Background"),
    "overnightUptimeCredits": ("Income per night the app stays open", "", "Background"),
    "weekUptimeTicket": ("Regular Ticket for 5 days running in a week", "×", "Background"),
    # Sessions (replacing what moved to Streaks)
    "encoreCredits": ("Income for a second session the same day", "", "Sessions"),
    "longSessionPassXp": ("Pass XP per session over 2 hours", "", "Sessions"),
    "nightSessionCredits": ("Income per session ending after 22:00", "", "Sessions"),
    # Streaks: days in a row you play
    "streakActiveCreditPct": ("Income while your play streak is 3+ days", "%", "Sessions"),
    "streak7Ticket": ("Regular Ticket at a 7-day play streak", "×", "Sessions"),
    "freezeOnRankUp": ("Streak freezes per rank-up", "", "Play time"),
    "streakPassXpPct": ("Pass XP per day of your play streak", "%", "Sessions"),
    "streakDayCredits": ("Income per day in a row you play", "", "Sessions"),
    "streak30Special": ("Special Ticket at a 30-day play streak", "×", "Sessions"),
    "streakRestartHalf": ("Streak restarts at half after a break", "×", "Always"),
    "streak14Ticket": ("Regular Ticket at a 14-day play streak", "×", "Sessions"),
    # Rig: how your PC behaves while you play
    "rigCreditPct": ("Income while your PC runs within safe limits", "%", "Background"),
    "quietRigCreditPct": ("Income while CPU load stays under 70%", "%", "Background"),
    "acPowerCreditPct": ("Income while on mains power", "%", "Background"),
    "lowPingPassXpPct": ("Pass XP while ping stays under 40 ms", "%", "Background"),
    "coolStartCredits": ("Income per session started with a cool GPU", "", "Background"),
    "gpuHeadroomCreditPct": ("Income while GPU load stays under 90%", "%", "Background"),
    "rigUptimeTicket": ("Regular Ticket per 10 hours without an overheat", "", "Background"),
    "silentRigCreditPct": ("Income while no system alert fires", "%", "Background"),
    "lowJitterCreditPct": ("Income while jitter stays under 5 ms", "%", "Background"),
}

# Effects the app can already apply today (an existing hook); everything else needs building first.
EXISTING_HOOKS = {"playCreditPct", "creditsPerHour", "passXpPct", "passCap", "allCreditPct"}

RING = ("allCreditPct", 1, "+1% to all Income")

# Six Special squares per class, besides its Season Key. Each unlocks a feature of the class rather than adding a few
# percent. Squares cost no points, but a player holds at most a few (Points sheet; the Season Key counts). Each sits on
# its own branch: off the left arm's notable, the right arm's, the middle path's, each cluster's, and an outer wheel's.
SPECIALS = {
    "payroll": [("Payslip", "paySlipPct", 5, "Every Monday, +5% of last week's Income from play"),
                ("Savings Vault", "vaultInterestPct", 2, "Income you leave unspent grows 2% each week (up to 20 Income a week)"),
                ("Overtime Clock", "overtimeHourIncome", 5, "After 3 counted hours in a day, every further counted hour pays +5 Income"),
                ("Bonus Cheque", "chequePer1000Income", 50, "Every 1,000 Income earned from play pays a bonus 50 Income"),
                ("Tip Jar", "tipJarPct", 10, "Each session over 1 hour has a 10% chance to pay a 25 Income tip"),
                ("Pension Plan", "pensionPct", 5, "5% of the Income you spend comes back the following Monday")],
    "pass": [("Season Archive", "seasonArchiveDays", 7, "Last season's unclaimed Pass rewards stay claimable for 7 more days"),
             ("Free Row Plus", "freeRowFragment", 1, "Every 10th level of the Free row also gives a Regular fragment"),
             ("Fast Track", "fastTrackLevels", 5, "The first 5 Season Pass levels each season need half the XP"),
             ("XP Bank", "xpBankCap", 1000, "Season Pass XP over the weekly cap is banked (up to 1,000) and paid in next week"),
             ("Encore Pack", "bonusLevelFragment", 1, "Each bonus level past 60 also gives a Regular fragment"),
             ("Retro Row", "retroRowClaims", 1, "Once a season, claim one Free-row reward you missed last season")],
    "sessions": [("Watch Post", "longSessionFragment", 1, "Every session longer than 2 hours gives a Regular fragment"),
                 ("Last Call", "lastCallIncome", 10, "Ending a session after 23:00 gives +10 Income"),
                 ("First Light", "firstSessionIncome", 10, "Your first session each day pays +10 Income once it passes 30 minutes"),
                 ("Marathon Medal", "marathonSpecialFragment", 1, "A single session over 4 hours gives a Special fragment"),
                 ("Double Header", "doubleHeaderTicket", 1, "Two sessions of 45 minutes or more on the same day give a Regular Ticket"),
                 ("Session Log", "tenthSessionIncome", 30, "Every 10th session over 30 minutes pays 30 Income")],
    "streaks": [("Streak Shield", "streakShieldMonthly", 1, "Once a month, a missed day never breaks your streak"),
                ("Streak Banner", "streak30Special", 1, "Reaching a 30-day streak gives a Special Ticket"),
                ("Comeback Kid", "comebackDoubleDays", 3, "After a broken streak, your next 3 days count double toward the new one"),
                ("Weekly Ritual", "fullWeekTicket", 1, "Playing on all 7 days from Monday to Sunday gives a Regular Ticket"),
                ("Streak Bank", "streak10Income", 20, "Every 10 days of play streak pays 20 Income"),
                ("Eternal Flame", "streak60SkinPick", 1, "A 60-day play streak lets you pick a 5-star card skin")],
    "loot": [("Treasure Map", "itemChoicePer25h", 1, "Every 25 counted hours of play, choose an item from the Regular Pack"),
             ("Salvage Kit", "weeklyDoubleRepeat", 1, "Once a week, a repeat from a draw pays double fragments"),
             ("Lucky Charm", "luckyFirstDraw", 1, "Your first draw each week is never the lowest rarity"),
             ("Fragment Press", "fragmentPressWeekly", 1, "Once a week, turn 10 Regular fragments into 1 Special fragment"),
             ("Gold Rush", "specialTicketPer50h", 1, "Every 50 counted hours of play gives a Special Ticket"),
             ("Collector's Eye", "collectorFragmentDaily", 1, "Each day, +1 Regular fragment for every 5 card skins you own (up to 3)")],
    "quests": [("Bounty Board", "extraDailyQuest", 1, "Adds one extra daily quest slot"),
               ("Contract Renewal", "dailyQuestSwap", 1, "Once a day, swap a daily quest for another"),
               ("Weekly Bounty", "extraWeeklyQuest", 1, "Adds one extra weekly quest slot"),
               ("Clean Sweep", "allDailiesIncome", 15, "Finishing every daily quest in a day pays +15 Income"),
               ("Month's End", "monthlyQuestTicket", 1, "Claiming a monthly quest also gives a Regular Ticket"),
               ("Hall of Fame", "quest25SpecialFragment", 1, "Every 25 quests claimed gives a Special fragment")],
    "background": [("Night Watch", "overnightIncome", 10, "+10 Income for each night the app stays open"),
                   ("Ghost Mode", "ghostGameMode", 1, "Game mode counts as on while the app is minimised during play"),
                   ("Morning Report", "morningReportFragment", 1, "Opening the app after it stayed on overnight gives a Regular fragment"),
                   ("Low Profile", "gameModeStintIncome", 5, "Game mode on for 2 hours straight pays +5 Income"),
                   ("Auto-Pilot", "autoGameMode", 1, "Game mode turns itself on when a watched game starts"),
                   ("Uptime Medal", "uptime30Special", 1, "30 days with the app open gives a Special Ticket")],
    "rig": [("Benchmark", "steadyWeekTicket", 1, "Once a week, a session with steady frame time gives a Regular Ticket"),
            ("Thermal Badge", "coolSessionIncome", 5, "A whole session with the GPU under 70°C gives +5 Income"),
            ("Overheat Guard", "noOverheatWeekIncome", 30, "A whole week with no overheat alert pays 30 Income"),
            ("Ping Master", "lowPingSessionIncome", 5, "A session with ping under 30 ms throughout pays +5 Income"),
            ("Stable Build", "stableSessionsTicket", 1, "10 sessions in a row with no system alert give a Regular Ticket"),
            ("Rig Report", "rigReportFragment", 1, "A weekly PC health report; a clean week also gives a Regular fragment")],
}

# The Season Key: every class has one, on a short spur off its fork. Taking any one opens Season Pass levels 46 to 60;
# a second one adds nothing.
GATE = ("Season Key", "passLevelCap", 15,
        "Opens Season Pass levels 46 to 60; without a Season Key the pass stops at level 45. Every class has one, but you can hold only one.")

# Each class's Season Key does the same job (opens Pass levels 46 to 60) plus a small extra in the class's own theme.
# (name, extra stat, extra value, extra effect). A second Key still opens nothing more, but its extra does count.
SEASON_KEYS = {
    "payroll": ("Payroll Key", "creditsPerHour", 1, "+1 Income for every counted hour"),
    "pass": ("Summit Key", "passXpPct", 5, "+5% Season Pass XP"),
    "sessions": ("Sentry Key", "playCreditPct", 3, "+3% Income from play"),
    "streaks": ("Vigil Key", "passCap", 500, "+500 Season Pass XP allowed each week"),
    "loot": ("Prospector's Key", "fragmentPlayPct", 5, "+5% fragments earned from play"),
    "quests": ("Contract Key", "questCreditPct", 5, "+5% Income from quests"),
    "background": ("Phantom Key", "allCreditPct", 2, "+2% to all Income"),
    "rig": ("Gearhead Key", "rigCreditPct", 3, "+3% Income while your PC runs within safe limits"),
}

# Inner section of each region: small node stat, notables A, B, M (middle path), C, D (clusters), inner keystone.
REGIONS = [
    {
        "id": "payroll", "name": "Tycoon", "focus": "Payroll", "color": "#f0893a",
        "small": ("playCreditPct", 3, "+3% Income from play"),
        "notA": ("Overtime", "creditsPerHour", 1, "+1 Income for every counted hour of play"),
        "notB": ("Long Haul", "longSessionCreditPct", 15, "+15% Income from sessions longer than 1 hour"),
        "notM": ("Steady Hands", "playCreditPct", 5, "+5% Income from play"),
        "notC": ("Night Owl", "nightCreditPct", 15, "+15% Income from play after 22:00"),
        "notD": ("Weekend Warrior", "weekendCreditPct", 15, "+15% Income from play on Saturday and Sunday"),
        "key": ("Marathon", "keyMarathon", 1, "Sessions longer than 3 hours pay double Income, but sessions under 1 hour pay none"),
    },
    {
        "id": "pass", "name": "Climber", "focus": "Season Pass", "color": "#8fc3ff",
        "small": ("passXpPct", 3, "+3% Season Pass XP"),
        "notA": ("Encore", "bonusLevelIncome", 10, "Past level 60, every 500 Season Pass XP is a bonus level that pays 10 Income (up to 20 bonus levels a season)"),
        "notB": ("Double Pay", "freeRowIncomePct", 50, "+50% Income from the Season Pass Free row"),
        "notM": ("Afterparty", "lateSeasonXpPct", 20, "+20% Season Pass XP once you are past level 45"),
        "notC": ("Milestone", "milestoneTicket", 1, "Every 10th Season Pass level also gives a Regular Ticket"),
        "notD": ("Victory Lap", "bonusLevelTicketPct", 10, "Each bonus level past 60 has a 10% chance of also giving a Regular Ticket"),
        "key": ("Endless Season", "keyEndlessSeason", 1, "Bonus levels past 60 never stop, but Season Pass XP before level 30 is 20% lower"),
    },
    {
        "id": "sessions", "name": "Sentinel", "focus": "Sessions", "color": "#9ef0b5",
        "small": ("sessionCredits", 2, "+2 Income for every game session longer than 30 minutes"),
        "notA": ("First Game", "firstGameCredits", 10, "Your first session each day gives +10 Income"),
        "notB": ("Regular Player", "weekPlayTicket", 1, "Playing on 5 different days in a week gives a Regular Ticket"),
        "notM": ("Session Bonus", "sessionPassXp", 100, "Every session longer than 45 minutes gives +100 Season Pass XP"),
        "notC": ("Comeback", "comebackCreditPct", 50, "After 3 or more days without play, your next hour of play pays +50% Income"),
        "notD": ("Regular Face", "creditsPerPlayDay", 5, "+5 Income for every day you play"),
        "key": ("Ritual", "keyRitual", 1, "Your first session each day pays double Income, but later sessions that day pay half"),
    },
    {
        "id": "streaks", "name": "Devotee", "focus": "Streaks", "color": "#ff7a6b",
        "small": ("streakActiveCreditPct", 2, "+2% Income while your play streak is 3 or more days"),
        "notA": ("Hot Streak", "streak7Ticket", 1, "Reaching a 7-day play streak gives a Regular Ticket"),
        "notB": ("Safety Net", "freezeOnRankUp", 1, "+1 streak freeze each time you rank up"),
        "notM": ("Momentum", "streakPassXpPct", 2, "+2% Season Pass XP for each day of your play streak (up to +14%)"),
        "notC": ("Daily Habit", "streakDayCredits", 3, "+3 Income for each day in a row you play"),
        "notD": ("Long Run", "streak30Special", 1, "A 30-day play streak gives a Special Ticket"),
        "key": ("All or Nothing", "keyAllOrNothing", 1, "Streak rewards are doubled, but streak freezes no longer work"),
    },
    {
        "id": "loot", "name": "Prospector", "focus": "Loot", "color": "#c9a2ff",
        "small": ("fragmentPlayPct", 3, "+3% fragments earned from play"),
        "notA": ("Loot Drop", "fragmentPer2Hours", 1, "+1 Regular fragment for every 2 counted hours of play"),
        "notB": ("Ticket Drop", "ticketPer5Hours", 1, "+1 Regular Ticket for every 5 counted hours of play"),
        "notM": ("Salvage", "fragmentPerRepeat", 1, "+1 Regular fragment for every repeat you draw"),
        "notC": ("Lucky Find", "itemPer10Hours", 1, "Every 10 counted hours of play gives a random item from the Regular Pack"),
        "notD": ("Treasure Hours", "specialFragmentPer20Hours", 1, "+1 Special fragment for every 20 counted hours of play"),
        "key": ("Scavenger", "keyScavenger", 1, "Play gives double fragments, but Income from play is 25% lower"),
    },
    {
        "id": "quests", "name": "Mercenary", "focus": "Quests", "color": "#ff9db0",
        "small": ("questCreditPct", 3, "+3% Income from quests"),
        "notA": ("Auto-Claim", "autoClaimPlayQuests", 1, "Play-time quests claim themselves when they finish, so you never have to open the app"),
        "notB": ("Busy Hands", "questPassXp", 50, "Each claimed quest gives +50 Season Pass XP"),
        "notM": ("Long Game", "creditsPer10Hours", 25, "+25 Income for every 10 counted hours of play"),
        "notC": ("Daily Grind", "dailyQuestCreditPct", 10, "+10% Income from daily quests"),
        "notD": ("Monthly Planner", "monthlyQuestCreditPct", 20, "+20% Income from monthly quests"),
        "key": ("Specialist", "keySpecialist", 1, "Daily quests pay double, but weekly quests pay nothing"),
    },
    {
        "id": "background", "name": "Phantom", "focus": "Background", "color": "#e6ebf3",
        "small": ("allCreditPct", 1, "+1% to all Income"),
        "notA": ("Lights On", "streakFreezeMonthly", 1, "+1 streak freeze at the start of each month"),
        "notB": ("Always On", "alwaysOnCreditPct", 10, "+10% Income once the app has been running for 2 hours"),
        "notM": ("Game Face", "gameModeCreditPct", 5, "+5% to all Income while game mode is on"),
        "notC": ("Night Watch", "overnightUptimeCredits", 10, "+10 Income for every night the app stays open while you game"),
        "notD": ("Steady Presence", "weekUptimeTicket", 1, "Running the app on 5 days in a week gives a Regular Ticket"),
        "key": ("Silent Running", "keySilentRunning", 1, "+20% to all Income, but the app shows no alerts or toasts while you play"),
    },
    {
        "id": "rig", "name": "Gearhead", "focus": "Rig", "color": "#5fd4d6",
        "small": ("rigCreditPct", 2, "+2% Income from play while your PC runs within safe limits"),
        "notA": ("Cool Running", "coolPcCreditPct", 5, "+5% Income from play while the GPU stays under 70°C"),
        "notB": ("Good Signal", "lowPingCreditPct", 5, "+5% Income from play while ping stays under 60 ms"),
        "notM": ("Stable Frame", "steadyFrameCreditPct", 5, "+5% Income from play while frame time stays steady"),
        "notC": ("Quiet Fans", "quietRigCreditPct", 5, "+5% Income from play while CPU load stays under 70%"),
        "notD": ("Plugged In", "acPowerCreditPct", 5, "+5% Income from play while the PC is on mains power"),
        "key": ("Overclock", "keyOverclock", 1, "+25% Income from play, but nothing is paid while the GPU is above 80°C"),
    },
]

# Outer band of each region: four wheel notables, two outer notables, the grand keystone on the rim.
OUTER = {
    "payroll": {
        "wheels": [("Double Shift", "longSessionCreditPct2", 20, "+20% Income from sessions longer than 2 hours"),
                   ("Penny Saver", "allCreditPct", 5, "+5% to all Income"),
                   ("Bonus Round", "creditsPerHour", 1, "+1 Income for every counted hour of play"),
                   ("Clocked In", "creditsPer5Hours", 10, "+10 Income for every 5 counted hours of play")],
        "outer": [("Early Riser", "earlyCreditPct", 15, "+15% Income from play before 09:00"),
                  ("Back to Back", "backToBackCreditPct", 10, "+10% Income from a session that starts within 30 minutes of the last one")],
        "grand": ("Grinder", "keyGrinder", 1, "+30% Income from play, but quests pay no Income"),
    },
    "pass": {
        "wheels": [("Head Start", "passStartXp", 1000, "Start each season with 1,000 Season Pass XP"),
                   ("Grand Finale", "finaleSpecialTickets", 2, "Reaching Season Pass level 60 gives 2 extra Special Tickets"),
                   ("Overtime Pay", "bonusLevelIncome", 5, "+5 more Income for every bonus level past 60"),
                   ("Second Wind", "passCap", 1000, "+1,000 Season Pass XP allowed each week")],
        "outer": [("Payday Levels", "freeRowEvery5Income", 20, "Every 5th level of the Free row also gives 20 Income"),
                  ("Valedictorian", "level60SpecialTicket", 1, "Reaching Pass level 60 gives a Special Ticket")],
        "grand": ("All on Free", "keyAllOnFree", 1, "The Free row pays double, but quests give no Season Pass XP: you climb by playing only"),
    },
    "sessions": {
        "wheels": [("Routine", "creditsPerPlayDay", 3, "+3 Income for every day you play"),
                   ("Lucky Session", "luckySessionTicketPct", 5, "5% chance that a session longer than 1 hour gives a Regular Ticket"),
                   ("Encore", "encoreCredits", 5, "+5 Income when you start a second session the same day"),
                   ("Marathon Mind", "longSessionPassXp", 150, "Sessions longer than 2 hours give +150 Season Pass XP")],
        "outer": [("Night Session", "nightSessionCredits", 10, "+10 Income for each session that ends after 22:00"),
                  ("Long Weekend", "longWeekendTicket", 1, "4 hours of play across a weekend gives a Regular Ticket")],
        "grand": ("Endurance", "keyEndurance", 1, "Sessions longer than 2 hours give double Pass XP, but sessions under 30 minutes give none"),
    },
    "streaks": {
        "wheels": [("Second Chance", "streakGraceMonthly", 1, "Once a month, a missed day does not break your play streak"),
                   ("Streak Keeper", "streakFreezePer20h", 1, "+1 streak freeze for every 20 counted hours of play"),
                   ("Warm Streak", "streakActiveCreditPct", 4, "+4% Income while your play streak is 3 or more days"),
                   ("Rebound", "streakRestartHalf", 1, "After a break, your play streak restarts at half its old length instead of zero")],
        "outer": [("Perfect Week", "perfectWeekCredits", 30, "Playing 7 days in a row gives +30 Income"),
                  ("Iron Will", "streak14Ticket", 1, "A 14-day play streak gives a Regular Ticket")],
        "grand": ("Iron Streak", "keyIronStreak", 1, "Each day in a row you play adds +2% to all Income (up to +30%), but a missed day resets it and streak freezes do not count"),
    },
    "loot": {
        "wheels": [("Keepsake", "fragmentPlayPct", 5, "+5% fragments earned from play"),
                   ("Sharp Eye", "fragmentPer4Star", 1, "+1 Regular fragment for every 4-star repeat"),
                   ("Ticket Stub", "ticketPer8Hours", 1, "+1 Regular Ticket for every 8 counted hours of play"),
                   ("Collector's Eye", "specialFragmentPer5Star", 1, "+1 Special fragment for every 5-star repeat")],
        "outer": [("Archivist", "fragmentPlayPct", 10, "+10% fragments earned from play"),
                  ("Jackpot Hours", "jackpotSpecialTicketPct", 1, "1% chance that each counted hour of play gives a Special Ticket")],
        "grand": ("Gambler", "keyGambler", 1, "Each counted hour has a 5% chance of a Special Ticket, but play gives no Regular Tickets"),
    },
    "quests": {
        "wheels": [("Checklist", "questCreditPct", 5, "+5% Income from quests"),
                   ("Session Quest", "playQuestCreditPct", 10, "+10% Income from play-time quests"),
                   ("Side Job", "questCreditPassXp", 1, "+1 Season Pass XP for every Income earned from quests"),
                   ("Big Week", "weeklyQuestCreditPct", 15, "+15% Income from weekly quests")],
        "outer": [("Completionist", "allWeekliesTicket", 1, "Claiming every weekly quest gives a Regular Ticket"),
                  ("Hour Hand", "hourMilestoneFragment", 1, "+1 Special fragment for every 25 counted hours of play")],
        "grand": ("Contractor", "keyContractor", 1, "Quests pay 50% more Income, but Income from play is halved"),
    },
    "background": {
        "wheels": [("Tidy Desk", "allCreditPct", 2, "+2% to all Income"),
                   ("Low Profile", "minimisedCreditPct", 5, "+5% Income from play while the app is minimised"),
                   ("Idle Hands", "idleCredits", 2, "+2 Income for every hour the app runs in the background"),
                   ("Collector's Shelf", "creditPctPer3Skins", 1, "+1% to all Income for every 3 card skins you own")],
        "outer": [("Night Light", "darkThemeCreditPct", 5, "+5% to all Income while a dark theme is on"),
                  ("Uptime", "uptimeCredits", 10, "+10 Income for every 10 hours the app runs")],
        "grand": ("Monk Mode", "keyMonkMode", 1, "+40% to all Income, but News, Draw and Themes are hidden while game mode is on"),
    },
    "rig": {
        "wheels": [("Low Latency", "lowPingPassXpPct", 10, "+10% Season Pass XP while ping stays under 40 ms"),
                   ("Cold Boot", "coolStartCredits", 5, "+5 Income for each session that starts with the GPU under 50°C"),
                   ("Headroom", "gpuHeadroomCreditPct", 8, "+8% Income from play while GPU load stays under 90%"),
                   ("Clean Run", "rigUptimeTicket", 1, "+1 Regular Ticket for every 10 hours of play without an overheat alert")],
        "outer": [("Silent PC", "silentRigCreditPct", 10, "+10% Income from play while no system alert fires that session"),
                  ("Fibre Line", "lowJitterCreditPct", 10, "+10% Income from play while jitter stays under 5 ms")],
        "grand": ("Redline", "keyRedline", 1, "+40% Income from play, but any overheat alert ends the bonus for the day"),
    },
}


def earned_by(node_type: str, stat: str) -> str:
    if node_type in ("start", "class"):
        return "Start"
    if node_type == "keystone" or stat.startswith("key"):
        return "Rule change"
    return STAT_INFO[stat][2]



# ---------------------------------------------------------------------------------------------------------------
# Specials 7 to 11 of each class: 12 squares per class with the Season Key. A player holds 8 squares in all.
# ---------------------------------------------------------------------------------------------------------------
MORE_SPECIALS = {
    "payroll": [("Payday Friday", "fridayIncomePct", 10, "+10% Income from play on Fridays"),
                ("Shift Bell", "shiftBellIncome", 15, "Every 5th counted hour in a week pays +15 Income"),
                ("Raise Review", "monthlyRaiseIncome", 40, "On the 1st of each month, +40 Income if you played 20 hours last month"),
                ("Hazard Pay", "lateHourIncome", 3, "Each counted hour after midnight pays +3 Income"),
                ("Ledger", "weeklyLedgerFragment", 1, "A week with 500 Income from play gives a Regular fragment")],
    "pass": [("Head Start", "seasonStartLevels", 2, "Each season starts 2 Season Pass levels up"),
             ("Midseason Boost", "midseasonXpPct", 15, "+15% Season Pass XP in the middle two weeks of a season"),
             ("Free Row Ticket", "freeRow20Ticket", 1, "Free-row level 20 also gives a Regular Ticket"),
             ("Catch the Wave", "weekendXpPct", 10, "+10% Season Pass XP from weekend play"),
             ("Curtain Call", "lastWeekXpPct", 20, "+20% Season Pass XP in the last week of a season")],
    "sessions": [("Warm-up Lap", "warmupIncome", 5, "Every session over 15 minutes pays +5 Income"),
                 ("Second Wind", "secondWindIncome", 10, "A second session on the same day pays +10 Income at 1 hour"),
                 ("Night Shift", "nightSessionFragment", 1, "A session that runs past 01:00 gives a Regular fragment"),
                 ("Weekday Regular", "weekdayTicket", 1, "Sessions on all 5 weekdays give a Regular Ticket"),
                 ("Long Haul Medal", "session6hIncome", 50, "A single session over 6 hours pays +50 Income")],
    "streaks": [("Kindling", "streak3Income", 5, "Every 3rd day of a play streak pays +5 Income"),
                ("Ember Guard", "streakFreezeStore", 2, "Store up to 2 unused streak freezes"),
                ("Bonfire", "streak14Fragment", 1, "A 14-day streak gives a Special fragment"),
                ("Torchbearer", "streak100Ticket", 3, "A 100-day streak gives 3 Special Tickets"),
                ("Rekindle", "streakRestoreDays", 1, "Once a season, restore a streak broken in the last 2 days")],
    "loot": [("Pity Timer", "pitySoftPct", 10, "The 5-star chance builds up 10% faster between 5-stars"),
             ("Scrap Heap", "repeatFragmentPct", 20, "+20% fragments from repeats"),
             ("Mystery Box", "mysteryItemPer40h", 1, "Every 40 counted hours of play gives a random item"),
             ("Ticket Stub", "ticketRefundPct", 5, "5% chance a draw gives its Ticket back"),
             ("Showcase Polish", "fiveStarFragment", 2, "Every new 5-star card skin also gives 2 Regular fragments")],
    "quests": [("Field Notes", "questAutoProgressPct", 10, "Play-time quests advance 10% faster"),
               ("Reroll Token", "weeklyQuestSwap", 1, "Once a week, swap a weekly quest for another"),
               ("Quest Chain", "questChainIncome", 10, "Claiming 3 quests in one day pays +10 Income"),
               ("Daily Double", "dailyQuestDoublePct", 10, "Each daily quest has a 10% chance to pay double"),
               ("Season Board", "seasonQuestTicket", 2, "Claiming 50 quests in a season gives 2 Regular Tickets")],
    "background": [("Quiet Hours", "quietHoursIncome", 5, "Each night the app stays open with notifications muted pays +5 Income"),
                   ("Tray Keeper", "trayHoursFragment", 1, "Every 50 hours the app sits in the tray gives a Regular fragment"),
                   ("Dark Room", "darkThemeIncomePct", 5, "+5% Income from play while a dark theme is on"),
                   ("Startup Ritual", "bootIncome", 3, "The app starting with Windows pays +3 Income once a day"),
                   ("Long Uptime", "uptime7Ticket", 1, "7 days open without a restart gives a Regular Ticket")],
    "rig": [("Fan Curve", "coolHourIncome", 2, "Each counted hour with the GPU under 65°C pays +2 Income"),
            ("Frame Pacer", "steadyFramesPct", 5, "+5% Income from play while frame time stays steady"),
            ("Plugged In", "mainsPowerIncomePct", 5, "+5% Income from play on mains power"),
            ("Driver Day", "driverUpdateFragment", 1, "Updating the GPU driver gives a Regular fragment (once a month)"),
            ("Clean Bench", "cleanMonthTicket", 2, "A month with no overheat alert gives 2 Regular Tickets")],
}

# Pentagons: 5 unique nodes per class, one beside each of the class's five grand keystones. Free, but a player holds
# only 3 across the whole tree (build.py, PENTAGON_LIMIT). Each one shapes a playstyle instead of adding a little.
PENTAGONS = {
    "payroll": [("Company Man", "pentCompanyMan", 1, "+25% Income from play, but Income from quests is halved"),
                ("Peak Hour", "pentPeakHour", 1, "Your best counted hour each day pays triple Income"),
                ("Union Card", "pentUnionCard", 1, "A counted hour never pays less than 15 Income"),
                ("Profit Share", "pentProfitShare", 1, "10% of all Income you earn in a week is paid again on Monday"),
                ("Workaholic", "pentWorkaholic", 1, "Every 4th counted hour in a row pays 4× Income")],
    "pass": [("Prodigy", "pentProdigy", 1, "Season Pass levels 1 to 30 need 30% less XP"),
             ("Overachiever", "pentOverachiever", 1, "The weekly Season Pass XP cap is doubled"),
             ("Patron's Gift", "pentPatronRow", 1, "Every 10th Free-row level also gives a reward from the Patreon row"),
             ("Infinite Season", "pentInfinite", 1, "Bonus levels past 60 need half the XP and never stop"),
             ("Graduate", "pentGraduate", 1, "Finishing a season at level 60 gives a Special Ticket and 100 Income")],
    "sessions": [("Iron Seat", "pentIronSeat", 1, "Sessions over 2 hours pay +50% Income for the whole session"),
                 ("Speedrunner", "pentSpeedrunner", 1, "Sessions under 45 minutes pay double Income"),
                 ("Ritualist", "pentRitualist", 1, "Your first session each day pays +30 Income at 30 minutes"),
                 ("Midnight Crown", "pentNightCrown", 1, "+40% Income from play between 22:00 and 04:00"),
                 ("Marathoner", "pentMarathoner", 1, "Every 8 hours in one session gives a Special Ticket")],
    "streaks": [("Unbroken", "pentUnbroken", 1, "A broken streak restarts at half its length, not at zero"),
                ("Phoenix", "pentPhoenix", 1, "When a streak breaks, +50% Income from play for 3 days"),
                ("Devotion", "pentDevotion", 1, "Each streak day adds +1% Income from play, up to +60%"),
                ("Weekly Flame", "pentWeeklyFlame", 1, "Each full week of streak gives a Special fragment"),
                ("Everflame", "pentEverflame", 1, "Your streak freezes refill every Monday")],
    "loot": [("Lucky Star", "pentLuckyStar", 1, "Every 40th draw is a 5-star"),
             ("Hoarder", "pentHoarder", 1, "Repeats from draws give double fragments"),
             ("Treasure Hunter", "pentTreasure", 1, "Every 10 counted hours of play gives a Regular Ticket"),
             ("High Roller", "pentHighRoller", 1, "A 10-draw costs 9 Tickets"),
             ("Curator", "pentCurator", 1, "Every 3rd 5-star, you choose the result")],
    "quests": [("Bounty Hunter", "pentBountyHunter", 1, "Quests pay double Income"),
               ("Taskmaster", "pentTaskmaster", 1, "Two extra daily quest slots and one extra weekly slot"),
               ("Autopilot", "pentAutoClaim", 1, "Finished quests claim themselves while you play"),
               ("Contractor", "pentContractor", 1, "Weekly quests also pay a Regular Ticket"),
               ("Completionist", "pentCompletionist", 1, "Claiming every quest in a week gives a Special Ticket")],
    "background": [("Night Watchman", "pentNightWatch", 1, "Each night the app stays open pays 30 Income"),
                   ("Silent Partner", "pentSilentPartner", 1, "With the app open and no game running, +1 Income every 30 minutes"),
                   ("Ghost Protocol", "pentGhost", 1, "Game mode time counts double for every Background node"),
                   ("Always On", "pentAlwaysOn", 1, "Every 7 days of uptime gives a Special fragment"),
                   ("Caretaker", "pentCaretaker", 1, "+50% to every Background Income bonus")],
    "rig": [("Overclocker", "pentOverclocker", 1, "+30% Income from play while the GPU runs above 90% load and under 80°C"),
            ("Zero Ping", "pentZeroPing", 1, "Sessions with ping under 20 ms pay +40% Income"),
            ("Ice Cold", "pentIceCold", 1, "A week with the GPU never above 70°C gives a Special Ticket"),
            ("Tuned Engine", "pentTunedEngine", 1, "Every Rig small node counts double"),
            ("Battle Station", "pentBattleStation", 1, "Sessions with no system alert pay +25% Income")],
}

# What pays each class's new nodes out (for the totals panel and the earned-by column).
_EARNED = {"payroll": "Play time", "pass": "Play time", "sessions": "Sessions", "streaks": "Sessions", "loot": "Play time",
           "quests": "Quests", "background": "Background", "rig": "Background"}
for _reg, _rows in MORE_SPECIALS.items():
    SPECIALS[_reg] = SPECIALS[_reg] + _rows
    for _name, _stat, _v, _eff in _rows:
        STAT_INFO.setdefault(_stat, (_eff, "", _EARNED[_reg]))
for _reg, _rows in PENTAGONS.items():
    for _name, _stat, _v, _eff in _rows:
        STAT_INFO.setdefault(_stat, (_name, "×", _EARNED[_reg]))



# ---------------------------------------------------------------------------------------------------------------
# Passives: an extra line on every keystone (large circle) and pentagon, on top of its main effect. Always on while
# the node is taken. Keystones: (inner keystone passive, grand keystone passive with {n} = the band's amount, base
# amount). The grand keystone's amount grows with its band (band 1 = base, band 2 = 2x base...).
# ---------------------------------------------------------------------------------------------------------------
KEYSTONE_PASSIVES = {
    "payroll": ("+1 Income per counted hour", "+{n}% Income from play", 2),
    "pass": ("+5% Season Pass XP", "+{n}% Season Pass XP", 3),
    "sessions": ("+5 Income per session over 1 hour", "+{n} Income per session over 1 hour", 3),
    "streaks": ("A streak of 7+ days gives +3% Income from play", "+{n}% Income from play while your streak is 7 days or more", 2),
    "loot": ("+5% fragments from play", "+{n}% fragments from play", 4),
    "quests": ("+5% Income from quests", "+{n}% Income from quests", 4),
    "background": ("+1 Income per hour the app is open in game mode", "+{n}% Income while game mode is on", 2),
    "rig": ("+3% Income from play while the GPU stays under 75°C", "+{n}% Income from play while no system alert fires", 2),
}

PENTAGON_PASSIVES = {
    "payroll": ["+2 Income per counted hour", "+5% Income from play", "+3% on all Income", "+1 Income per session", "+4% Income from play after 2 hours"],
    "pass": ["+5% Season Pass XP", "+500 weekly Pass XP cap", "+3% Season Pass XP", "Start each season with 300 Pass XP", "+5% Season Pass XP past level 45"],
    "sessions": ["+5 Income per session over 2 hours", "+5 Income per session under 45 minutes", "+3 Income per session", "+5% Income from play after 22:00", "+10 Income per session over 4 hours"],
    "streaks": ["+2% Income from play while on a streak", "+5 Income the day a streak restarts", "+1 Income per streak day, up to +20 a day", "+1 Regular fragment per full streak week", "+1 streak freeze a month"],
    "loot": ["+5% fragments from play", "+5% fragments from repeats", "+1 Regular fragment per 5 counted hours", "+2% chance of a Regular Ticket per counted hour", "+1 Regular fragment per 5-star"],
    "quests": ["+5% Income from quests", "+1 daily quest slot", "+3 Income per claimed quest", "+5% Income from weekly quests", "+10 Income for every daily quest done in a day"],
    "background": ["+3 Income per night left open", "+1 Income per 2 hours open", "+5% Income while game mode is on", "+1 Regular fragment per 3 days of uptime", "+3% on all Income"],
    "rig": ["+3% Income from play under 80°C", "+3% Income from play under 30 ms ping", "+2 Income per cool counted hour", "+1% Income from play per Rig node taken, up to +10%", "+3% Income from play with no system alert"],
}


# The extra Passive line on every band V notable (the mid size circles named "... V"), by class and base name.
# Like the keystone and pentagon passives, it is shown in the hover tip and the side panel; the app does not apply it yet.
NOTABLE_V_PASSIVES = {
    "payroll": {
        "Double Shift": "+2 Income for every session over 2 hours",
        "Penny Saver": "+5 Income each local day you play",
        "Bonus Round": "Every 10th counted hour pays +50 Income",
        "Clocked In": "+1 Regular fragment for every 20 counted hours",
        "Early Riser": "+10 Income for the first session each day",
        "Back to Back": "+5 Income for each session in a row today, up to +25",
    },
    "pass": {
        "Head Start": "+500 Season Pass XP on the first day of each season",
        "Grand Finale": "+1 Special fragment for every 5 Pass levels past 60",
        "Overtime Pay": "+5% Season Pass XP past level 60",
        "Second Wind": "+250 Season Pass XP the first time you play each week",
        "Payday Levels": "+10 Income for every Pass level you claim",
        "Valedictorian": "+2 Regular Tickets when you reach Pass level 30",
    },
    "sessions": {
        "Routine": "+1 Regular fragment for every 7 days you play",
        "Lucky Session": "+1% Income from play for each session over 1 hour today, up to +5%",
        "Encore": "+5 Season Pass XP for every session after the first today",
        "Marathon Mind": "+5% Income from sessions longer than 3 hours",
        "Night Session": "+1 streak freeze for every 10 sessions that end after 22:00",
        "Long Weekend": "+10% Income from play on Saturday and Sunday",
    },
    "streaks": {
        "Second Chance": "+3 Income for every day of your play streak, up to +60",
        "Streak Keeper": "A streak freeze also pays 20 Income when it saves a day",
        "Warm Streak": "+1 Regular fragment for every 7 streak days",
        "Rebound": "+10 Income the day a streak restarts",
        "Perfect Week": "+2 Regular Tickets for every 4 perfect weeks",
        "Iron Will": "+5% Income from play once your streak reaches 30 days",
    },
    "loot": {
        "Keepsake": "+1 Regular fragment for every 10 draws",
        "Sharp Eye": "+2% chance that a repeat gives double fragments",
        "Ticket Stub": "+1 Regular Ticket for every 5 draws",
        "Collector's Eye": "+1 Special fragment for every 3 Special repeats",
        "Archivist": "+5% fragments from repeats",
        "Jackpot Hours": "+10% Special fragments earned",
    },
    "quests": {
        "Checklist": "+5 Income for every daily quest you claim",
        "Session Quest": "+3% Income from play for each quest claimed today, up to +15%",
        "Side Job": "+10 Season Pass XP for every quest you claim",
        "Big Week": "+25 Income when you claim all three weekly quests",
        "Completionist": "+1 Regular Ticket for every 5 weekly quests you claim",
        "Hour Hand": "+20 Income for every 50 counted hours of play",
    },
    "background": {
        "Tidy Desk": "+2 Income for every hour the app is open, up to 20 a day",
        "Low Profile": "+5% Income from play while game mode is on",
        "Idle Hands": "+1 Regular fragment for every 30 hours the app runs",
        "Collector's Shelf": "+1% to all Income for every card skin you own, up to +10%",
        "Night Light": "+5 Income for each night the app stays open past midnight",
        "Uptime": "+1 streak freeze for every 100 hours the app runs",
    },
    "rig": {
        "Low Latency": "+10% Season Pass XP from sessions with no ping spike",
        "Cold Boot": "+5 Income for each session that starts with the CPU under 50 degrees",
        "Headroom": "+3% Income from play while RAM use stays under 80%",
        "Clean Run": "+1 Special fragment for every 50 hours without an overheat alert",
        "Silent PC": "+10 Income for each clean session in a row, up to +50",
        "Fibre Line": "+5% Season Pass XP while jitter stays under 5 ms",
    },
}


# ---------------------------------------------------------------------------------------------------------------
# Trade-off notables (decided 2026-11-18): a notable can give a stronger bonus and take a smaller one away elsewhere.
# The downside is the node's second effect (stat2 / value2) with a negative value.
#   - It is always on a different theme from the gain: Income buys down Pass XP, fragments or quest Income, and so on.
#   - It is weaker than the gain: about a quarter of it. The gain itself is about a third stronger than a plain notable.
#   - Point cost does not change; the downside is the price.
#   - Only notables (the large circles) get one: about a third of them. Small circles, squares and pentagons stay plus only.
#   - Totals never drop below base: a perk tree cannot make a player earn less than one with no perks (the app floors it).
# Entry: region -> base notable name -> (penalty stat, penalty at band I, plus multiplier or None to leave the gain as is).
# Band II to V copies of a notable use the same entry: the gain follows build.py's tier scaling times the multiplier, and
# the penalty grows with BAND_SCALE below.
# ---------------------------------------------------------------------------------------------------------------
TRADEOFF_BOOST = 1.35
BAND_SCALE = {1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0}

TRADEOFFS = {
    "payroll": {
        "Night Owl": ("earlyCreditPct", 5, TRADEOFF_BOOST),
        "Long Haul": ("questCreditPct", 5, TRADEOFF_BOOST),
        "Double Shift": ("passXpPct", 5, TRADEOFF_BOOST),
        "Early Riser": ("nightCreditPct", 5, TRADEOFF_BOOST),
    },
    "pass": {
        "Afterparty": ("playCreditPct", 3, TRADEOFF_BOOST),
        "Double Pay": ("fragmentPlayPct", 5, TRADEOFF_BOOST),
        "Second Wind": ("fragmentPlayPct", 4, TRADEOFF_BOOST),
        "Payday Levels": ("questCreditPct", 3, TRADEOFF_BOOST),
    },
    "sessions": {
        "Comeback": ("questCreditPct", 5, TRADEOFF_BOOST),
        "Session Bonus": ("playCreditPct", 3, TRADEOFF_BOOST),
        "Marathon Mind": ("questCreditPct", 4, TRADEOFF_BOOST),
        "Night Session": ("earlyCreditPct", 5, TRADEOFF_BOOST),
    },
    "streaks": {
        "Daily Habit": ("passXpPct", 3, TRADEOFF_BOOST),
        "Warm Streak": ("passXpPct", 2, TRADEOFF_BOOST),
        "Perfect Week": ("questCreditPct", 4, TRADEOFF_BOOST),
        "Hot Streak": ("fragmentPlayPct", 2, None),
    },
    "loot": {
        "Keepsake": ("playCreditPct", 2, TRADEOFF_BOOST),
        "Archivist": ("playCreditPct", 3, TRADEOFF_BOOST),
        "Loot Drop": ("playCreditPct", 2, None),
        "Ticket Drop": ("passXpPct", 2, None),
    },
    "quests": {
        "Daily Grind": ("playCreditPct", 3, TRADEOFF_BOOST),
        "Monthly Planner": ("passXpPct", 3, TRADEOFF_BOOST),
        "Big Week": ("fragmentPlayPct", 4, TRADEOFF_BOOST),
        "Session Quest": ("passXpPct", 3, TRADEOFF_BOOST),
    },
    "background": {
        "Always On": ("questCreditPct", 3, TRADEOFF_BOOST),
        "Game Face": ("passXpPct", 2, TRADEOFF_BOOST),
        "Low Profile": ("questCreditPct", 2, TRADEOFF_BOOST),
        "Night Light": ("fragmentPlayPct", 2, TRADEOFF_BOOST),
    },
    "rig": {
        "Cool Running": ("questCreditPct", 2, TRADEOFF_BOOST),
        "Good Signal": ("passXpPct", 2, TRADEOFF_BOOST),
        "Headroom": ("questCreditPct", 3, TRADEOFF_BOOST),
        "Silent PC": ("fragmentPlayPct", 3, TRADEOFF_BOOST),
    },
}

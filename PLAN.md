# Looks

> Wording (2026-11-18): the currency is **Income** (paid by Payroll) and a "look" is a **theme** in the app. This plan keeps the word "look" in places; read it as theme.

The first 30 looks are free and owned. Every look after those 30 is locked.

A locked look costs 120 Income. The user chooses which locked look to buy. The price stays 120 at every rank. A rank does not grant a look.

Five check-ins on different days in one week (Monday–Sunday, local) unlock one locked look the user chooses. That claim costs nothing. Four check-in days in a week grant no look. A completed weekly look that is not collected by the end of Sunday is lost. A collected pick stays waiting until the user chooses a look. A later week with five check-ins can add another. Spending 120 Income does not use up a waiting weekly unlock.

Brand colors cannot be bought with Income or with the weekly claim.

Canceling Patreon does not remove the 30 free looks, weekly picks, Income purchases, or gacha unlocks.

This plan does not name the looks.

# Gacha

The gacha spends earned Income. Income cannot be bought. A tip adds none. Patreon sign-in adds none. Buying one chosen locked look for 120 Income is separate from a draw. Income are never a prize.

Two packs share the same machine UI with a pack tab. Each pack has its own price, drop table, look pity and machine colour.

| Purchase | Cost |
| --- | --- |
| Regular Pack · one draw | 100 Income |
| Regular Pack · ten draws | 900 Income, paid as one purchase |
| Brand Pack · one draw | 150 Income |
| Brand Pack · ten draws | 1,350 Income, paid as one purchase |

**Regular Pack odds:** Regular theme 15%, weekly unlock pick 3%, Better item 25%, Common item 57%.

**Brand Pack odds:** Regular theme 13.5%, Brand theme 1% (this fortnight’s 2 Brand looks), weekly unlock pick 3%, Custom upload unlock 0.5%, Better item 25%, Common item 57%. Brand themes are only won from the Brand Pack (draw, Brand pity, or Brand prisms)—not with Income or a weekly pick—unless the CMS adds one back to the Regular Pack (Themes → Back in Regular Pack). An added-back look then drops from the Regular theme row in every pack, counts as a Regular theme (a repeat gives Regular crystals), and can be picked with Regular crystals. It is still never sold for Income.

Every draw awards a look, a weekly unlock pick, or an app item. Owned looks and one-time items stay in the pool; a repeat becomes Regular crystals (Regular Pack) or Brand prisms (Brand Pack). Crystals/prisms cannot become Income. Regular crystals (10) unlock one unowned Regular look; Brand prisms (5) unlock one of this fortnight’s two Brand themes.

Look pity is per pack: after 9 draws without a look, the next forces a Regular theme. Brand Pack also has Brand pity: after 69 draws without a Brand theme, the 70th is one of this fortnight’s two. The Region Pack has the same pity toward its featured looks. Only a featured look resets either counter, and the counter waits while nothing is featured or every featured look is owned. A ten-draw always includes at least one Regular theme. Weekly unlock picks from draws are capped at 2 per week across both packs, and at 5 picks waiting at once; a pick past either cap becomes a streak freeze.

A pack is disabled only when every look and one-time item in it is already owned.

# Patreon paid tiers

Paid unlock is Log in with Patreon. The person signs in on Patreon's site. The exe asks Patreon which tier that account is paying. Internet is required. There is no redeem code. No posts are required. No tier adds Income.

| Tier | Price | Benefits |
| --- | --- | --- |
| Bronze | $2.99 / month | Basic Theme: all preset looks, including locked ones after the first 30 |
| Silver | $5.99 / month | Basic Theme, Brand Theme (the brand-color editor), Discord |
| Gold | $9.99 / month | Everything in Silver, plus a channel to request a design or update |
| Diamond | $11.99 / month | Everything in Gold, plus early access to the beta |

The exe only unlocks Basic and Brand. Bronze turns on Basic. Silver, Gold, and Diamond turn on Basic and Brand. Discord, the request channel, and beta are not checked by the exe.

Cancel removes Patreon unlocks on the next check. Earned looks stay.

# Creator access

Creator access is a hidden Creator tier. It is not on the public Patreon page. There is no public $0 button.

The owner gifts it. The creator pays nothing. There is no application form. The same Log in with Patreon button is used. The exe turns on Basic and Brand. The tier adds no Income. Discord, the request channel, and beta stay off unless the owner also invites that creator on Patreon.

When the gift ends, the next check turns those unlocks off. Earned looks stay.

# Earn

Income are earned on this PC. They pay for locked looks and gacha draws. The start balance is 200 Income.

A counted minute is a minute while a watched game is the running session. A session under 60 seconds adds nothing. Leftover minutes bank until they make 1 Credit.

**Update (2026-11-18): ranks are removed.** Play pays one flat rate for everyone: 1 Income per 6 counted minutes, 10 an hour (`INCOME_PER_HOUR` in `questEngine.ts`); perks can add to it. The app now calls this currency **Income**, paid by **Payroll**; "Credits" is the thank-you roll. A locked look is a **theme**, and the weekly claim is a **Theme pick**. The Recruit / Regular / Veteran / Night table that stood here is gone, and so are the rank gates on Long watch, Night watch and Star a theme. Amounts in the tables below are Income.

Claim is explicit. A claim pays once.

- Daily resets at local midnight.
- Weekly resets Monday 00:00 local.
- Monthly resets on the 1st at 00:00 local.

## Daily check-in board

Daily check-in is **its own page** (tab "Check-in", between Quests and Pass), no longer a block on Quests; Quests links to it from its period tabs, with a dot when a box is ready. Its layout borrows the pattern of the Travel Log "Daily Check-In" window in Honkai: Star Rail (interfaceingame.com): a kicker chip and title with a countdown on the right, and a board of six boxes in two rows plus one tall Day 7. Pattern only: no names, art or palette from the game.

Opening the station checks the user in for that local day, and each check-in day lets the user claim the next box once. A missed day costs nothing: the board waits on the next box, and there is no catch-up. Day 7 stays shown as claimed for the rest of that day; the next local day the board starts again at Day 1. Board claims do not count as claimed quests. The tab shows a dot while a box is ready. The countdown is the event's end when there is one, otherwise the time to the next local midnight.

What each box pays is set in the CMS (`checkinPrizes`): a Draw Ticket (Regular or Special) or an item, and how many. With no setting every box pays Special Tickets:

| Box | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Default pay | 1 Special | 1 Special | 2 Special | 1 Special | 1 Special | 1 Special | 3 Special |

The CMS can also run the board as an event with a start and an end (`checkinEvent`). Outside it nothing can be claimed, and the page says when the next event starts; tickets already held still work on Draw. An item prize is granted before the claim is saved, so a refused item leaves the box unclaimed.

There are two Draw Tickets. Each pack takes one kind, and the CMS chooses which (Odds → the pack → Draw Ticket). By default every pack takes **Special Tickets** (`DEFAULT_PACK_TICKETS` in `gachaContent.ts`; the Regular Ticket stays available if the CMS sets a pack to take it). One ticket pays one draw in a pack that takes it (ten pay for a ten-draw). When enough of the pack's ticket are held, the draw buttons (and Draw again) show and spend tickets instead of Income. A ticket draw rolls exactly like a Income draw, with the same odds, pity and caps. Tickets come from the board and the Season Pass free row: they are never a gacha prize, never Income, and cannot be bought. Code: `checkinBoard.ts` (pure), `useCheckinBoard.ts`, `pages/CheckinPage.tsx`.

## Daily, all ranks

| Quest | Income | Completes when |
| --- | --- | --- |
| Station check-in | 5 | Once per local day |
| Thirty on the clock | 8 | 30 counted minutes that day |
| Arm game mode | 6 | Game mode phase on that day |

## Daily, long play (rank gates removed)

| Quest | Was | Income | Completes when |
| --- | --- | --- | --- |
| Long watch | Veteran | 12 | One finished session that day of at least 45 minutes |
| Night watch | Night | 15 | 90 counted minutes that day |

## Weekly

| Quest | Income | Completes when |
| --- | --- | --- |
| Weekly look | 0 | Check-in on 5 different days that week, then the user picks 1 locked look to unlock free |
| Three-hour week | 12 | 180 counted minutes that week |
| Armed three times | 8 | Game mode on, on 3 different days that week |

## Monthly

| Quest | Income | Completes when |
| --- | --- | --- |
| Half the month | 20 | Check-in on 12 different days |
| Ten-hour month | 20 | 600 counted minutes |
| Eight armed days | 15 | Game mode on, on 8 different days |

## One-time

| Quest | Income | Completes when |
| --- | --- | --- |
| Apply a look | 15 | Apply a look |
| Open Calendar | 10 | Open Calendar |
| Open Vault | 10 | Open Vault |
| Star a theme | 12 | Star a theme. Available at Regular. It pays Income and leaves every look locked. |

# Buy Me a Coffee

The Support page is already in the app; Buy Me a Coffee is a tip only and does not unlock looks or add Income.

# Looks

The first 30 looks are free and owned. Every look after those 30 is locked.

A locked look costs 120 Credits. The user chooses which locked look to buy. The price stays 120 at every rank. A rank does not grant a look.

Five check-ins on different days in one week (Monday–Sunday, local) unlock one locked look the user chooses. That claim costs nothing. Four check-in days in a week grant no look. An unclaimed weekly unlock stays waiting. A later week with five check-ins can add another. Spending 120 Credits does not use up a waiting weekly unlock.

Brand colors cannot be bought with Credits or with the weekly claim.

Canceling Patreon does not remove the 30 free looks, weekly picks, Credit purchases, or gacha unlocks.

This plan does not name the looks.

# Gacha

The gacha spends earned Credits. Credits cannot be bought. A tip adds none. Patreon sign-in adds none. Buying one chosen locked look for 120 Credits is separate from a draw. Credits are never a prize.

Two packs share the same machine UI with a pack tab. Each pack has its own price, drop table, look pity and machine colour.

| Purchase | Cost |
| --- | --- |
| Regular Pack · one draw | 100 Credits |
| Regular Pack · ten draws | 900 Credits, paid as one purchase |
| Brand Pack · one draw | 150 Credits |
| Brand Pack · ten draws | 1,350 Credits, paid as one purchase |

**Regular Pack odds:** Regular theme 15%, weekly unlock pick 3%, Better item 25%, Common item 57%.

**Brand Pack odds:** Regular theme 13.5%, Brand theme 1% (this fortnight’s 2 Brand looks), weekly unlock pick 3%, Custom upload unlock 0.5%, Better item 25%, Common item 57%. Brand themes are only won from the Brand Pack (draw, Brand pity, or Brand prisms)—not with Credits or a weekly pick—unless the CMS adds one back to the Regular Pack (Themes → Back in Regular Pack). An added-back look then drops from the Regular theme row in every pack, counts as a Regular theme (a repeat gives Regular crystals), and can be picked with Regular crystals. It is still never sold for Credits.

Every draw awards a look, a weekly unlock pick, or an app item. Owned looks and one-time items stay in the pool; a repeat becomes Regular crystals (Regular Pack) or Brand prisms (Brand Pack). Crystals/prisms cannot become Credits. Regular crystals (10) unlock one unowned Regular look; Brand prisms (5) unlock one of this fortnight’s two Brand themes.

Look pity is per pack: after 9 draws without a look, the next forces a Regular theme. Brand Pack also has Brand pity: after 69 draws without a Brand theme, the 70th is one of this fortnight’s two. A ten-draw always includes at least one Regular theme. Weekly unlock picks from draws are capped at 2 per week across both packs; overflow chance becomes a streak freeze.

A pack is disabled only when every look and one-time item in it is already owned.

# Patreon paid tiers

Paid unlock is Log in with Patreon. The person signs in on Patreon's site. The exe asks Patreon which tier that account is paying. Internet is required. There is no redeem code. No posts are required. No tier adds Credits.

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

The owner gifts it. The creator pays nothing. There is no application form. The same Log in with Patreon button is used. The exe turns on Basic and Brand. The tier adds no Credits. Discord, the request channel, and beta stay off unless the owner also invites that creator on Patreon.

When the gift ends, the next check turns those unlocks off. Earned looks stay.

# Earn

Credits are earned on this PC. They pay for locked looks and gacha draws. The start balance is 200 Credits.

A counted minute is a minute while a watched game is the running session. A session under 60 seconds adds nothing. Leftover minutes bank until they make 1 Credit.

Ranks are earned. They are not sold. A rank sets Credits per counted minute and grants no look.

| Rank | Reach | Credits per counted minute |
| --- | --- | --- |
| Recruit | Start | 1 per 6 minutes (10/hour) |
| Regular | 180 counted minutes and 5 claimed tasks | 1 per 5 minutes (12/hour) |
| Veteran | 600 counted minutes and 15 claimed tasks | 1 per 3 minutes (20/hour) |
| Night | 1,500 counted minutes and 40 claimed tasks | 1 per 2 minutes (30/hour) |

Claim is explicit. A claim pays once.

- Daily resets at local midnight.
- Weekly resets Monday 00:00 local.
- Monthly resets on the 1st at 00:00 local.

## Daily check-in board

The Quests page shows a 7-box check-in board. Opening the station checks the user in for that local day, and each check-in day lets the user claim the next box once. A missed day costs nothing: the board waits on the next box, and there is no catch-up for missed days. Day 7 stays shown as claimed for the rest of that day; the next local day the board starts again at Day 1. Board claims do not count as claimed tasks for rank.

| Box | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pays | 1 Regular | 1 Regular | 2 Special | 1 Regular | 1 Regular | 1 Regular | 3 Special |

There are two Draw Tickets. Each pack takes one kind, and the CMS chooses which (Odds → the pack → Draw Ticket). By default the Regular Pack takes **Regular Tickets** and the Brand and Region packs take **Special Tickets**; a future pack picks one the same way. One ticket pays one draw in a pack that takes it (ten pay for a ten-draw). When enough of the pack's ticket are held, the draw buttons (and Draw again) show and spend tickets instead of Credits. A ticket draw rolls exactly like a Credit draw, with the same odds, pity and caps. Tickets only come from the board: they are never a gacha prize, never Credits, and cannot be bought. The table is `BOARD_PRIZES` in `checkinBoard.ts`.

## Daily, all ranks

| Quest | Credits | Completes when |
| --- | --- | --- |
| Station check-in | 5 | Once per local day |
| Thirty on the clock | 8 | 30 counted minutes that day |
| Arm game mode | 6 | Game mode phase on that day |

## Daily, higher ranks

| Quest | Rank | Credits | Completes when |
| --- | --- | --- | --- |
| Long watch | Veteran | 12 | One finished session that day of at least 45 minutes |
| Night watch | Night | 15 | 90 counted minutes that day |

## Weekly

| Quest | Credits | Completes when |
| --- | --- | --- |
| Weekly look | 0 | Check-in on 5 different days that week, then the user picks 1 locked look to unlock free |
| Three-hour week | 12 | 180 counted minutes that week |
| Armed three times | 8 | Game mode on, on 3 different days that week |

## Monthly

| Quest | Credits | Completes when |
| --- | --- | --- |
| Half the month | 20 | Check-in on 12 different days |
| Ten-hour month | 20 | 600 counted minutes |
| Eight armed days | 15 | Game mode on, on 8 different days |

## One-time

| Quest | Credits | Completes when |
| --- | --- | --- |
| Apply a look | 15 | Apply a look |
| Open Calendar | 10 | Open Calendar |
| Open Vault | 10 | Open Vault |
| Star a theme | 12 | Star a theme. Available at Regular. It pays Credits and leaves every look locked. |

# Buy Me a Coffee

The Support page is already in the app; Buy Me a Coffee is a tip only and does not unlock looks or add Credits.

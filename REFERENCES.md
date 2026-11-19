# References

Everything the station pulls from or is built with, as `name: url`.
Part 1 is what the station reads at run time (game info). Part 2 is what we used to build it.
Credits-page entries come from `app/src/pages/CreditsPage.tsx`; the rest from `app/service/*.mjs` and `design/`.

# Part 1: Game info (data the station shows)

## Overwatch data
- Counterwatch: https://www.counterwatch.gg/stats/overwatch
- Steam (Overwatch 2): https://store.steampowered.com/app/2357570/Overwatch_2/
- Blizzard Overwatch news: https://overwatch.blizzard.com/en-us/news/
- Blizzard patch notes: https://overwatch.blizzard.com/en-us/news/patch-notes/

## Apex Legends data
- Apex Legends Status: https://apexlegendsstatus.com
- Apex legend pick rates: https://apexlegendsstatus.com/game-stats/legends-pick-rates/
- Apex Tracker: https://tracker.gg/apex
- Apex legend/weapon images (Tracker CDN): https://trackercdn.com/cdn/apex.tracker.gg/
- EA Apex Legends news: https://www.ea.com/games/apex-legends/news

## Community
- r/Overwatch: https://www.reddit.com/r/Overwatch/
- r/CompetitiveOverwatch: https://www.reddit.com/r/CompetitiveOverwatch/
- r/Overwatch_Leaks: https://www.reddit.com/r/Overwatch_Leaks/
- PlayOverwatch on YouTube: https://www.youtube.com/@PlayOverwatch
- YourOverwatch on YouTube: https://www.youtube.com/@YourOverwatch
- Stylosa on YouTube: https://www.youtube.com/@stylosa

## Leak search
- Google News: https://news.google.com/
- X (Twitter): https://x.com/
- @wiki_ow: https://x.com/wiki_ow
- @SkaVorah: https://x.com/SkaVorah
- @OWCavalry: https://x.com/OWCavalry
- @OmnicPost: https://x.com/OmnicPost
- @PlayOverwatch: https://x.com/PlayOverwatch

## Feeds and APIs
- Steam current-players API: https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/
- Steam news API: https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/
- YouTube Atom feed: https://www.youtube.com/feeds/videos.xml
- Google News RSS: https://news.google.com/rss/search
- Reddit RSS: https://www.reddit.com/r/Overwatch/.rss

## Runs locally (integrations)
- Discord: https://discord.com/
- Discord OAuth: https://discord.com/api/oauth2/token
- Spotify: https://www.spotify.com/
- Spotify Web API: https://api.spotify.com/v1
- Spotify accounts (auth): https://accounts.spotify.com
- Patreon: https://www.patreon.com
- PresentMon: https://github.com/GameTechDev/PresentMon
- Windows media session: (no url)
- nvidia-smi: (no url)

# Part 2: Development stage (UI references)

## Design and UI
- Outfit (typeface, Fontsource): https://fontsource.org/fonts/outfit
- Lucide (line icons): https://lucide.dev/
- 21st.dev (UI components, front-end thanks): https://21st.dev
- Interface In Game, Honkai: Star Rail (62 reference screenshots, downloaded 2026-11-18): https://interfaceingame.com/games/honkai-star-rail/

# Part 3: Localhost and creator codes

## Localhost (port)
- Dashboard / app dev server (1420): http://localhost:1420
- Dashboard, alternate port (1421): http://localhost:1421
- Local service API (8787): http://127.0.0.1:8787
- Service health check (8787): http://127.0.0.1:8787/api/health
- CMS, dev server and desktop build (1430): http://localhost:1430
- CMS local release host (1430): http://localhost:1430/releases
- Remotion (gacha videos) (3100): http://localhost:3100
- Patreon sign-in callback (8787): http://127.0.0.1:8787/api/patreon/callback
- Spotify sign-in callback (8787): http://127.0.0.1:8787/api/spotify/callback

## Creator codes (test stage only, not shipped)
- Unlock: CREATOR-HNWC-6DVV
- Reset: RESET-9WMG-J69N

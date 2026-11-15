import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { openLink } from "../lib/openLink";
import type { Provider, SettingsData, TrackedSource } from "../lib/types";

/**
 * Credits / thanks page — film end-credits crawl.
 * Motion adapted from 21st MagicUI Marquee (dillionverma, vertical):
 * CSS translateY crawl, edge masks, seamless infinite loop. Rebuilt in Command Station
 * tokens (no Tailwind). Single authored roll, not user-scroll reveal.
 */

interface Source {
  name: string;
  blurb: string;
  url?: string;
  group: string;
}

const SOURCES: Source[] = [
  {
    group: "Overwatch data",
    name: "Counterwatch",
    blurb: "Hero tier lists, map picks, and win-rate stats for the Meta cards.",
    url: "https://www.counterwatch.gg/stats/overwatch",
  },
  {
    group: "Overwatch data",
    name: "Steam",
    blurb: "Public player counts for Overwatch 2 and the Steam news feed.",
    url: "https://store.steampowered.com/app/2357570/Overwatch_2/",
  },
  {
    group: "Overwatch data",
    name: "Blizzard Overwatch news",
    blurb: "Official news posts that feed the Overwatch panel.",
    url: "https://overwatch.blizzard.com/en-us/news/",
  },
  {
    group: "Overwatch data",
    name: "Blizzard patch notes",
    blurb: "Official patch notes used for the feed and patch summary.",
    url: "https://overwatch.blizzard.com/en-us/news/patch-notes/",
  },
  {
    group: "Community",
    name: "r/Overwatch",
    blurb: "Community posts pulled into the Overwatch feed.",
    url: "https://www.reddit.com/r/Overwatch/",
  },
  {
    group: "Community",
    name: "r/CompetitiveOverwatch",
    blurb: "Community posts pulled into the Overwatch feed. Posts about a leak show under Leaks.",
    url: "https://www.reddit.com/r/CompetitiveOverwatch/",
  },
  {
    group: "Community",
    name: "r/Overwatch_Leaks",
    blurb: "Leak-focused subreddit; every post is treated as a leak in the feed.",
    url: "https://www.reddit.com/r/Overwatch_Leaks/",
  },
  {
    group: "Community",
    name: "PlayOverwatch on YouTube",
    blurb: "Official channel videos via the YouTube Atom feed.",
    url: "https://www.youtube.com/@PlayOverwatch",
  },
  {
    group: "Community",
    name: "YourOverwatch on YouTube",
    blurb: "Overwatch news and leak coverage via the YouTube Atom feed.",
    url: "https://www.youtube.com/@YourOverwatch",
  },
  {
    group: "Community",
    name: "Stylosa on YouTube",
    blurb: "Overwatch news and analysis videos via the YouTube Atom feed.",
    url: "https://www.youtube.com/@stylosa",
  },
  {
    group: "Leak search",
    name: "Google News",
    blurb: "Keyword searches for Overwatch leak, datamine, hero leak, and rumor headlines across news sites.",
    url: "https://news.google.com/",
  },
  {
    group: "Leak search",
    name: "X (Twitter)",
    blurb: "PlayOverwatch (official), wiki_ow and SkaVorah (leak), OWCavalry and OmnicPost (news). Posts reach the feed when an X bridge is set.",
    url: "https://x.com/",
  },
  {
    group: "Leak search",
    name: "@wiki_ow",
    blurb: "Datamine-focused X account; tagged Leak in the feed.",
    url: "https://x.com/wiki_ow",
  },
  {
    group: "Leak search",
    name: "@SkaVorah",
    blurb: "Confirms or denies Overwatch leaks; tagged Leak in the feed.",
    url: "https://x.com/SkaVorah",
  },
  {
    group: "Leak search",
    name: "@OWCavalry",
    blurb: "Community Overwatch news account; tagged News (not a primary leaker).",
    url: "https://x.com/OWCavalry",
  },
  {
    group: "Leak search",
    name: "@OmnicPost",
    blurb: "Overwatch news and community coverage; tagged News.",
    url: "https://x.com/OmnicPost",
  },
  {
    group: "Leak search",
    name: "@PlayOverwatch",
    blurb: "Official Overwatch X account; tagged Official.",
    url: "https://x.com/PlayOverwatch",
  },
  {
    group: "Runs locally",
    name: "Discord",
    blurb: "Local Discord pipe for voice status, mute, and notifications.",
    url: "https://discord.com/",
  },
  {
    group: "Runs locally",
    name: "Spotify",
    blurb: "Optional Spotify control for playback, devices, and volume.",
    url: "https://www.spotify.com/",
  },
  {
    group: "Runs locally",
    name: "Windows media session",
    blurb: "Now playing title, art, and transport for any session app.",
  },
  {
    group: "Runs locally",
    name: "nvidia-smi",
    blurb: "GPU temperature and load from NVIDIA’s command-line tool.",
  },
  {
    group: "Runs locally",
    name: "PresentMon",
    blurb: "Frame timing while a game is running, when PresentMon is installed.",
    url: "https://github.com/GameTechDev/PresentMon",
  },
  {
    group: "Built with",
    name: "React",
    blurb: "UI library for the dashboard.",
    url: "https://react.dev/",
  },
  {
    group: "Built with",
    name: "Vite",
    blurb: "Dev server and production bundler.",
    url: "https://vitejs.dev/",
  },
  {
    group: "Built with",
    name: "Tauri",
    blurb: "Desktop shell that starts the local service with the window.",
    url: "https://tauri.app/",
  },
  {
    group: "Built with",
    name: "react-grid-layout",
    blurb: "The draggable, resizable card grid.",
    url: "https://github.com/react-grid-layout/react-grid-layout",
  },
  {
    group: "Built with",
    name: "d3-geo and topojson-client",
    blurb: "Draw the world map on the Players online card.",
    url: "https://d3js.org/d3-geo",
  },
  {
    group: "Built with",
    name: "world-atlas",
    blurb: "Land outlines for that map.",
    url: "https://github.com/topojson/world-atlas",
  },
  {
    group: "Built with",
    name: "Outfit",
    blurb: "The typeface, via Fontsource.",
    url: "https://fontsource.org/fonts/outfit",
  },
  {
    group: "Built with",
    name: "Lucide",
    blurb: "The line-icon style used across the top bar.",
    url: "https://lucide.dev/",
  },
];

/** Who made it. Shown first on the roll, after the title card. */
const MADE_BY = {
  studio: ["Yuzi Studio", "鈺梓燒工作室"],
  project: "Project Charcoal",
  roles: [
    ["Design", "Mochi"],
    ["Front end", "Biscuit"],
    ["Back end", "Pebble"],
    ["Desktop app", "Pudding"],
  ],
} as const;

const THANKS_FRONT_END = "21st.dev";

/** The platforms the station's information comes from, and what each one supplies. */
const THANKS_INFO = [
  ["Counterwatch", "hero tiers, map picks, win rates"],
  ["Steam", "player counts, news"],
  ["Blizzard", "official news, patch notes"],
  ["Reddit", "community posts, leaks"],
  ["YouTube", "official and leak videos"],
  ["Google News", "leak headlines from news sites"],
  ["X", "first-hand leak posts"],
] as const;

/** The link for a source the user tracks, built from its stored short form. */
function trackedUrl(t: TrackedSource): string {
  if (t.platform === "x") return `https://x.com/${t.value}`;
  if (t.platform === "reddit") return `https://www.reddit.com/r/${t.value}/`;
  if (t.platform === "youtube") return t.value.startsWith("@") ? `https://www.youtube.com/${t.value}` : `https://www.youtube.com/channel/${t.value}`;
  return `https://${t.value}`;
}

const TRACKED_LABEL: Record<TrackedSource["platform"], string> = { x: "X account", youtube: "YouTube channel", reddit: "Subreddit", website: "Website" };

/** The sources the user added on the Vault Sources page, as credit entries. */
function trackedCredits(tracked: TrackedSource[]): Source[] {
  return tracked.map((t) => ({
    group: "Sources you track",
    name: t.platform === "x" ? `@${t.value}` : t.platform === "reddit" ? `r/${t.value}` : t.value,
    blurb: t.note || `${TRACKED_LABEL[t.platform]} you track for leaks.`,
    url: trackedUrl(t),
  }));
}

/** ~3.6s per credit ≈ film crawl; scales with list length. */
const crawlSeconds = (count: number) => Math.max(56, (count + 9) * 3.6);

function CreditHalf({ sources, inert }: { sources: Source[]; inert?: boolean }) {
  return (
    <div className="credits-half" aria-hidden={inert || undefined}>
      <div className="credits-lead" aria-hidden="true" />
      <div className="credits-block">
        <div className="credits-titlecard">
          <p className="credits-brand">
            <b>Command</b> Station
          </p>
          <h2>Thanks</h2>
          <p>Every live number, story, and sensor reading on this station comes from the people and tools below.</p>
        </div>
        <section className="credits-made" aria-label="Made by">
          <p className="credits-group">Made by</p>
          <h3 className="credits-studio">{MADE_BY.studio[0]}</h3>
          <h3 className="credits-studio">{MADE_BY.studio[1]}</h3>
          <p className="credits-project">{MADE_BY.project}</p>
          <dl className="credits-roles">
            {MADE_BY.roles.map(([role, name]) => (
              <div key={role}>
                <dt>{role}</dt>
                <dd>{name}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="credits-made" aria-label="Special thanks">
          <p className="credits-group">Special thanks</p>
          <dl className="credits-roles">
            <div>
              <dt>Special thanks for front end</dt>
              <dd>{THANKS_FRONT_END}</dd>
            </div>
          </dl>
          <p className="credits-sub">Special thanks for info</p>
          <dl className="credits-roles info">
            {THANKS_INFO.map(([platform, gives]) => (
              <div key={platform}>
                <dt>{platform}</dt>
                <dd>{gives}</dd>
              </div>
            ))}
          </dl>
        </section>
        {sources.map((s, i) => {
          const showGroup = i === 0 || sources[i - 1].group !== s.group;
          const body = (
            <>
              {showGroup && <p className="credits-group">{s.group}</p>}
              <h3>{s.name}</h3>
              <p>{s.blurb}</p>
              {s.url && <span className="credits-url">{s.url.replace(/^https?:\/\//, "")}</span>}
            </>
          );
          const key = `${inert ? "dup-" : ""}${s.name}`;
          // Loop copy is visual only — never interactive.
          if (inert || !s.url) {
            return (
              <article key={key} className="credits-item">
                {body}
              </article>
            );
          }
          return (
            <button
              key={key}
              type="button"
              className="credits-item"
              onClick={() => void openLink(s.url!)}
              title={`Open ${s.name}`}
            >
              {body}
            </button>
          );
        })}
        <p className="credits-fin">— end of roll —</p>
        <p className="credits-sign">
          {MADE_BY.studio[0]} {MADE_BY.studio[1]}
        </p>
      </div>
    </div>
  );
}

export function CreditsPage({ provider }: { provider?: Provider }) {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  const [tracked, setTracked] = useState<TrackedSource[]>([]);

  // Credit the sources the user chose to track, too. If the service does not answer, the fixed list still shows.
  useEffect(() => {
    let alive = true;
    provider
      ?.api<SettingsData>("/api/settings")
      .then((d) => alive && setTracked(d.tracked ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [provider]);

  // The tracked group goes just before "Built with", so the tools stay last.
  const sources = useMemo(() => {
    const extra = trackedCredits(tracked);
    const at = SOURCES.findIndex((s) => s.group === "Built with");
    return at < 0 ? [...SOURCES, ...extra] : [...SOURCES.slice(0, at), ...extra, ...SOURCES.slice(at)];
  }, [tracked]);

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const staticList = reduceMotion;

  return (
    <section className="credits" aria-label="Credits">
      <header className="credits-head">
        <div className="credits-head-copy">
          <h2>Credits</h2>
          <p>
            {staticList
              ? "Sources that power the station. Links open in your browser."
              : "A rolling thank-you. Links open in your browser."}
          </p>
        </div>
      </header>

      <div
        className={["credits-stage", staticList && "static"].filter(Boolean).join(" ")}
        style={{ "--credits-duration": `${crawlSeconds(sources.length)}s` } as CSSProperties}
        aria-label="Credits roll"
      >
        <div className="credits-fade credits-fade-top" aria-hidden="true" />
        <div className="credits-viewport">
          <div className="credits-crawl">
            <CreditHalf sources={sources} />
            {!staticList && <CreditHalf sources={sources} inert />}
          </div>
        </div>
        <div className="credits-fade credits-fade-bottom" aria-hidden="true" />
      </div>
    </section>
  );
}

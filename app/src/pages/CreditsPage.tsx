import { useEffect, useState, type CSSProperties } from "react";
import { openLink } from "../lib/openLink";

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
    name: "r/OverwatchLeaks",
    blurb: "Leak and rumor threads for the feed and leak watch.",
    url: "https://www.reddit.com/r/OverwatchLeaks/",
  },
  {
    group: "Community",
    name: "PlayOverwatch on YouTube",
    blurb: "Official channel videos via the YouTube Atom feed.",
    url: "https://www.youtube.com/@PlayOverwatch",
  },
  {
    group: "Leak search",
    name: "Claude CLI",
    blurb: "Claude Code web search for the AI leak feed, using your signed-in account.",
    url: "https://docs.anthropic.com/en/docs/claude-code",
  },
  {
    group: "Leak search",
    name: "Gemini CLI",
    blurb: "Google Gemini CLI as the other leak-search engine (API key; personal OAuth retired). Antigravity CLI is the subscription successor, not wired in yet.",
    url: "https://github.com/google-gemini/gemini-cli",
  },
  {
    group: "This PC",
    name: "Discord",
    blurb: "Local Discord pipe for voice status, mute, and notifications.",
    url: "https://discord.com/",
  },
  {
    group: "This PC",
    name: "Spotify",
    blurb: "Optional Spotify control for playback, devices, and volume.",
    url: "https://www.spotify.com/",
  },
  {
    group: "This PC",
    name: "Windows media session",
    blurb: "Now playing title, art, and transport for any session app.",
  },
  {
    group: "This PC",
    name: "nvidia-smi",
    blurb: "GPU temperature and load from NVIDIA’s command-line tool.",
  },
  {
    group: "This PC",
    name: "PresentMon",
    blurb: "Frame timing while a game is running, when PresentMon is installed.",
    url: "https://github.com/GameTechDev/PresentMon",
  },
  {
    group: "This PC",
    name: "LibreHardwareMonitor",
    blurb: "CPU temperature via its local web server when enabled.",
    url: "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor",
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
];

/** ~3.6s per credit ≈ film crawl; scales with list length. */
const CRAWL_SECONDS = Math.max(56, SOURCES.length * 3.6);

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
      </div>
    </div>
  );
}

export function CreditsPage() {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );

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
        style={{ "--credits-duration": `${CRAWL_SECONDS}s` } as CSSProperties}
        aria-label="Credits roll"
      >
        <div className="credits-fade credits-fade-top" aria-hidden="true" />
        <div className="credits-viewport">
          <div className="credits-crawl">
            <CreditHalf sources={SOURCES} />
            {!staticList && <CreditHalf sources={SOURCES} inert />}
          </div>
        </div>
        <div className="credits-fade credits-fade-bottom" aria-hidden="true" />
      </div>
    </section>
  );
}

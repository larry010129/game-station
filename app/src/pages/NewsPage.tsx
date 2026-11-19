import { useContext, useEffect, useId, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, RefreshCw } from "lucide-react";
import { CardCtxContext } from "../layout/registry";
import { FEED_KIND_LABEL } from "../lib/feedKind";
import { age } from "../lib/format";
import { openLink } from "../lib/openLink";
import type { FeedItem, FeedKind } from "../lib/types";
import { PLATFORM_NAME, PlatformIcon, platformOf } from "../components/PlatformIcon";
import { isUnread, unreadCount } from "../state/newsRead";
import { listNotices, useNewsRead, type Notice } from "../state/useNewsRead";

type Board = "news" | "notices";

/** One tile on the board: a story from the feed, or a station notice. */
interface Entry {
  id: string;
  kind: FeedKind | "notice";
  title: string;
  body: string;
  publishedAt?: number;
  story?: FeedItem;
}

const fromStory = (s: FeedItem): Entry => ({ id: s.id, kind: s.kind, title: s.title, body: s.summary, publishedAt: s.publishedAt, story: s });
const fromNotice = (n: Notice): Entry => ({ id: n.id, kind: "notice", title: n.title, body: n.body });
const kindLabel = (k: Entry["kind"]) => (k === "notice" ? "Notice" : FEED_KIND_LABEL[k]);

/**
 * The News board: News (the game's feed) and Notices (what changed in the station). The chosen tile is drawn large
 * on the left, every other one runs down the right, and a dot marks what you have not opened yet.
 */
export function NewsPage() {
  const feed = useContext(CardCtxContext)?.feed;
  const { state: read, mark } = useNewsRead();
  const [board, setBoard] = useState<Board>("news");
  const [kind, setKind] = useState<FeedKind | "all">("all");
  const [picked, setPicked] = useState<Partial<Record<Board, string>>>({});
  const boardId = useId();

  const stories = feed?.items ?? [];
  const notices = useMemo(listNotices, []);
  const unread = { news: unreadCount(read, stories), notices: unreadCount(read, notices) };

  const kinds = useMemo(() => [...new Set(stories.map((s) => s.kind))], [stories]);
  const entries: Entry[] = board === "news" ? stories.filter((s) => kind === "all" || s.kind === kind).map(fromStory) : notices.map(fromNotice);
  const firstUnread = entries.find((e) => isUnread(read, e.id, e.publishedAt));
  const selected = entries.find((e) => e.id === picked[board]) ?? firstUnread ?? entries[0];

  // What is on the big tile has been seen. It is also pinned, so marking it read does not move the board on to the
  // next unread story under the reader.
  useEffect(() => {
    if (!selected) return;
    mark([selected.id]);
    setPicked((p) => (p[board] === selected.id ? p : { ...p, [board]: selected.id }));
  }, [selected?.id, board, mark]);

  const pick = (id: string) => setPicked((p) => ({ ...p, [board]: id }));
  const markAll = () => mark(entries.map((e) => e.id));

  return (
    <section className="news" aria-labelledby={`${boardId}-h`}>
      <header className="news-head">
        <h2 id={`${boardId}-h`} className="news-title">
          News
        </h2>
        <div className="news-boards" role="tablist" aria-label="Board">
          {(["news", "notices"] as const).map((b) => (
            <button key={b} type="button" role="tab" aria-selected={board === b} className="news-board-tab" onClick={() => setBoard(b)}>
              {b === "news" ? "News" : "Notices"}
              {unread[b] > 0 && (
                <span className="news-count" aria-label={`${unread[b]} unread`}>
                  {unread[b]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="news-tools">
          {entries.some((e) => isUnread(read, e.id, e.publishedAt)) && (
            <button type="button" className="eb-btn" onClick={markAll}>
              Mark all read
            </button>
          )}
          {board === "news" && feed && (
            <button type="button" className="eb-btn news-check" onClick={feed.checkNow} disabled={feed.checking}>
              <RefreshCw aria-hidden="true" strokeWidth={1.5} data-spin={feed.checking || undefined} />
              {feed.checking ? "Checking" : "Check now"}
            </button>
          )}
        </div>
      </header>

      {board === "news" && kinds.length > 1 && (
        <div className="news-kinds" role="toolbar" aria-label="Show">
          {(["all", ...kinds] as const).map((k) => (
            <button key={k} type="button" className="pill-btn" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? "All" : FEED_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}

      {board === "news" && feed?.error && (
        <p className="news-error" role="status">
          {feed.error}
        </p>
      )}

      {selected ? (
        <div className="news-grid">
          <Hero entry={selected} />
          <ul className="news-list" aria-label={board === "news" ? "Stories" : "Notices"}>
            {entries.map((e) => (
              <li key={e.id}>
                <button type="button" className="news-row" data-kind={e.kind} aria-current={e.id === selected.id || undefined} onClick={() => pick(e.id)}>
                  <span className="news-row-meta">
                    <span className="news-tag">{kindLabel(e.kind)}</span>
                    {e.story && (
                      <span className="news-src">
                        <PlatformIcon platform={platformOf(e.story)} size={13} />
                        {e.story.source}
                        <span aria-hidden="true">·</span>
                        <time dateTime={new Date(e.story.publishedAt).toISOString()}>{age(e.story.publishedAt)}</time>
                      </span>
                    )}
                  </span>
                  <b className="news-row-title">{e.title}</b>
                  {isUnread(read, e.id, e.publishedAt) && <span className="news-dot" role="img" aria-label="Unread" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="news-empty">
          {board === "news" ? (
            <>
              <p>{kind === "all" ? "No stories yet." : `No ${FEED_KIND_LABEL[kind as FeedKind].toLowerCase()} stories right now.`}</p>
              {feed && kind === "all" && (
                <button type="button" className="eb-btn" onClick={feed.checkNow} disabled={feed.checking}>
                  Check every source now
                </button>
              )}
            </>
          ) : (
            <p>No notices. When the station gets new themes, items or odds, they are listed here.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** The big tile: what it is, where it is from, the headline, the summary, and the way to the full story. */
function Hero({ entry }: { entry: Entry }) {
  const s = entry.story;
  const platform = s ? platformOf(s) : null;
  return (
    <article className="news-hero" data-kind={entry.kind} aria-labelledby={`hero-${entry.id}`}>
      <svg className="news-hero-rings" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="200" cy="0" r="80" />
        <circle cx="200" cy="0" r="120" />
        <circle cx="200" cy="0" r="160" />
      </svg>
      <p className="news-hero-meta">
        <span className="news-tag">{kindLabel(entry.kind)}</span>
        {s && platform && (
          <span className="news-src">
            <PlatformIcon platform={platform} size={14} />
            {s.source}
            <span aria-hidden="true">·</span>
            <time dateTime={new Date(s.publishedAt).toISOString()}>{age(s.publishedAt)} ago</time>
          </span>
        )}
      </p>
      <h3 id={`hero-${entry.id}`} className="news-hero-title">
        {entry.title}
      </h3>
      {s?.trusted && <p className="news-trusted">{s.trusted}</p>}
      {entry.body && <p className="news-hero-body">{entry.body}</p>}
      {s?.heroChanges && s.heroChanges.length > 0 && (
        <ul className="news-heroes" aria-label="Heroes changed">
          {s.heroChanges.map((h) => (
            <li key={h.name}>
              {h.name}
              {h.up > 0 && (
                <span className="news-up" aria-label={`${h.up} up`}>
                  <ArrowUp aria-hidden="true" strokeWidth={2} />
                  {h.up}
                </span>
              )}
              {h.down > 0 && (
                <span className="news-down" aria-label={`${h.down} down`}>
                  <ArrowDown aria-hidden="true" strokeWidth={2} />
                  {h.down}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {s?.url && platform && (
        <button type="button" className="news-open" onClick={() => void openLink(s.url!)}>
          Open on {PLATFORM_NAME[platform]}
          <ExternalLink aria-hidden="true" strokeWidth={1.6} />
        </button>
      )}
    </article>
  );
}

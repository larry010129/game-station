import { useEffect } from "react";
import { appVersionOf } from "../content/contentSettings";
import { readAppliedRelease } from "../content/contentStore";
import { useT } from "../lib/i18n";
import { listNotices, useNewsRead } from "../state/useNewsRead";
import { useContentStatus } from "../state/useUpdateGate";

/**
 * What's new: the release notes and the updates of the version in use. The update banner under the tabs opens it.
 * Opening it marks the release's notices read, which clears the banner.
 */
export function WhatsNewPage() {
  const T = useT();
  const { applied } = useContentStatus();
  const { mark } = useNewsRead();
  const release = applied > 0 ? readAppliedRelease() : null;

  useEffect(() => {
    mark(listNotices().filter((n) => n.id.startsWith("release-")).map((n) => n.id));
  }, [applied, mark]);

  const sections: { key: string; label: string; items: string[] }[] = release
    ? [
        { key: "themes", label: T("whatsnew.themes"), items: release.changelog.themes ?? [] },
        { key: "items", label: T("whatsnew.items"), items: release.changelog.items ?? [] },
        { key: "odds", label: T("whatsnew.odds"), items: release.changelog.odds ?? [] },
        { key: "banners", label: T("whatsnew.banners"), items: release.changelog.banners ?? [] },
      ].filter((s) => s.items.length > 0)
    : [];
  const notes = release ? (release.changelog.notes || release.notes || "").trim() : "";

  return (
    <section className="whatsnew" aria-labelledby="whatsnew-h">
      <header className="whatsnew-head">
        <h2 id="whatsnew-h">{T("whatsnew.title")}</h2>
        <p>{T("whatsnew.sub")}</p>
      </header>

      {!release ? (
        <div className="whatsnew-panel">
          <p className="whatsnew-none">{T("whatsnew.none")}</p>
          {listNotices().length > 0 && (
            <ul className="whatsnew-plain">
              {listNotices().map((n) => (
                <li key={n.id}>
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="whatsnew-version">
            <span className="whatsnew-badge">{T("update.badge", { n: appVersionOf(release.number) })}</span>
            <small>{T("whatsnew.installed", { when: new Date(release.appliedAt).toLocaleString() })}</small>
          </div>

          <div className="whatsnew-panel">
            <h3>{T("whatsnew.notes")}</h3>
            <p className={notes ? "whatsnew-notes" : "whatsnew-none"}>{notes || T("whatsnew.noNotes")}</p>
          </div>

          {sections.length > 0 && (
            <div className="whatsnew-panel">
              <h3>{T("whatsnew.updates")}</h3>
              {sections.map((s) => (
                <section key={s.key} className="whatsnew-group" aria-label={s.label}>
                  <h4>
                    {s.label} <small>{s.items.length}</small>
                  </h4>
                  <ul className="whatsnew-chips">
                    {s.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { DEFAULT_SOURCE_KIND, SOURCE_KIND_LABEL, SOURCE_KIND_OPTIONS, type SourceKind } from "../lib/feedKind";
import type { FeedPlatform, Provider, SettingsData, TrackedKind, TrackedPlatform, TrackedSource } from "../lib/types";
import { useToast } from "../state/Toast";
import { PlatformIcon } from "./PlatformIcon";
import { Segmented } from "./Segmented";

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

interface Kind {
  id: TrackedPlatform;
  label: string;
  icon: FeedPlatform;
  placeholder: string;
  /** What adding one of these actually does, in plain words. */
  use: string;
  show: (v: string) => string;
}

const KINDS: Kind[] = [
  {
    id: "x",
    label: "X accounts",
    icon: "x",
    placeholder: "@handle or an x.com link",
    use: "Built-in handles are always read when an X bridge is set. Add more and tag Official, Leak or News so cards match.",
    show: (v) => `@${v}`,
  },
  {
    id: "youtube",
    label: "YouTube channels",
    icon: "youtube",
    placeholder: "@channel or a youtube.com link",
    use: "New videos are read every 30 minutes. Leak marks every video as a leak; Video only does when the title talks about one.",
    show: (v) => v,
  },
  {
    id: "reddit",
    label: "Subreddits",
    icon: "reddit",
    placeholder: "Overwatch or r/Overwatch",
    use: "Community: leak-worded posts show under Leaks. Leak: every post is treated as a leak.",
    show: (v) => `r/${v}`,
  },
  {
    id: "website",
    label: "Websites",
    icon: "news",
    placeholder: "pcgamer.com",
    use: "A leak that this site reported gets a Trusted badge.",
    show: (v) => v,
  },
];

const PLATFORM_OPTIONS = [
  { value: "x" as const, label: "X" },
  { value: "youtube" as const, label: "YouTube" },
  { value: "reddit" as const, label: "Reddit" },
  { value: "website" as const, label: "Website" },
];

/** Role first (Official / Leak / News / …); Trusted is a quieter secondary mark. */
function SourceTag({ kind, trusted }: { kind?: string; trusted?: boolean }) {
  const role = kind && SOURCE_KIND_LABEL[kind as SourceKind] ? SOURCE_KIND_LABEL[kind as SourceKind] : null;
  return (
    <span className="srctags">
      {role && (
        <span className={`srctag srctag-role srctag-${kind}`} title="Role">
          {role}
        </span>
      )}
      {trusted && (
        <span className="srctag srctag-trusted" title="Trusted for the leak badge">
          Trusted
        </span>
      )}
    </span>
  );
}

type RowItem = { key: string; label: string; kind?: string; trusted?: boolean; note?: string; removable?: TrackedSource };

function builtinRows(data: SettingsData, platform: TrackedPlatform): { rows: RowItem[]; keys: Set<string> } {
  const keys = new Set<string>();
  if (platform === "x") {
    const rows = (data.builtinX ?? []).map((b) => {
      keys.add(b.handle.toLowerCase());
      return {
        key: `b:x:${b.handle.toLowerCase()}`,
        label: `@${b.handle}`,
        kind: b.kind,
        trusted: b.trusted,
        note: b.note,
      };
    });
    return { rows, keys };
  }
  if (platform === "youtube") {
    const rows = (data.builtinYoutube ?? []).map((b) => {
      for (const m of b.match?.length ? b.match : [b.name.toLowerCase()]) keys.add(m);
      return {
        key: `b:yt:${b.name.toLowerCase()}`,
        label: b.name,
        kind: b.kind,
        trusted: b.trusted,
        note: b.note,
      };
    });
    return { rows, keys };
  }
  if (platform === "reddit") {
    const rows = (data.builtinReddit ?? []).map((b) => {
      keys.add(b.sub.toLowerCase());
      return {
        key: `b:r:${b.sub.toLowerCase()}`,
        label: `r/${b.sub}`,
        kind: b.kind,
      };
    });
    return { rows, keys };
  }
  return { rows: [], keys };
}

function trackKey(platform: TrackedPlatform, value: string) {
  return `${platform}:${value.replace(/^@/, "").toLowerCase()}`;
}

/** Vault section: the accounts, channels, subreddits and sites the user trusts for leaks. */
export function SourcesSettings({ provider }: { provider: Provider }) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [platform, setPlatform] = useState<TrackedPlatform>("x");
  const [sourceKind, setSourceKind] = useState<SourceKind>(DEFAULT_SOURCE_KIND.x);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    provider
      .api<SettingsData>("/api/settings")
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [provider]);

  if (!data) {
    return (
      <section className="vault-card" aria-label="Sources">
        <h3>Sources</h3>
        <p className="hint vault-intro">{failed ? "The local service did not answer, so this list can't be read." : "Reading your sources…"}</p>
      </section>
    );
  }

  const tracked: TrackedSource[] = data.tracked ?? [];
  const kind = KINDS.find((k) => k.id === platform) ?? KINDS[0];
  const kindOptions = platform === "website" ? null : SOURCE_KIND_OPTIONS[platform];

  const save = async (next: TrackedSource[]) => {
    setBusy(true);
    try {
      setData(await provider.api<SettingsData>("/api/settings", { tracked: next }));
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!value.trim()) return;
    setError("");
    try {
      const entry: TrackedSource = { platform, value: value.trim(), note: note.trim() };
      if (kindOptions) entry.kind = sourceKind as TrackedKind;
      await save([...tracked, entry]);
      setValue("");
      setNote("");
    } catch (e) {
      setError(msg(e, "Couldn't save that."));
    }
  };

  const remove = (item: TrackedSource) => {
    save(tracked.filter((t) => !(t.platform === item.platform && t.value === item.value))).catch((e) => toast(msg(e, "Couldn't remove that.")));
  };

  const rowsFor = (k: Kind): RowItem[] => {
    const { rows: built, keys: builtKeys } = builtinRows(data, k.id);
    const extras: RowItem[] = tracked
      .filter((t) => t.platform === k.id)
      .filter((t) => !builtKeys.has(t.value.replace(/^@/, "").toLowerCase()))
      .map((t) => ({
        key: trackKey(t.platform, t.value),
        label: k.show(t.value),
        kind: t.kind,
        trusted: true,
        note: t.note,
        removable: t,
      }));
    return [...built, ...extras];
  };

  return (
    <section className="vault-card" aria-label="Sources">
      <h3>Sources</h3>
      <p className="hint vault-intro">
        Accounts, channels, subreddits and sites you track. Role tags are Official, Leak or News (and Video / Community where they apply). Trusted is a quieter badge for the leak mark. Saved to config.json on this PC.
      </p>

      <div className="vault-row">
        <div>
          <h3>Add a source</h3>
          <p className="hint">Paste a link or type a name, pick a role tag, then press Enter.</p>
        </div>
        <form
          className="vault-field srcadd"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Segmented
            label="Platform"
            value={platform}
            options={PLATFORM_OPTIONS}
            onChange={(p) => {
              setPlatform(p);
              if (p !== "website") setSourceKind(DEFAULT_SOURCE_KIND[p]);
              setError("");
            }}
          />
          {kindOptions && (
            <Segmented
              label="Role"
              value={sourceKind}
              options={kindOptions}
              onChange={(k) => {
                setSourceKind(k);
                setError("");
              }}
            />
          )}
          <div className="srcadd-fields">
            <input
              value={value}
              placeholder={kind.placeholder}
              aria-label={`${kind.label}: name or link`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "src-error" : undefined}
              maxLength={200}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
            />
            <input value={note} placeholder="Why you trust it (optional)" aria-label="Note" maxLength={120} onChange={(e) => setNote(e.target.value)} />
            <button className="eb-btn primary" type="submit" disabled={busy || !value.trim()}>
              Add
            </button>
          </div>
          {error && (
            <p className="srcerr" id="src-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>

      {KINDS.map((k) => {
        const items = rowsFor(k);
        return (
          <div className="vault-row" key={k.id}>
            <div>
              <h3 className="srcname">
                <PlatformIcon platform={k.icon} size={16} />
                {k.label}
              </h3>
              <p className="hint">{k.use}</p>
            </div>
            <div className="vault-field plist">
              <ul>
                {items.map((t) => (
                  <li key={t.key} className={t.removable ? undefined : "builtin"} title={t.note || undefined}>
                    <span>{t.label}</span>
                    <SourceTag kind={t.kind} trusted={t.trusted} />
                    {t.removable && (
                      <button type="button" className="cell-x-inline" aria-label={`Remove ${t.label}`} disabled={busy} onClick={() => remove(t.removable!)}>
                        ×
                      </button>
                    )}
                  </li>
                ))}
                {!items.length && <li className="hint">Nothing added yet.</li>}
              </ul>
            </div>
          </div>
        );
      })}

      {(data.builtin ?? []).length > 0 && (
        <div className="vault-row">
          <div>
            <h3>Trusted</h3>
            <p className="hint">Always trusted for the leak badge. Role tags live on the lists above. To change these, edit feed.trusted in config.json.</p>
          </div>
          <div className="vault-field plist">
            <ul>
              {(data.builtin ?? []).map((b) => (
                <li key={b.name} className="builtin" title={b.note || undefined}>
                  <span>{b.name}</span>
                  <SourceTag trusted />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

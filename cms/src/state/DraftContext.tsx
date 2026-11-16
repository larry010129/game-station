import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getPersistMode,
  loadDraft,
  publishDraft,
  saveDraft,
  type PersistMode,
} from "../api/contentApi";
import type { CmsDraft } from "../types/draft";
import { validateDraftForPublish } from "../types/draft";

type Status = "loading" | "ready" | "error";

interface DraftContextValue {
  status: Status;
  error: string | null;
  draft: CmsDraft | null;
  dirty: boolean;
  saving: boolean;
  persistMode: PersistMode;
  lastSavedAt: string | null;
  publishErrors: string[];
  setDraft: (updater: (d: CmsDraft) => CmsDraft) => void;
  save: () => Promise<void>;
  publish: (
    notes?: string,
    effectiveAt?: string,
  ) => Promise<{ number: number; note?: string; errors?: string[] } | null>;
  reload: () => Promise<void>;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraftState] = useState<CmsDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [persistMode, setPersistMode] = useState<PersistMode>("api");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const d = await loadDraft();
      setDraftState(d);
      setDirty(false);
      setPersistMode(getPersistMode());
      setStatus("ready");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setDraft = useCallback((updater: (d: CmsDraft) => CmsDraft) => {
    setDraftState((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const next = { ...draft, updatedAt: new Date().toISOString() };
      const { mode } = await saveDraft(next);
      setDraftState(next);
      setPersistMode(mode);
      setDirty(false);
      setLastSavedAt(next.updatedAt);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  // Debounced autosave when dirty
  useEffect(() => {
    if (!dirty || !draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, draft, save]);

  const publishErrors = useMemo(
    () => (draft ? validateDraftForPublish(draft) : []),
    [draft],
  );

  const publish = useCallback(
    async (notes?: string, effectiveAt?: string) => {
      if (!draft) return null;
      if (publishErrors.length) return null;
      if (dirty) await save();
      const result = await publishDraft(notes ?? draft.releaseNotes, effectiveAt);
      setPersistMode(result.mode);
      if (!result.ok) {
        return {
          number: 0,
          note: undefined,
          errors: result.errors,
        };
      }
      return {
        number: result.number ?? 0,
        note: result.note ?? result.manifestPath,
        errors: undefined,
      };
    },
    [draft, dirty, publishErrors, save],
  );

  const value: DraftContextValue = {
    status,
    error,
    draft,
    dirty,
    saving,
    persistMode,
    lastSavedAt,
    publishErrors,
    setDraft,
    save,
    publish,
    reload,
  };

  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  );
}

export function useDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useDraft outside DraftProvider");
  return ctx;
}

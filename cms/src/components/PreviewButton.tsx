import { useEffect, useId, useState, type MouseEvent } from "react";
import { Button } from "../ui/primitives";

/** Session-only blob URLs for local file preview (not persisted in draft). */
const localPreviewByItemId = new Map<string, string>();

let active: { id: string; audio: HTMLAudioElement } | null = null;
const onStopped = new Map<string, () => void>();

function stopActive() {
  if (!active) return;
  const prev = active;
  active = null;
  prev.audio.pause();
  prev.audio.removeAttribute("src");
  prev.audio.load();
  onStopped.get(prev.id)?.();
}

/** Resolve playable src: local blob preview wins over draft assetPath. */
export function getAlertPreviewSrc(item: {
  id: string;
  assetPath?: string | null;
}): string | undefined {
  const local = localPreviewByItemId.get(item.id);
  if (local) return local;
  const url = item.assetPath?.trim();
  return url || undefined;
}

/** Attach a local audio file for preview without writing bytes into the draft. */
export function setLocalAlertPreview(itemId: string, file: File): string {
  const prev = localPreviewByItemId.get(itemId);
  if (prev) URL.revokeObjectURL(prev);
  const url = URL.createObjectURL(file);
  localPreviewByItemId.set(itemId, url);
  return url;
}

export function clearLocalAlertPreview(itemId: string) {
  const prev = localPreviewByItemId.get(itemId);
  if (prev) URL.revokeObjectURL(prev);
  localPreviewByItemId.delete(itemId);
}

/**
 * Play / Stop control for alert-sound preview.
 * Only one clip plays at a time; stops on unmount.
 */
export function PreviewButton({
  src,
  className = "",
}: {
  src?: string | null;
  className?: string;
}) {
  const id = useId();
  const [playing, setPlaying] = useState(false);
  const hasSrc = Boolean(src?.trim());

  useEffect(() => {
    onStopped.set(id, () => setPlaying(false));
    return () => {
      onStopped.delete(id);
      if (active?.id === id) stopActive();
    };
  }, [id]);

  useEffect(() => {
    if (active?.id === id) {
      stopActive();
      setPlaying(false);
    }
    // Re-bind when the playable source changes.
  }, [src, id]);

  async function toggle(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!hasSrc || !src) return;

    if (playing && active?.id === id) {
      stopActive();
      setPlaying(false);
      return;
    }

    stopActive();
    const audio = new Audio(src);
    active = { id, audio };
    setPlaying(true);
    audio.onended = () => {
      if (active?.id === id) active = null;
      setPlaying(false);
    };
    audio.onerror = () => {
      if (active?.id === id) active = null;
      setPlaying(false);
    };
    try {
      await audio.play();
    } catch {
      if (active?.id === id) active = null;
      setPlaying(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={`min-w-[4.5rem] px-2 py-1 text-xs ${className}`}
      disabled={!hasSrc}
      title={hasSrc ? (playing ? "Stop preview" : "Play preview") : "No audio file"}
      aria-label={hasSrc ? (playing ? "Stop" : "Play") : "No audio file"}
      onClick={toggle}
    >
      {!hasSrc ? "No audio file" : playing ? "Stop" : "Play"}
    </Button>
  );
}

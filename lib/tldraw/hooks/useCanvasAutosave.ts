"use client";

import { useCallback, useRef, useState } from "react";
import { getSnapshot, type Editor } from "@tldraw/tldraw";
import {
  saveTldrawSnapshot,
  saveHistorySnapshot,
} from "@/lib/actions/tldraw";

const AUTOSAVE_DEBOUNCE_MS = 1000;
const HISTORY_INTERVAL_MS = 60000;

/**
 * Manages autosave (debounced) and periodic history snapshots.
 * Returns `saveStatus` for UI indicators and setup/teardown functions.
 */
export function useCanvasAutosave(boardId: string) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHistoryHashRef = useRef("");
  const hasChangedSinceHistoryRef = useRef(false);
  const previewActiveRef = useRef(false);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

  /** Mark that we're in preview mode — suppresses autosave. */
  const setPreviewActive = useCallback((active: boolean) => {
    previewActiveRef.current = active;
  }, []);

  /** Debounced save triggered by store changes. */
  const debouncedSave = useCallback(
    (editor: Editor) => {
      if (previewActiveRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaveStatus("saving");
      hasChangedSinceHistoryRef.current = true;

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const snapshot = getSnapshot(editor.store);
          await saveTldrawSnapshot(boardId, snapshot as any);
          setSaveStatus("saved");
          if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
          fadeTimeoutRef.current = setTimeout(
            () => setSaveStatus((s) => (s === "saved" ? "idle" : s)),
            2000
          );
        } catch (err) {
          console.error("Autosave failed:", err);
          setSaveStatus("idle");
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [boardId]
  );

  /** Save a history snapshot if content has changed since last save. */
  const saveHistoryIfChanged = useCallback(
    async (editor: Editor) => {
      if (!hasChangedSinceHistoryRef.current) return;
      try {
        const snapshot = getSnapshot(editor.store);
        const hash = JSON.stringify(snapshot).slice(0, 200);
        if (hash === lastHistoryHashRef.current) return;

        await saveHistorySnapshot(boardId, snapshot as any);
        lastHistoryHashRef.current = hash;
        hasChangedSinceHistoryRef.current = false;
      } catch (err) {
        console.error("History save failed:", err);
      }
    },
    [boardId]
  );

  /** Wire up store listener + history interval. Call in handleMount. */
  const setupAutosave = useCallback(
    (editor: Editor, initializedRef: React.MutableRefObject<boolean>) => {
      // Listen for document changes from the user
      editor.store.listen(
        () => {
          if (initializedRef.current) debouncedSave(editor);
        },
        { scope: "document", source: "user" }
      );

      // Periodic history snapshots
      historyIntervalRef.current = setInterval(() => {
        saveHistoryIfChanged(editor);
      }, HISTORY_INTERVAL_MS);
    },
    [debouncedSave, saveHistoryIfChanged]
  );

  /** Final save + cleanup. Call on unmount. */
  const cleanup = useCallback(
    (editor: Editor | null, initialized: boolean) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (historyIntervalRef.current) clearInterval(historyIntervalRef.current);

      if (editor && initialized) {
        const snapshot = getSnapshot(editor.store);
        saveTldrawSnapshot(boardId, snapshot as any).catch(console.error);
        saveHistorySnapshot(boardId, snapshot as any).catch(console.error);
      }
    },
    [boardId]
  );

  return {
    saveStatus,
    setPreviewActive,
    debouncedSave,
    saveHistoryIfChanged,
    setupAutosave,
    cleanup,
  };
}

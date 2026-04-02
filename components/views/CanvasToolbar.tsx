"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tldraw/tldraw";
import { Plus, ArrowRight, ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface CanvasToolbarProps {
  editorRef: React.MutableRefObject<Editor | null>;
}

/**
 * Minimal floating toolbar for the canvas.
 * Replaces all tldraw chrome with a clean pill at bottom-center.
 */
export function CanvasToolbar({ editorRef }: CanvasToolbarProps) {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleSelect = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setCurrentTool("select");
    setActiveTool(null);
  }, [editorRef]);

  const handleArrow = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setCurrentTool("arrow");
    setActiveTool("arrow");
  }, [editorRef]);

  const handleZoomIn = useCallback(() => {
    editorRef.current?.zoomIn();
  }, [editorRef]);

  const handleZoomOut = useCallback(() => {
    editorRef.current?.zoomOut();
  }, [editorRef]);

  const handleZoomFit = useCallback(() => {
    editorRef.current?.zoomToFit({ animation: { duration: 300 } });
  }, [editorRef]);

  const btnBase =
    "flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150";
  const btnDefault =
    "text-[var(--color-muted-fg)] hover:text-[var(--color-text)] hover:bg-white/10";
  const btnActive =
    "text-[var(--sticky-yellow)] bg-[var(--sticky-yellow)]/15";

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md shadow-lg"
      style={{ pointerEvents: "all" }}
    >
      {/* Select / pointer (default) */}
      <button
        onClick={handleSelect}
        className={`${btnBase} ${!activeTool ? btnActive : btnDefault}`}
        title="Select (V)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 1l16 11.5-6.5 1.5 4 8-3 1.5-4-8L4 21V1z" />
        </svg>
      </button>

      {/* Connect / arrow */}
      <button
        onClick={handleArrow}
        className={`${btnBase} ${activeTool === "arrow" ? btnActive : btnDefault}`}
        title="Connect (A)"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--color-border)] mx-0.5" />

      {/* Zoom controls */}
      <button onClick={handleZoomOut} className={`${btnBase} ${btnDefault}`} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button onClick={handleZoomFit} className={`${btnBase} ${btnDefault}`} title="Zoom to fit">
        <Maximize className="w-3.5 h-3.5" />
      </button>
      <button onClick={handleZoomIn} className={`${btnBase} ${btnDefault}`} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}

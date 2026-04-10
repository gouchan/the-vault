"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createShapeId, type Editor } from "@tldraw/tldraw";
import { ArrowRight, ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface CanvasToolbarProps {
  editor: Editor | null;
}

const HIDE_DELAY = 600;

export function CanvasToolbar({ editor }: CanvasToolbarProps) {
  const [currentTool, setCurrentTool] = useState("select");
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const show = useCallback(() => {
    clearHide();
    setVisible(true);
  }, []);
  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }, []);

  useEffect(() => () => clearHide(), []);

  useEffect(() => {
    if (!editor) return;

    const handleChange = () => {
      const toolId = editor.getCurrentToolId();
      setCurrentTool(toolId);
    };

    handleChange();

    const unlisten = editor.store.listen(handleChange, {
      scope: "session",
      source: "user",
    });

    return unlisten;
  }, [editor]);

  const handleSelect = useCallback(() => {
    editor?.setCurrentTool("select");
  }, [editor]);

  const handleArrow = useCallback(() => {
    editor?.setCurrentTool("arrow");
  }, [editor]);

  const handleCreateCluster = useCallback(() => {
    if (!editor) return;

    const center = editor.getViewportScreenCenter();
    const pagePoint = editor.screenToPage(center);
    const id = createShapeId();

    editor.createShapes([{
      id,
      type: "vault-cluster",
      x: pagePoint.x - 160,
      y: pagePoint.y - 100,
      props: { w: 320, h: 200, title: "Cluster", collapsed: false },
    }]);

    // Select the new cluster
    editor.select(id);
    editor.setCurrentTool("select");
  }, [editor]);

  const handleZoomIn = useCallback(() => {
    editor?.zoomIn();
  }, [editor]);

  const handleZoomOut = useCallback(() => {
    editor?.zoomOut();
  }, [editor]);

  const handleZoomFit = useCallback(() => {
    editor?.zoomToFit({ animation: { duration: 300 } });
  }, [editor]);

  const btnBase =
    "flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150";
  const btnDefault =
    "text-[var(--color-muted-fg)] hover:text-[var(--color-text)] hover:bg-white/10";
  const btnActive =
    "text-[var(--sticky-yellow)] bg-[var(--sticky-yellow)]/15";

  return (
    <>
      {/* Invisible hover trigger at the bottom edge */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 z-40"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
      />

      {/* The toolbar itself */}
      <div
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-md shadow-lg transition-all duration-300 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ pointerEvents: visible ? "all" : "none" }}
      >
      {/* Select / pointer */}
      <button
        onClick={handleSelect}
        className={`${btnBase} ${currentTool === "select" ? btnActive : btnDefault}`}
        title="Select (V)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 1l16 11.5-6.5 1.5 4 8-3 1.5-4-8L4 21V1z" />
        </svg>
      </button>

      {/* Connect / arrow */}
      <button
        onClick={handleArrow}
        className={`${btnBase} ${currentTool === "arrow" ? btnActive : btnDefault}`}
        title="Connect (A)"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Create cluster */}
      <button
        onClick={handleCreateCluster}
        className={`${btnBase} ${btnDefault}`}
        title="Create cluster"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
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
    </>
  );
}

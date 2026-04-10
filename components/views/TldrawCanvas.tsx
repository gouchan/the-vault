"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Tldraw, type Editor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useTheme } from "next-themes";
import type { Block, CanvasPosition } from "@/types/block";
import { VaultBlockShapeUtil } from "@/lib/tldraw/VaultBlockShape";
import { VaultClusterShapeUtil } from "@/lib/tldraw/VaultClusterShape";
import { ConnectorPreviewSheet } from "./ConnectorPreviewSheet";

// Hooks
import { useCanvasAutosave } from "@/lib/tldraw/hooks/useCanvasAutosave";
import { useCanvasSync } from "@/lib/tldraw/hooks/useCanvasSync";
import { useConnectorPreview } from "@/lib/tldraw/hooks/useConnectorPreview";
import { useExternalContent } from "@/lib/tldraw/hooks/useExternalContent";

// Canvas floating toolbar
import { CanvasToolbar } from "@/components/views/CanvasToolbar";

const shapeUtils = [VaultBlockShapeUtil, VaultClusterShapeUtil];

// ── Null components to strip all tldraw chrome ──────────────────
const HIDDEN_UI = {
  Toolbar: null,
  PageMenu: null,
  NavigationPanel: null,
  StylePanel: null,
  ActionsMenu: null,
  MainMenu: null,
  ContextMenu: null,
  HelpMenu: null,
  DebugPanel: null,
  Minimap: null,
  ZoomMenu: null,
  QuickActions: null,
  MenuPanel: null,
} as const;

// ── Props ──────────────────────────────────────────────────────
interface TldrawCanvasProps {
  boardId: string;
  blocks: Block[];
  positions: CanvasPosition[];
  previewSnapshot?: Record<string, any> | null;
  onBlockClick?: (block: Block) => void;
  onBlocksChanged?: () => void;
  onEditorReady?: (editor: Editor) => void;
}

export function TldrawCanvas({
  boardId,
  blocks,
  positions,
  previewSnapshot,
  onBlockClick,
  onBlocksChanged,
  onEditorReady,
}: TldrawCanvasProps) {
  const { resolvedTheme } = useTheme();
  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;

  const editorRef = useRef<Editor | null>(null);
  const [editorState, setEditorState] = useState<Editor | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const initializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Hooks ──────────────────────────────────────────────────────
  const autosave = useCanvasAutosave(boardId);

  const sync = useCanvasSync(
    editorRef,
    initializedRef,
    blocks,
    boardId,
    positions,
    previewSnapshot ?? null,
    autosave.saveHistoryIfChanged,
    autosave.setPreviewActive,
  );

  const connector = useConnectorPreview(containerRef);

  const content = useExternalContent(
    boardId,
    editorRef,
    blocksRef,
    onBlocksChanged,
    onBlockClick,
  );

  // ── Sync theme → tldraw ────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const scheme = resolvedTheme === "light" ? "light" : "dark";
    editor.user.updateUserPreferences({ colorScheme: scheme });
  }, [resolvedTheme]);

  // ── Mount handler ──────────────────────────────────────────────
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      setEditorState(editor);
      onEditorReady?.(editor);

      // Theme
      const scheme = resolvedThemeRef.current === "light" ? "light" : "dark";
      editor.user.updateUserPreferences({ colorScheme: scheme });

      // Enable snap mode for that "intentional placement" feel
      editor.user.updateUserPreferences({ isSnapMode: true });

      // Async init (snapshot load / migration)
      sync.initializeEditor(editor).catch(console.error);

      // Autosave + history
      autosave.setupAutosave(editor, initializedRef);

      // Connector preview
      connector.setupConnectorHandlers(editor);

      // External content (URL, file, text drops + double-click)
      content.setupExternalHandlers(editor);
    },
    [sync, autosave, connector, content, onEditorReady]
  );

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      autosave.cleanup(editorRef.current, initializedRef.current);
      connector.cleanup();
      content.cleanup();
    };
  }, [autosave, connector, content]);

  // Merge toast messages (connector takes priority since it's more important)
  const toastMessage = connector.toastMessage || content.contentToastMessage;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      onDrop={content.handleDrop}
      onDragOver={content.handleDragOver}
    >
      <Tldraw
        key={boardId}
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
        shapeUtils={shapeUtils}
        onMount={handleMount}
        components={HIDDEN_UI}
        options={{
          maxPages: 1,
        }}
      />

      {/* Custom floating toolbar */}
      <CanvasToolbar editor={editorState} />

      {/* Autosave dot — tiny, muted, only on active save */}
      <div
        className={`absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full transition-opacity duration-500 pointer-events-none ${
          autosave.saveStatus === "saving" ? "opacity-60" : "opacity-0"
        }`}
        style={{ background: "var(--sticky-yellow)" }}
      />

      {/* Connector preview sheet */}
      {connector.pendingConnection && (
        <div
          style={{
            position: "fixed",
            left: Math.min(
              Math.max(connector.pendingConnection.screenX - 160, 12),
              typeof window !== "undefined" ? window.innerWidth - 332 : 500
            ),
            top: connector.pendingConnection.screenY > 240
              ? connector.pendingConnection.screenY - 240
              : connector.pendingConnection.screenY + 24,
            zIndex: 9999,
          }}
        >
          <ConnectorPreviewSheet
            preview={connector.pendingConnection.preview}
            onSync={connector.handleSyncConnection}
            onSkip={connector.handleSkipConnection}
          />
        </div>
      )}

      {/* Toast */}
      {toastMessage && !connector.pendingConnection && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-md bg-[var(--sticky-yellow)] text-[var(--sticky-yellow-fg)] font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

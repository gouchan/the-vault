"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  Tldraw,
  createShapeId,
  getSnapshot,
  loadSnapshot,
  type Editor,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useTheme } from "next-themes";
import type { Block, CanvasPosition } from "@/types/block";
import {
  VaultBlockShapeUtil,
  blockToShapeProps,
  type VaultBlockShape,
} from "@/lib/tldraw/VaultBlockShape";
import {
  getTldrawSnapshot,
  saveTldrawSnapshot,
  saveHistorySnapshot,
} from "@/lib/actions/tldraw";
import { createBlock } from "@/lib/actions/blocks";
import { addBlockToBoard } from "@/lib/actions/boards";
import { detectMediaType, isValidUrl, normalizeUrl } from "@/lib/utils/url-parser";
import {
  getConnectorPreview,
  syncSelectedFields as syncSelectedFieldsAction,
  type ConnectorPreviewData,
} from "@/lib/actions/connectors";
import { ConnectorPreviewSheet } from "./ConnectorPreviewSheet";

// ── Constants ──────────────────────────────────────────────────
const AUTOSAVE_DEBOUNCE_MS = 1000;
const HISTORY_INTERVAL_MS = 60000; // 60 seconds

const shapeUtils = [VaultBlockShapeUtil];

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
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHistorySaveRef = useRef<string>(""); // JSON hash to avoid duplicate history saves
  const hasChangedSinceHistoryRef = useRef(false);
  const initializedRef = useRef(false);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Connector preview sheet
  const [pendingConnection, setPendingConnection] = useState<{
    fromBlockId: string;
    toBlockId: string;
    preview: ConnectorPreviewData;
    screenX: number;
    screenY: number;
  } | null>(null);
  const pendingConnectionRef = useRef(pendingConnection);
  pendingConnectionRef.current = pendingConnection;
  // Track which arrow+connection pairs have already triggered the sheet
  const seenConnectionsRef = useRef<Set<string>>(new Set());

  // ── Sync next-themes → tldraw dark mode ────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const scheme = resolvedTheme === "light" ? "light" : "dark";
    editor.user.updateUserPreferences({ colorScheme: scheme });
  }, [resolvedTheme]);

  // ── Preview snapshot: load history snapshot into editor ──────
  const previewActiveRef = useRef(false);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !initializedRef.current) return;
    let cancelled = false;

    if (previewSnapshot) {
      // Pause autosave during preview
      previewActiveRef.current = true;
      try {
        loadSnapshot(editor.store, previewSnapshot as any);
        editor.zoomToFit({ animation: { duration: 300 } });
      } catch (err) {
        console.error("Failed to load preview snapshot:", err);
      }
    } else if (previewActiveRef.current) {
      // Exiting preview — reload the current saved snapshot
      previewActiveRef.current = false;
      (async () => {
        try {
          const current = await getTldrawSnapshot(boardId);
          if (cancelled) return; // component unmounted or effect re-ran
          if (current?.snapshot && Object.keys(current.snapshot).length > 0) {
            loadSnapshot(editor.store, current.snapshot as any);
            editor.zoomToFit({ animation: { duration: 300 } });
          }
        } catch (err) {
          if (!cancelled) console.error("Failed to restore current snapshot:", err);
        }
      })();
    }

    return () => { cancelled = true; };
  }, [previewSnapshot, boardId]);

  // ── Autosave: persist snapshot ───────────────────────────────
  const debouncedSave = useCallback(
    (editor: Editor) => {
      if (previewActiveRef.current) return; // Don't save during preview
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setSaveStatus("saving");
      hasChangedSinceHistoryRef.current = true;

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const snapshot = getSnapshot(editor.store);
          await saveTldrawSnapshot(boardId, snapshot as any);
          setSaveStatus("saved");
          // Fade back to idle after 2s
          if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
          fadeTimeoutRef.current = setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
        } catch (err) {
          console.error("Autosave failed:", err);
          setSaveStatus("idle");
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [boardId]
  );

  // ── History: periodic snapshot ───────────────────────────────
  const saveHistoryIfChanged = useCallback(
    async (editor: Editor) => {
      if (!hasChangedSinceHistoryRef.current) return;
      try {
        const snapshot = getSnapshot(editor.store);
        const hash = JSON.stringify(snapshot).slice(0, 200); // rough comparison
        if (hash === lastHistorySaveRef.current) return;

        await saveHistorySnapshot(boardId, snapshot as any);
        lastHistorySaveRef.current = hash;
        hasChangedSinceHistoryRef.current = false;
      } catch (err) {
        console.error("History save failed:", err);
      }
    },
    [boardId]
  );

  // ── Handle arrow binding → show connector preview sheet ──────
  const handleArrowBinding = useCallback(
    (editor: Editor, changedArrowId: string) => {
      const arrow = editor.getShape(changedArrowId as any);
      if (!arrow || arrow.type !== "arrow") return;

      const bindings = editor.getBindingsFromShape(arrow, "arrow");
      const startBinding = bindings.find((b: any) => b.props?.terminal === "start");
      const endBinding = bindings.find((b: any) => b.props?.terminal === "end");

      if (!startBinding || !endBinding) return;

      const startShape = editor.getShape(startBinding.toId);
      const endShape = editor.getShape(endBinding.toId);

      if (startShape?.type !== "vault-block" || endShape?.type !== "vault-block") return;

      const fromBlockId = (startShape as VaultBlockShape).props.blockId;
      const toBlockId = (endShape as VaultBlockShape).props.blockId;
      const connectionKey = `${arrow.id}:${fromBlockId}->${toBlockId}`;

      if (!fromBlockId || !toBlockId || seenConnectionsRef.current.has(connectionKey)) return;
      seenConnectionsRef.current.add(connectionKey);

      // Calculate viewport position: midpoint between the two connected shapes
      // editor.pageToScreen() returns coords relative to the tldraw container element.
      // To use position:fixed (viewport space) we offset by the container's rect.
      const startBounds = editor.getShapeMaskedPageBounds(startShape.id);
      const endBounds = editor.getShapeMaskedPageBounds(endShape.id);
      let screenX = window.innerWidth / 2;
      let screenY = window.innerHeight / 2;
      if (startBounds && endBounds) {
        const midPage = {
          x: (startBounds.midX + endBounds.midX) / 2,
          y: (startBounds.midY + endBounds.midY) / 2,
        };
        const containerCoord = editor.pageToScreen(midPage);
        // Offset by the container's position in the viewport
        const containerRect = containerRef.current?.getBoundingClientRect();
        screenX = containerCoord.x + (containerRect?.left ?? 0);
        screenY = containerCoord.y + (containerRect?.top ?? 0);
      }

      getConnectorPreview(fromBlockId, toBlockId)
        .then((preview) => {
          // Use rAF so state update lands in React's rendering cycle
          requestAnimationFrame(() => {
            setPendingConnection({ fromBlockId, toBlockId, preview, screenX, screenY });
          });
        })
        .catch(console.error);
    },
    []
  );

  // ── Connector preview handlers ────────────────────────────────
  async function handleSyncConnection(selectedFields: string[], syncTags: boolean) {
    const conn = pendingConnectionRef.current;
    if (!conn) return;
    setPendingConnection(null);
    try {
      const result = await syncSelectedFieldsAction(conn.fromBlockId, conn.toBlockId, selectedFields, syncTags);
      const count = (result?.fieldsCopied ?? 0) + (result?.tagsSynced ? 1 : 0);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMessage(count > 0 ? `Synced ${count} field${count !== 1 ? "s" : ""}` : "Connected");
      toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Sync failed:", err);
    }
  }

  function handleSkipConnection() {
    setPendingConnection(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage("Connected");
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
  }

  // ── Drop/paste URL → fetch OG → create block → add shape ────
  const handleUrlDrop = useCallback(
    async (url: string, editor: Editor, x: number, y: number) => {
      const normalized = normalizeUrl(url);
      if (!isValidUrl(normalized)) return;

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMessage("Fetching link...");

      try {
        const mediaType = detectMediaType(normalized);
        let ogData: { title?: string | null; description?: string | null; image?: string | null } = {};
        try {
          const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(normalized)}`);
          if (res.ok) ogData = await res.json();
        } catch {}

        const block = await createBlock({
          type: "reference",
          url: normalized,
          media_type: mediaType,
          title: ogData.title || null,
          og_title: ogData.title || null,
          og_description: ogData.description || null,
          og_image: ogData.image || null,
          thumbnail_url: ogData.image || null,
        });

        await addBlockToBoard(boardId, block.id);

        const pagePoint = editor.screenToPage({ x, y });
        const id = createShapeId(`vault-${block.id}`);
        editor.createShapes([{
          id,
          type: "vault-block",
          x: pagePoint.x - 140,
          y: pagePoint.y - 110,
          props: {
            w: 280,
            h: ogData.image ? 220 : 100,
            ...blockToShapeProps(block),
          },
        }]);

        onBlocksChanged?.();
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToastMessage("Link added");
        toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
      } catch (err) {
        console.error("URL drop error:", err);
        setToastMessage(null);
      }
    },
    [boardId, onBlocksChanged]
  );

  // ── Upload file → create block → add shape ──────────────────
  const handleFileUpload = useCallback(
    async (file: File, editor: Editor, x: number, y: number) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large (max 10MB)");
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();

        // Create a reference block
        const block = await createBlock({
          type: "reference",
          title: file.name.replace(/\.[^.]+$/, ""),
          url,
          media_type: "image",
          thumbnail_url: url,
        });

        // Add to board
        await addBlockToBoard(boardId, block.id);

        // Add shape at drop position
        const pagePoint = editor.screenToPage({ x, y });
        const id = createShapeId(`vault-${block.id}`);
        editor.createShapes([
          {
            id,
            type: "vault-block",
            x: pagePoint.x,
            y: pagePoint.y,
            props: {
              w: 280,
              h: 220,
              ...blockToShapeProps(block),
            },
          },
        ]);

        onBlocksChanged?.();
      } catch (err) {
        console.error("File upload error:", err);
      }
    },
    [boardId, onBlocksChanged]
  );

  // ── tldraw mount handler ─────────────────────────────────────
  // ── Sync: load snapshot or migrate positions into editor ─────
  const initializeEditor = useCallback(
    async (editor: Editor) => {
      // 1. Try to load existing tldraw snapshot
      let loaded = false;
      try {
        const existing = await getTldrawSnapshot(boardId);
        if (existing && existing.snapshot && Object.keys(existing.snapshot).length > 0) {
          loadSnapshot(editor.store, existing.snapshot as any);
          loaded = true;
        }
      } catch (err) {
        console.error("Failed to load snapshot:", err);
      }

      // 1b. If snapshot was loaded, check if it contains vault-block shapes for our blocks.
      //     If blocks exist but none have shapes in the snapshot, create them.
      if (loaded && blocks.length > 0) {
        const existingShapes = editor
          .getCurrentPageShapes()
          .filter((s) => s.type === "vault-block") as VaultBlockShape[];
        const existingBlockIds = new Set(existingShapes.map((s) => s.props.blockId));

        const missingBlocks = blocks.filter((b) => !existingBlockIds.has(b.id));
        if (missingBlocks.length > 0) {
          const shapesToCreate = missingBlocks.map((block, i) => ({
            id: createShapeId(`vault-${block.id}`),
            type: "vault-block" as const,
            x: (i % 4) * 300 + 50,
            y: Math.floor(i / 4) * 250 + 50,
            props: {
              w: block.type === "reference" ? 280 : 240,
              h: block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160,
              ...blockToShapeProps(block),
            },
          }));
          editor.createShapes(shapesToCreate);
        }
      }

      // 2. If no snapshot, migrate from canvas_positions (existing boards)
      if (!loaded && positions.length > 0) {
        const shapesToCreate: any[] = [];
        const posMap = new Map(positions.map((p) => [p.block_id, p]));

        blocks.forEach((block, i) => {
          const pos = posMap.get(block.id);
          const defaultW = block.type === "reference" ? 280 : 240;
          const defaultH =
            block.type === "reference" && (block.thumbnail_url || block.og_image)
              ? 220
              : 160;

          shapesToCreate.push({
            id: createShapeId(`vault-${block.id}`),
            type: "vault-block",
            x: pos?.x ?? (i % 4) * 300 + 50,
            y: pos?.y ?? Math.floor(i / 4) * 250 + 50,
            props: {
              w: pos?.width ?? defaultW,
              h: pos?.height ?? defaultH,
              ...blockToShapeProps(block),
            },
          });
        });

        if (shapesToCreate.length > 0) {
          editor.createShapes(shapesToCreate);
        }
      } else if (!loaded && blocks.length > 0) {
        // 3. Fresh board with blocks but no positions — lay them out in a grid
        const shapesToCreate = blocks.map((block, i) => ({
          id: createShapeId(`vault-${block.id}`),
          type: "vault-block" as const,
          x: (i % 4) * 300 + 50,
          y: Math.floor(i / 4) * 250 + 50,
          props: {
            w: block.type === "reference" ? 280 : 240,
            h: block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160,
            ...blockToShapeProps(block),
          },
        }));

        editor.createShapes(shapesToCreate);
      }

      // Zoom to fit content
      const shapes = editor.getCurrentPageShapes();
      if (shapes.length > 0) {
        editor.zoomToFit({ animation: { duration: 300 } });
      }

      // Seed knownBlockIdsRef so the sync effect knows what's already on the canvas
      knownBlockIdsRef.current = new Set(blocks.map((b) => b.id));

      // Mark initialized after a short delay (to skip the initial load changes)
      setTimeout(() => {
        initializedRef.current = true;
      }, 500);

      // Save initial history snapshot
      setTimeout(() => {
        saveHistoryIfChanged(editor);
      }, 2000);
    },
    [boardId, blocks, positions, saveHistoryIfChanged]
  );

  // ── tldraw mount handler (MUST be synchronous — no async!) ──
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      onEditorReady?.(editor);

      // Sync theme immediately on mount
      const scheme = resolvedThemeRef.current === "light" ? "light" : "dark";
      editor.user.updateUserPreferences({ colorScheme: scheme });

      // Fire async initialization without returning the Promise
      // tldraw expects onMount to return void or a teardown fn, NOT a Promise
      initializeEditor(editor).catch(console.error);

      // ── Listen for all store changes → autosave ──────────────
      editor.store.listen(
        () => {
          if (initializedRef.current) {
            debouncedSave(editor);
          }
        },
        { scope: "document", source: "user" }
      );

      // ── Listen for binding creation → connector preview sheet ─
      // Fires when tldraw creates a new arrow binding (more reliable than shape change)
      editor.sideEffects.registerAfterCreateHandler("binding", (binding: any) => {
        if (binding.type === "arrow") {
          handleArrowBinding(editor, binding.fromId);
        }
      });
      // Also listen for shape changes as a fallback
      editor.sideEffects.registerAfterChangeHandler("shape", (prev, next) => {
        if (next.type === "arrow") {
          handleArrowBinding(editor, next.id);
        }
      });

      // ── Prevent tldraw from creating built-in bookmark shapes ──
      // Override the external content handler so tldraw never creates
      // its own bookmark/embed shapes — we handle all URLs ourselves.
      editor.registerExternalContentHandler("url", async (info) => {
        const center = editor.getViewportScreenCenter();
        handleUrlDrop(info.url, editor, center.x, center.y);
      });
      editor.registerExternalContentHandler("text", async (info) => {
        const text = info.text.trim();
        if (isValidUrl(text)) {
          const center = editor.getViewportScreenCenter();
          handleUrlDrop(text, editor, center.x, center.y);
          return;
        }
        // For non-URL text, let it become a default text shape
        // (do nothing — tldraw handles it)
      });

      // ── Double-click to open block ───────────────────────────
      editor.on("event", (event) => {
        if (event.name === "double_click" && event.phase === "up") {
          const selectedShapes = editor.getSelectedShapes();
          if (selectedShapes.length === 1 && selectedShapes[0].type === "vault-block") {
            const shape = selectedShapes[0] as VaultBlockShape;
            const block = blocksRef.current.find((b) => b.id === shape.props.blockId);
            if (block) onBlockClick?.(block);
          }
        }
      });

      // ── History interval ─────────────────────────────────────
      historyIntervalRef.current = setInterval(() => {
        saveHistoryIfChanged(editor);
      }, HISTORY_INTERVAL_MS);
    },
    [initializeEditor, debouncedSave, handleArrowBinding, onBlockClick, onEditorReady, saveHistoryIfChanged]
  );

  // ── Sync blocks prop changes into tldraw ─────────────────────
  // Track the block IDs we know about so we can detect actual additions/removals
  const knownBlockIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !initializedRef.current) return;

    const prevKnown = knownBlockIdsRef.current;
    const newBlockIds = new Set(blocks.map((b) => b.id));

    // On first run after init, record what we have and add any missing shapes
    // (don't delete anything on first run)
    if (prevKnown.size === 0) {
      knownBlockIdsRef.current = newBlockIds;

      // Still create shapes for blocks that aren't on the canvas yet
      const existingShapes = editor
        .getCurrentPageShapes()
        .filter((s) => s.type === "vault-block") as VaultBlockShape[];
      const existingBlockIds = new Set(existingShapes.map((s) => s.props.blockId));

      const missingShapes: any[] = [];
      blocks.forEach((block) => {
        if (!existingBlockIds.has(block.id)) {
          const viewportCenter = editor.getViewportScreenCenter();
          const pageCenter = editor.screenToPage(viewportCenter);
          missingShapes.push({
            id: createShapeId(`vault-${block.id}`),
            type: "vault-block",
            x: pageCenter.x + (Math.random() - 0.5) * 200,
            y: pageCenter.y + (Math.random() - 0.5) * 200,
            props: {
              w: block.type === "reference" ? 280 : 240,
              h: block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160,
              ...blockToShapeProps(block),
            },
          });
        }
      });
      if (missingShapes.length > 0) {
        editor.createShapes(missingShapes);
      }
      return;
    }

    const existingShapes = editor
      .getCurrentPageShapes()
      .filter((s) => s.type === "vault-block") as VaultBlockShape[];
    const existingBlockIds = new Set(existingShapes.map((s) => s.props.blockId));

    // Add new blocks (blocks in new set that weren't in previous known set)
    const shapesToCreate: any[] = [];
    blocks.forEach((block) => {
      if (!existingBlockIds.has(block.id)) {
        // Place new blocks near the center of the viewport
        const viewportCenter = editor.getViewportScreenCenter();
        const pageCenter = editor.screenToPage(viewportCenter);
        shapesToCreate.push({
          id: createShapeId(`vault-${block.id}`),
          type: "vault-block",
          x: pageCenter.x + (Math.random() - 0.5) * 200,
          y: pageCenter.y + (Math.random() - 0.5) * 200,
          props: {
            w: block.type === "reference" ? 280 : 240,
            h: block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160,
            ...blockToShapeProps(block),
          },
        });
      }
    });
    if (shapesToCreate.length > 0) {
      editor.createShapes(shapesToCreate);
    }

    // Update existing blocks (in case data changed)
    existingShapes.forEach((shape) => {
      const block = blocks.find((b) => b.id === shape.props.blockId);
      if (block) {
        const newProps = blockToShapeProps(block);
        const changed = Object.entries(newProps).some(
          ([k, v]) => (shape.props as any)[k] !== v
        );
        if (changed) {
          editor.updateShape({
            id: shape.id,
            type: "vault-block",
            props: newProps,
          });
        }
      }
    });

    // Remove shapes only for blocks that were previously known but are now gone
    // (i.e., actually removed from the board — not just missing from initial load)
    const shapesToRemove = existingShapes
      .filter((s) => prevKnown.has(s.props.blockId) && !newBlockIds.has(s.props.blockId))
      .map((s) => s.id);
    if (shapesToRemove.length > 0) {
      editor.deleteShapes(shapesToRemove);
    }

    // Update known set
    knownBlockIdsRef.current = newBlockIds;
  }, [blocks]);

  // ── Cleanup ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (historyIntervalRef.current) clearInterval(historyIntervalRef.current);

      // Final save on unmount
      const editor = editorRef.current;
      if (editor && initializedRef.current) {
        const snapshot = getSnapshot(editor.store);
        saveTldrawSnapshot(boardId, snapshot as any).catch(console.error);
        saveHistorySnapshot(boardId, snapshot as any).catch(console.error);
      }
    };
  }, [boardId]);

  // ── Drop handler for files and URLs ─────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        files.forEach((file) => {
          handleFileUpload(file, editor, e.clientX, e.clientY);
        });
        return;
      }

      // Handle URL drops (browser address bar drag, link drag, etc.)
      const uriList = e.dataTransfer.getData("text/uri-list");
      const textPlain = e.dataTransfer.getData("text/plain");
      const droppedUrl = (uriList || textPlain).trim().split("\n")[0].trim();
      if (droppedUrl && isValidUrl(droppedUrl)) {
        handleUrlDrop(droppedUrl, editor, e.clientX, e.clientY);
      }
    },
    [handleFileUpload, handleUrlDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ── Paste handler for images and URLs ───────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const editor = editorRef.current;
      if (!editor) return;

      const items = Array.from(e.clipboardData?.items || []);

      // Images take priority
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const center = editor.getViewportScreenCenter();
            handleFileUpload(file, editor, center.x, center.y);
          }
          return;
        }
      }

      // URL text paste — we must preventDefault SYNCHRONOUSLY before tldraw
      // can intercept the paste and create its own bookmark shape.
      // Read the text from clipboardData directly (sync) to check if it's a URL.
      const pastedText = e.clipboardData?.getData("text/plain") || e.clipboardData?.getData("text/uri-list") || "";
      const trimmedUrl = pastedText.trim().split("\n")[0].trim();
      if (trimmedUrl && isValidUrl(trimmedUrl)) {
        e.preventDefault();
        e.stopPropagation();
        const center = editor.getViewportScreenCenter();
        handleUrlDrop(trimmedUrl, editor, center.x, center.y);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFileUpload, handleUrlDrop]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden border border-[var(--border)]"
      style={{ height: "100%", minHeight: "300px" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Tldraw
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
        shapeUtils={shapeUtils}
        onMount={handleMount}
        options={{
          maxPages: 1,
        }}
      />

      {/* Autosave indicator */}
      <div
        className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md transition-opacity duration-300 ${
          saveStatus === "idle"
            ? "opacity-0"
            : "opacity-100"
        } ${
          saveStatus === "saving"
            ? "bg-[var(--sticky-yellow)]/20 text-[var(--sticky-yellow)]"
            : "bg-[var(--sticky-yellow)]/10 text-[var(--sticky-yellow)]/70"
        }`}
      >
        {saveStatus === "saving" ? "Saving..." : "Saved"}
      </div>

      {/* Connector preview sheet — fixed to viewport so overflow:hidden never clips it */}
      {pendingConnection && (
        <div
          style={{
            position: "fixed",
            // Sheet is ~320px wide; clamp with 12px margins from viewport edges
            left: Math.min(
              Math.max(pendingConnection.screenX - 160, 12),
              window.innerWidth - 332
            ),
            // Prefer above midpoint; flip below if too close to top
            top: pendingConnection.screenY > 240
              ? pendingConnection.screenY - 240
              : pendingConnection.screenY + 24,
            zIndex: 9999,
          }}
        >
          <ConnectorPreviewSheet
            preview={pendingConnection.preview}
            onSync={handleSyncConnection}
            onSkip={handleSkipConnection}
          />
        </div>
      )}

      {/* Connector toast */}
      {toastMessage && !pendingConnection && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-md bg-[var(--sticky-yellow)] text-[var(--sticky-yellow-fg)] font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

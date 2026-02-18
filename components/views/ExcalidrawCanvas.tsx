"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";
import type { Block, CanvasPosition } from "@/types/block";
import {
  blockToElementSkeleton,
  getBlockIdsFromScene,
  gridPosition,
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
} from "@/lib/excalidraw/blockElements";
import {
  getTldrawSnapshot,
  saveTldrawSnapshot,
  saveHistorySnapshot,
} from "@/lib/actions/tldraw";
import { createBlock } from "@/lib/actions/blocks";
import { addBlockToBoard } from "@/lib/actions/boards";
import { syncConnectedFields } from "@/lib/actions/connectors";

// Excalidraw types — use local aliases to avoid brittle deep imports
type ExcalidrawAPI = {
  updateScene: (scene: { elements?: any[]; appState?: any }) => void;
  getSceneElements: () => readonly any[];
  getSceneElementsIncludingDeleted: () => readonly any[];
  getAppState: () => any;
  getFiles: () => any;
  scrollToContent: (target?: any, opts?: any) => void;
  resetScene: () => void;
  onChange: (cb: (elements: readonly any[], appState: any, files: any) => void) => () => void;
  onPointerDown: (cb: (activeTool: any, state: any, event: any) => void) => () => void;
  onPointerUp: (cb: (activeTool: any, state: any, event: any) => void) => () => void;
};

// ── Constants ──────────────────────────────────────────────────
const AUTOSAVE_DEBOUNCE_MS = 1500;
const HISTORY_INTERVAL_MS = 60000; // 60 seconds

// ── Props ──────────────────────────────────────────────────────
export interface ExcalidrawCanvasProps {
  boardId: string;
  blocks: Block[];
  positions: CanvasPosition[];
  previewSnapshot?: Record<string, any> | null;
  onBlockClick?: (block: Block) => void;
  onBlocksChanged?: () => void;
}

export function ExcalidrawCanvas({
  boardId,
  blocks,
  positions,
  previewSnapshot,
  onBlockClick,
  onBlocksChanged,
}: ExcalidrawCanvasProps) {
  const { resolvedTheme } = useTheme();

  // ── Stable refs ────────────────────────────────────────────────
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const onBlockClickRef = useRef(onBlockClick);
  onBlockClickRef.current = onBlockClick;
  const onBlocksChangedRef = useRef(onBlocksChanged);
  onBlocksChangedRef.current = onBlocksChanged;
  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHistorySaveRef = useRef<string>("");
  const hasChangedSinceHistoryRef = useRef(false);
  const initializedRef = useRef(false);
  const previewActiveRef = useRef(false);
  const prevBlockIdsRef = useRef<string>("");

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build initial scene from blocks ────────────────────────────
  const buildSceneFromBlocks = useCallback(
    (blockList: Block[], positionList: CanvasPosition[]) => {
      if (blockList.length === 0) return { elements: [] as any[] };

      const posMap = new Map(positionList.map((p) => [p.block_id, p]));

      const skeletons = blockList.map((block, i) => {
        const pos = posMap.get(block.id);
        const grid = gridPosition(i);
        return blockToElementSkeleton(
          block,
          pos?.x ?? grid.x,
          pos?.y ?? grid.y
        );
      });

      const elements = convertToExcalidrawElements(skeletons as any[]);
      return { elements };
    },
    []
  );

  // ── Get scene data for persistence ─────────────────────────────
  const getSceneForSave = useCallback(() => {
    const api = apiRef.current;
    if (!api) return null;
    return {
      elements: api.getSceneElements(),
      appState: {
        viewBackgroundColor:
          api.getAppState().viewBackgroundColor,
      },
    };
  }, []);

  // ── Count vault block elements ─────────────────────────────────
  const countVaultElements = useCallback(() => {
    const api = apiRef.current;
    if (!api) return 0;
    return api
      .getSceneElements()
      .filter((el: any) => el.customData?.vaultBlockId && !el.isDeleted).length;
  }, []);

  // ── Autosave ───────────────────────────────────────────────────
  const debouncedSave = useCallback(() => {
    if (previewActiveRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    hasChangedSinceHistoryRef.current = true;

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Guard: don't persist empty canvas when blocks exist
        const vaultCount = countVaultElements();
        if (vaultCount === 0 && blocksRef.current.length > 0) {
          setSaveStatus("idle");
          return;
        }
        const scene = getSceneForSave();
        if (!scene) { setSaveStatus("idle"); return; }

        await saveTldrawSnapshot(boardIdRef.current, scene);
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
  }, [countVaultElements, getSceneForSave]);

  // ── History ────────────────────────────────────────────────────
  const saveHistoryIfChanged = useCallback(async () => {
    if (!hasChangedSinceHistoryRef.current) return;
    try {
      const scene = getSceneForSave();
      if (!scene) return;
      const hash = JSON.stringify(scene).slice(0, 200);
      if (hash === lastHistorySaveRef.current) return;
      await saveHistorySnapshot(boardIdRef.current, scene);
      lastHistorySaveRef.current = hash;
      hasChangedSinceHistoryRef.current = false;
    } catch (err) {
      console.error("History save failed:", err);
    }
  }, [getSceneForSave]);

  // ── onChange callback ──────────────────────────────────────────
  const handleChange = useCallback(
    (elements: readonly any[], appState: any) => {
      if (!initializedRef.current) return;
      debouncedSave();
    },
    [debouncedSave]
  );

  // ── Excalidraw API callback ────────────────────────────────────
  const handleExcalidrawAPI = useCallback(
    (api: any) => {
      apiRef.current = api as ExcalidrawAPI;
    },
    []
  );

  // ── Double-click detection via native DOM ──────────────────────
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDblClick = (e: MouseEvent) => {
      const api = apiRef.current;
      if (!api) return;

      const appState = api.getAppState();
      const elements = api.getSceneElements();

      // Get canvas coordinates from screen coordinates
      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Convert screen → scene coordinates
      const { scrollX, scrollY, zoom } = appState;
      const sceneX = (screenX / zoom.value) - scrollX;
      const sceneY = (screenY / zoom.value) - scrollY;

      // Find clicked vault block element
      for (const el of elements) {
        if (el.isDeleted) continue;
        if (!(el as any).customData?.vaultBlockId) continue;

        if (
          sceneX >= el.x &&
          sceneX <= el.x + el.width &&
          sceneY >= el.y &&
          sceneY <= el.y + el.height
        ) {
          const blockId = (el as any).customData.vaultBlockId;
          const block = blocksRef.current.find((b) => b.id === blockId);
          if (block) {
            e.preventDefault();
            e.stopPropagation();
            onBlockClickRef.current?.(block);
          }
          break;
        }
      }
    };

    container.addEventListener("dblclick", handleDblClick);
    return () => container.removeEventListener("dblclick", handleDblClick);
  }, []);

  // ── Initial data loader (async) ────────────────────────────────
  const loadInitialData = useCallback(async () => {
    const currentBlocks = blocksRef.current;
    const currentPositions = positionsRef.current;
    const currentBoardId = boardIdRef.current;

    // Try loading saved snapshot
    try {
      const existing = await getTldrawSnapshot(currentBoardId);
      if (existing?.snapshot && typeof existing.snapshot === "object") {
        const snap = existing.snapshot as any;
        // Validate it has elements (Excalidraw format)
        if (snap.elements && Array.isArray(snap.elements) && snap.elements.length > 0) {
          // Check for missing blocks and add them
          const sceneBlockIds = new Set<string>();
          for (const el of snap.elements) {
            if (el.customData?.vaultBlockId && !el.isDeleted) {
              sceneBlockIds.add(el.customData.vaultBlockId);
            }
          }

          const missing = currentBlocks.filter((b) => !sceneBlockIds.has(b.id));
          if (missing.length > 0) {
            const existingCount = snap.elements.length;
            const newSkeletons = missing.map((block, i) => {
              const grid = gridPosition(existingCount + i);
              return blockToElementSkeleton(block, grid.x, grid.y);
            });
            const newElements = convertToExcalidrawElements(newSkeletons as any[]);
            snap.elements = [...snap.elements, ...newElements];
          }

          // Seed the blockIds ref
          prevBlockIdsRef.current = currentBlocks
            .map((b) => b.id)
            .sort()
            .join(",");

          // Mark initialized after a short delay
          setTimeout(() => {
            initializedRef.current = true;
          }, 500);

          return {
            elements: snap.elements,
            appState: {
              ...snap.appState,
              theme: resolvedTheme === "light" ? "light" : "dark",
            },
            scrollToContent: true,
          };
        }
      }
    } catch (err) {
      console.error("Failed to load snapshot:", err);
    }

    // No saved snapshot — build from blocks
    const scene = buildSceneFromBlocks(currentBlocks, currentPositions);

    // Seed the blockIds ref
    prevBlockIdsRef.current = currentBlocks
      .map((b) => b.id)
      .sort()
      .join(",");

    setTimeout(() => {
      initializedRef.current = true;
    }, 500);

    return {
      elements: scene.elements,
      appState: {
        theme: resolvedTheme === "light" ? "light" : "dark",
        viewBackgroundColor: resolvedTheme === "light" ? "#ffffff" : "#121212",
      },
      scrollToContent: true,
    };
  }, [buildSceneFromBlocks, resolvedTheme]);

  // ── Preview snapshot ───────────────────────────────────────────
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    if (previewSnapshot) {
      previewActiveRef.current = true;
      try {
        const snap = previewSnapshot as any;
        if (snap.elements && Array.isArray(snap.elements)) {
          api.updateScene({
            elements: snap.elements,
          });
          api.scrollToContent();
        }
      } catch (err) {
        console.error("Failed to load preview snapshot:", err);
      }
    } else if (previewActiveRef.current) {
      previewActiveRef.current = false;
      // Restore current scene from DB
      (async () => {
        try {
          const current = await getTldrawSnapshot(boardIdRef.current);
          if (current?.snapshot) {
            const snap = current.snapshot as any;
            if (snap.elements && Array.isArray(snap.elements)) {
              api.updateScene({ elements: snap.elements });
              api.scrollToContent();
            }
          }
        } catch (err) {
          console.error("Failed to restore current snapshot:", err);
        }
      })();
    }
  }, [previewSnapshot]);

  // ── Sync blocks prop → scene ───────────────────────────────────
  const blockIdStr = blocks.map((b) => b.id).sort().join(",");

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !initializedRef.current) return;
    if (blockIdStr === prevBlockIdsRef.current) return;

    const prev = new Set(prevBlockIdsRef.current.split(",").filter(Boolean));
    const next = new Set(blockIdStr.split(",").filter(Boolean));
    prevBlockIdsRef.current = blockIdStr;

    const currentElements = api.getSceneElements();
    const onCanvas = getBlockIdsFromScene(currentElements);

    // Add elements for new blocks
    const newBlocks = blocks.filter((b) => !onCanvas.has(b.id));
    if (newBlocks.length > 0) {
      const appState = api.getAppState();
      const centerX = (-appState.scrollX + appState.width / 2) / appState.zoom.value;
      const centerY = (-appState.scrollY + appState.height / 2) / appState.zoom.value;

      const newSkeletons = newBlocks.map((block, i) =>
        blockToElementSkeleton(
          block,
          centerX + (Math.random() - 0.5) * 300 - BLOCK_WIDTH / 2,
          centerY + (Math.random() - 0.5) * 300 - BLOCK_HEIGHT / 2
        )
      );
      const newElements = convertToExcalidrawElements(newSkeletons as any[]);
      api.updateScene({
        elements: [...currentElements, ...newElements],
      });
    }

    // Remove elements for blocks that were explicitly removed
    if (prev.size > 0) {
      const removed = [...prev].filter((id) => !next.has(id));
      if (removed.length > 0) {
        const removedSet = new Set(removed);
        const updated = api.getSceneElements().map((el: any) => {
          if (el.customData?.vaultBlockId && removedSet.has(el.customData.vaultBlockId)) {
            return { ...el, isDeleted: true };
          }
          return el;
        });
        api.updateScene({ elements: updated });
      }
    }
  }, [blockIdStr, blocks]);

  // ── History interval ───────────────────────────────────────────
  useEffect(() => {
    historyIntervalRef.current = setInterval(() => {
      saveHistoryIfChanged();
    }, HISTORY_INTERVAL_MS);

    return () => {
      if (historyIntervalRef.current) clearInterval(historyIntervalRef.current);
    };
  }, [saveHistoryIfChanged]);

  // ── Arrow connector sync ───────────────────────────────────────
  // Check arrow bindings when scene changes
  const checkArrowConnectors = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;

    const elements = api.getSceneElements();
    const arrows = elements.filter((el: any) => el.type === "arrow" && !el.isDeleted);

    for (const arrow of arrows) {
      const arrowEl = arrow as any;
      const startId = arrowEl.startBinding?.elementId;
      const endId = arrowEl.endBinding?.elementId;

      if (startId && endId) {
        const startEl = elements.find((el: any) => el.id === startId);
        const endEl = elements.find((el: any) => el.id === endId);

        if (startEl && endEl) {
          const fromBlockId = (startEl as any).customData?.vaultBlockId;
          const toBlockId = (endEl as any).customData?.vaultBlockId;

          if (fromBlockId && toBlockId) {
            syncConnectedFields(fromBlockId, toBlockId).catch(console.error);
          }
        }
      }
    }
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (historyIntervalRef.current) clearInterval(historyIntervalRef.current);

      // Save on unmount — only if canvas has vault elements
      if (initializedRef.current && apiRef.current) {
        const vaultCount = apiRef.current
          .getSceneElements()
          .filter((el: any) => el.customData?.vaultBlockId && !el.isDeleted).length;

        if (vaultCount > 0 || blocksRef.current.length === 0) {
          const scene = {
            elements: apiRef.current.getSceneElements(),
            appState: {
              viewBackgroundColor:
                apiRef.current.getAppState().viewBackgroundColor,
            },
          };
          saveTldrawSnapshot(boardIdRef.current, scene).catch(console.error);
        }
      }

      initializedRef.current = false;
      apiRef.current = null;
    };
  }, []);

  // ── Drop handler ───────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const api = apiRef.current;
      if (!api) return;
      Array.from(e.dataTransfer.files).forEach((file) => {
        handleFileUpload(file, api, e.clientX, e.clientY);
      });
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ── File upload → create block → add element ──────────────────
  const handleFileUpload = useCallback(
    async (
      file: File,
      api: ExcalidrawAPI,
      screenX: number,
      screenY: number
    ) => {
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

        const block = await createBlock({
          type: "reference",
          title: file.name.replace(/\.[^.]+$/, ""),
          url,
          media_type: "image",
          thumbnail_url: url,
        });

        await addBlockToBoard(boardIdRef.current, block.id);

        // Convert screen → scene coordinates
        const appState = api.getAppState();
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const sx = screenX - rect.left;
          const sy = screenY - rect.top;
          const sceneX = (sx / appState.zoom.value) - appState.scrollX;
          const sceneY = (sy / appState.zoom.value) - appState.scrollY;

          const skeleton = blockToElementSkeleton(block, sceneX, sceneY);
          const newElements = convertToExcalidrawElements([skeleton as any]);
          const currentElements = api.getSceneElements();
          api.updateScene({
            elements: [...currentElements, ...newElements],
          });
        }

        onBlocksChangedRef.current?.();
      } catch (err) {
        console.error("File upload error:", err);
      }
    },
    []
  );

  // ── Paste handler ──────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const api = apiRef.current;
      if (!api) return;
      const items = Array.from(e.clipboardData?.items || []);
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const appState = api.getAppState();
            const centerX = appState.width / 2;
            const centerY = appState.height / 2;
            handleFileUpload(file, api, centerX, centerY);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFileUpload]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden border border-[var(--border)]"
      style={{ height: "100%", minHeight: "300px" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Excalidraw
        key={boardId}
        initialData={loadInitialData}
        excalidrawAPI={handleExcalidrawAPI}
        theme={resolvedTheme === "light" ? "light" : "dark"}
        onChange={handleChange}
      />

      {/* Autosave indicator */}
      <div
        className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md transition-opacity duration-300 pointer-events-none z-10 ${
          saveStatus === "idle" ? "opacity-0" : "opacity-100"
        } ${
          saveStatus === "saving"
            ? "bg-[var(--sticky-yellow)]/20 text-[var(--sticky-yellow)]"
            : "bg-[var(--sticky-yellow)]/10 text-[var(--sticky-yellow)]/70"
        }`}
      >
        {saveStatus === "saving" ? "Saving..." : "Saved"}
      </div>
    </div>
  );
}

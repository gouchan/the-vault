"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  createShapeId,
  getSnapshot,
  loadSnapshot,
  type Editor,
} from "@tldraw/tldraw";
import type { Block, CanvasPosition } from "@/types/block";
import {
  blockToShapeProps,
  type VaultBlockShape,
} from "@/lib/tldraw/VaultBlockShape";
import { getTldrawSnapshot } from "@/lib/actions/tldraw";

/**
 * Syncs the `blocks` prop into tldraw shapes.
 * Handles: initial load (snapshot / positions / fresh grid), block additions,
 * block removals, and block updates.
 */
export function useCanvasSync(
  editorRef: React.MutableRefObject<Editor | null>,
  initializedRef: React.MutableRefObject<boolean>,
  blocks: Block[],
  boardId: string,
  positions: CanvasPosition[],
  previewSnapshot: Record<string, any> | null,
  saveHistoryIfChanged: (editor: Editor) => Promise<void>,
  setPreviewActive: (active: boolean) => void,
) {
  const knownBlockIdsRef = useRef<Set<string>>(new Set());
  const previewActiveRef = useRef(false);

  /** Load snapshot or migrate positions. Call once after mount. */
  const initializeEditor = useCallback(
    async (editor: Editor) => {
      let loaded = false;

      // 1. Try existing tldraw snapshot
      try {
        const existing = await getTldrawSnapshot(boardId);
        if (existing?.snapshot && Object.keys(existing.snapshot).length > 0) {
          loadSnapshot(editor.store, existing.snapshot as any);
          loaded = true;
        }
      } catch (err) {
        console.error("Failed to load snapshot:", err);
      }

      // 1b. Snapshot loaded — create shapes for blocks missing from the snapshot
      if (loaded && blocks.length > 0) {
        const existing = editor
          .getCurrentPageShapes()
          .filter((s) => s.type === "vault-block") as VaultBlockShape[];
        const existingIds = new Set(existing.map((s) => s.props.blockId));
        const missing = blocks.filter((b) => !existingIds.has(b.id));

        if (missing.length > 0) {
          editor.createShapes(
            missing.map((block, i) => ({
              id: createShapeId(`vault-${block.id}`),
              type: "vault-block" as const,
              x: (i % 4) * 300 + 50,
              y: Math.floor(i / 4) * 250 + 50,
              props: {
                w: block.type === "reference" ? 280 : 240,
                h: block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160,
                ...blockToShapeProps(block),
              },
            }))
          );
        }
      }

      // 2. No snapshot — migrate from canvas_positions
      if (!loaded && positions.length > 0) {
        const posMap = new Map(positions.map((p) => [p.block_id, p]));
        const shapes = blocks.map((block, i) => {
          const pos = posMap.get(block.id);
          return {
            id: createShapeId(`vault-${block.id}`),
            type: "vault-block" as const,
            x: pos?.x ?? (i % 4) * 300 + 50,
            y: pos?.y ?? Math.floor(i / 4) * 250 + 50,
            props: {
              w: pos?.width ?? (block.type === "reference" ? 280 : 240),
              h: pos?.height ?? (block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160),
              ...blockToShapeProps(block),
            },
          };
        });
        if (shapes.length > 0) editor.createShapes(shapes);
      } else if (!loaded && blocks.length > 0) {
        // 3. Fresh board — grid layout
        editor.createShapes(
          blocks.map((block, i) => ({
            id: createShapeId(`vault-${block.id}`),
            type: "vault-block" as const,
            x: (i % 4) * 300 + 50,
            y: Math.floor(i / 4) * 250 + 50,
            props: {
              w: block.type === "reference" ? 280 : 240,
              h: block.type === "reference" && (block.thumbnail_url || block.og_image) ? 220 : 160,
              ...blockToShapeProps(block),
            },
          }))
        );
      }

      // Zoom to fit
      const shapes = editor.getCurrentPageShapes();
      if (shapes.length > 0) {
        editor.zoomToFit({ animation: { duration: 300 } });
      }

      // Seed known IDs
      knownBlockIdsRef.current = new Set(blocks.map((b) => b.id));

      // Mark initialized after a short delay (skip initial-load store changes)
      setTimeout(() => {
        initializedRef.current = true;
      }, 500);

      // Save initial history snapshot after settling
      setTimeout(() => {
        saveHistoryIfChanged(editor);
      }, 2000);
    },
    [boardId, blocks, positions, saveHistoryIfChanged, initializedRef]
  );

  // ── Preview snapshot loading ──────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !initializedRef.current) return;
    let cancelled = false;

    if (previewSnapshot) {
      previewActiveRef.current = true;
      setPreviewActive(true);
      try {
        loadSnapshot(editor.store, previewSnapshot as any);
        editor.zoomToFit({ animation: { duration: 300 } });
      } catch (err) {
        console.error("Failed to load preview snapshot:", err);
      }
    } else if (previewActiveRef.current) {
      previewActiveRef.current = false;
      setPreviewActive(false);
      (async () => {
        try {
          const current = await getTldrawSnapshot(boardId);
          if (cancelled) return;
          if (current?.snapshot && Object.keys(current.snapshot).length > 0) {
            loadSnapshot(editor.store, current.snapshot as any);
            editor.zoomToFit({ animation: { duration: 300 } });
          }
        } catch (err) {
          if (!cancelled) console.error("Failed to restore snapshot:", err);
        }
      })();
    }

    return () => { cancelled = true; };
  }, [previewSnapshot, boardId, editorRef, initializedRef, setPreviewActive]);

  // ── Ongoing block sync ────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !initializedRef.current) return;

    const prevKnown = knownBlockIdsRef.current;
    const newBlockIds = new Set(blocks.map((b) => b.id));

    // First run after init — record IDs, add missing shapes, don't delete
    if (prevKnown.size === 0) {
      knownBlockIdsRef.current = newBlockIds;

      const existingShapes = editor
        .getCurrentPageShapes()
        .filter((s) => s.type === "vault-block") as VaultBlockShape[];
      const existingBlockIds = new Set(existingShapes.map((s) => s.props.blockId));

      const missing: any[] = [];
      blocks.forEach((block) => {
        if (!existingBlockIds.has(block.id)) {
          const viewportCenter = editor.getViewportScreenCenter();
          const pageCenter = editor.screenToPage(viewportCenter);
          missing.push({
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
      if (missing.length > 0) editor.createShapes(missing);
      return;
    }

    const existingShapes = editor
      .getCurrentPageShapes()
      .filter((s) => s.type === "vault-block") as VaultBlockShape[];
    const existingBlockIds = new Set(existingShapes.map((s) => s.props.blockId));

    // Add new blocks
    const toCreate: any[] = [];
    blocks.forEach((block) => {
      if (!existingBlockIds.has(block.id)) {
        const viewportCenter = editor.getViewportScreenCenter();
        const pageCenter = editor.screenToPage(viewportCenter);
        toCreate.push({
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
    if (toCreate.length > 0) editor.createShapes(toCreate);

    // Update existing blocks with changed data
    existingShapes.forEach((shape) => {
      const block = blocks.find((b) => b.id === shape.props.blockId);
      if (block) {
        const newProps = blockToShapeProps(block);
        const changed = Object.entries(newProps).some(
          ([k, v]) => (shape.props as any)[k] !== v
        );
        if (changed) {
          editor.updateShape({ id: shape.id, type: "vault-block", props: newProps });
        }
      }
    });

    // Remove blocks that were known but are now gone
    const toRemove = existingShapes
      .filter((s) => prevKnown.has(s.props.blockId) && !newBlockIds.has(s.props.blockId))
      .map((s) => s.id);
    if (toRemove.length > 0) editor.deleteShapes(toRemove);

    knownBlockIdsRef.current = newBlockIds;
  }, [blocks, editorRef, initializedRef]);

  return { initializeEditor };
}

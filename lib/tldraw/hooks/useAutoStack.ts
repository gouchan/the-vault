"use client";

import { useCallback, useRef } from "react";
import { createShapeId, type Editor, type TLShape } from "@tldraw/tldraw";

/**
 * Auto-stack: when a vault-block is dropped overlapping another vault-block
 * (neither in a cluster), create a cluster containing both.
 *
 * This gives the "solitaire" feel — drop a card on another card, they stack.
 */
export function useAutoStack() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setup = useCallback((editor: Editor) => {
    // Listen for pointer-up after dragging (end of a move)
    const handleEvent = (event: any) => {
      if (event.name !== "pointer_up" || event.phase !== "up") return;

      // Only act when we just finished translating shapes
      const currentTool = editor.getCurrentToolId();
      if (currentTool !== "select") return;

      const selectedShapes = editor.getSelectedShapes();
      if (selectedShapes.length !== 1) return;

      const dragged = selectedShapes[0];
      if (dragged.type !== "vault-block") return;

      // Skip if already in a cluster
      const parentId = dragged.parentId;
      const parent = editor.getShape(parentId as any);
      if (parent && parent.type === "vault-cluster") return;

      // Find overlapping vault-block shapes (not the dragged one)
      const draggedBounds = editor.getShapePageBounds(dragged);
      if (!draggedBounds) return;

      const allShapes = editor.getCurrentPageShapes();
      let bestOverlap: TLShape | null = null;
      let bestArea = 0;

      for (const shape of allShapes) {
        if (shape.id === dragged.id) continue;
        if (shape.type === "vault-cluster") {
          // If dropped ON a cluster, the cluster's own drop handler handles it
          continue;
        }
        if (shape.type !== "vault-block") continue;

        // Skip if this shape is already in a cluster
        const sParent = editor.getShape(shape.parentId as any);
        if (sParent && sParent.type === "vault-cluster") continue;

        const shapeBounds = editor.getShapePageBounds(shape);
        if (!shapeBounds) continue;

        // Check overlap
        const overlapX = Math.max(0,
          Math.min(draggedBounds.maxX, shapeBounds.maxX) -
          Math.max(draggedBounds.minX, shapeBounds.minX)
        );
        const overlapY = Math.max(0,
          Math.min(draggedBounds.maxY, shapeBounds.maxY) -
          Math.max(draggedBounds.minY, shapeBounds.minY)
        );
        const area = overlapX * overlapY;

        // Need at least 30% overlap of the smaller shape to trigger stacking
        const draggedArea = draggedBounds.width * draggedBounds.height;
        const shapeArea = shapeBounds.width * shapeBounds.height;
        const smallerArea = Math.min(draggedArea, shapeArea);
        const overlapRatio = area / smallerArea;

        if (overlapRatio > 0.3 && area > bestArea) {
          bestArea = area;
          bestOverlap = shape;
        }
      }

      if (!bestOverlap) return;

      // Create a cluster containing both shapes
      const overlapBounds = editor.getShapePageBounds(bestOverlap);
      if (!overlapBounds) return;

      // Position cluster to encompass both shapes with padding
      const padding = 16;
      const headerHeight = 36;
      const minX = Math.min(draggedBounds.minX, overlapBounds.minX) - padding;
      const minY = Math.min(draggedBounds.minY, overlapBounds.minY) - headerHeight - padding;
      const maxX = Math.max(draggedBounds.maxX, overlapBounds.maxX) + padding;
      const maxY = Math.max(draggedBounds.maxY, overlapBounds.maxY) + padding;

      const clusterId = createShapeId();

      editor.run(() => {
        editor.createShapes([{
          id: clusterId,
          type: "vault-cluster",
          x: minX,
          y: minY,
          props: {
            w: maxX - minX,
            h: maxY - minY,
            title: "Stack",
            collapsed: false,
          },
        }]);

        // Reparent both shapes under the cluster
        editor.reparentShapes([bestOverlap!, dragged], clusterId);
      });

      editor.select(clusterId);
    };

    editor.on("event", handleEvent);
    cleanupRef.current = () => editor.off("event", handleEvent);
  }, []);

  const cleanup = useCallback(() => {
    if (cleanupRef.current) cleanupRef.current();
  }, []);

  return { setup, cleanup };
}

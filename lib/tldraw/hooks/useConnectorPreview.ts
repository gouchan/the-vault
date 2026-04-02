"use client";

import { useCallback, useRef, useState, type MutableRefObject } from "react";
import type { Editor } from "@tldraw/tldraw";
import type { VaultBlockShape } from "@/lib/tldraw/VaultBlockShape";
import {
  getConnectorPreview,
  syncSelectedFields as syncSelectedFieldsAction,
  type ConnectorPreviewData,
} from "@/lib/actions/connectors";

export interface PendingConnection {
  fromBlockId: string;
  toBlockId: string;
  preview: ConnectorPreviewData;
  screenX: number;
  screenY: number;
}

/**
 * Manages the connector preview sheet shown when an arrow is drawn
 * between two vault-block shapes.
 */
export function useConnectorPreview(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const pendingConnectionRef = useRef(pendingConnection);
  pendingConnectionRef.current = pendingConnection;

  const seenConnectionsRef = useRef<Set<string>>(new Set());

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Check an arrow for vault-block endpoints and show the preview sheet. */
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

      // Calculate viewport position for the sheet
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
        const containerRect = containerRef.current?.getBoundingClientRect();
        screenX = containerCoord.x + (containerRect?.left ?? 0);
        screenY = containerCoord.y + (containerRect?.top ?? 0);
      }

      getConnectorPreview(fromBlockId, toBlockId)
        .then((preview) => {
          requestAnimationFrame(() => {
            setPendingConnection({ fromBlockId, toBlockId, preview, screenX, screenY });
          });
        })
        .catch(console.error);
    },
    [containerRef]
  );

  const cleanupHandlersRef = useRef<(() => void)[]>([]);

  /** Register tldraw side-effect handlers. Call in handleMount. */
  const setupConnectorHandlers = useCallback(
    (editor: Editor) => {
      const unsubCreate = editor.sideEffects.registerAfterCreateHandler("binding", (binding: any) => {
        if (binding.type === "arrow") {
          handleArrowBinding(editor, binding.fromId);
        }
      });
      const unsubChange = editor.sideEffects.registerAfterChangeHandler("shape", (_prev, next) => {
        if (next.type === "arrow") {
          handleArrowBinding(editor, next.id);
        }
      });
      cleanupHandlersRef.current = [unsubCreate, unsubChange];
    },
    [handleArrowBinding]
  );

  /** Sync selected fields between connected blocks. */
  async function handleSyncConnection(selectedFields: string[], syncTags: boolean) {
    const conn = pendingConnectionRef.current;
    if (!conn) return;
    setPendingConnection(null);
    try {
      const result = await syncSelectedFieldsAction(
        conn.fromBlockId,
        conn.toBlockId,
        selectedFields,
        syncTags
      );
      const count = (result?.fieldsCopied ?? 0) + (result?.tagsSynced ? 1 : 0);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMessage(count > 0 ? `Synced ${count} field${count !== 1 ? "s" : ""}` : "Connected");
      toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Sync failed:", err);
    }
  }

  /** Skip syncing, just show "Connected" toast. */
  function handleSkipConnection() {
    setPendingConnection(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage("Connected");
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
  }

  /** Clean up toast timeout + side-effect handlers. */
  function cleanup() {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    cleanupHandlersRef.current.forEach((fn) => fn());
    cleanupHandlersRef.current = [];
  }

  return {
    pendingConnection,
    toastMessage,
    handleArrowBinding,
    setupConnectorHandlers,
    handleSyncConnection,
    handleSkipConnection,
    cleanup,
  };
}

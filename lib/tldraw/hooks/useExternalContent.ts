"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { createShapeId, type Editor } from "@tldraw/tldraw";
import { createBlock } from "@/lib/actions/blocks";
import { addBlockToBoard } from "@/lib/actions/boards";
import {
  detectMediaType,
  isValidUrl,
  normalizeUrl,
} from "@/lib/utils/url-parser";
import { blockToShapeProps } from "@/lib/tldraw/VaultBlockShape";
import type { Block } from "@/types/block";

/**
 * Handles external content: URL drops/pastes, file uploads, and
 * the corresponding tldraw handler registrations.
 */
export function useExternalContent(
  boardId: string,
  editorRef: React.MutableRefObject<Editor | null>,
  blocksRef: React.MutableRefObject<Block[]>,
  onBlocksChanged?: () => void,
  onBlockClick?: (block: Block) => void,
) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, duration = 2000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), duration);
  }, []);

  /** Create a block from a URL, add it to the board, and place a shape. */
  const handleUrlDrop = useCallback(
    async (url: string, editor: Editor, x: number, y: number) => {
      const normalized = normalizeUrl(url);
      if (!isValidUrl(normalized)) return;

      showToast("Fetching link...", 10000);

      try {
        const mediaType = detectMediaType(normalized);
        let ogData: { title?: string | null; description?: string | null; image?: string | null } = {};
        try {
          const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(normalized)}`);
          if (res.ok) ogData = await res.json();
        } catch { /* OG fetch is best-effort */ }

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
        showToast("Link added");
      } catch (err) {
        console.error("URL drop error:", err);
        setToastMessage(null);
      }
    },
    [boardId, onBlocksChanged, showToast]
  );

  /** Upload an image file, create a block, and place a shape. */
  const handleFileUpload = useCallback(
    async (file: File, editor: Editor, x: number, y: number) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) {
        showToast("File too large (max 10MB)");
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

        await addBlockToBoard(boardId, block.id);

        const pagePoint = editor.screenToPage({ x, y });
        const id = createShapeId(`vault-${block.id}`);
        editor.createShapes([{
          id,
          type: "vault-block",
          x: pagePoint.x,
          y: pagePoint.y,
          props: { w: 280, h: 220, ...blockToShapeProps(block) },
        }]);

        onBlocksChanged?.();
      } catch (err) {
        console.error("File upload error:", err);
      }
    },
    [boardId, onBlocksChanged, showToast]
  );

  const eventCleanupRef = useRef<(() => void) | null>(null);

  /** Register tldraw external content handlers + double-click. Call in handleMount. */
  const setupExternalHandlers = useCallback(
    (editor: Editor) => {
      // URL drops — override tldraw's built-in bookmark creation
      editor.registerExternalContentHandler("url", async (info) => {
        const center = editor.getViewportScreenCenter();
        handleUrlDrop(info.url, editor, center.x, center.y);
      });

      // Text drops — check for URLs first
      editor.registerExternalContentHandler("text", async (info) => {
        const text = info.text.trim();
        if (isValidUrl(text)) {
          const center = editor.getViewportScreenCenter();
          handleUrlDrop(text, editor, center.x, center.y);
        }
        // Non-URL text falls through to tldraw default
      });

      // File drops — upload images
      editor.registerExternalContentHandler("files", async (info) => {
        const images = info.files.filter((f: File) => f.type.startsWith("image/"));
        for (const file of images) {
          const center = editor.getViewportScreenCenter();
          await handleFileUpload(file, editor, center.x, center.y);
        }
      });

      // Double-click → open block detail
      const handleDoubleClick = (event: any) => {
        if (event.name === "double_click" && event.phase === "up") {
          const selectedShapes = editor.getSelectedShapes();
          if (selectedShapes.length === 1 && selectedShapes[0].type === "vault-block") {
            const shape = selectedShapes[0] as any;
            const block = blocksRef.current.find((b) => b.id === shape.props.blockId);
            if (block) onBlockClick?.(block);
          }
        }
      };
      editor.on("event", handleDoubleClick);
      eventCleanupRef.current = () => editor.off("event", handleDoubleClick);
    },
    [handleUrlDrop, handleFileUpload, blocksRef, onBlockClick]
  );

  // ── React drop/paste handlers (outside tldraw's system) ─────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        files.forEach((file) => handleFileUpload(file, editor, e.clientX, e.clientY));
        return;
      }

      const uriList = e.dataTransfer.getData("text/uri-list");
      const textPlain = e.dataTransfer.getData("text/plain");
      const droppedUrl = (uriList || textPlain).trim().split("\n")[0].trim();
      if (droppedUrl && isValidUrl(droppedUrl)) {
        handleUrlDrop(droppedUrl, editor, e.clientX, e.clientY);
      }
    },
    [editorRef, handleFileUpload, handleUrlDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // ── Paste handler (window-level, runs before tldraw's) ────────
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

      // URL text
      const pastedText =
        e.clipboardData?.getData("text/plain") ||
        e.clipboardData?.getData("text/uri-list") ||
        "";
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
  }, [editorRef, handleFileUpload, handleUrlDrop]);

  function cleanup() {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (eventCleanupRef.current) eventCleanupRef.current();
  }

  return {
    contentToastMessage: toastMessage,
    setupExternalHandlers,
    handleDrop,
    handleDragOver,
    cleanup,
  };
}

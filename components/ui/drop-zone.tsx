"use client";

import { useState, useCallback, useRef } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { createBlock } from "@/lib/actions/blocks";

interface DropZoneProps {
  children: React.ReactNode;
  /** Board ID — if provided, also adds the block to this board */
  boardId?: string;
  onUploaded?: () => void;
  className?: string;
}

export function DropZone({ children, boardId, onUploaded, className }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) continue; // skip >10MB

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) continue;
        const { url } = await res.json();

        const block = await createBlock({
          type: "reference",
          title: file.name.replace(/\.[^.]+$/, ""),
          url,
          media_type: "image",
          thumbnail_url: url,
        });

        if (boardId) {
          // Dynamic import to avoid circular deps
          const { addBlockToBoard } = await import("@/lib/actions/boards");
          await addBlockToBoard(boardId, block.id);
        }
      }
      onUploaded?.();
    } catch (err) {
      console.error("Drop upload error:", err);
    } finally {
      setUploading(false);
    }
  }, [boardId, onUploaded]);

  return (
    <div
      className={`relative ${className || ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {(dragging || uploading) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--ring)] bg-[var(--background)]/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium">Uploading...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <p className="text-sm font-medium">Drop images here</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

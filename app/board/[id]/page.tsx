"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getBoardWithBlocks } from "@/lib/actions/boards";
import { getCanvasPositions } from "@/lib/actions/canvas";
import type { Block, CanvasPosition } from "@/types/block";

// Dynamic import — tldraw must not be SSR'd
const TldrawCanvas = dynamic(
  () => import("@/components/views/TldrawCanvas").then((m) => m.TldrawCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
      </div>
    ),
  }
);

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  const [board, setBoard] = useState<Block | null>(null);
  const [canvasPositions, setCanvasPositions] = useState<CanvasPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleHovered, setTitleHovered] = useState(false);

  const loadBoard = useCallback(async () => {
    try {
      const [data, positions] = await Promise.all([
        getBoardWithBlocks(boardId),
        getCanvasPositions(boardId),
      ]);
      setBoard(data);
      setCanvasPositions(positions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
        Garland not found
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Canvas fills everything */}
      <TldrawCanvas
        boardId={boardId}
        blocks={board.children || []}
        positions={canvasPositions}
        previewSnapshot={null}
        onBlockClick={(block) => {
          if (block.type === "board") router.push(`/board/${block.id}`);
          else router.push(`/block/${block.id}`);
        }}
        onBlocksChanged={loadBoard}
        onEditorReady={() => {}}
      />

      {/* Title overlay — only shows on hover near the top */}
      <div
        className="absolute top-0 left-0 right-0 h-12 z-30 flex items-center justify-center pointer-events-none"
        onMouseEnter={() => setTitleHovered(true)}
        onMouseLeave={() => setTitleHovered(false)}
      >
        <div
          className={`pointer-events-auto px-4 py-1.5 rounded-full text-xs font-medium text-[var(--muted-foreground)] transition-opacity duration-300 ${
            titleHovered ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          {board.title || "Untitled Garland"}
        </div>
      </div>

      {/* Invisible hover trigger for title */}
      <div
        className="absolute top-0 left-0 right-0 h-6 z-20"
        onMouseEnter={() => setTitleHovered(true)}
        onMouseLeave={() => setTitleHovered(false)}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getBoardWithBlocks } from "@/lib/actions/boards";
import { getBlocks } from "@/lib/actions/blocks";
import { addBlockToBoard } from "@/lib/actions/boards";
import { getCanvasPositions } from "@/lib/actions/canvas";
import { GridView } from "@/components/views/GridView";
import { HistoryTimeline } from "@/components/views/HistoryTimeline";
import { BlockForm } from "@/components/forms/BlockForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Block, BlockType, CanvasPosition } from "@/types/block";
import { Grid3x3, Pencil, Plus, User, Link2, FileText, Clock } from "lucide-react";

// Dynamic import — tldraw must not be SSR'd
const TldrawCanvas = dynamic(
  () => import("@/components/views/TldrawCanvas").then((m) => m.TldrawCanvas),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center border border-[var(--border)] rounded-lg h-full" style={{ minHeight: "300px" }}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
    </div>
  )}
);

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  const [board, setBoard] = useState<Block | null>(null);
  const [view, setView] = useState<"grid" | "canvas">("canvas"); // Default to canvas
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<BlockType | null>(null);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [canvasPositions, setCanvasPositions] = useState<CanvasPosition[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function handleOpenAddDialog() {
    const blocks = await getBlocks({ limit: 200 });
    const childIds = new Set(board?.children?.map((c) => c.id) || []);
    setAllBlocks(blocks.filter((b) => b.type !== "board" && !childIds.has(b.id)));
    setAddDialogOpen(true);
  }

  async function handleAddBlock(blockId: string) {
    await addBlockToBoard(boardId, blockId);
    setAddDialogOpen(false);
    loadBoard();
  }

  function handleCreateAndAdd(type: BlockType) {
    setAddDialogOpen(false);
    setCreateType(type);
  }

  async function handleBlockCreated() {
    const blocks = await getBlocks({ limit: 1 });
    if (blocks.length > 0) {
      await addBlockToBoard(boardId, blocks[0].id);
    }
    setCreateType(null);
    loadBoard();
  }

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
        Board not found
      </div>
    );
  }

  return (
    <div className={view === "canvas" ? "flex flex-col h-screen" : "p-6"}>
      {/* Header */}
      <div className={`flex items-start justify-between ${view === "canvas" ? "px-4 py-3" : "mb-6"}`}>
        <div className="min-w-0">
          <h1 className="text-xl font-bold truncate">{board.title || "Untitled Board"}</h1>
          {board.description && view !== "canvas" && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{board.description}</p>
          )}
          <p className="text-xs text-[var(--muted-foreground)]">
            {board.children?.length || 0} items
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* History toggle (canvas only) */}
          {view === "canvas" && (
            <Button
              variant={showHistory ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              title="Toggle history timeline"
              className="h-8"
            >
              <Clock className="h-4 w-4 mr-1" /> History
            </Button>
          )}

          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-[var(--border)]">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setView("grid")}
              title="Grid view"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "canvas" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setView("canvas")}
              title="Infinite canvas"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          <Button size="sm" onClick={handleOpenAddDialog} className="h-8">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* View */}
      {view === "grid" ? (
        <GridView
          blocks={board.children || []}
          onBlockClick={(block) => {
            if (block.type === "board") router.push(`/board/${block.id}`);
            else router.push(`/block/${block.id}`);
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-2">
          <div className="min-h-0" style={{ flex: "1 1 0%" }}>
            <TldrawCanvas
              boardId={boardId}
              blocks={board.children || []}
              positions={canvasPositions}
              previewSnapshot={previewSnapshot}
              onBlockClick={(block) => {
                if (block.type === "board") router.push(`/board/${block.id}`);
                else router.push(`/block/${block.id}`);
              }}
              onBlocksChanged={loadBoard}
            />
          </div>

          {/* History Timeline — sits below the canvas, never overlapped by tldraw toolbar */}
          {showHistory && (
            <HistoryTimeline
              boardId={boardId}
              onPreviewSnapshot={(snapshot) => {
                setPreviewSnapshot(snapshot);
              }}
              onRestoreSnapshot={(snapshot) => {
                window.location.reload();
              }}
            />
          )}
        </div>
      )}

      {/* Add Block Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent onClose={() => setAddDialogOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Block to Board</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => handleCreateAndAdd("person")} className="text-xs">
              <User className="mr-1 h-3 w-3" /> New Person
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleCreateAndAdd("reference")} className="text-xs">
              <Link2 className="mr-1 h-3 w-3" /> New Reference
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleCreateAndAdd("prompt")} className="text-xs">
              <FileText className="mr-1 h-3 w-3" /> New Prompt
            </Button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 mt-3">
            {allBlocks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-6">
                No existing blocks to add. Use the buttons above to create one.
              </p>
            ) : (
              <>
                <p className="text-xs text-[var(--muted-foreground)] px-1">Or add an existing block:</p>
                {allBlocks.map((block) => (
                  <button
                    key={block.id}
                    onClick={() => handleAddBlock(block.id)}
                    className="flex w-full items-center gap-3 rounded-md border border-[var(--border)] p-3 text-left transition-colors hover:bg-[var(--accent)]"
                  >
                    <span className="text-xs capitalize text-[var(--muted-foreground)] w-16">
                      {block.type}
                    </span>
                    <span className="text-sm truncate flex-1">{block.title || "Untitled"}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Block Dialog */}
      <Dialog open={!!createType} onOpenChange={() => setCreateType(null)}>
        <DialogContent onClose={() => setCreateType(null)}>
          <DialogHeader>
            <DialogTitle className="capitalize">New {createType}</DialogTitle>
          </DialogHeader>
          {createType && (
            <BlockForm
              type={createType}
              onSaved={handleBlockCreated}
              onCancel={() => setCreateType(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

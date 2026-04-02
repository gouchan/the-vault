"use client";

import { useState, useEffect, useRef } from "react";
import { FolderInput, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBoards, getBoardsForBlock, moveBlockToBoard } from "@/lib/actions/boards";

interface MoveToGarlandProps {
  blockId: string;
  currentBoardId?: string;
  onMoved?: () => void;
}

export function MoveToGarland({ blockId, currentBoardId, onMoved }: MoveToGarlandProps) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);
  const [currentBoards, setCurrentBoards] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const [allBoards, blockBoards] = await Promise.all([
        getBoards(),
        getBoardsForBlock(blockId),
      ]);
      setBoards(allBoards);
      setCurrentBoards(new Set(blockBoards.map((b: any) => b.id)));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(toBoardId: string) {
    if (currentBoards.has(toBoardId)) return;
    setMoving(toBoardId);
    try {
      await moveBlockToBoard(blockId, toBoardId, currentBoardId);
      setOpen(false);
      onMoved?.();
    } catch (err) {
      console.error(err);
    } finally {
      setMoving(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        title="Move to garland"
        onClick={handleOpen}
      >
        <FolderInput className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] border-b border-[var(--border)]">
            Move to garland
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
            </div>
          ) : boards.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">No garlands found</p>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {boards.map((board) => {
                const isCurrent = currentBoards.has(board.id);
                const isMoving = moving === board.id;
                return (
                  <button
                    key={board.id}
                    disabled={isCurrent || isMoving}
                    onClick={() => handleSelect(board.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)] disabled:cursor-default disabled:opacity-60"
                  >
                    <span className="flex-1 truncate">{board.title || "Untitled"}</span>
                    {isCurrent && <Check className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />}
                    {isMoving && (
                      <div className="h-3 w-3 shrink-0 animate-spin rounded-full border border-[var(--muted-foreground)] border-t-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

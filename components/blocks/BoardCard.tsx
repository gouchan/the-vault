"use client";

import type { Block } from "@/types/block";
import { LayoutGrid, Pin } from "lucide-react";

export function BoardCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  const childCount = (block as any)._count?.children || 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--ring)] hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-[var(--muted-foreground)]" />
          <h3 className="text-sm font-medium">{block.title || "Untitled Board"}</h3>
        </div>
        {block.pinned && <Pin className="h-3 w-3 text-[var(--muted-foreground)]" />}
      </div>

      {block.description && (
        <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
          {block.description}
        </p>
      )}

      <div className="mt-3 text-xs text-[var(--muted-foreground)]">
        {childCount} {childCount === 1 ? "item" : "items"}
      </div>
    </div>
  );
}

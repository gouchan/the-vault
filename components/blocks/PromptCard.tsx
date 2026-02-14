"use client";

import type { Block } from "@/types/block";
import { Badge } from "@/components/ui/badge";
import { FileText, Layers } from "lucide-react";

export function PromptCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--ring)] hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium truncate">{block.title || "Untitled Prompt"}</h3>
          {block.description && (
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)] truncate">
              {block.description}
            </p>
          )}
        </div>
      </div>

      {block.content && (
        <div className="mt-2 rounded bg-[var(--secondary)] p-2">
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-4 whitespace-pre-wrap font-mono">
            {block.content}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {block.tags?.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag.name}
            </Badge>
          ))}
        </div>
        {(block as any)._count?.children > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
            <Layers className="h-3 w-3" /> {(block as any)._count.children}
          </span>
        )}
      </div>
    </div>
  );
}

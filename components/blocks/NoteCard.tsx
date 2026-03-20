"use client";

import type { Block } from "@/types/block";
import { Badge } from "@/components/ui/badge";

export function NoteCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  const title = block.title || "Untitled";
  const content = block.content || "";
  const hasContent = content.trim().length > 0;
  const hasTitle = block.title && block.title.trim().length > 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl overflow-hidden bg-[var(--card)] border border-transparent hover:border-[var(--border)] transition-all duration-200 hover:shadow-lg hover:shadow-black/30"
    >
      <div className="p-4">
        {hasTitle && (
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-2">
            {title}
          </h3>
        )}
        {hasContent && (
          <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)] line-clamp-8 whitespace-pre-wrap">
            {content}
          </p>
        )}
        {!hasTitle && !hasContent && (
          <p className="text-sm text-[var(--muted-foreground)] italic">Empty note</p>
        )}
      </div>

      {/* Tags */}
      {block.tags && block.tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {block.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Bottom bar — type indicator */}
      <div className="px-4 pb-3 pt-1 border-t border-[var(--border)]/30">
        <span className="text-[10px] text-[var(--muted-foreground)]/60 uppercase tracking-wider font-medium">
          Note
        </span>
      </div>
    </div>
  );
}

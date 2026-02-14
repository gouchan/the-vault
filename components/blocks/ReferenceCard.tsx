"use client";

import type { Block } from "@/types/block";
import { Badge } from "@/components/ui/badge";
import { getYouTubeId, getVimeoId } from "@/lib/utils/url-parser";
import { ExternalLink, Play, Image as ImageIcon, Link2, Layers } from "lucide-react";

export function ReferenceCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  const youtubeId = block.url ? getYouTubeId(block.url) : null;
  const vimeoId = block.url ? getVimeoId(block.url) : null;
  const thumbnailUrl = block.thumbnail_url || block.og_image || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] transition-all hover:border-[var(--ring)] hover:shadow-md"
    >
      {/* Thumbnail / Media Preview */}
      {thumbnailUrl ? (
        <div className="relative aspect-video w-full overflow-hidden bg-[var(--secondary)]">
          <img
            src={thumbnailUrl}
            alt={block.title || block.og_title || ""}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {(youtubeId || vimeoId || block.media_type === "video") && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/60 p-2">
                <Play className="h-5 w-5 text-white" fill="white" />
              </div>
            </div>
          )}
        </div>
      ) : block.media_type === "image" && block.url ? (
        <div className="relative aspect-video w-full overflow-hidden bg-[var(--secondary)]">
          <img
            src={block.url}
            alt={block.title || ""}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-[var(--secondary)]">
          {block.media_type === "image" ? (
            <ImageIcon className="h-8 w-8 text-[var(--muted-foreground)]" />
          ) : (
            <Link2 className="h-8 w-8 text-[var(--muted-foreground)]" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium line-clamp-2">
            {block.title || block.og_title || block.url || "Untitled"}
          </h3>
          {block.url && (
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {(block.description || block.og_description) && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
            {block.description || block.og_description}
          </p>
        )}

        {block.url && (
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)] truncate opacity-50">
            {new URL(block.url).hostname}
          </p>
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
    </div>
  );
}

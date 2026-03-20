"use client";

import type { Block } from "@/types/block";
import { Link2, FileText, User, Layers, Image as ImageIcon } from "lucide-react";

function getBlockTypeIcon(type: string) {
  switch (type) {
    case "reference": return Link2;
    case "note": return FileText;
    case "person": return User;
    case "board": return Layers;
    default: return FileText;
  }
}

function getBlockImage(block: Block): string | null {
  if (block.thumbnail_url) return block.thumbnail_url;
  if (block.og_image) return block.og_image;
  if (block.media_type === "image" && block.url) return block.url;
  if (block.avatar_url) return block.avatar_url;
  return null;
}

function ChannelCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  const image = getBlockImage(block);
  const TypeIcon = getBlockTypeIcon(block.type);
  const title = block.title || block.og_title || "Untitled";

  let hostname = "";
  if (block.url) {
    try { hostname = new URL(block.url).hostname.replace("www.", ""); } catch {}
  }

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      {/* Card body — square aspect ratio */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-[var(--secondary)] border border-[var(--border)]/50 transition-all duration-200 group-hover:border-[var(--border)] group-hover:shadow-lg group-hover:shadow-black/20">
        {image ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : block.type === "note" && block.content ? (
          /* Text preview for notes */
          <div className="absolute inset-0 p-3 overflow-hidden">
            <p className="text-[12px] leading-relaxed text-[var(--foreground)]/80 whitespace-pre-wrap">
              {block.content}
            </p>
          </div>
        ) : (
          /* Empty/icon fallback */
          <div className="absolute inset-0 flex items-center justify-center">
            <TypeIcon className="h-8 w-8 text-[var(--muted-foreground)]/40" />
          </div>
        )}

        {/* Type badge — bottom-left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-1.5 py-0.5">
          <TypeIcon className="h-2.5 w-2.5 text-white/80" />
          <span className="text-[9px] text-white/80 uppercase tracking-wider font-medium">
            {block.media_type === "image" ? "Image" : block.type}
          </span>
        </div>
      </div>

      {/* Title — below the card, are.na style */}
      <div className="mt-2 px-0.5">
        <p className="text-[12px] font-medium leading-snug line-clamp-2 text-[var(--foreground)]">
          {title}
        </p>
        {hostname && (
          <p className="text-[10px] text-[var(--muted-foreground)]/60 mt-0.5 truncate">
            {hostname}
          </p>
        )}
      </div>
    </div>
  );
}

export function ChannelGrid({
  blocks,
  onBlockClick,
}: {
  blocks: Block[];
  onBlockClick?: (block: Block) => void;
}) {
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
        <p className="text-sm">No items yet</p>
        <p className="mt-1 text-xs">Paste a URL or create a new block to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {blocks.map((block) => (
        <ChannelCard
          key={block.id}
          block={block}
          onClick={() => onBlockClick?.(block)}
        />
      ))}
    </div>
  );
}

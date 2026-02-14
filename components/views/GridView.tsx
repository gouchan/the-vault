"use client";

import Masonry from "react-masonry-css";
import { BlockCard } from "@/components/blocks/BlockCard";
import type { Block } from "@/types/block";

const breakpointColumns = {
  default: 4,
  1280: 3,
  1024: 2,
  640: 1,
};

export function GridView({
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
    <Masonry
      breakpointCols={breakpointColumns}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {blocks.map((block) => (
        <div key={block.id}>
          <BlockCard block={block} onClick={() => onBlockClick?.(block)} />
        </div>
      ))}
    </Masonry>
  );
}

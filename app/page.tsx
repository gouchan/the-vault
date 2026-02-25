"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBlocks } from "@/lib/actions/blocks";
import { GridView } from "@/components/views/GridView";
import { QuickCapture } from "@/components/forms/QuickCapture";
import { BlockDetailPanel } from "@/components/blocks/BlockDetailPanel";
import { BlockForm } from "@/components/forms/BlockForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Block, BlockType } from "@/types/block";
import { User, Link2, FileText, Filter, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadImageAndCreateBlock } from "@/lib/utils/upload-image";

const PAGE_SIZE = 20;

type FilterDef = {
  key: string;
  type: BlockType | null;
  mediaType?: string;
  label: string;
  icon: React.ElementType;
};

const typeFilters: FilterDef[] = [
  { key: "all", type: null, label: "All Beads", icon: Filter },
  { key: "person", type: "person", label: "People", icon: User },
  { key: "reference", type: "reference", label: "References", icon: Link2 },
  { key: "note", type: "note", label: "Notes", icon: FileText },
  { key: "images", type: "reference", mediaType: "image", label: "Images", icon: ImageIcon },
];

export default function HomePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createType, setCreateType] = useState<BlockType | null>(null);

  const currentFilterDef = typeFilters.find((f) => f.key === activeFilter) || typeFilters[0];
  const typeFilter = currentFilterDef.type;
  const mediaTypeFilter = currentFilterDef.mediaType;

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getBlocks({
        type: typeFilter ?? undefined,
        media_type: mediaTypeFilter,
        limit: PAGE_SIZE,
      });
      setBlocks(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, mediaTypeFilter]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const data = await getBlocks({
        type: typeFilter ?? undefined,
        media_type: mediaTypeFilter,
        limit: PAGE_SIZE,
        offset: blocks.length,
      });
      setBlocks((prev) => [...prev, ...data]);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [typeFilter, mediaTypeFilter, blocks.length]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  useEffect(() => {
    function onRefresh() {
      loadBlocks();
    }
    window.addEventListener("vault:refresh", onRefresh);
    return () => window.removeEventListener("vault:refresh", onRefresh);
  }, [loadBlocks]);

  const router = useRouter();

  async function handleImageUpload() {
    const block = await uploadImageAndCreateBlock();
    if (block) {
      loadBlocks();
    }
  }

  function handleBlockClick(block: Block) {
    if (block.type === "board") {
      router.push(`/board/${block.id}`);
    } else {
      router.push(`/block/${block.id}`);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Rosary</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          String ideas together
        </p>
      </div>

      {/* Quick Capture */}
      <div className="mb-6">
        <QuickCapture onCreated={loadBlocks} />
      </div>

      {/* Create buttons + Filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {typeFilters.map((f) => (
            <Button
              key={f.key}
              variant={activeFilter === f.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter(f.key)}
              className="text-xs"
            >
              <f.icon className="mr-1 h-3 w-3" />
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {(["person", "reference", "note"] as BlockType[]).map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => setCreateType(type)}
              className="text-xs"
            >
              + {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleImageUpload}
            className="text-xs"
          >
            <ImageIcon className="mr-1 h-3 w-3" /> + Image
          </Button>
        </div>
      </div>

      {/* Grid */}
      {!loading && loadError ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <p className="text-sm">Couldn't connect to database</p>
          <p className="mt-1 text-xs opacity-60">Supabase may be waking up from a cold start</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadBlocks}
            className="mt-3 text-xs"
          >
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="aspect-video bg-[var(--muted)]" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 rounded bg-[var(--muted)]" style={{ width: `${55 + (i % 3) * 15}%` }} />
                <div className="h-2.5 rounded bg-[var(--muted)] w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <GridView blocks={blocks} onBlockClick={handleBlockClick} />
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Panel */}
      {selectedBlock && (
        <BlockDetailPanel
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onUpdated={() => {
            loadBlocks();
            setSelectedBlock(null);
          }}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={!!createType} onOpenChange={() => setCreateType(null)}>
        <DialogContent onClose={() => setCreateType(null)}>
          <DialogHeader>
            <DialogTitle>New {createType ? createType.charAt(0).toUpperCase() + createType.slice(1) : ""}</DialogTitle>
          </DialogHeader>
          {createType && (
            <BlockForm
              type={createType}
              onSaved={() => {
                setCreateType(null);
                loadBlocks();
              }}
              onCancel={() => setCreateType(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

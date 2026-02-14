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
import { User, Link2, FileText, LayoutGrid, Filter } from "lucide-react";

const typeFilters: { type: BlockType | null; label: string; icon: React.ElementType }[] = [
  { type: null, label: "All", icon: Filter },
  { type: "person", label: "People", icon: User },
  { type: "reference", label: "References", icon: Link2 },
  { type: "prompt", label: "Prompts", icon: FileText },
  { type: "board", label: "Boards", icon: LayoutGrid },
];

export default function HomePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [typeFilter, setTypeFilter] = useState<BlockType | null>(null);
  const [loading, setLoading] = useState(true);
  const [createType, setCreateType] = useState<BlockType | null>(null);

  const loadBlocks = useCallback(async () => {
    try {
      const data = await getBlocks({ type: typeFilter ?? undefined, limit: 100 });
      setBlocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

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
        <h1 className="text-2xl font-bold">The Vault</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Your creative intelligence hub
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
              key={f.label}
              variant={typeFilter === f.type ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTypeFilter(f.type)}
              className="text-xs"
            >
              <f.icon className="mr-1 h-3 w-3" />
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {(["person", "reference", "prompt", "board"] as BlockType[]).map((type) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => setCreateType(type)}
              className="text-xs capitalize"
            >
              + {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
        </div>
      ) : (
        <GridView blocks={blocks} onBlockClick={handleBlockClick} />
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
            <DialogTitle className="capitalize">New {createType}</DialogTitle>
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

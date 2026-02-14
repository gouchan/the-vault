"use client";

import { useState, useEffect, useCallback } from "react";
import { getBlocks } from "@/lib/actions/blocks";
import { GridView } from "@/components/views/GridView";
import { BlockDetailPanel } from "@/components/blocks/BlockDetailPanel";
import { BlockForm } from "@/components/forms/BlockForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Block } from "@/types/block";
import { Plus } from "lucide-react";

export default function PeoplePage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBlocks = useCallback(async () => {
    try {
      const data = await getBlocks({ type: "person", limit: 100 });
      setBlocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Creative strategists, art directors, stylists & more
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Add Person
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
        </div>
      ) : (
        <GridView blocks={blocks} onBlockClick={setSelectedBlock} />
      )}

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

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent onClose={() => setCreating(false)}>
          <DialogHeader>
            <DialogTitle>Add Person</DialogTitle>
          </DialogHeader>
          <BlockForm
            type="person"
            onSaved={() => {
              setCreating(false);
              loadBlocks();
            }}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { searchBlocks } from "@/lib/actions/blocks";
import { GridView } from "@/components/views/GridView";
import { BlockDetailPanel } from "@/components/blocks/BlockDetailPanel";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Block } from "@/types/block";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchBlocks(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search</h1>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everything..."
            className="pl-10"
            autoFocus
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
        </div>
      ) : query.trim() ? (
        <>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
          <GridView blocks={results} onBlockClick={setSelectedBlock} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
          <Search className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Start typing to search across all your beads</p>
        </div>
      )}

      {selectedBlock && (
        <BlockDetailPanel
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onUpdated={() => {
            setSelectedBlock(null);
            if (query.trim()) {
              searchBlocks(query).then(setResults);
            }
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { createBlock } from "@/lib/actions/blocks";
import { searchBlocks } from "@/lib/actions/blocks";
import type { Block } from "@/types/block";
import {
  User,
  Link2,
  FileText,
  LayoutGrid,
  Search,
  Home,
  Users,
  Plus,
} from "lucide-react";

export function CommandPalette({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Block[]>([]);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const data = await searchBlocks(search);
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setResults([]);
  }, []);

  async function handleCreateBlock(type: "person" | "reference" | "note" | "board") {
    close();
    // Navigate to home and open create dialog (we'll use a simpler approach)
    const title = prompt(`New ${type} name:`);
    if (!title) return;
    await createBlock({ type, title });
    onCreated?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl"
          shouldFilter={false}
        >
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search or create..."
            className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--muted-foreground)]">
              No results found.
            </Command.Empty>

            {/* Search results */}
            {results.length > 0 && (
              <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
                {results.slice(0, 8).map((block) => (
                  <Command.Item
                    key={block.id}
                    value={block.id}
                    onSelect={() => {
                      close();
                      if (block.type === "board") {
                        router.push(`/board/${block.id}`);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
                  >
                    {block.type === "person" && <User className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    {block.type === "reference" && <Link2 className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    {(block.type === "note" || block.type === "prompt") && <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    {block.type === "board" && <LayoutGrid className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    <span className="truncate">{block.title || "Untitled"}</span>
                    <span className="ml-auto text-xs text-[var(--muted-foreground)] capitalize">{block.type === "board" ? "garland" : block.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick actions */}
            <Command.Group heading="Create" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
              <Command.Item
                onSelect={() => handleCreateBlock("person")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Person
              </Command.Item>
              <Command.Item
                onSelect={() => handleCreateBlock("reference")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Reference
              </Command.Item>
              <Command.Item
                onSelect={() => handleCreateBlock("note")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Note
              </Command.Item>
              <Command.Item
                onSelect={() => handleCreateBlock("board")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Garland
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--muted-foreground)]">
              <Command.Item
                onSelect={() => { close(); router.push("/"); }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Home className="h-4 w-4 text-[var(--muted-foreground)]" />
                Home
              </Command.Item>
              <Command.Item
                onSelect={() => { close(); router.push("/people"); }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
                People
              </Command.Item>
              <Command.Item
                onSelect={() => { close(); router.push("/search"); }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]"
              >
                <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
                Search
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { createBlock } from "@/lib/actions/blocks";
import { searchBlocks } from "@/lib/actions/blocks";
import { getBoards, addBlockToBoard } from "@/lib/actions/boards";
import { isValidUrl, normalizeUrl, detectMediaType } from "@/lib/utils/url-parser";
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
  Loader2,
} from "lucide-react";

function looksLikeUrl(str: string): boolean {
  const trimmed = str.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  // Common TLD pattern: something.tld or something.tld/path
  if (/^[\w-]+\.(?:com|org|net|io|co|dev|app|ai|edu|gov|me|tv|gg|ly|to|so|sh|uk|de|fr|jp|cn|au|ca|br|in|ru)(?:[/?#]|$)/i.test(trimmed)) {
    return true;
  }
  return false;
}

interface Garland {
  id: string;
  title: string | null;
}

export function CommandPalette({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Block[]>([]);
  const [garlands, setGarlands] = useState<Garland[]>([]);
  const [selectedGarlandId, setSelectedGarlandId] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const router = useRouter();

  const inputIsUrl = looksLikeUrl(search);
  const inputIsNote = !inputIsUrl && search.trim().length >= 3;

  // Open palette and load garlands
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

  // Load garlands when palette opens
  useEffect(() => {
    if (!open) return;
    getBoards()
      .then((data) => setGarlands(data.map((b: any) => ({ id: b.id, title: b.title }))))
      .catch(() => setGarlands([]));
  }, [open]);

  // Search blocks with debounce
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
    setSelectedGarlandId(null);
    setUrlLoading(false);
  }, []);

  async function maybeAddToGarland(blockId: string) {
    if (selectedGarlandId) {
      try {
        await addBlockToBoard(selectedGarlandId, blockId);
      } catch {
        // Non-fatal: block was still created
      }
    }
  }

  async function handleAddAsLink() {
    if (urlLoading) return;
    const raw = search.trim();
    const url = normalizeUrl(raw);
    setUrlLoading(true);

    try {
      let ogData: { title?: string; description?: string; image?: string } = {};
      try {
        const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          ogData = await res.json();
        }
      } catch {
        // Proceed without OG data
      }

      const mediaType = detectMediaType(url);
      const block = await createBlock({
        type: "reference",
        title: ogData.title || url,
        url,
        media_type: mediaType,
        og_title: ogData.title || null,
        og_description: ogData.description || null,
        og_image: ogData.image || null,
        thumbnail_url: ogData.image || null,
      });

      await maybeAddToGarland((block as any).id);
      onCreated?.();
      close();
    } catch {
      setUrlLoading(false);
    }
  }

  async function handleSaveAsNote() {
    const title = search.trim();
    if (!title) return;

    try {
      const block = await createBlock({
        type: "note",
        title,
        content: title,
      });

      await maybeAddToGarland((block as any).id);
      onCreated?.();
      close();
    } catch {
      // ignore
    }
  }

  async function handleCreateBlank(type: "person" | "reference" | "note" | "board") {
    try {
      const title = search.trim() || `New ${type}`;
      const block = await createBlock({ type, title });
      if (type !== "board") {
        await maybeAddToGarland((block as any).id);
      }
      onCreated?.();
      close();
    } catch {
      // ignore
    }
  }

  if (!open) return null;

  const groupHeadingClass =
    "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--muted-foreground)]";
  const itemClass =
    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-[var(--accent)] data-[selected]:bg-[var(--accent)]";

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
            placeholder="Search, paste a URL, or type a note..."
            className="w-full border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          />

          {/* Garland targeting row */}
          {garlands.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
              <span className="text-xs text-[var(--muted-foreground)]">Add to:</span>
              <button
                type="button"
                onClick={() => setSelectedGarlandId(null)}
                className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                  selectedGarlandId === null
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                }`}
              >
                All
              </button>
              {garlands.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGarlandId((prev) => (prev === g.id ? null : g.id))}
                  className={`max-w-[120px] truncate rounded-full px-2 py-0.5 text-xs transition-colors ${
                    selectedGarlandId === g.id
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--accent)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                  }`}
                >
                  {g.title || "Untitled"}
                </button>
              ))}
            </div>
          )}

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--muted-foreground)]">
              No results found.
            </Command.Empty>

            {/* URL quick-add */}
            {inputIsUrl && (
              <Command.Group heading="Quick add" className={groupHeadingClass}>
                <Command.Item
                  onSelect={handleAddAsLink}
                  disabled={urlLoading}
                  className={itemClass}
                >
                  {urlLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
                  ) : (
                    <Link2 className="h-4 w-4 text-[var(--muted-foreground)]" />
                  )}
                  <span className="truncate">
                    {urlLoading ? "Fetching link info..." : `Add as link bead — ${search.trim()}`}
                  </span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Note quick-add */}
            {inputIsNote && (
              <Command.Group heading="Quick add" className={groupHeadingClass}>
                <Command.Item onSelect={handleSaveAsNote} className={itemClass}>
                  <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="truncate">Save as note — &ldquo;{search.trim()}&rdquo;</span>
                </Command.Item>
              </Command.Group>
            )}

            {/* Search results */}
            {results.length > 0 && (
              <Command.Group heading="Results" className={groupHeadingClass}>
                {results.slice(0, 8).map((block) => (
                  <Command.Item
                    key={block.id}
                    value={block.id}
                    onSelect={() => {
                      close();
                      if (block.type === "board") {
                        router.push(`/board/${block.id}`);
                      } else {
                        router.push(`/block/${block.id}`);
                      }
                    }}
                    className={itemClass}
                  >
                    {block.type === "person" && <User className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    {block.type === "reference" && <Link2 className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    {(block.type === "note" || block.type === "prompt") && (
                      <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                    )}
                    {block.type === "board" && <LayoutGrid className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    <span className="truncate">{block.title || "Untitled"}</span>
                    <span className="ml-auto text-xs text-[var(--muted-foreground)] capitalize">
                      {block.type === "board" ? "garland" : block.type}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick actions */}
            <Command.Group heading="Create" className={groupHeadingClass}>
              <Command.Item onSelect={() => handleCreateBlank("person")} className={itemClass}>
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Person
              </Command.Item>
              <Command.Item onSelect={() => handleCreateBlank("reference")} className={itemClass}>
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Reference
              </Command.Item>
              <Command.Item onSelect={() => handleCreateBlank("note")} className={itemClass}>
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Note
              </Command.Item>
              <Command.Item onSelect={() => handleCreateBlank("board")} className={itemClass}>
                <Plus className="h-4 w-4 text-[var(--muted-foreground)]" />
                New Garland
              </Command.Item>
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Go to" className={groupHeadingClass}>
              <Command.Item
                onSelect={() => {
                  close();
                  router.push("/");
                }}
                className={itemClass}
              >
                <Home className="h-4 w-4 text-[var(--muted-foreground)]" />
                Home
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  close();
                  router.push("/people");
                }}
                className={itemClass}
              >
                <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
                People
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  close();
                  router.push("/search");
                }}
                className={itemClass}
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getBlockWithChildren,
  getBlocks,
  createBlock,
  addChildBlock,
  removeChildBlock,
  deleteBlock,
  togglePin,
} from "@/lib/actions/blocks";
import { GridView } from "@/components/views/GridView";
import { QuickCapture } from "@/components/forms/QuickCapture";
import { BlockForm } from "@/components/forms/BlockForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Block, BlockType } from "@/types/block";
import { getYouTubeId } from "@/lib/utils/url-parser";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  ExternalLink,
  Instagram,
  Twitter,
  Linkedin,
  User,
  Link2,
  FileText,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import { MoveToGarland } from "@/components/ui/move-to-garland";
import { TagInput } from "@/components/ui/tag-input";
import { getBoardsForBlock } from "@/lib/actions/boards";

export default function BlockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const blockId = params.id as string;

  const [block, setBlock] = useState<Block | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [createType, setCreateType] = useState<BlockType | null>(null);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState<Block[]>([]);
  const [selectedChild, setSelectedChild] = useState<Block | null>(null);
  const [parentGarlands, setParentGarlands] = useState<{ id: string; title: string; type: string }[]>([]);

  const loadBlock = useCallback(async () => {
    try {
      const [data, garlands] = await Promise.all([
        getBlockWithChildren(blockId),
        getBoardsForBlock(blockId),
      ]);
      setBlock(data);
      setParentGarlands(garlands);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [blockId]);

  useEffect(() => {
    loadBlock();
  }, [loadBlock]);

  async function handleDelete() {
    if (!confirm("Delete this block and all its connections?")) return;
    await deleteBlock(blockId);
    router.push("/");
  }

  async function handleTogglePin() {
    if (!block) return;
    await togglePin(blockId, !block.pinned);
    loadBlock();
  }

  // Create new sub-block and add it as child
  async function handleSubBlockCreated() {
    const blocks = await getBlocks({ limit: 1 });
    if (blocks.length > 0) {
      await addChildBlock(blockId, blocks[0].id);
    }
    setCreateType(null);
    loadBlock();
  }

  // Quick capture creates a block and adds it as child
  async function handleQuickCaptureCreated() {
    const blocks = await getBlocks({ limit: 1 });
    if (blocks.length > 0) {
      await addChildBlock(blockId, blocks[0].id);
    }
    loadBlock();
  }

  // Add existing block as child
  async function handleOpenAddExisting() {
    const blocks = await getBlocks({ limit: 200 });
    const childIds = new Set(block?.children?.map((c) => c.id) || []);
    setAvailableBlocks(blocks.filter((b) => b.id !== blockId && !childIds.has(b.id)));
    setAddExistingOpen(true);
  }

  async function handleAddExisting(childId: string) {
    await addChildBlock(blockId, childId);
    setAddExistingOpen(false);
    loadBlock();
  }

  async function handleRemoveChild(childId: string) {
    await removeChildBlock(blockId, childId);
    loadBlock();
  }

  function handleChildClick(child: Block) {
    if (child.type === "board") {
      router.push(`/board/${child.id}`);
    } else {
      router.push(`/block/${child.id}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--muted-foreground)] border-t-transparent" />
      </div>
    );
  }

  if (!block) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
        Block not found
      </div>
    );
  }

  const youtubeId = block.url ? getYouTubeId(block.url) : null;

  return (
    <div className="p-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <Link href="/" className="hover:text-[var(--foreground)]">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--foreground)]">{block.title || "Untitled"}</span>
      </div>

      {/* Block Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar for person */}
          {block.type === "person" && (
            block.avatar_url ? (
              <img src={block.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--secondary)]">
                <User className="h-7 w-7 text-[var(--muted-foreground)]" />
              </div>
            )
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{block.title || "Untitled"}</h1>
              <Badge variant="outline" className="text-xs capitalize">{block.type}</Badge>
              {block.pinned && <Pin className="h-3 w-3 text-[var(--muted-foreground)]" />}
            </div>

            {block.role && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{block.role}</p>
            )}
            {block.description && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{block.description}</p>
            )}

            {/* Social links for person */}
            {block.type === "person" && (
              <div className="mt-2 flex items-center gap-3">
                {block.portfolio_url && (
                  <a href={block.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
                    <ExternalLink className="h-3 w-3" /> Portfolio
                  </a>
                )}
                {block.instagram && (
                  <a href={`https://instagram.com/${block.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
                    <Instagram className="h-3 w-3" /> {block.instagram}
                  </a>
                )}
                {block.twitter && (
                  <a href={`https://x.com/${block.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
                    <Twitter className="h-3 w-3" /> {block.twitter}
                  </a>
                )}
                {block.linkedin && (
                  <a href={block.linkedin.startsWith("http") ? block.linkedin : `https://linkedin.com/in/${block.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </a>
                )}
              </div>
            )}

            {/* URL for reference */}
            {block.url && (
              <a href={block.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
                <ExternalLink className="h-3 w-3" /> {(() => { try { return new URL(block.url).hostname; } catch { return block.url; } })()}
              </a>
            )}

            {/* Tags — interactive editor */}
            <div className="mt-3">
              <TagInput blockId={blockId} tags={block.tags || []} onTagsChanged={loadBlock} />
            </div>

            {/* Garland membership */}
            {parentGarlands.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-xs text-[var(--muted-foreground)]">In:</span>
                {parentGarlands.map((g) => (
                  <Link
                    key={g.id}
                    href={`/board/${g.id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs hover:bg-[var(--accent)] transition-colors"
                  >
                    <LayoutGrid className="h-2.5 w-2.5" />
                    {g.title || "Untitled"}
                  </Link>
                ))}
              </div>
            )}

            {/* Metadata */}
            <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
              <span>Created {new Date(block.created_at).toLocaleDateString()}</span>
              {block.updated_at !== block.created_at && (
                <span>Updated {new Date(block.updated_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleTogglePin} title={block.pinned ? "Unpin" : "Pin"}>
            {block.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <MoveToGarland blockId={blockId} onMoved={loadBlock} />
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>

      {/* YouTube embed */}
      {youtubeId && (
        <div className="mb-6 aspect-video max-w-2xl overflow-hidden rounded-lg">
          <iframe src={`https://www.youtube.com/embed/${youtubeId}`} className="h-full w-full" allowFullScreen />
        </div>
      )}

      {/* Reference image */}
      {block.type === "reference" && !youtubeId && (block.thumbnail_url || block.og_image) && (
        <img src={block.thumbnail_url || block.og_image || ""} alt="" className="mb-6 max-w-2xl rounded-lg" />
      )}

      {/* Prompt content */}
      {block.content && (
        <div className="mb-6 max-w-2xl rounded-lg bg-[var(--secondary)] p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono">{block.content}</pre>
        </div>
      )}

      {/* Notes */}
      {block.notes && (
        <div className="mb-6 max-w-2xl">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Notes</h3>
          <p className="text-sm">{block.notes}</p>
        </div>
      )}

      {/* ── Sub-blocks Section ─────────────────────────────── */}
      <div className="border-t border-[var(--border)] pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Contents
            {block.children && block.children.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--muted-foreground)]">
                {block.children.length} {block.children.length === 1 ? "item" : "items"}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCreateType("reference")} className="text-xs">
              <Link2 className="mr-1 h-3 w-3" /> Reference
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateType("person")} className="text-xs">
              <User className="mr-1 h-3 w-3" /> Person
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateType("note")} className="text-xs">
              <FileText className="mr-1 h-3 w-3" /> Note
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenAddExisting} className="text-xs">
              <Plus className="mr-1 h-3 w-3" /> Existing
            </Button>
          </div>
        </div>

        {/* Quick capture for sub-blocks */}
        <div className="mb-4">
          <QuickCapture onCreated={handleQuickCaptureCreated} />
        </div>

        {/* Children grid */}
        {block.children && block.children.length > 0 ? (
          <GridView blocks={block.children} onBlockClick={handleChildClick} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
            <p className="text-sm">No sub-blocks yet</p>
            <p className="mt-1 text-xs">Paste a URL above or use the buttons to add content</p>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent onClose={() => setEditing(false)}>
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
          </DialogHeader>
          <BlockForm
            type={block.type}
            block={block}
            onSaved={() => {
              setEditing(false);
              loadBlock();
            }}
            onCancel={() => setEditing(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Sub-block Dialog */}
      <Dialog open={!!createType} onOpenChange={() => setCreateType(null)}>
        <DialogContent onClose={() => setCreateType(null)}>
          <DialogHeader>
            <DialogTitle className="capitalize">New {createType}</DialogTitle>
          </DialogHeader>
          {createType && (
            <BlockForm
              type={createType}
              onSaved={handleSubBlockCreated}
              onCancel={() => setCreateType(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Existing Block Dialog */}
      <Dialog open={addExistingOpen} onOpenChange={setAddExistingOpen}>
        <DialogContent onClose={() => setAddExistingOpen(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Existing Block</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 mt-4">
            {availableBlocks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No blocks available</p>
            ) : (
              availableBlocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleAddExisting(b.id)}
                  className="flex w-full items-center gap-3 rounded-md border border-[var(--border)] p-3 text-left transition-colors hover:bg-[var(--accent)]"
                >
                  <span className="text-xs capitalize text-[var(--muted-foreground)] w-16">{b.type}</span>
                  <span className="text-sm truncate flex-1">{b.title || "Untitled"}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

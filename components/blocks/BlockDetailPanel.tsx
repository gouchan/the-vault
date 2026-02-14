"use client";

import { useState, useEffect } from "react";
import type { Block } from "@/types/block";
import { BlockForm } from "@/components/forms/BlockForm";
import { Button } from "@/components/ui/button";
import { X, Pencil, Trash2, Pin, PinOff, ExternalLink, ArrowRight, Layers } from "lucide-react";
import { deleteBlock, togglePin, getChildrenCount } from "@/lib/actions/blocks";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getYouTubeId } from "@/lib/utils/url-parser";

interface BlockDetailPanelProps {
  block: Block;
  onClose: () => void;
  onUpdated?: () => void;
}

export function BlockDetailPanel({ block, onClose, onUpdated }: BlockDetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [childrenCount, setChildrenCount] = useState(0);
  const youtubeId = block.url ? getYouTubeId(block.url) : null;

  useEffect(() => {
    getChildrenCount(block.id).then(setChildrenCount);
  }, [block.id]);

  async function handleDelete() {
    if (!confirm("Delete this block?")) return;
    await deleteBlock(block.id);
    onUpdated?.();
    onClose();
  }

  async function handleTogglePin() {
    await togglePin(block.id, !block.pinned);
    onUpdated?.();
  }

  if (editing) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Block</h2>
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <BlockForm
          type={block.type}
          block={block}
          onSaved={() => {
            setEditing(false);
            onUpdated?.();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] p-6 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs capitalize">
            {block.type}
          </Badge>
          {block.pinned && <Pin className="h-3 w-3 text-[var(--muted-foreground)]" />}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleTogglePin} title={block.pinned ? "Unpin" : "Pin"}>
            {block.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Avatar for person */}
      {block.type === "person" && block.avatar_url && (
        <img src={block.avatar_url} alt="" className="mb-4 h-20 w-20 rounded-full object-cover" />
      )}

      {/* Title */}
      <h2 className="text-xl font-bold">{block.title || "Untitled"}</h2>

      {/* Role */}
      {block.role && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{block.role}</p>}

      {/* YouTube embed */}
      {youtubeId && (
        <div className="mt-4 aspect-video overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      )}

      {/* Image */}
      {block.type === "reference" && !youtubeId && (block.thumbnail_url || block.og_image) && (
        <img
          src={block.thumbnail_url || block.og_image || ""}
          alt=""
          className="mt-4 w-full rounded-lg"
        />
      )}

      {/* URL */}
      {block.url && (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1 text-sm text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]"
        >
          <ExternalLink className="h-3 w-3" />
          {new URL(block.url).hostname}
        </a>
      )}

      {/* Content (prompts) */}
      {block.content && (
        <div className="mt-4 rounded bg-[var(--secondary)] p-3">
          <pre className="whitespace-pre-wrap text-sm font-mono">{block.content}</pre>
        </div>
      )}

      {/* Description */}
      {block.description && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)]">Description</h4>
          <p className="mt-1 text-sm">{block.description}</p>
        </div>
      )}

      {/* Notes */}
      {block.notes && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)]">Notes</h4>
          <p className="mt-1 text-sm">{block.notes}</p>
        </div>
      )}

      {/* Social links */}
      {block.type === "person" && (
        <div className="mt-4 flex flex-wrap gap-3">
          {block.portfolio_url && (
            <a href={block.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
              Portfolio
            </a>
          )}
          {block.instagram && (
            <a href={`https://instagram.com/${block.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
              Instagram
            </a>
          )}
          {block.twitter && (
            <a href={`https://x.com/${block.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
              Twitter/X
            </a>
          )}
          {block.linkedin && (
            <a href={block.linkedin.startsWith("http") ? block.linkedin : `https://linkedin.com/in/${block.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--sticky-yellow)] hover:text-[var(--sticky-yellow-dark)]">
              LinkedIn
            </a>
          )}
        </div>
      )}

      {/* Tags */}
      {block.tags && block.tags.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium text-[var(--muted-foreground)]">Tags</h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {block.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* View full page + children count */}
      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <Link
          href={block.type === "board" ? `/board/${block.id}` : `/block/${block.id}`}
          className="flex items-center justify-between rounded-md border border-[var(--border)] p-3 transition-colors hover:bg-[var(--accent)]"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-sm">
              {childrenCount > 0
                ? `${childrenCount} sub-${childrenCount === 1 ? "block" : "blocks"}`
                : "View full page"}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
        </Link>
      </div>

      {/* Metadata */}
      <div className="mt-4 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
        <p>Created: {new Date(block.created_at).toLocaleDateString()}</p>
        <p>Updated: {new Date(block.updated_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

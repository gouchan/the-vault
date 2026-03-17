"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createBlock, updateBlock } from "@/lib/actions/blocks";
import type { Block, BlockType } from "@/types/block";
import { isValidUrl, normalizeUrl, detectMediaType } from "@/lib/utils/url-parser";

interface BlockFormProps {
  type: BlockType;
  block?: Block | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function BlockForm({ type, block, onSaved, onCancel }: BlockFormProps) {
  const isEdit = !!block;
  const [loading, setLoading] = useState(false);
  const [ogLoading, setOgLoading] = useState(false);
  const [ogImage, setOgImage] = useState(block?.og_image || block?.thumbnail_url || "");
  const [form, setForm] = useState({
    title: block?.title || "",
    description: block?.description || "",
    notes: block?.notes || "",
    // Person
    role: block?.role || "",
    portfolio_url: block?.portfolio_url || "",
    instagram: block?.instagram || "",
    twitter: block?.twitter || "",
    linkedin: block?.linkedin || "",
    avatar_url: block?.avatar_url || "",
    // Reference
    url: block?.url || "",
    og_title: block?.og_title || "",
    og_description: block?.og_description || "",
    og_image: block?.og_image || "",
    thumbnail_url: block?.thumbnail_url || "",
    media_type: block?.media_type || "",
    // Prompt
    content: block?.content || "",
    // Tags
    tagString: block?.tags?.map((t) => t.name).join(", ") || "",
  });

  async function handleUrlBlur() {
    if (!form.url || isEdit) return;
    const normalized = normalizeUrl(form.url);
    if (!isValidUrl(normalized)) return;
    // Skip if we already have OG data
    if (form.og_title || form.og_image) return;

    setOgLoading(true);
    try {
      const mediaType = detectMediaType(normalized);
      let ogData: { title?: string | null; description?: string | null; image?: string | null } = {};
      const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(normalized)}`);
      if (res.ok) ogData = await res.json();

      setForm((f) => ({
        ...f,
        url: normalized,
        media_type: mediaType,
        title: f.title || ogData.title || "",
        og_title: ogData.title || "",
        og_description: ogData.description || "",
        og_image: ogData.image || "",
        thumbnail_url: ogData.image || "",
      }));
      setOgImage(ogData.image || "");
    } catch {}
    finally {
      setOgLoading(false);
    }
  }

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const tags = form.tagString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const data: any = {
      type,
      title: form.title || null,
      description: form.description || null,
      notes: form.notes || null,
      tags,
    };

    if (type === "person") {
      data.role = form.role || null;
      data.portfolio_url = form.portfolio_url || null;
      data.instagram = form.instagram || null;
      data.twitter = form.twitter || null;
      data.linkedin = form.linkedin || null;
      data.avatar_url = form.avatar_url || null;
    }

    if (type === "reference") {
      data.url = form.url ? normalizeUrl(form.url) : null;
      data.media_type = form.media_type || null;
      data.og_title = form.og_title || null;
      data.og_description = form.og_description || null;
      data.og_image = form.og_image || null;
      data.thumbnail_url = form.thumbnail_url || null;
    }

    if (type === "note" || type === "prompt") {
      data.content = form.content || null;
    }

    try {
      if (isEdit && block) {
        await updateBlock(block.id, data);
      } else {
        await createBlock(data);
      }
      onSaved?.();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Common fields */}
      <div>
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          {type === "person" ? "Name" : "Title"}
        </label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={type === "person" ? "Jane Doe" : "Title..."}
        />
      </div>

      {/* Person fields */}
      {type === "person" && (
        <>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Role</label>
            <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Creative Director" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Portfolio URL</label>
            <Input value={form.portfolio_url} onChange={(e) => set("portfolio_url", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Avatar URL</label>
            <Input value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Instagram</label>
              <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Twitter / X</label>
              <Input value={form.twitter} onChange={(e) => set("twitter", e.target.value)} placeholder="@handle" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">LinkedIn</label>
              <Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="username" />
            </div>
          </div>
        </>
      )}

      {/* Reference fields */}
      {type === "reference" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">URL</label>
          <div className="relative">
            <Input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://..."
            />
            {ogLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-[var(--muted-foreground)]" />
            )}
          </div>
          {ogImage && (
            <div className="overflow-hidden rounded border border-[var(--border)] aspect-video bg-[var(--secondary)]">
              <img src={ogImage} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Note fields */}
      {(type === "note" || type === "prompt") && (
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Content</label>
          <Textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="Write your note..."
            rows={6}
            className="font-mono text-sm"
          />
        </div>
      )}

      {/* Board only needs title + description */}
      {type === "board" && null}

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Description</label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Add a description..."
          rows={2}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Personal notes..."
          rows={2}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs font-medium text-[var(--muted-foreground)]">Tags (comma separated)</label>
        <Input
          value={form.tagString}
          onChange={(e) => set("tagString", e.target.value)}
          placeholder="strategy, fashion, moodboard"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Update" : "Create"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

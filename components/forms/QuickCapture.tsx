"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { createBlock } from "@/lib/actions/blocks";
import { detectMediaType, isValidUrl, normalizeUrl } from "@/lib/utils/url-parser";
import type { BlockType } from "@/types/block";

export function QuickCapture({ onCreated }: { onCreated?: () => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      if (isValidUrl(trimmed)) {
        const url = normalizeUrl(trimmed);
        const mediaType = detectMediaType(url);

        // Try to fetch OG data
        let ogData: any = {};
        try {
          const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(url)}`);
          if (res.ok) ogData = await res.json();
        } catch {}

        await createBlock({
          type: "reference",
          url,
          media_type: mediaType,
          title: ogData.title || null,
          og_title: ogData.title || null,
          og_description: ogData.description || null,
          og_image: ogData.image || null,
          thumbnail_url: ogData.image || null,
        });
      } else {
        // Treat as a prompt/note
        await createBlock({
          type: "prompt",
          title: trimmed.slice(0, 80),
          content: trimmed,
        });
      }

      setValue("");
      onCreated?.();
    } catch (err) {
      console.error("Failed to create block:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a URL, type a note, or press / to focus..."
          className="pr-10"
          disabled={loading}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted-foreground)]" />
        )}
      </div>
      <Button type="submit" size="icon" disabled={!value.trim() || loading}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}

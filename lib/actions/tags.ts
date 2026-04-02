"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Tag } from "@/types/block";

// Get all tags, ordered by usage count (most used first)
export async function getTags(): Promise<Tag[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("tags")
    .select("*, block_tags(count)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Sort by usage count descending in JS since Supabase aggregation
  // via select count in embedded relation returns an array per row
  const withCount = (data || []).map((tag: any) => ({
    ...tag,
    _count: Array.isArray(tag.block_tags) ? tag.block_tags.length : 0,
  }));

  withCount.sort((a, b) => b._count - a._count);

  return withCount.map(({ _count, block_tags, ...tag }) => tag as Tag);
}

// Create a new tag (name must be unique, lowercased, trimmed)
export async function createTag(name: string, color?: string): Promise<Tag> {
  const sb = createServerClient();
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) throw new Error("Tag name cannot be empty");

  const payload: { name: string; color?: string } = { name: trimmed };
  if (color) payload.color = color;

  const { data, error } = await sb
    .from("tags")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as Tag;
}

// Delete a tag (cascades to block_tags via FK)
export async function deleteTag(id: string): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb.from("tags").delete().eq("id", id);
  if (error) throw error;
}

// Update tag color
export async function updateTagColor(id: string, color: string): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb.from("tags").update({ color }).eq("id", id);
  if (error) throw error;
}

// Get tags for a specific block
export async function getBlockTags(blockId: string): Promise<Tag[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("block_tags")
    .select("tags(*)")
    .eq("block_id", blockId);

  if (error) throw error;
  return (data || []).map((row: any) => row.tags).filter(Boolean) as Tag[];
}

// Add tag to block (creates tag if it doesn't exist by name)
export async function addTagToBlock(blockId: string, tagName: string): Promise<Tag> {
  const sb = createServerClient();
  const trimmed = tagName.trim().toLowerCase();
  if (!trimmed) throw new Error("Tag name cannot be empty");

  // Upsert tag by name
  const { data: tag, error: tagError } = await sb
    .from("tags")
    .upsert({ name: trimmed }, { onConflict: "name" })
    .select()
    .single();

  if (tagError) throw tagError;

  // Attach to block
  const { error: joinError } = await sb
    .from("block_tags")
    .upsert(
      { block_id: blockId, tag_id: tag.id },
      { onConflict: "block_id,tag_id" }
    );

  if (joinError) throw joinError;

  return tag as Tag;
}

// Remove tag from block
export async function removeTagFromBlock(blockId: string, tagId: string): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb
    .from("block_tags")
    .delete()
    .eq("block_id", blockId)
    .eq("tag_id", tagId);

  if (error) throw error;
}

// Search tags by name prefix (for autocomplete)
export async function searchTags(query: string): Promise<Tag[]> {
  const sb = createServerClient();
  const trimmed = query.trim().toLowerCase();

  const { data, error } = await sb
    .from("tags")
    .select("*")
    .ilike("name", `${trimmed}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) throw error;
  return (data || []) as Tag[];
}

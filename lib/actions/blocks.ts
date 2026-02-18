"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Block, BlockType, CreatePersonInput, CreateReferenceInput, CreateNoteInput } from "@/types/block";

export async function getBlocks(options?: {
  type?: BlockType;
  search?: string;
  tagId?: string;
  limit?: number;
  offset?: number;
  pinned?: boolean;
}) {
  const sb = createServerClient();
  let query = sb.from("blocks").select("*, block_tags(tag_id, tags(*))")
    .order("created_at", { ascending: false });

  if (options?.type) {
    query = query.eq("type", options.type);
  }
  if (options?.pinned) {
    query = query.eq("pinned", true);
  }
  if (options?.search) {
    query = query.textSearch("search_vector", options.search, { type: "websearch" });
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options?.limit || 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(transformBlockWithTags);
}

export async function getBlock(id: string) {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("blocks")
    .select("*, block_tags(tag_id, tags(*))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return transformBlockWithTags(data);
}

export async function createBlock(input: Partial<Block> & { type: BlockType; tags?: string[] }) {
  const sb = createServerClient();
  const { tags, ...blockData } = input;

  const { data, error } = await sb
    .from("blocks")
    .insert(blockData)
    .select()
    .single();

  if (error) throw error;

  if (tags && tags.length > 0) {
    await attachTags(data.id, tags);
  }

  return data as Block;
}

export async function updateBlock(id: string, input: Partial<Block> & { tags?: string[] }) {
  const sb = createServerClient();
  const { tags, ...blockData } = input;

  // Remove fields that shouldn't be updated
  const { id: _id, created_at, updated_at, search_vector, ...updateData } = blockData as any;

  const { data, error } = await sb
    .from("blocks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (tags !== undefined) {
    // Clear existing tags and re-attach
    await sb.from("block_tags").delete().eq("block_id", id);
    if (tags.length > 0) {
      await attachTags(id, tags);
    }
  }

  return data as Block;
}

export async function deleteBlock(id: string) {
  const sb = createServerClient();
  const { error } = await sb.from("blocks").delete().eq("id", id);
  if (error) throw error;
}

export async function togglePin(id: string, pinned: boolean) {
  const sb = createServerClient();
  const { error } = await sb.from("blocks").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function searchBlocks(query: string) {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("blocks")
    .select("*, block_tags(tag_id, tags(*))")
    .textSearch("search_vector", query, { type: "websearch" })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []).map(transformBlockWithTags);
}

// ── Nested blocks (any block can contain sub-blocks) ──────────

export async function getBlockWithChildren(id: string) {
  const sb = createServerClient();

  // Get block with tags
  const { data: block, error: blockError } = await sb
    .from("blocks")
    .select("*, block_tags(tag_id, tags(*))")
    .eq("id", id)
    .single();

  if (blockError) throw blockError;

  // Get children
  const { data: connections, error: connError } = await sb
    .from("block_connections")
    .select("child_id, sort_order, blocks!block_connections_child_id_fkey(*, block_tags(tag_id, tags(*)))")
    .eq("parent_id", id)
    .eq("connection_type", "contains")
    .order("sort_order");

  if (connError) throw connError;

  const children = (connections || []).map((c: any) => {
    const { block_tags, ...child } = c.blocks;
    return {
      ...child,
      tags: block_tags?.map((bt: any) => bt.tags).filter(Boolean) || [],
    };
  });

  return {
    ...transformBlockWithTags(block),
    children,
  } as Block;
}

export async function addChildBlock(parentId: string, childId: string) {
  const sb = createServerClient();

  // Get max sort_order
  const { data: existing } = await sb
    .from("block_connections")
    .select("sort_order")
    .eq("parent_id", parentId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;

  const { error } = await sb.from("block_connections").upsert(
    {
      parent_id: parentId,
      child_id: childId,
      connection_type: "contains",
      sort_order: sortOrder,
    },
    { onConflict: "parent_id,child_id,connection_type" }
  );

  if (error) throw error;
}

export async function removeChildBlock(parentId: string, childId: string) {
  const sb = createServerClient();
  const { error } = await sb
    .from("block_connections")
    .delete()
    .eq("parent_id", parentId)
    .eq("child_id", childId)
    .eq("connection_type", "contains");

  if (error) throw error;
}

export async function getChildrenCount(blockId: string): Promise<number> {
  const sb = createServerClient();
  const { count, error } = await sb
    .from("block_connections")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", blockId)
    .eq("connection_type", "contains");

  if (error) return 0;
  return count || 0;
}

// Helper: attach tags to a block (creates tags if they don't exist)
async function attachTags(blockId: string, tagNames: string[]) {
  const sb = createServerClient();

  for (const name of tagNames) {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) continue;

    // Upsert tag
    const { data: tag } = await sb
      .from("tags")
      .upsert({ name: trimmed }, { onConflict: "name" })
      .select()
      .single();

    if (tag) {
      await sb.from("block_tags").upsert(
        { block_id: blockId, tag_id: tag.id },
        { onConflict: "block_id,tag_id" }
      );
    }
  }
}

// Transform Supabase response to include tags array
function transformBlockWithTags(row: any): Block {
  const { block_tags, ...block } = row;
  return {
    ...block,
    tags: block_tags?.map((bt: any) => bt.tags).filter(Boolean) || [],
  };
}

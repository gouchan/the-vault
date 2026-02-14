"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { Block } from "@/types/block";

export async function getBoards() {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("blocks")
    .select("*, block_connections!block_connections_parent_id_fkey(count)")
    .eq("type", "board")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((b: any) => ({
    ...b,
    _count: { children: b.block_connections?.[0]?.count || 0 },
  }));
}

export async function getBoardWithBlocks(boardId: string) {
  const sb = createServerClient();

  // Get board
  const { data: board, error: boardError } = await sb
    .from("blocks")
    .select("*")
    .eq("id", boardId)
    .single();

  if (boardError) throw boardError;

  // Get connected blocks
  const { data: connections, error: connError } = await sb
    .from("block_connections")
    .select("child_id, sort_order, blocks!block_connections_child_id_fkey(*, block_tags(tag_id, tags(*)))")
    .eq("parent_id", boardId)
    .eq("connection_type", "contains")
    .order("sort_order");

  if (connError) throw connError;

  const children = (connections || []).map((c: any) => {
    const { block_tags, ...block } = c.blocks;
    return {
      ...block,
      tags: block_tags?.map((bt: any) => bt.tags).filter(Boolean) || [],
    };
  });

  return { ...board, children } as Block;
}

export async function addBlockToBoard(boardId: string, blockId: string) {
  const sb = createServerClient();

  // Get current max sort_order
  const { data: existing } = await sb
    .from("block_connections")
    .select("sort_order")
    .eq("parent_id", boardId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;

  const { error } = await sb.from("block_connections").upsert(
    {
      parent_id: boardId,
      child_id: blockId,
      connection_type: "contains",
      sort_order: sortOrder,
    },
    { onConflict: "parent_id,child_id,connection_type" }
  );

  if (error) throw error;
}

export async function removeBlockFromBoard(boardId: string, blockId: string) {
  const sb = createServerClient();
  const { error } = await sb
    .from("block_connections")
    .delete()
    .eq("parent_id", boardId)
    .eq("child_id", blockId)
    .eq("connection_type", "contains");

  if (error) throw error;
}

export async function getBoardsForBlock(blockId: string) {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("block_connections")
    .select("parent_id, blocks!block_connections_parent_id_fkey(id, title, type)")
    .eq("child_id", blockId)
    .eq("connection_type", "contains");

  if (error) throw error;
  return (data || []).map((c: any) => c.blocks).filter(Boolean);
}

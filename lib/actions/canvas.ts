"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { CanvasPosition } from "@/types/block";

export async function getCanvasPositions(boardId: string) {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_positions")
    .select("*")
    .eq("board_id", boardId);

  if (error) throw error;
  return data as CanvasPosition[];
}

export async function saveCanvasPosition(
  boardId: string,
  blockId: string,
  position: { x: number; y: number; width?: number; height?: number; z_index?: number }
) {
  const sb = createServerClient();
  const { error } = await sb.from("canvas_positions").upsert(
    {
      board_id: boardId,
      block_id: blockId,
      ...position,
    },
    { onConflict: "board_id,block_id" }
  );

  if (error) throw error;
}

export async function saveCanvasPositionsBatch(
  boardId: string,
  positions: Array<{ block_id: string; x: number; y: number; width?: number; height?: number; z_index?: number }>
) {
  const sb = createServerClient();
  const rows = positions.map((p) => ({ board_id: boardId, ...p }));

  const { error } = await sb.from("canvas_positions").upsert(rows, {
    onConflict: "board_id,block_id",
  });

  if (error) throw error;
}

"use server";

import { createServerClient } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────

export interface TldrawSnapshot {
  id: string;
  board_id: string;
  snapshot: Record<string, any>;
  updated_at: string;
}

export interface HistoryEntry {
  id: string;
  board_id: string;
  label: string | null;
  created_at: string;
}

export interface HistorySnapshot extends HistoryEntry {
  snapshot: Record<string, any>;
}

// ── Current snapshot (autosave) ────────────────────────────────

export async function getTldrawSnapshot(
  boardId: string
): Promise<TldrawSnapshot | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_snapshots")
    .select("*")
    .eq("board_id", boardId)
    .single();

  if (error && error.code === "PGRST116") return null; // not found
  if (error) throw error;
  return data as TldrawSnapshot;
}

export async function saveTldrawSnapshot(
  boardId: string,
  snapshot: Record<string, any>
): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb.from("canvas_snapshots").upsert(
    {
      board_id: boardId,
      snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "board_id" }
  );

  if (error) throw error;
}

// ── History (timeline) ─────────────────────────────────────────

export async function saveHistorySnapshot(
  boardId: string,
  snapshot: Record<string, any>,
  label?: string
): Promise<string> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_history")
    .insert({
      board_id: boardId,
      snapshot,
      label: label || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getHistory(
  boardId: string
): Promise<HistoryEntry[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_history")
    .select("id, board_id, label, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as HistoryEntry[];
}

export async function getHistorySnapshot(
  historyId: string
): Promise<HistorySnapshot | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_history")
    .select("*")
    .eq("id", historyId)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw error;
  return data as HistorySnapshot;
}

export async function deleteHistoryEntry(historyId: string): Promise<void> {
  const sb = createServerClient();
  const { error } = await sb
    .from("canvas_history")
    .delete()
    .eq("id", historyId);

  if (error) throw error;
}

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { updateBlock } from "@/lib/actions/blocks";

export interface Connector {
  id: string;
  board_id: string;
  from_block_id: string;
  to_block_id: string;
  created_at: string;
}

export async function getConnectors(boardId: string): Promise<Connector[]> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_connectors")
    .select("*")
    .eq("board_id", boardId);

  if (error) throw error;
  return (data || []) as Connector[];
}

export async function addConnector(
  boardId: string,
  fromBlockId: string,
  toBlockId: string
): Promise<Connector> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from("canvas_connectors")
    .upsert(
      { board_id: boardId, from_block_id: fromBlockId, to_block_id: toBlockId },
      { onConflict: "board_id,from_block_id,to_block_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Connector;
}

export async function removeConnector(connectorId: string) {
  const sb = createServerClient();
  const { error } = await sb
    .from("canvas_connectors")
    .delete()
    .eq("id", connectorId);

  if (error) throw error;
}

// ── Preview types (also used by ConnectorPreviewSheet) ───────
export interface ConnectorPreviewField {
  key: string;
  label: string;
  sourceValue: string | null;
  targetHasValue: boolean;
  canTransfer: boolean; // source has value AND target is empty
}

export interface ConnectorPreviewData {
  fromTitle: string;
  toTitle: string;
  fields: ConnectorPreviewField[];
  tagCount: number; // new tags source would add to target
}

/**
 * Preview what would be synced between two blocks — without actually syncing.
 */
export async function getConnectorPreview(
  fromBlockId: string,
  toBlockId: string
): Promise<ConnectorPreviewData> {
  const sb = createServerClient();

  const { data: fromBlock } = await sb.from("blocks").select("*").eq("id", fromBlockId).single();
  const { data: toBlock } = await sb.from("blocks").select("*").eq("id", toBlockId).single();
  if (!fromBlock || !toBlock) throw new Error("Blocks not found");

  const { data: fromTags } = await sb.from("block_tags").select("tag_id").eq("block_id", fromBlockId);
  const { data: toTags } = await sb.from("block_tags").select("tag_id").eq("block_id", toBlockId);
  const existingTagIds = new Set((toTags || []).map((t: any) => t.tag_id));
  const newTagCount = (fromTags || []).filter((t: any) => !existingTagIds.has(t.tag_id)).length;

  const fieldDefs = [
    { key: "url", label: "URL" },
    { key: "description", label: "Description" },
    { key: "notes", label: "Notes" },
    { key: "og_title", label: "OG Title" },
    { key: "og_image", label: "OG Image URL" },
  ];

  const fields: ConnectorPreviewField[] = fieldDefs.map(({ key, label }) => {
    const sourceValue = fromBlock[key] || null;
    const targetHasValue = !!toBlock[key];
    return {
      key,
      label,
      sourceValue,
      targetHasValue,
      canTransfer: !!sourceValue && !targetHasValue,
    };
  });

  return {
    fromTitle: fromBlock.title || "Untitled",
    toTitle: toBlock.title || "Untitled",
    fields,
    tagCount: newTagCount,
  };
}

/**
 * Sync only the user-selected fields from source → target.
 */
export async function syncSelectedFields(
  fromBlockId: string,
  toBlockId: string,
  selectedFieldKeys: string[],
  syncTags: boolean
): Promise<{ fieldsCopied: number; tagsSynced: boolean }> {
  const sb = createServerClient();

  const { data: fromBlock } = await sb.from("blocks").select("*").eq("id", fromBlockId).single();
  if (!fromBlock) return { fieldsCopied: 0, tagsSynced: false };

  const updates: Record<string, any> = {};
  for (const key of selectedFieldKeys) {
    if (fromBlock[key]) updates[key] = fromBlock[key];
  }
  if (Object.keys(updates).length > 0) {
    await sb.from("blocks").update(updates).eq("id", toBlockId);
  }

  let tagsSynced = false;
  if (syncTags) {
    const { data: fromTags } = await sb.from("block_tags").select("tag_id").eq("block_id", fromBlockId);
    const { data: toTags } = await sb.from("block_tags").select("tag_id").eq("block_id", toBlockId);
    if (fromTags && fromTags.length > 0) {
      const existingTagIds = new Set((toTags || []).map((t: any) => t.tag_id));
      const newTags = fromTags.filter((t: any) => !existingTagIds.has(t.tag_id));
      if (newTags.length > 0) {
        await sb.from("block_tags").insert(
          newTags.map((t: any) => ({ block_id: toBlockId, tag_id: t.tag_id }))
        );
        tagsSynced = true;
      }
    }
  }

  return { fieldsCopied: Object.keys(updates).length, tagsSynced };
}

/**
 * When two blocks are connected, copy shared fields from source → target.
 * Only copies non-empty fields that the target is missing.
 */
export async function syncConnectedFields(fromBlockId: string, toBlockId: string) {
  const sb = createServerClient();

  // Fetch both blocks
  const { data: fromBlock } = await sb.from("blocks").select("*").eq("id", fromBlockId).single();
  const { data: toBlock } = await sb.from("blocks").select("*").eq("id", toBlockId).single();

  if (!fromBlock || !toBlock) return;

  const updates: Record<string, any> = {};

  // Copy tags from source to target
  const { data: fromTags } = await sb
    .from("block_tags")
    .select("tag_id")
    .eq("block_id", fromBlockId);

  if (fromTags && fromTags.length > 0) {
    const { data: toTags } = await sb
      .from("block_tags")
      .select("tag_id")
      .eq("block_id", toBlockId);

    const existingTagIds = new Set((toTags || []).map((t: any) => t.tag_id));
    const newTags = fromTags.filter((t: any) => !existingTagIds.has(t.tag_id));

    if (newTags.length > 0) {
      await sb.from("block_tags").insert(
        newTags.map((t: any) => ({ block_id: toBlockId, tag_id: t.tag_id }))
      );
    }
  }

  // Copy shared text fields (only if target field is empty)
  const sharedFields = ["url", "description", "notes"] as const;
  for (const field of sharedFields) {
    if (fromBlock[field] && !toBlock[field]) {
      updates[field] = fromBlock[field];
    }
  }

  // Copy OG metadata if target is missing
  if (fromBlock.og_title && !toBlock.og_title) updates.og_title = fromBlock.og_title;
  if (fromBlock.og_description && !toBlock.og_description) updates.og_description = fromBlock.og_description;
  if (fromBlock.og_image && !toBlock.og_image) updates.og_image = fromBlock.og_image;

  if (Object.keys(updates).length > 0) {
    await sb.from("blocks").update(updates).eq("id", toBlockId);
  }

  return { fieldsCopied: Object.keys(updates), tagsCopied: fromTags?.length || 0 };
}

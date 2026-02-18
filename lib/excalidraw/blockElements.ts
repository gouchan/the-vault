import type { Block } from "@/types/block";

// ── Constants ─────────────────────────────────────────────────
export const BLOCK_WIDTH = 260;
export const BLOCK_HEIGHT = 140;
export const BLOCK_GAP = 20;
export const COLS = 4;

// ── Color palette (matches vault dark theme) ──────────────────
const COLORS = {
  person: { bg: "#1e1e2e", stroke: "#585874", text: "#e4e4ef" },
  reference: { bg: "#1a1a2e", stroke: "#3d5a80", text: "#e4e4ef" },
  note: { bg: "#2d2b1e", stroke: "#6b6840", text: "#e4e4ef" },
  board: { bg: "#1e2a1e", stroke: "#4a7c59", text: "#e4e4ef" },
  default: { bg: "#1e1e2e", stroke: "#585874", text: "#e4e4ef" },
};

function getColors(blockType: string) {
  return COLORS[blockType as keyof typeof COLORS] || COLORS.default;
}

// ── Type for an element skeleton ──────────────────────────────
// Matches what convertToExcalidrawElements expects
export interface ElementSkeleton {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: string;
  verticalAlign?: string;
  backgroundColor?: string;
  strokeColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  roundness?: { type: number } | null;
  opacity?: number;
  id?: string;
  groupIds?: string[];
  customData?: Record<string, any>;
  boundElements?: any[];
  containerId?: string | null;
  label?: { text: string; fontSize?: number; fontFamily?: number };
}

// ── Generate a stable element ID from block ID ────────────────
export function blockElementId(blockId: string): string {
  return `vault-${blockId}`;
}

// ── Convert Block → Excalidraw element skeleton ───────────────
export function blockToElementSkeleton(
  block: Block,
  x: number,
  y: number
): ElementSkeleton {
  const colors = getColors(block.type);
  const title = block.title || "Untitled";
  const subtitle = getSubtitle(block);

  // Single rectangle with a label (title + subtitle)
  const labelText = subtitle ? `${title}\n${subtitle}` : title;

  return {
    type: "rectangle",
    x,
    y,
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    backgroundColor: colors.bg,
    strokeColor: colors.stroke,
    fillStyle: "solid",
    strokeWidth: 1,
    roundness: { type: 3 },
    opacity: 100,
    id: blockElementId(block.id),
    customData: {
      vaultBlockId: block.id,
      blockType: block.type,
    },
    label: {
      text: labelText,
      fontSize: 16,
      fontFamily: 1, // Virgil (hand-drawn)
    },
  };
}

// ── Get subtitle based on block type ──────────────────────────
function getSubtitle(block: Block): string {
  switch (block.type) {
    case "person":
      return block.role || "";
    case "reference": {
      if (block.url) {
        try {
          return new URL(block.url).hostname;
        } catch {
          return block.url.slice(0, 40);
        }
      }
      return "";
    }
    case "note":
    case "prompt":
      return block.content?.slice(0, 80) || "";
    case "board":
      return block.description?.slice(0, 60) || "";
    default:
      return "";
  }
}

// ── Grid layout helper ────────────────────────────────────────
export function gridPosition(index: number): { x: number; y: number } {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: col * (BLOCK_WIDTH + BLOCK_GAP) + 50,
    y: row * (BLOCK_HEIGHT + BLOCK_GAP) + 50,
  };
}

// ── Find block element in scene ───────────────────────────────
export function findBlockElement(
  elements: readonly any[],
  blockId: string
): any | undefined {
  return elements.find(
    (el: any) => el.customData?.vaultBlockId === blockId && !el.isDeleted
  );
}

// ── Count vault block elements ────────────────────────────────
export function countBlockElements(elements: readonly any[]): number {
  return elements.filter(
    (el: any) => el.customData?.vaultBlockId && !el.isDeleted
  ).length;
}

// ── Get all vault block IDs from scene ────────────────────────
export function getBlockIdsFromScene(elements: readonly any[]): Set<string> {
  const ids = new Set<string>();
  for (const el of elements) {
    if (el.customData?.vaultBlockId && !el.isDeleted) {
      ids.add(el.customData.vaultBlockId);
    }
  }
  return ids;
}

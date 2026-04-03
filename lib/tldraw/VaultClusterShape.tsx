"use client";

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLShape,
  type TLShapePartial,
} from "@tldraw/tldraw";
import { useState } from "react";
import type { VaultBlockShape } from "./VaultBlockShape";

// ── Type declaration ─────────────────────────────────────────────
declare module "@tldraw/tldraw" {
  interface TLGlobalShapePropsMap {
    "vault-cluster": {
      w: number;
      h: number;
      title: string;
      collapsed: boolean;
    };
  }
}

export type VaultClusterShape = TLShape<"vault-cluster">;

// ── Constants ────────────────────────────────────────────────────
const PADDING = 16;
const HEADER_HEIGHT = 36;
const MIN_W = 200;
const MIN_H = 120;
const CHILD_GAP = 12;
const CHILD_COLS = 2;

// ── Shape Util ───────────────────────────────────────────────────
export class VaultClusterShapeUtil extends BaseBoxShapeUtil<VaultClusterShape> {
  static override type = "vault-cluster" as const;
  static override props = {
    w: T.number,
    h: T.number,
    title: T.string,
    collapsed: T.boolean,
  };

  override canResize() { return true; }
  override canBind() { return true; }

  // Accept vault-block shapes as children, but not other clusters
  override canReceiveNewChildrenOfType(_shape: VaultClusterShape, _type: string) {
    return _type === "vault-block";
  }

  getDefaultProps() {
    return {
      w: 320,
      h: 200,
      title: "Cluster",
      collapsed: false,
    };
  }

  // ── Drop shapes over → reparent + auto-layout ─────────────────
  override onDropShapesOver(shape: VaultClusterShape, shapes: TLShape[]) {
    const validShapes = shapes.filter((s) => s.type === "vault-block");
    if (validShapes.length === 0) return;

    const newShapes = validShapes.filter((s) => s.parentId !== shape.id);
    if (newShapes.length > 0) {
      this.editor.reparentShapes(newShapes, shape.id);
    }

    const updated = this.editor.getShape(shape.id) as VaultClusterShape | undefined;
    if (updated) this.autoLayoutChildren(updated);
  }

  // ── Drag shapes out → they get reparented to the page by tldraw ─
  override onDragShapesOut(shape: VaultClusterShape, _shapes: TLShape[]) {
    // Re-layout after tldraw finishes the reparent
    const shapeId = shape.id;
    const editor = this.editor;
    // Use a microtask so tldraw finishes reparent first, but safer than rAF
    queueMicrotask(() => {
      try {
        const current = editor.getShape(shapeId) as VaultClusterShape | undefined;
        if (current) this.autoLayoutChildren(current);
      } catch {
        // Editor may be disposed — safe to ignore
      }
    });
  }

  // ── Children changed → resize cluster to fit ──────────────────
  override onChildrenChange(shape: VaultClusterShape): TLShapePartial[] | void {
    this.autoLayoutChildren(shape);
  }

  // ── Auto-layout: arrange children in a grid inside the cluster ─
  private _isLayouting = false;

  private autoLayoutChildren(shape: VaultClusterShape) {
    if (this._isLayouting) return;
    this._isLayouting = true;

    try {
    this.editor.run(() => {
    const children = this.editor
      .getSortedChildIdsForParent(shape.id)
      .map((id) => this.editor.getShape(id))
      .filter((s): s is VaultBlockShape => s?.type === "vault-block");

    if (children.length === 0) {
      // Shrink to minimum when empty
      if (shape.props.w !== MIN_W || shape.props.h !== MIN_H) {
        this.editor.updateShape({
          id: shape.id,
          type: "vault-cluster",
          props: { w: MIN_W, h: MIN_H },
        });
      }
      return;
    }

    // Calculate grid layout
    const cols = Math.min(CHILD_COLS, children.length);
    const childW = Math.max(
      200,
      (shape.props.w - PADDING * 2 - CHILD_GAP * (cols - 1)) / cols
    );

    // First pass: compute max height per row
    const rowHeights: number[] = [];
    for (let i = 0; i < children.length; i++) {
      const r = Math.floor(i / cols);
      rowHeights[r] = Math.max(rowHeights[r] ?? 0, children[i].props.h);
    }

    // Second pass: position children using accumulated row heights
    const updates: TLShapePartial[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const row = Math.floor(i / cols);
      const col = i % cols;

      const x = PADDING + col * (childW + CHILD_GAP);
      let yOffset = 0;
      for (let r = 0; r < row; r++) {
        yOffset += rowHeights[r] + CHILD_GAP;
      }
      const y = HEADER_HEIGHT + PADDING + yOffset;

      if (Math.abs(child.x - x) > 1 || Math.abs(child.y - y) > 1) {
        updates.push({ id: child.id, type: "vault-block", x, y });
      }
    }

    if (updates.length > 0) {
      this.editor.updateShapes(updates);
    }

    // Resize cluster to fit all children
    const totalRowH = rowHeights.reduce((sum, h) => sum + h + CHILD_GAP, 0) - CHILD_GAP;
    const neededH = HEADER_HEIGHT + PADDING * 2 + totalRowH;
    const neededW = PADDING * 2 + cols * childW + (cols - 1) * CHILD_GAP;

    const newW = Math.max(MIN_W, neededW);
    const newH = Math.max(MIN_H, neededH);

    if (Math.abs(shape.props.w - newW) > 2 || Math.abs(shape.props.h - newH) > 2) {
      this.editor.updateShape({
        id: shape.id,
        type: "vault-cluster",
        props: { w: newW, h: newH },
      });
    }
    }); // end editor.run
    } finally {
      this._isLayouting = false;
    }
  }

  component(shape: VaultClusterShape) {
    return <ClusterComponent shape={shape} />;
  }

  indicator(shape: VaultClusterShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={16}
        strokeDasharray="8 4"
      />
    );
  }
}

// ── Cluster visual component ─────────────────────────────────────
function ClusterComponent({ shape }: { shape: VaultClusterShape }) {
  const [hovered, setHovered] = useState(false);
  const { title, w, h } = shape.props;

  return (
    <HTMLContainer
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "16px",
        border: `2px dashed ${hovered ? "var(--sticky-yellow, #FFE066)" : "var(--color-border, #404040)"}`,
        background: hovered
          ? "var(--vault-cluster-bg-hover, rgba(255,224,102,0.04))"
          : "var(--vault-cluster-bg, rgba(255,255,255,0.02))",
        transition: "border-color 0.2s ease, background 0.2s ease",
        pointerEvents: "all",
        display: "flex",
        flexDirection: "column",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div
        style={{
          height: HEADER_HEIGHT,
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          borderBottom: "1px solid var(--color-border, #27272a)",
        }}
      >
        {/* Cluster icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-muted-fg, #999)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-text, #e8e8e8)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {title || "Cluster"}
        </span>
      </div>

      {/* Content area — children are rendered by tldraw as child shapes */}
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
        }}
      />
    </HTMLContainer>
  );
}

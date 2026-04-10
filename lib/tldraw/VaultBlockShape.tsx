"use client";

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLShape,
} from "@tldraw/tldraw";
import { useState } from "react";
import { ReferenceMedia } from "./ReferenceMedia";

// ── Shared styles ────────────────────────────────────────────────
// tldraw shapes run inside HTMLContainer — external CSS classes
// don't apply, so all styling is inline + CSS custom properties.

const CARD_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  background: "var(--color-card, #0a0a0c)",
  color: "var(--color-text, #fafafa)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  display: "flex",
  flexDirection: "column",
  pointerEvents: "all",
  // Spatial-style depth
  boxShadow: "var(--vault-card-shadow, 0 2px 12px rgba(0,0,0,0.08))",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
};

// ── Custom shape type declaration ────────────────────────────────
declare module "@tldraw/tldraw" {
  interface TLGlobalShapePropsMap {
    "vault-block": {
      w: number;
      h: number;
      blockId: string;
      blockType: string;
      title: string;
      role: string;
      avatarUrl: string;
      thumbnailUrl: string;
      url: string;
      mediaType: string;
      content: string;
      tagNames: string;
    };
  }
}

export type VaultBlockShape = TLShape<"vault-block">;

// ── Shape Util ───────────────────────────────────────────────────
export class VaultBlockShapeUtil extends BaseBoxShapeUtil<VaultBlockShape> {
  static override type = "vault-block" as const;
  static override props = {
    w: T.number,
    h: T.number,
    blockId: T.string,
    blockType: T.string,
    title: T.string,
    role: T.string,
    avatarUrl: T.string,
    thumbnailUrl: T.string,
    url: T.string,
    mediaType: T.string,
    content: T.string,
    tagNames: T.string,
  };

  override canResize() { return true; }
  override canBind() { return true; }

  getDefaultProps() {
    return {
      w: 280, h: 200,
      blockId: "", blockType: "reference", title: "", role: "",
      avatarUrl: "", thumbnailUrl: "", url: "", mediaType: "",
      content: "", tagNames: "",
    };
  }

  component(shape: VaultBlockShape) {
    return <VaultCardComponent shape={shape} />;
  }

  indicator(shape: VaultBlockShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} />;
  }
}

// ── Card wrapper with inline hover state ─────────────────────────
function VaultCardComponent({ shape }: { shape: VaultBlockShape }) {
  const [hovered, setHovered] = useState(false);
  const { blockType, title, role, avatarUrl, thumbnailUrl, url, content, tagNames } =
    shape.props;
  const tagCount = tagNames ? tagNames.split(",").filter(Boolean).length : 0;

  const hoverStyle: React.CSSProperties = hovered
    ? {
        boxShadow: "var(--vault-card-shadow-hover, 0 8px 32px rgba(0,0,0,0.18))",
        transform: "translateY(-1px)",
      }
    : {};

  return (
    <HTMLContainer
      style={{ ...CARD_STYLE, ...hoverStyle }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {blockType === "person" && (
        <PersonCard title={title} role={role} avatarUrl={avatarUrl} />
      )}

      {blockType === "reference" && (
        <ReferenceMedia
          thumbnailUrl={thumbnailUrl}
          url={url}
          title={title}
          tagCount={tagCount}
        />
      )}

      {(blockType === "note" || blockType === "prompt") && (
        <NoteCard title={title} content={content} />
      )}

      {blockType === "board" && (
        <BoardCard title={title} />
      )}
    </HTMLContainer>
  );
}

// ── Person card ──────────────────────────────────────────────────
function PersonCard({ title, role, avatarUrl }: {
  title: string; role: string; avatarUrl: string;
}) {
  return (
    <div style={{ padding: "14px", display: "flex", alignItems: "center", gap: "10px", height: "100%" }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          style={{
            width: 36, height: 36, borderRadius: "50%",
            objectFit: "cover", flexShrink: 0,
          }}
        />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "var(--color-muted, #1c1c22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", fontWeight: 600,
          color: "var(--color-muted-fg, #a1a1aa)", flexShrink: 0,
        }}>
          {title?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: "13px", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {title || "Untitled"}
        </div>
        {role && (
          <div style={{ fontSize: "11px", color: "var(--color-muted-fg, #a1a1aa)", marginTop: "2px" }}>
            {role}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Note card ────────────────────────────────────────────────────
function NoteCard({ title, content }: {
  title: string; content: string;
}) {
  return (
    <div style={{
      padding: "14px", display: "flex", flexDirection: "column",
      gap: "6px", height: "100%",
    }}>
      {title && (
        <div style={{ fontSize: "12px", fontWeight: 600, lineHeight: "1.3" }}>
          {title}
        </div>
      )}
      {content && (
        <div style={{
          fontSize: "11px", lineHeight: "1.5",
          color: "var(--color-muted-fg, #a1a1aa)",
          overflow: "hidden", flex: 1,
          whiteSpace: "pre-wrap",
          maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
        }}>
          {content.slice(0, 500)}
        </div>
      )}
      {!title && !content && (
        <div style={{
          fontSize: "11px", color: "var(--color-muted-fg, #a1a1aa)",
          fontStyle: "italic",
        }}>
          Empty note
        </div>
      )}
    </div>
  );
}

// ── Board card ───────────────────────────────────────────────────
function BoardCard({ title }: { title: string }) {
  return (
    <div style={{
      padding: "14px", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", gap: "8px",
    }}>
      {/* Stacked cards icon instead of emoji */}
      <div style={{
        position: "relative", width: 40, height: 32,
      }}>
        <div style={{
          position: "absolute", left: 4, top: 0,
          width: 28, height: 20, borderRadius: "4px",
          background: "var(--color-muted, #1c1c22)",
          border: "1px solid var(--color-border, #27272a)",
        }} />
        <div style={{
          position: "absolute", left: 0, top: 6,
          width: 28, height: 20, borderRadius: "4px",
          background: "var(--color-card, #0a0a0c)",
          border: "1px solid var(--color-border, #27272a)",
        }} />
      </div>
      <div style={{
        fontSize: "12px", fontWeight: 600,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: "100%",
      }}>
        {title || "Untitled Garland"}
      </div>
    </div>
  );
}

// ── Helper: convert Block data to shape props ────────────────────
export function blockToShapeProps(block: {
  id: string;
  type: string;
  title: string | null;
  role?: string | null;
  avatar_url?: string | null;
  thumbnail_url?: string | null;
  og_image?: string | null;
  url?: string | null;
  media_type?: string | null;
  content?: string | null;
  tags?: { name: string }[];
}) {
  return {
    blockId: block.id,
    blockType: block.type,
    title: block.title || "",
    role: block.role || "",
    avatarUrl: block.avatar_url || "",
    thumbnailUrl: block.thumbnail_url || block.og_image || "",
    url: block.url || "",
    mediaType: block.media_type || "",
    content: block.content || "",
    tagNames: block.tags?.map((t) => t.name).join(",") || "",
  };
}

"use client";

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLShape,
} from "@tldraw/tldraw";
import { getYouTubeId } from "@/lib/utils/url-parser";

// ── Custom shape type declaration ──────────────────────────────
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

// ── Shape Util ─────────────────────────────────────────────────
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

  override canResize() {
    return true;
  }

  override canBind() {
    return true;
  }

  getDefaultProps() {
    return {
      w: 280,
      h: 200,
      blockId: "",
      blockType: "reference",
      title: "",
      role: "",
      avatarUrl: "",
      thumbnailUrl: "",
      url: "",
      mediaType: "",
      content: "",
      tagNames: "",
    };
  }

  component(shape: VaultBlockShape) {
    const { blockType, title, role, avatarUrl, thumbnailUrl, url, mediaType, content, tagNames } =
      shape.props;
    const tags = tagNames ? tagNames.split(",").filter(Boolean) : [];
    const youtubeId = url ? getYouTubeId(url) : null;
    const isImage = mediaType === "image" || /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(url || "");

    return (
      <HTMLContainer
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: "8px",
          border: "1px solid var(--color-border, #27272a)",
          background: "var(--color-card, #0a0a0c)",
          color: "var(--color-text, #fafafa)",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "all",
        }}
      >
        {/* ─── Person ─── */}
        {blockType === "person" && (
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--color-muted, #1c1c22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    color: "var(--color-muted-fg, #a1a1aa)",
                    flexShrink: 0,
                  }}
                >
                  {title?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</div>
                {role && <div style={{ fontSize: "11px", color: "var(--color-muted-fg, #a1a1aa)" }}>{role}</div>}
              </div>
            </div>
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "9999px",
                      background: "var(--color-muted, #1c1c22)",
                      color: "var(--color-muted-fg, #a1a1aa)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Reference (image-first) ─── */}
        {blockType === "reference" && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {(thumbnailUrl || youtubeId || isImage) && (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "hidden",
                  background: "var(--color-muted, #1c1c22)",
                }}
              >
                <img
                  src={
                    thumbnailUrl ||
                    (isImage ? url : "") ||
                    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "")
                  }
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div style={{ padding: "8px 10px", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title || (() => { try { return new URL(url).hostname; } catch { return "Untitled"; } })()}
              </div>
              {url && (
                <div style={{ fontSize: "10px", color: "var(--color-muted-fg, #71717a)", marginTop: "2px" }}>
                  {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Prompt / Note (sticky style) ─── */}
        {blockType === "prompt" && (
          <div
            style={{
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              height: "100%",
              background: "var(--color-note-bg, #1a1a0e)",
              borderColor: "var(--color-note-border, #3d3d1a)",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600 }}>{title || "Untitled Note"}</div>
            {content && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-muted-fg, #a1a1aa)",
                  fontFamily: "monospace",
                  background: "rgba(0,0,0,0.15)",
                  padding: "6px 8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  flex: 1,
                  whiteSpace: "pre-wrap",
                }}
              >
                {content.slice(0, 500)}
              </div>
            )}
          </div>
        )}

        {/* ─── Board ─── */}
        {blockType === "board" && (
          <div
            style={{
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "6px",
            }}
          >
            <div style={{ fontSize: "20px" }}>&#x1F4CB;</div>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>{title || "Untitled Board"}</div>
          </div>
        )}
      </HTMLContainer>
    );
  }

  indicator(shape: VaultBlockShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}

// ── Helper: convert Block data to shape props ──────────────────
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

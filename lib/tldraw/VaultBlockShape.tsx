"use client";

import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type TLShape,
} from "@tldraw/tldraw";
import { useState, useCallback, useRef, useEffect } from "react";
import { getYouTubeId, isVideoUrl, isGifUrl } from "@/lib/utils/url-parser";

// ── GIF pause/play + Video play button ─────────────────────────
function ReferenceMedia({
  thumbnailUrl,
  url,
  youtubeId,
  isImage,
  isGif,
  isVideo,
  title,
}: {
  thumbnailUrl: string;
  url: string;
  youtubeId: string | null;
  isImage: boolean;
  isGif: boolean;
  isVideo: boolean;
  title: string;
}) {
  const [gifPaused, setGifPaused] = useState(false);
  const [staticFrame, setStaticFrame] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const gifSrc = thumbnailUrl || url || "";

  // Capture the first frame of a GIF for the paused state
  const captureStaticFrame = useCallback(() => {
    if (!gifSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setStaticFrame(canvas.toDataURL("image/png"));
        }
      } catch {
        // CORS or other error — just leave null, GIF will keep playing
      }
    };
    img.src = gifSrc;
  }, [gifSrc]);

  // Capture static frame on mount for GIFs
  useEffect(() => {
    if (isGif) captureStaticFrame();
  }, [isGif, captureStaticFrame]);

  const handleGifClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setGifPaused((prev) => !prev);
  }, []);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (url) window.open(url, "_blank");
    },
    [url]
  );

  const imageSrc =
    thumbnailUrl ||
    (isImage ? url : "") ||
    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "");

  const displaySrc = isGif && gifPaused && staticFrame ? staticFrame : imageSrc;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {(thumbnailUrl || youtubeId || isImage) && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            background: "var(--color-muted, #1c1c22)",
            position: "relative",
            cursor: isGif ? "pointer" : isVideo ? "pointer" : "default",
          }}
          onClick={isGif ? handleGifClick : isVideo ? handleVideoClick : undefined}
        >
          <img
            ref={imgRef}
            src={displaySrc}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* GIF badge + pause/play indicator */}
          {isGif && (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "2px 5px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                GIF
              </div>
              {gifPaused && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="14" height="16" viewBox="0 0 14 16" fill="white">
                      <polygon points="2,0 14,8 2,16" />
                    </svg>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Video play button overlay */}
          {isVideo && !isGif && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.65)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                <svg width="16" height="18" viewBox="0 0 14 16" fill="white">
                  <polygon points="2,0 14,8 2,16" />
                </svg>
              </div>
            </div>
          )}
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
  );
}

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
    const isGif = isGifUrl(url || "") || isGifUrl(thumbnailUrl || "");
    const isVideo = isVideoUrl(url || "") || mediaType === "video" || mediaType === "youtube" || mediaType === "vimeo";

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
          <ReferenceMedia
            thumbnailUrl={thumbnailUrl}
            url={url}
            youtubeId={youtubeId}
            isImage={isImage}
            isGif={isGif}
            isVideo={isVideo}
            title={title}
          />
        )}

        {/* ─── Prompt / Note (sticky style) ─── */}
        {(blockType === "note" || blockType === "prompt") && (
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

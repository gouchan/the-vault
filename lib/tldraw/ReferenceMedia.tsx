"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getYouTubeId, isVideoUrl, isGifUrl } from "@/lib/utils/url-parser";

// ── Shared inline SVG icons (avoids lucide dep inside tldraw shapes) ──
const ExternalLinkIcon = ({ size = 10, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-fg, #71717a)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

interface ReferenceMediaProps {
  thumbnailUrl: string;
  url: string;
  title: string;
  tagCount: number;
}

export function ReferenceMedia({ thumbnailUrl, url, title, tagCount }: ReferenceMediaProps) {
  const [gifPaused, setGifPaused] = useState(false);
  const [staticFrame, setStaticFrame] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const youtubeId = url ? getYouTubeId(url) : null;
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(url || "");
  const isGif = isGifUrl(url || "") || isGifUrl(thumbnailUrl || "");
  const isVideo = isVideoUrl(url || "");

  // Lazy OG re-fetch if no thumbnail
  useEffect(() => {
    if (thumbnailUrl || !url || isImage || youtubeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/og-fetch?url=${encodeURIComponent(url)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.image && !cancelled) setFetchedImage(data.image);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [url, thumbnailUrl, isImage, youtubeId]);

  const gifSrc = thumbnailUrl || fetchedImage || url || "";

  // Capture first frame of GIF for paused state
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
      } catch { /* CORS */ }
    };
    img.src = gifSrc;
  }, [gifSrc]);

  useEffect(() => {
    if (isGif) captureStaticFrame();
  }, [isGif, captureStaticFrame]);

  const handleGifClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setGifPaused((p) => !p);
  }, []);

  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) window.open(url, "_blank");
  }, [url]);

  const handleOpenUrl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) window.open(url, "_blank", "noopener");
  }, [url]);

  // Image source resolution
  const rawImageSrc =
    thumbnailUrl ||
    fetchedImage ||
    (isImage ? url : "") ||
    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "");

  const imageSrc = rawImageSrc && !rawImageSrc.startsWith("/") && !youtubeId
    ? `/api/img-proxy?url=${encodeURIComponent(rawImageSrc)}`
    : rawImageSrc;

  const displaySrc = isGif && gifPaused && staticFrame ? staticFrame : imageSrc;

  // Hostname + favicon
  let hostname = "";
  try { hostname = new URL(url).hostname.replace(/^www\./, ""); } catch { /* invalid URL */ }
  const faviconUrl = hostname
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
    : "";

  const showImage = (thumbnailUrl || fetchedImage || youtubeId || isImage) && !imgError;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Image area ── */}
      {showImage ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            background: "var(--color-muted, #1c1c22)",
            position: "relative",
            cursor: url ? "pointer" : "default",
            borderRadius: "11px 11px 0 0",
          }}
          onClick={isGif ? handleGifClick : isVideo ? handleVideoClick : url ? handleOpenUrl : undefined}
        >
          <img
            ref={imgRef}
            src={displaySrc}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgError(true)}
          />

          {/* GIF badge */}
          {isGif && (
            <div style={{
              position: "absolute", top: 8, left: 8,
              background: "rgba(0,0,0,0.7)", color: "#fff",
              fontSize: "9px", fontWeight: 700, padding: "2px 6px",
              borderRadius: "6px", letterSpacing: "0.5px", textTransform: "uppercase",
            }}>
              GIF
            </div>
          )}

          {/* GIF paused overlay */}
          {isGif && gifPaused && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="16" viewBox="0 0 14 16" fill="white"><polygon points="2,0 14,8 2,16" /></svg>
              </div>
            </div>
          )}

          {/* Video play button */}
          {isVideo && !isGif && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                <svg width="16" height="18" viewBox="0 0 14 16" fill="white"><polygon points="2,0 14,8 2,16" /></svg>
              </div>
            </div>
          )}

          {/* External link badge */}
          {url && !isGif && !isVideo && (
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(0,0,0,0.5)", borderRadius: "6px",
              padding: "4px 6px", display: "flex", alignItems: "center",
              backdropFilter: "blur(8px)",
            }}>
              <ExternalLinkIcon size={10} />
            </div>
          )}
        </div>
      ) : (
        /* ── No image fallback ── */
        <div
          style={{
            flex: 1, minHeight: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "10px",
            background: "var(--color-muted, #1c1c22)",
            padding: "16px", cursor: url ? "pointer" : "default",
            borderRadius: "11px 11px 0 0",
          }}
          onClick={url ? handleOpenUrl : undefined}
        >
          {faviconUrl ? (
            <img src={faviconUrl} alt="" style={{ width: 32, height: 32, borderRadius: "6px" }} />
          ) : (
            <GlobeIcon />
          )}
          {url && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <ExternalLinkIcon size={10} color="var(--color-muted-fg, #71717a)" />
              <span style={{ fontSize: "10px", color: "var(--color-muted-fg, #71717a)" }}>
                {hostname}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom metadata bar ── */}
      <div style={{
        padding: "8px 10px",
        flexShrink: 0,
        borderTop: "1px solid var(--color-border, #27272a)",
        display: "flex",
        flexDirection: "column",
        gap: "3px",
      }}>
        <div style={{
          fontSize: "11px", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: "1.3",
        }}>
          {title || hostname || "Untitled"}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          fontSize: "9px", color: "var(--color-muted-fg, #71717a)",
        }}>
          {/* Favicon + hostname */}
          {url && (
            <div
              style={{ display: "flex", alignItems: "center", gap: "3px", cursor: "pointer", minWidth: 0 }}
              onClick={handleOpenUrl}
            >
              {faviconUrl && (
                <img src={faviconUrl} alt="" style={{ width: 10, height: 10, borderRadius: "2px", flexShrink: 0 }} />
              )}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {hostname}
              </span>
              <ExternalLinkIcon size={8} color="var(--color-muted-fg, #71717a)" />
            </div>
          )}
          {/* Tag count */}
          {tagCount > 0 && (
            <span style={{
              marginLeft: "auto", flexShrink: 0,
              background: "var(--color-muted, #1c1c22)",
              padding: "1px 5px", borderRadius: "4px",
            }}>
              {tagCount} tag{tagCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

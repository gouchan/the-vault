"use client";

import { useState } from "react";
import type { Block } from "@/types/block";
import { Badge } from "@/components/ui/badge";
import { Lightbox } from "@/components/ui/lightbox";
import { getYouTubeId, getVimeoId, isVideoUrl } from "@/lib/utils/url-parser";
import { ExternalLink, Play, Link2 } from "lucide-react";

export function ReferenceCard({ block, onClick }: { block: Block; onClick?: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const youtubeId = block.url ? getYouTubeId(block.url) : null;
  const vimeoId = block.url ? getVimeoId(block.url) : null;
  const isVideo = !!(youtubeId || vimeoId || block.media_type === "video" || isVideoUrl(block.url || ""));
  const isImage = block.media_type === "image";

  const thumbnailUrl =
    !imgError
      ? block.thumbnail_url ||
        block.og_image ||
        (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null)
      : null;

  const hostname = block.url
    ? (() => { try { return new URL(block.url).hostname.replace("www.", ""); } catch { return block.url; } })()
    : null;

  const faviconUrl = hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32` : null;

  const title = block.title || block.og_title || hostname || "Untitled";
  const description = block.description || block.og_description;

  const hasImage = !!(thumbnailUrl || (isImage && block.url && !imgError));
  const lightboxSrc = thumbnailUrl || (isImage ? block.url : null);

  const handleClick = () => {
    if (hasImage && lightboxSrc) {
      setLightboxOpen(true);
    } else {
      onClick?.();
    }
  };

  return (
    <>
    {lightboxOpen && lightboxSrc && (
      <Lightbox
        src={lightboxSrc}
        alt={title}
        title={title}
        hostname={hostname || undefined}
        url={block.url || undefined}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    <div
      onClick={handleClick}
      className="group relative cursor-pointer rounded-xl overflow-hidden bg-[var(--card)] border border-transparent hover:border-[var(--border)] transition-all duration-200 hover:shadow-lg hover:shadow-black/30"
    >
      {/* ── Image / Thumbnail area ── */}
      {thumbnailUrl && !isImage ? (
        <div className="relative w-full overflow-hidden bg-[var(--secondary)]">
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full block object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setImgError(true)}
          />
          {/* Video play badge */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/60 p-2.5 backdrop-blur-sm">
                <Play className="h-4 w-4 text-white" fill="white" />
              </div>
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-1">
            <p className="text-white text-[13px] font-medium leading-snug line-clamp-2">{title}</p>
            {hostname && (
              <div className="flex items-center gap-1.5">
                {faviconUrl && (
                  <img src={faviconUrl} alt="" className="h-3.5 w-3.5 rounded-sm opacity-80" onError={() => {}} />
                )}
                <span className="text-white/60 text-[10px]">{hostname}</span>
              </div>
            )}
          </div>
          {/* External link pill — top right on hover */}
          {block.url && (
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/15 hover:bg-white/30 backdrop-blur-md rounded-full p-1.5"
            >
              <ExternalLink className="h-3 w-3 text-white" />
            </a>
          )}
        </div>
      ) : isImage && block.url ? (
        <div className="relative w-full overflow-hidden bg-[var(--secondary)]">
          <img
            src={block.url}
            alt={title}
            className="w-full block object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
            <p className="text-white text-[13px] font-medium leading-snug line-clamp-2">{title}</p>
          </div>
        </div>
      ) : (
        /* No image — text card */
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              {faviconUrl ? (
                <img src={faviconUrl} alt="" className="h-5 w-5 rounded-sm" onError={() => {}} />
              ) : (
                <Link2 className="h-4 w-4 text-[var(--muted-foreground)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug line-clamp-3">{title}</p>
              {description && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">{description}</p>
              )}
              {hostname && (
                <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]/50 truncate">{hostname}</p>
              )}
            </div>
            {block.url && (
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-opacity"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tags — only shown for text cards or if present */}
      {block.tags && block.tags.length > 0 && !thumbnailUrl && !(isImage && block.url) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {block.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

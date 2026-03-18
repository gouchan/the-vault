"use client";

import { useEffect, useCallback } from "react";
import { X, ExternalLink } from "lucide-react";

interface LightboxProps {
  src: string;
  alt?: string;
  title?: string;
  hostname?: string;
  url?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt, title, hostname, url, onClose }: LightboxProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/60 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hostname && (
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
              alt=""
              className="h-4 w-4 rounded-sm opacity-70 shrink-0"
            />
          )}
          {title && (
            <span className="text-white/80 text-sm truncate max-w-[60vw]">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
              title="Open original"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt || ""}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

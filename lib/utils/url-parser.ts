import type { MediaType } from "@/types/block";

export function detectMediaType(url: string): MediaType {
  const lower = url.toLowerCase();

  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(lower)) {
    return "youtube";
  }
  if (/vimeo\.com\//.test(lower)) {
    return "vimeo";
  }
  if (/twitter\.com\/|x\.com\//.test(lower)) {
    return "tweet";
  }
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(lower)) {
    return "image";
  }
  if (/\.(mp4|webm|mov|avi)(\?|$)/i.test(lower)) {
    return "video";
  }

  return "url";
}

export function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || null;
}

export function isValidUrl(str: string): boolean {
  try {
    new URL(str.startsWith("http") ? str : `https://${str}`);
    return true;
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith("http")) {
    return `https://${url}`;
  }
  return url;
}

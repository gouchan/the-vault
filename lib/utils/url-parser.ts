import type { MediaType } from "@/types/block";

export function detectMediaType(url: string): MediaType {
  const lower = url.toLowerCase();

  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(lower)) {
    return "youtube";
  }
  if (/vimeo\.com\//.test(lower)) {
    return "vimeo";
  }
  if (/tiktok\.com/i.test(lower)) {
    return "video";
  }
  if (/instagram\.com\/reel/i.test(lower)) {
    return "video";
  }
  if (/snapchat\.com\/spotlight/i.test(lower)) {
    return "video";
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

/** Check if URL points to a video platform (YouTube, Vimeo, TikTok, Reels, Snapchat) */
export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    /youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts/.test(lower) ||
    /vimeo\.com\//.test(lower) ||
    /tiktok\.com/i.test(lower) ||
    /instagram\.com\/reel/i.test(lower) ||
    /snapchat\.com\/spotlight/i.test(lower) ||
    /\.(mp4|webm|mov|avi)(\?|$)/i.test(lower)
  );
}

/** Check if URL points to a GIF file */
export function isGifUrl(url: string): boolean {
  if (!url) return false;
  return /\.gif(\?|$)/i.test(url);
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

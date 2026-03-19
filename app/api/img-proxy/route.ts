import { NextRequest, NextResponse } from "next/server";

// Allowed content types — only proxy actual images
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif"];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  // Basic SSRF guard — only allow http/https external URLs
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new NextResponse("Forbidden protocol", { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Rosary/1.0)",
        Accept: "image/*",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!upstream.ok) return new NextResponse("Upstream error", { status: 502 });

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const baseType = contentType.split(";")[0].trim();

    if (!ALLOWED_TYPES.includes(baseType)) {
      return new NextResponse("Not an image", { status: 415 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }
}

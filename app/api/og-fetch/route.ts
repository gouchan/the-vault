import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TheVault/1.0)",
      },
    });
    clearTimeout(timeout);

    const html = await res.text();

    const title = extractMeta(html, "og:title") || extractTitle(html);
    const description = extractMeta(html, "og:description") || extractMeta(html, "description");
    const image = extractMeta(html, "og:image");

    return NextResponse.json({ title, description, image });
  } catch {
    return NextResponse.json({ title: null, description: null, image: null });
  }
}

function extractMeta(html: string, property: string): string | null {
  // Try og: property
  const ogMatch = html.match(
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
  );
  if (ogMatch) return ogMatch[1];

  // Try name attribute
  const nameMatch = html.match(
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
  );
  if (nameMatch) return nameMatch[1];

  // Try reversed order (content before property)
  const revMatch = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i")
  );
  if (revMatch) return revMatch[1];

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

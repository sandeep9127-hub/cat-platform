import { NextResponse } from "next/server";
import { getDirectory } from "@/lib/db/directory";

export const runtime = "nodejs";
export const preferredRegion = "bom1";
// Directory changes rarely; the CDN caches the response (Cache-Control below).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDirectory();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    console.error("organizations directory fetch failed:", e);
    return NextResponse.json({ error: "directory_unavailable" }, { status: 500 });
  }
}

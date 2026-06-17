import { NextResponse } from "next/server";
import { geoSearch } from "@/lib/db/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Type-ahead geography search. GET /api/geo/search?q=patra&type=village&state=JH
 * Returns up to ~12 fuzzy (typo-tolerant) matches, each with its full ancestor
 * path so the right one can be picked among duplicates.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type") ?? undefined;
  const state = url.searchParams.get("state") ?? undefined;
  const limit = Number(url.searchParams.get("limit")) || undefined;
  try {
    const hits = await geoSearch(q, { type, state, limit });
    return NextResponse.json({ hits });
  } catch {
    return NextResponse.json({ hits: [] }, { status: 200 });
  }
}

import { NextResponse } from "next/server";
import { geoChildren } from "@/lib/db/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cascade fallback. GET /api/geo/children?parent=<id> returns the direct
 * children of a node (or the states when parent is omitted).
 */
export async function GET(req: Request) {
  const parent = new URL(req.url).searchParams.get("parent");
  try {
    const nodes = await geoChildren(parent || null);
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ nodes: [] }, { status: 200 });
  }
}

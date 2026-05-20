import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { buildLandscapeProfilePdf } from "@/lib/downloads/landscape-pdf";
import { buildLandscapeProfileDocx } from "@/lib/downloads/landscape-docx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();
  const p = LANDSCAPES[slug];
  if (!p) {
    return NextResponse.json({ error: "Landscape not found" }, { status: 404 });
  }

  // Resolve the state name for the header
  let stateName: string = p.region;
  try {
    const [g] = await db
      .select()
      .from(schema.geographies)
      .where(
        and(eq(schema.geographies.slug, slug), eq(schema.geographies.type, "landscape"))
      )
      .limit(1);
    if (g?.parentId) {
      const [state] = await db
        .select()
        .from(schema.geographies)
        .where(eq(schema.geographies.id, g.parentId))
        .limit(1);
      if (state?.name) stateName = state.name;
    }
  } catch {
    // Non-fatal — fall back to region string from static profile.
  }

  if (format === "docx") {
    const buf = await buildLandscapeProfileDocx(p, stateName);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}-landscape-profile.docx"`,
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  }

  // Default: PDF
  const bytes = await buildLandscapeProfilePdf(p, stateName);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-landscape-profile.pdf"`,
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}

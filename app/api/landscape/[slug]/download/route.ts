import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { buildLandscapeBriefPdf, ALL_BRIEF_SECTIONS, type BriefSection } from "@/lib/downloads/landscape-brief-pdf";
import { buildLandscapeBriefDocx } from "@/lib/downloads/landscape-brief-docx";
import { budgetSummary, landscapeHasLip } from "@/lib/db/landscape-kb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const format = (req.nextUrl.searchParams.get("format") || "pdf").toLowerCase();
  const sectionsParam = req.nextUrl.searchParams.get("sections");
  const sections: BriefSection[] | undefined = sectionsParam
    ? (sectionsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is BriefSection =>
          (ALL_BRIEF_SECTIONS as string[]).includes(s)
        ))
    : undefined;
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

  // If the landscape has an ingested investment plan, pull the budget summary
  // so the finance page renders. Hides cleanly otherwise.
  let budget: Awaited<ReturnType<typeof budgetSummary>> | undefined;
  try {
    if (await landscapeHasLip(slug)) {
      budget = await budgetSummary(slug);
    }
  } catch {
    // Non-fatal — finance page just won't render.
  }

  if (format === "docx") {
    // DOCX always renders full brief — sections filtering is PDF-only for now.
    const buf = await buildLandscapeBriefDocx(p, stateName, { budget });
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}-investment-brief.docx"`,
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  }

  // Default: PDF
  const bytes = await buildLandscapeBriefPdf(p, stateName, { budget, sections });
  // Custom selections get a different filename so users can tell their
  // hand-picked briefs apart from the canonical one.
  const filename =
    sections && sections.length < ALL_BRIEF_SECTIONS.length
      ? `${slug}-custom-brief.pdf`
      : `${slug}-investment-brief.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}

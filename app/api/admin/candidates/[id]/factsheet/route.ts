import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { generateFactSheet } from "@/lib/factsheet/generate";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
// Generation runs a grounded web search + LLM pass, which can take up to a minute.
export const maxDuration = 300;

/**
 * Promote a discovery candidate straight onto the Solutions Atlas as a fact
 * sheet (the human-in-the-loop bridge: a CAT editor clicks, the engine builds a
 * cited fact sheet, auto-publishes it if well-sourced, and pins it to the map).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [cand] = await db
    .select()
    .from(schema.discoveryCandidates)
    .where(eq(schema.discoveryCandidates.id, id))
    .limit(1);

  if (!cand) {
    return NextResponse.redirect(new URL("/admin/candidates?gen=notfound", req.url), 303);
  }

  const query = [cand.proposedTitle, cand.proposedLeadOrganisationName, cand.proposedGeographyName]
    .filter(Boolean)
    .join(" ")
    .trim();

  let result;
  try {
    result = await generateFactSheet(query);
  } catch (e) {
    console.error("[candidate->factsheet] generation failed:", (e as Error).message);
    return NextResponse.redirect(new URL("/admin/candidates?gen=error", req.url), 303);
  }

  if (!result.ok) {
    return NextResponse.redirect(new URL("/admin/candidates?gen=norows", req.url), 303);
  }

  // Mark the candidate as actioned so it leaves the triage queue.
  await db
    .update(schema.discoveryCandidates)
    .set({
      status: "promoted_to_draft",
      triagedAt: new Date(),
      triagedByUserId: (session?.user as { id?: string } | undefined)?.id ?? null,
    })
    .where(eq(schema.discoveryCandidates.id, id));

  await writeAudit({
    actorUserId: (session?.user as { id?: string } | undefined)?.id ?? null,
    actorEmail: session?.user?.email ?? null,
    action: "candidate.promoted_to_factsheet",
    entityType: "discovery_candidate",
    entityId: id,
  });

  return NextResponse.redirect(
    new URL(`/admin/candidates?gen=${result.status}&slug=${result.sheet.slug}`, req.url),
    303,
  );
}

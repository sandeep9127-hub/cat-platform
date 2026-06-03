import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateFactSheet } from "@/lib/factsheet/generate";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300; // web search + extraction can take a while

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  if (!query || !query.trim()) {
    return NextResponse.json({ error: "Programme name required" }, { status: 400 });
  }

  const result = await generateFactSheet(query.trim());

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
  }

  await writeAudit({
    actorUserId: (session?.user as { id?: string })?.id ?? null,
    actorEmail: session?.user?.email ?? null,
    action: "factsheet.generated",
    entityType: "solution_factsheet",
    entityId: result.sheet.slug,
    meta: { title: result.sheet.title, status: result.status, confidence: result.sheet.confidence },
  });

  return NextResponse.json({ ok: true, slug: result.sheet.slug, title: result.sheet.title, status: result.status });
}

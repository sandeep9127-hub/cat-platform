import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ingestLandscapeReport } from "@/lib/landscape/ingest";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300; // embedding can take a while for long reports

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const title = String(form.get("title") || "").trim();
  const yearRaw = form.get("year");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "only .docx reports are supported right now" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestLandscapeReport({
      slug,
      title: title || file.name.replace(/\.[^.]+$/, ""),
      buffer,
      year: yearRaw ? Number(yearRaw) : undefined,
    });

    await writeAudit({
      actorUserId: (session?.user as { id?: string })?.id ?? null,
      actorEmail: session?.user?.email ?? null,
      action: "landscape.report.ingested",
      entityType: "landscape",
      entityId: slug,
      meta: { documentId: result.documentId, chunks: result.chunkCount, title: result.title },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "ingestion failed" }, { status: 500 });
  }
}

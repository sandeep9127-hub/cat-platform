import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { ingestLandscapeReport } from "@/lib/landscape/ingest";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300; // embedding can take a while for long reports

const ACCEPTED = [".pdf", ".docx"];
const okType = (name: string) => ACCEPTED.some((e) => name.toLowerCase().endsWith(e));

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const actor = {
    actorUserId: (session?.user as { id?: string })?.id ?? null,
    actorEmail: session?.user?.email ?? null,
  };

  let buffer: Buffer;
  let fileName: string;
  let title: string;
  let year: number | undefined;
  let blobUrl: string | null = null;

  const ct = req.headers.get("content-type") || "";

  try {
    if (ct.includes("application/json")) {
      // Big-file path: the browser already uploaded straight to Vercel Blob.
      // We just get the URL, download it server-side, ingest, then delete it.
      const body = (await req.json()) as {
        blobUrl?: string;
        fileName?: string;
        title?: string;
        year?: number;
      };
      if (!body.blobUrl || !body.fileName) {
        return NextResponse.json({ error: "blobUrl and fileName required" }, { status: 400 });
      }
      if (!okType(body.fileName)) {
        return NextResponse.json({ error: "only .pdf or .docx reports are supported" }, { status: 400 });
      }
      blobUrl = body.blobUrl;
      fileName = body.fileName;
      title = (body.title || "").trim() || fileName.replace(/\.[^.]+$/, "");
      year = body.year ? Number(body.year) : undefined;
      const res = await fetch(blobUrl);
      if (!res.ok) return NextResponse.json({ error: "could not read uploaded file" }, { status: 400 });
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      // Small-file path: file posted directly (under the ~4.5 MB function limit).
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
      }
      if (!okType(file.name)) {
        return NextResponse.json({ error: "only .pdf or .docx reports are supported" }, { status: 400 });
      }
      fileName = file.name;
      title = String(form.get("title") || "").trim() || fileName.replace(/\.[^.]+$/, "");
      const yr = form.get("year");
      year = yr ? Number(yr) : undefined;
      buffer = Buffer.from(await file.arrayBuffer());
    }

    const result = await ingestLandscapeReport({ slug, title, buffer, fileName, year });

    await writeAudit({
      ...actor,
      action: "landscape.report.ingested",
      entityType: "landscape",
      entityId: slug,
      meta: { documentId: result.documentId, chunks: result.chunkCount, title: result.title, fileName },
    });

    // Clean up the transient blob now that it's ingested.
    if (blobUrl) await del(blobUrl).catch(() => {});

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (blobUrl) await del(blobUrl).catch(() => {});
    return NextResponse.json({ error: (e as Error).message || "ingestion failed" }, { status: 500 });
  }
}

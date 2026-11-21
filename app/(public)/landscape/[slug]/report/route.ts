import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getClientIp, rateLimit } from "@/lib/security/ratelimit";
import { signedGetUrl } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stable link to a landscape's current investment plan, opened at a page:
 *   /landscape/<slug>/report?page=N
 * Ask citations use it. Redirects to a short-lived signed link for the
 * reader-facing PDF (the one page numbers were taken from), opened inline at
 * #page=N by the browser's PDF viewer. Without a PDF, falls back to the
 * landscape page.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LANDSCAPES[slug]) return NextResponse.json({ error: "Unknown landscape" }, { status: 404 });

  const limited = await rateLimit({ key: "report-pdf", ip: getClientIp(req), limit: 60, windowSec: 60 });
  if (!limited.ok) return new NextResponse("Too many requests", { status: 429 });

  const fallback = new URL(`/landscape/${slug}`, req.url);
  let v: { r2_pdf_key: string; page_count: number | null; title: string } | undefined;
  try {
    v = ((await db.execute(sql`
      SELECT v.r2_pdf_key, v.page_count, d.title
      FROM "cat".documents d JOIN "cat".document_versions v ON v.id = d.current_version_id
      WHERE d.landscape_slug = ${slug} AND d.doc_type = 'lip' AND v.is_current AND v.status = 'ready'
        AND v.r2_pdf_key IS NOT NULL
      ORDER BY d.source = 'drive' DESC, v.updated_at DESC LIMIT 1`)) as unknown as { rows: typeof v[] }).rows[0];
  } catch {
    v = undefined; // database without the v2 tables (e.g. the current live site)
  }
  if (!v) return NextResponse.redirect(fallback, 302);

  const requested = Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const max = v.page_count && v.page_count > 0 ? v.page_count : 1;
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), max) : 1;

  const url = await signedGetUrl(v.r2_pdf_key, 900, { downloadName: `${v.title}.pdf`, inlinePdf: true });
  const res = NextResponse.redirect(`${url}#page=${page}`, 302);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { getInterventions, toCsv } from "@/lib/budget/table";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getClientIp, rateLimit } from "@/lib/security/ratelimit";
import { logShareView, resolveShareToken } from "@/lib/share/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV of the shared table, only when the link allows downloads. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getClientIp(req);
  const limited = await rateLimit({ key: "share-dl", ip, limit: 10, windowSec: 60 });
  if (!limited.ok) return new NextResponse("Too many requests", { status: 429 });

  const link = await resolveShareToken(token);
  if (!link || !link.allow_download) return new NextResponse("Not available", { status: 404 });
  await logShareView(link.id, ip, req.headers.get("user-agent"), "download");

  const slug = link.scope === "all_landscapes_full_table" ? null : link.landscape_slug;
  const csv = toCsv(await getInterventions(slug), (s) => LANDSCAPES[s]?.name ?? s);
  const name = `${slug ?? "all-landscapes"}-investment-table.csv`.replace(/[^a-z0-9.-]/gi, "-");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

import { getFactSheet } from "@/lib/factsheet/generate";
import { buildFactSheetPdf } from "@/lib/downloads/factsheet-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Published-only: flagged/unpublished sheets must 404 for the public, same as
  // the page. Never render an unverified sheet's PDF from a guessed slug.
  const sheet = await getFactSheet(slug);
  if (!sheet) return new Response("Not found", { status: 404 });

  const pdf = await buildFactSheetPdf(sheet);
  const fileName = `${slug}-fact-sheet.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import { getFactSheet } from "@/lib/factsheet/generate";
import { buildFactSheetPdf } from "@/lib/downloads/factsheet-pdf";
import { solutionHeroPdf, glanceIconPdf, GLANCE_ART, type GlanceKey } from "@/lib/design/solution-art";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Static art is fetched from the site itself: public/ files are always served,
// whereas reading them from disk inside a serverless function is not reliable.
async function fetchPng(origin: string, path: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(new URL(path, origin), { cache: "force-cache" });
    return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Published-only: flagged/unpublished sheets must 404 for the public, same as
  // the page. Never render an unverified sheet's PDF from a guessed slug.
  const sheet = await getFactSheet(slug);
  if (!sheet) return new Response("Not found", { status: 404 });

  const origin = new URL(req.url).origin;
  const keys = Object.keys(GLANCE_ART) as GlanceKey[];
  const [hero, ...icons] = await Promise.all([
    fetchPng(origin, solutionHeroPdf(sheet.themes)),
    ...keys.map((k) => fetchPng(origin, glanceIconPdf(k))),
  ]);
  const glance = Object.fromEntries(keys.map((k, i) => [k, icons[i]]));
  const pdf = await buildFactSheetPdf(sheet, { hero, glance });
  const fileName = `${slug}-fact-sheet.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

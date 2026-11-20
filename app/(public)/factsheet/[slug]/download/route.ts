import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getFactSheet } from "@/lib/factsheet/generate";
import { buildFactSheetPdf } from "@/lib/downloads/factsheet-pdf";
import { solutionHeroPdf, glanceIconPdf, GLANCE_ART, type GlanceKey } from "@/lib/design/solution-art";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trusted origin for the fallback fetch. Never derived from the request's
// Host header, so a spoofed header cannot point the server at another host.
const TRUSTED_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://hub.agroecologyindia.org");

// Art paths come only from lib/design/solution-art (fixed, known files).
// Read from disk first (works locally and when traced into the function);
// otherwise fetch the same static file from the trusted origin, refusing
// redirects. Any failure just means a text-only PDF.
async function loadPng(path: string): Promise<Uint8Array | null> {
  if (!/^\/illustrations\/solutions\/pdf\/[a-z-]+\.png$/.test(path)) return null;
  try {
    return new Uint8Array(await readFile(join(process.cwd(), "public", path)));
  } catch {
    /* not on disk in this deployment: fall through to the trusted origin */
  }
  try {
    const r = await fetch(new URL(path, TRUSTED_ORIGIN), { cache: "force-cache", redirect: "error" });
    return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Published-only: flagged/unpublished sheets must 404 for the public, same as
  // the page. Never render an unverified sheet's PDF from a guessed slug.
  const sheet = await getFactSheet(slug);
  if (!sheet) return new Response("Not found", { status: 404 });

  const keys = Object.keys(GLANCE_ART) as GlanceKey[];
  const [hero, ...icons] = await Promise.all([
    loadPng(solutionHeroPdf(sheet.themes)),
    ...keys.map((k) => loadPng(glanceIconPdf(k))),
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

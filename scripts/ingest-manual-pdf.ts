import { config } from "dotenv";
import { readFile } from "node:fs/promises";

/**
 * Add a PDF that isn't in the Drive Final folder (e.g. the HLPE report) to the
 * Hub library, CAT database only. Same pipeline as the Drive reports: sections,
 * chunks, context lines, embeddings, page numbers from the PDF itself. A newer
 * file with the same title becomes a new version and replaces the old one.
 *
 *   npx tsx scripts/ingest-manual-pdf.ts <file.pdf> --title="..." [--landscape=<slug>] \
 *     [--type=report|lip|other] [--label="..."] [--published=YYYY-MM-DD] [--source-url=https://...]
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set; this script only targets the CAT database");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

(async () => {
  const file = process.argv[2];
  const title = arg("title");
  if (!file || !title) throw new Error("Usage: ingest-manual-pdf.ts <file.pdf> --title=\"...\"");
  const { LANDSCAPES } = await import("../lib/data/landscapes");
  const slug = arg("landscape") ?? null;
  if (slug && !LANDSCAPES[slug]) throw new Error(`Unknown landscape ${slug}`);
  const docType = (arg("type") ?? "report") as "lip" | "report" | "other";

  const bytes = new Uint8Array(await readFile(file));
  if (bytes.length > 150 * 1024 * 1024) throw new Error("PDF too large");
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Not a PDF");

  const { pdfPageTexts, attachPdfPages } = await import("../lib/ingest/pdf-pages");
  const { pdfToBlocks } = await import("../lib/ingest/pdf-blocks");
  const { ingestDocumentVersion } = await import("../lib/ingest/pipeline");

  const pages = await pdfPageTexts(bytes);
  const parsed = pdfToBlocks(pages);
  const words = parsed.blocks.reduce((n, b) => n + (b.kind === "table" ? 0 : b.text.split(" ").length), 0);
  if (words < 200) throw new Error("Too little text: is this a scanned PDF? (needs a text layer)");
  console.log(`${parsed.pageCount} pages, ${parsed.blocks.length} blocks, ~${words} words`);

  const res = await ingestDocumentVersion({
    landscapeSlug: slug,
    landscapeName: slug ? LANDSCAPES[slug].name : "General reference (all landscapes)",
    title,
    docType,
    versionLabel: arg("label") ?? "Current",
    publishedOn: arg("published") ?? null,
    bytes,
    mime: "application/pdf",
    fileName: file.split("/").pop() ?? "document.pdf",
    parsed,
    parser: "cat-pdf@1",
    log: (m) => console.log(m),
  });
  if (res.skipped) { console.log("Already in the library (same file)."); process.exit(0); }
  // The PDF itself is the reader-facing file, so page numbers come straight from it.
  const p = await attachPdfPages(res.versionId, bytes, "original");
  const sourceUrl = arg("source-url");
  if (sourceUrl) {
    if (!/^https:\/\/[^\s]+$/.test(sourceUrl)) throw new Error("source-url must be https");
    const { db } = await import("../lib/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`UPDATE "cat".documents SET drive_path = NULL, source_url = ${sourceUrl} WHERE id = ${res.documentId}::uuid`);
  }
  console.log(`✓ ${title}: v${res.versionNo}, ${res.chunks} chunks, ${p.matched}/${p.chunks} with a page, $${res.costUsd.toFixed(3)}`);
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});

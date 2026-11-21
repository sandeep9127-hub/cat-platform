import { config } from "dotenv";

/**
 * Add reader-facing PDFs and page numbers to the current version of every
 * Drive-synced report (CAT database only). Google Docs use Drive's PDF export;
 * Word files are rendered with LibreOffice, which must be installed.
 *
 *   npx tsx scripts/backfill-pdf-pages.ts --dry-run          # match rates only, no writes
 *   npx tsx scripts/backfill-pdf-pages.ts [--only=ahwa,mau]  # write
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set; this script only targets the CAT database");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

(async () => {
  const { db } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  const { listTree } = await import("../lib/ingest/drive");
  const { getObjectBytes } = await import("../lib/storage/r2");
  const { assignPages, attachPdfPages, pdfForDriveFile, pdfPageTexts } = await import("../lib/ingest/pdf-pages");

  const dryRun = process.argv.includes("--dry-run");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const folderId = process.env.DRIVE_FINAL_FOLDER_ID;
  if (!folderId) throw new Error("DRIVE_FINAL_FOLDER_ID is not set");

  const mimeById = new Map((await listTree(folderId, "Final folder")).map((f) => [f.id, f.mimeType]));
  const versions = (await db.execute(sql`
    SELECT d.landscape_slug, d.drive_file_id, v.id AS version_id, v.r2_original_key, v.label, v.drive_modified_time
    FROM "cat".documents d JOIN "cat".document_versions v ON v.id = d.current_version_id
    WHERE d.drive_file_id IS NOT NULL ORDER BY d.landscape_slug`)).rows as {
      landscape_slug: string; drive_file_id: string; version_id: string; r2_original_key: string; label: string; drive_modified_time: string | null;
    }[];

  let failures = 0;
  for (const v of versions) {
    if (only && !only.includes(v.landscape_slug)) continue;
    const mimeType = mimeById.get(v.drive_file_id);
    if (!mimeType) { console.log(`! ${v.landscape_slug}: Drive file not found in the Final folder, skipped`); continue; }
    try {
      const docx = await getObjectBytes(v.r2_original_key);
      const got = await pdfForDriveFile({ id: v.drive_file_id, mimeType }, docx, { expectModifiedTime: v.drive_modified_time });
      if (!got) { console.log(`- ${v.landscape_slug}: no PDF (LibreOffice not installed?), skipped`); continue; }
      if (dryRun) {
        const texts = await pdfPageTexts(got.pdf);
        const chunks = (await db.execute(sql`SELECT text FROM "cat".chunks WHERE version_id = ${v.version_id}::uuid ORDER BY chunk_index`)).rows as { text: string }[];
        const a = assignPages(chunks.map((c) => c.text), texts);
        const matched = a.filter((p) => p.pageStart !== null).length;
        const monotonic = a.filter((p) => p.pageStart !== null).every((p, i, arr) => i === 0 || p.pageStart! >= arr[i - 1].pageStart! - 1);
        console.log(`  ${v.landscape_slug.padEnd(22)} ${got.method.padEnd(12)} ${String(texts.length).padStart(3)} pages  ${matched}/${chunks.length} chunks matched (${Math.round((matched / chunks.length) * 100)}%)${monotonic ? "" : "  [order jumps]"}`);
      } else {
        const r = await attachPdfPages(v.version_id, got.pdf, got.method);
        console.log(`✓ ${v.landscape_slug.padEnd(22)} ${got.method.padEnd(12)} ${String(r.pages).padStart(3)} pages  ${r.matched}/${r.chunks} chunks with a page`);
      }
    } catch (e) {
      failures++;
      console.log(`✗ ${v.landscape_slug}: ${(e as Error).message}`);
    }
  }
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

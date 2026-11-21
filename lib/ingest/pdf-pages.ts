import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { db } from "@/lib/db";
import { DOCX, exportGoogleDocPdf, GOOGLE_DOC } from "@/lib/ingest/drive";
import { putObject } from "@/lib/storage/r2";

/**
 * Page numbers for citations, taken from a PDF of the report.
 *
 * The PDF is the one readers will open, so "p. N" is always the page they see:
 *   - Google Docs: Drive's own PDF export (read-only; nothing changes in Drive)
 *   - Word files: rendered here with LibreOffice (headless), nothing uploaded to Drive
 * Each chunk is matched to the PDF text in document order. A chunk that can't
 * be matched confidently keeps a null page, so Ask cites its section only.
 * Runs after a version is published; a failure never blocks the report update.
 */

const run = promisify(execFile);
const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;
const MAX_PDF_BYTES = 150 * 1024 * 1024;

// ─── Getting the PDF ─────────────────────────────────────────────────

function sofficePath(): string | null {
  const candidates = [
    process.env.SOFFICE_PATH,
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/usr/local/bin/soffice",
    "/opt/homebrew/bin/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/** DOCX -> PDF with LibreOffice in a throwaway profile and folder. Null if LibreOffice isn't installed. */
export async function renderDocxPdf(docx: Uint8Array): Promise<Uint8Array | null> {
  const soffice = sofficePath();
  if (!soffice) return null;
  const dir = await mkdtemp(join(tmpdir(), "cat-pdf-"));
  try {
    const input = join(dir, "report.docx");
    await writeFile(input, docx);
    await run(soffice, [
      `-env:UserInstallation=file://${join(dir, "profile")}`,
      "--headless", "--norestore", "--convert-to", "pdf", "--outdir", dir, input,
    ], { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 });
    const pdf = await readFile(join(dir, "report.pdf"));
    if (pdf.length > MAX_PDF_BYTES) throw new Error("Rendered PDF too large");
    return new Uint8Array(pdf);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** The reader-facing PDF for a Drive file, or null when it can't be produced here. */
export async function pdfForDriveFile(file: { id: string; mimeType: string }, docxBytes: Uint8Array): Promise<{ pdf: Uint8Array; method: "drive-export" | "libreoffice" } | null> {
  if (file.mimeType === GOOGLE_DOC) return { pdf: await exportGoogleDocPdf(file.id), method: "drive-export" };
  if (file.mimeType === DOCX) {
    const pdf = await renderDocxPdf(docxBytes);
    return pdf ? { pdf, method: "libreoffice" } : null;
  }
  return null;
}

// ─── Matching chunks to pages ────────────────────────────────────────

const norm = (s: string) =>
  s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type PageAssignment = { pageStart: number | null; pageEnd: number | null };

/**
 * Locate each chunk in the PDF text. Anchors are short word windows from the
 * chunk's start and end, searched forward from where the previous chunk was
 * found (so repeated table headers land on the right occurrence). Needs a start
 * anchor to assign a page; no match -> null.
 */
export function assignPages(chunkTexts: string[], pageTexts: string[]): PageAssignment[] {
  const pageStarts: number[] = [];
  let doc = "";
  for (const t of pageTexts) {
    pageStarts.push(doc.length);
    doc += norm(t) + " ";
  }
  const pageAt = (offset: number) => {
    let lo = 0, hi = pageStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (pageStarts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return lo + 1;
  };
  const find = (anchor: string, from: number) => {
    const i = doc.indexOf(anchor, Math.max(0, from));
    return i >= 0 ? i : null;
  };

  const WINDOW = 7;
  let cursor = 0;
  return chunkTexts.map((text) => {
    const words = norm(text).split(" ").filter(Boolean);
    if (words.length < WINDOW) return { pageStart: null, pageEnd: null };
    const windows = (fromEnd: boolean) => {
      const out: string[] = [];
      const step = 5;
      for (let k = 0; k < 8; k++) {
        const s = fromEnd ? words.length - WINDOW - k * step : k * step;
        if (s < 0 || s + WINDOW > words.length) break;
        out.push(words.slice(s, s + WINDOW).join(" "));
      }
      return out;
    };
    // Start: first window found after the cursor (allow a little back-step).
    let start: number | null = null;
    for (const w of windows(false)) {
      const i = find(w, cursor - 2000);
      if (i !== null) { start = i; break; }
    }
    if (start === null) return { pageStart: null, pageEnd: null };
    let end = start;
    for (const w of windows(true)) {
      const i = find(w, start);
      if (i !== null) { end = i; break; }
    }
    const pageStart = pageAt(start);
    let pageEnd = pageAt(end);
    if (pageEnd < pageStart || pageEnd - pageStart > 6) pageEnd = pageStart; // implausible span: trust the start only
    cursor = start;
    return { pageStart, pageEnd };
  });
}

export async function pdfPageTexts(pdf: Uint8Array): Promise<string[]> {
  const proxy = await getDocumentProxy(new Uint8Array(pdf));
  const { text } = await extractText(proxy, { mergePages: false });
  return Array.isArray(text) ? text : [text];
}

// ─── Attaching pages to a published version ──────────────────────────

/**
 * Store the PDF next to the version in R2, set page numbers on its chunks and
 * sections, replace its per-page text, and record page_count. Idempotent.
 */
export async function attachPdfPages(versionId: string, pdf: Uint8Array, method: string): Promise<{ pages: number; matched: number; chunks: number }> {
  const v = rows<{ r2_original_key: string }>(await db.execute(sql`
    SELECT r2_original_key FROM "cat".document_versions WHERE id = ${versionId}::uuid`))[0];
  if (!v) throw new Error(`Version ${versionId} not found`);
  const pageTexts = await pdfPageTexts(pdf);
  const chunks = rows<{ id: string; text: string }>(await db.execute(sql`
    SELECT id, text FROM "cat".chunks WHERE version_id = ${versionId}::uuid ORDER BY chunk_index`));
  const pages = assignPages(chunks.map((c) => c.text), pageTexts);

  const pdfKey = v.r2_original_key.replace(/\/original\.[a-z0-9]+$/, "/rendered.pdf");
  if (pdfKey === v.r2_original_key) throw new Error("Unexpected R2 key layout");
  await putObject(pdfKey, pdf, "application/pdf");

  await db.transaction(async (tx) => {
    const BATCH = 200;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const values = chunks.slice(i, i + BATCH).map((c, j) => sql`(${c.id}::uuid, ${pages[i + j].pageStart}::int, ${pages[i + j].pageEnd}::int)`);
      await tx.execute(sql`
        UPDATE "cat".chunks AS c SET page_start = v.ps, page_end = v.pe
        FROM (VALUES ${sql.join(values, sql`, `)}) AS v(id, ps, pe) WHERE c.id = v.id`);
    }
    await tx.execute(sql`
      UPDATE "cat".sections s SET page_start = p.ps, page_end = p.pe
      FROM (SELECT section_id, min(page_start) AS ps, max(page_end) AS pe FROM "cat".chunks
            WHERE version_id = ${versionId}::uuid AND section_id IS NOT NULL GROUP BY 1) p
      WHERE s.id = p.section_id`);
    await tx.execute(sql`DELETE FROM "cat".document_pages WHERE version_id = ${versionId}::uuid`);
    for (let i = 0; i < pageTexts.length; i += 50) {
      const values = pageTexts.slice(i, i + 50).map((t, j) => sql`(${versionId}::uuid, ${i + j + 1}, ${t}, 'text', ${t.length})`);
      await tx.execute(sql`INSERT INTO "cat".document_pages (version_id, page_no, text, method, char_count) VALUES ${sql.join(values, sql`, `)}`);
    }
    await tx.execute(sql`
      UPDATE "cat".document_versions SET page_count = ${pageTexts.length}, r2_pdf_key = ${pdfKey}, pdf_method = ${method}, updated_at = now()
      WHERE id = ${versionId}::uuid`);
  });
  return { pages: pageTexts.length, matched: pages.filter((p) => p.pageStart !== null).length, chunks: chunks.length };
}

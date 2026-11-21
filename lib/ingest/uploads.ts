import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { deleteObject, getObjectBytes, signedPutUrl, verifyUpload } from "@/lib/storage/r2";

/**
 * "Upload and done" for documents outside the Drive Final folder (e.g. Pangi).
 * 1. startUpload: validate the details, create an ingest_upload job, return a
 *    short-lived signed link so the browser sends the file straight to R2.
 * 2. confirmUpload: check the stored file (type, size, first bytes).
 * 3. processUploadJob: parse (PDF or DOCX), then the same pipeline as Drive
 *    reports: sections, chunks, context, embeddings, page numbers, publish.
 * Jobs that can't finish in the web request are picked up by the nightly sync
 * (processPendingUploads), so nothing is lost on a timeout.
 */

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

export type UploadMeta = {
  title: string; landscape: string | null; docType: "report" | "lip" | "other";
  label: string; publishedOn: string | null; sourceUrl: string | null;
  fileName: string; contentType: string; bytes: number;
};

type Job = { id: string; status: string; attempts: number; payload: UploadMeta & { key: string; uploaded?: boolean; userId?: string | null } };

export function validateUploadMeta(m: Partial<UploadMeta>): { meta?: UploadMeta; error?: string } {
  const title = String(m.title ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (title.length < 3) return { error: "Give the document a title." };
  const landscape = m.landscape && m.landscape !== "none" ? m.landscape : null;
  if (landscape && !LANDSCAPES[landscape]) return { error: "Unknown landscape." };
  const docType = m.docType === "lip" || m.docType === "other" ? m.docType : "report";
  const contentType = String(m.contentType ?? "");
  if (contentType !== PDF && contentType !== DOCX) return { error: "Upload a PDF or a Word (.docx) file." };
  const bytes = Number(m.bytes);
  if (!Number.isInteger(bytes) || bytes <= 0 || bytes > 100 * 1024 * 1024) return { error: "Files up to 100 MB." };
  const publishedOn = m.publishedOn && /^\d{4}-\d{2}-\d{2}$/.test(m.publishedOn) ? m.publishedOn : null;
  const sourceUrl = m.sourceUrl ? String(m.sourceUrl).trim() : null;
  if (sourceUrl && !/^https:\/\/[^\s<>"']+$/.test(sourceUrl)) return { error: "The source link must start with https://" };
  const fileName = String(m.fileName ?? "document").replace(/[^\w.\- ]+/g, "_").slice(0, 120);
  const label = String(m.label ?? "").trim().slice(0, 120) || "Current";
  return { meta: { title, landscape, docType, label, publishedOn, sourceUrl, fileName, contentType, bytes } };
}

export async function startUpload(meta: UploadMeta, userId: string | null): Promise<{ jobId: string; putUrl: string }> {
  const key = `uploads/${randomUUID()}.${meta.contentType === PDF ? "pdf" : "docx"}`;
  const putUrl = await signedPutUrl(key, meta.contentType, meta.bytes, 900);
  const job = rows<{ id: string }>(await db.execute(sql`
    INSERT INTO "cat".jobs (kind, payload, status, max_attempts)
    VALUES ('ingest_upload', ${JSON.stringify({ ...meta, key, uploaded: false, userId })}::jsonb, 'queued', 3)
    RETURNING id`))[0];
  return { jobId: job.id, putUrl };
}

/** After the browser's PUT: verify the stored file, then mark the job ready. */
export async function confirmUpload(jobId: string): Promise<{ error?: string }> {
  if (!UUID.test(jobId)) return { error: "Unknown upload." };
  const job = rows<Job>(await db.execute(sql`
    SELECT id, status, attempts, payload FROM "cat".jobs WHERE id = ${jobId}::uuid AND kind = 'ingest_upload'`))[0];
  if (!job || job.status !== "queued" || job.payload.uploaded) return { error: "This upload was already handled." };
  try {
    await verifyUpload(job.payload.key, job.payload.contentType, job.payload.bytes);
  } catch {
    await db.execute(sql`UPDATE "cat".jobs SET status = 'failed', error = 'File check failed (type or size)', finished_at = now() WHERE id = ${jobId}::uuid`);
    return { error: "The file didn't pass the upload check (wrong type or size)." };
  }
  await db.execute(sql`UPDATE "cat".jobs SET payload = payload || '{"uploaded": true}'::jsonb WHERE id = ${jobId}::uuid`);
  return {};
}

/** Parse and publish one uploaded document. Safe to call twice: it claims the job first. */
export async function processUploadJob(jobId: string, log: (m: string) => void = () => {}): Promise<{ ok?: string; error?: string }> {
  const job = rows<Job>(await db.execute(sql`
    UPDATE "cat".jobs SET status = 'running', locked_at = now(), locked_by = ${process.env.VERCEL ? "web" : "worker"}, attempts = attempts + 1
    WHERE id = ${jobId}::uuid AND kind = 'ingest_upload' AND payload->>'uploaded' = 'true'
      AND (status = 'queued' OR (status = 'running' AND locked_at < now() - interval '20 minutes'))
    RETURNING id, status, attempts, payload`))[0];
  if (!job) return { error: "Nothing to process (already done, running, or not uploaded)." };
  const m = job.payload;
  try {
    const bytes = await getObjectBytes(m.key);
    const { ingestDocumentVersion } = await import("@/lib/ingest/pipeline");
    let parsed: { blocks: import("@/lib/ingest/docx").Block[]; pageCount: number };
    let pdf: Uint8Array | null = null;
    let pdfMethod: "original" | "libreoffice" | null = null;
    if (m.contentType === PDF) {
      const { pdfPageTexts } = await import("@/lib/ingest/pdf-pages");
      const { pdfToBlocks } = await import("@/lib/ingest/pdf-blocks");
      parsed = pdfToBlocks(await pdfPageTexts(bytes));
      pdf = bytes; pdfMethod = "original";
    } else {
      const { parseDocx } = await import("@/lib/ingest/docx");
      parsed = await parseDocx(bytes);
      const { renderDocxPdf } = await import("@/lib/ingest/pdf-pages");
      pdf = await renderDocxPdf(bytes).catch(() => null); // null where LibreOffice isn't installed (e.g. Vercel)
      pdfMethod = pdf ? "libreoffice" : null;
    }
    const words = parsed.blocks.reduce((n, b) => n + (b.kind === "table" ? b.rows.flat().join(" ").split(" ").length : b.text.split(" ").length), 0);
    if (words < 200) throw new Error("Too little text to index. Is it a scanned PDF? Upload a version with a text layer.");
    log(`${m.title}: ${parsed.pageCount} pages, ${parsed.blocks.length} blocks`);
    const res = await ingestDocumentVersion({
      landscapeSlug: m.landscape,
      landscapeName: m.landscape ? LANDSCAPES[m.landscape].name : "General reference (all landscapes)",
      title: m.title, docType: m.docType, versionLabel: m.label, publishedOn: m.publishedOn,
      bytes, mime: m.contentType, fileName: m.fileName, parsed,
      parser: m.contentType === PDF ? "cat-pdf@1" : undefined,
      log,
    });
    let pages = "";
    if (!res.skipped && pdf && pdfMethod) {
      const { attachPdfPages } = await import("@/lib/ingest/pdf-pages");
      const p = await attachPdfPages(res.versionId, pdf, pdfMethod);
      pages = `, ${p.matched}/${p.chunks} passages with a page`;
    }
    if (m.sourceUrl) await db.execute(sql`UPDATE "cat".documents SET source_url = ${m.sourceUrl} WHERE id = ${res.documentId}::uuid`);
    await deleteObject(m.key).catch(() => {});
    const ok = res.skipped ? "Already in the library (same file)." : `Published v${res.versionNo}: ${res.chunks} passages${pages}.`;
    await db.execute(sql`
      UPDATE "cat".jobs SET status = 'done', finished_at = now(), error = NULL,
        result = ${JSON.stringify({ documentId: res.documentId, versionNo: res.versionNo, chunks: res.chunks, costUsd: res.costUsd, message: ok })}::jsonb
      WHERE id = ${jobId}::uuid`);
    return { ok };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500);
    const final = job.attempts >= 3 || /scanned|Not a DOCX|too large/i.test(msg);
    await db.execute(sql`
      UPDATE "cat".jobs SET status = ${final ? "failed" : "queued"}, error = ${msg}, locked_at = NULL,
        finished_at = ${final ? new Date() : null}, run_after = now() + interval '10 minutes'
      WHERE id = ${jobId}::uuid`);
    if (final) await deleteObject(m.key).catch(() => {});
    return { error: msg };
  }
}

/** For the nightly sync: finish uploads that timed out or failed transiently. */
export async function processPendingUploads(log: (m: string) => void = () => {}): Promise<{ done: number; failed: number }> {
  const ids = rows<{ id: string }>(await db.execute(sql`
    SELECT id FROM "cat".jobs
    WHERE kind = 'ingest_upload' AND payload->>'uploaded' = 'true' AND run_after <= now()
      AND (status = 'queued' OR (status = 'running' AND locked_at < now() - interval '20 minutes'))
    ORDER BY created_at LIMIT 10`));
  let done = 0, failed = 0;
  for (const { id } of ids) {
    const r = await processUploadJob(id, log);
    if (r.ok) done++; else failed++;
  }
  // Uploads never confirmed within a day are abandoned: remove their files.
  const stale = rows<{ id: string; key: string }>(await db.execute(sql`
    UPDATE "cat".jobs SET status = 'cancelled', finished_at = now(), error = 'Upload not completed'
    WHERE kind = 'ingest_upload' AND status = 'queued' AND coalesce(payload->>'uploaded', 'false') = 'false'
      AND created_at < now() - interval '1 day'
    RETURNING id, payload->>'key' AS key`));
  for (const s of stale) await deleteObject(s.key).catch(() => {});
  return { done, failed };
}

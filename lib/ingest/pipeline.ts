import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embedDocuments, EMBED_MODEL, toVectorLiteral } from "@/lib/ai/embed";
import { buildSectionsAndChunks } from "@/lib/ingest/chunk";
import { contextualise } from "@/lib/ingest/context";
import { diffVersions, type VersionDiff } from "@/lib/ingest/diff";
import type { Block } from "@/lib/ingest/docx";
import { deleteObject, putObject } from "@/lib/storage/r2";

/**
 * Ingest one version of one document, end to end:
 * R2 (original + parsed) -> sections/pages/chunks -> context lines ->
 * embeddings -> change summary vs the previous version -> publish -> delete
 * the previous version completely (policy: only its change summary is kept).
 *
 * All database writes for the new version happen in one transaction, so a
 * failure never leaves a half-published document. Chunks start hidden and are
 * published only after the version is current and ready (enforced by DB
 * triggers as well).
 */

export const PARSER = "cat-docx@1";
const BATCH = 50; // rows per INSERT (one round trip each; the DB is in Singapore)

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

/**
 * Fingerprint of a parse: block kinds, heading levels, page markers and text.
 * Null for an empty parse, so it can never match by accident.
 */
export function contentFingerprint(blocks: Block[]): string | null {
  if (!blocks.length) return null;
  const shape = blocks.map((b) =>
    b.kind === "heading" ? ["h", b.level, b.page, b.text]
    : b.kind === "table" ? ["t", b.pageStart, b.pageEnd, b.rows]
    : ["p", b.pageStart, b.pageEnd, b.list, b.text]);
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex");
}

/** Word's saved page markers are missing in Google-Docs-authored files. */
export function pagesReliable(blocks: Block[], pageCount: number): boolean {
  const chars = blocks.reduce((n, b) => n + (b.kind === "table" ? b.rows.flat().join(" ").length : b.text.length), 0);
  return pageCount > 1 && chars / pageCount < 7000;
}

function pagesText(blocks: Block[]): Map<number, string> {
  const pages = new Map<number, string[]>();
  for (const b of blocks) {
    const p = b.kind === "heading" ? b.page : b.pageStart;
    const t = b.kind === "table" ? b.rows.map((r) => r.join(" | ")).join("\n") : b.text;
    if (!pages.has(p)) pages.set(p, []);
    pages.get(p)!.push(t);
  }
  return new Map([...pages].map(([p, parts]) => [p, parts.join("\n\n")]));
}

export type IngestInput = {
  /** null for documents that belong to no landscape (e.g. the HLPE report). */
  landscapeSlug: string | null;
  landscapeName: string;
  title: string;
  docType: "lip" | "report" | "other";
  versionLabel: string;
  publishedOn?: string | null; // YYYY-MM-DD
  bytes: Uint8Array;
  mime: string;
  fileName: string;
  /** Present for Drive-synced files; absent for documents added by hand (source 'manual'). */
  drive?: { fileId: string; path: string; modifiedTime: string; md5?: string | null };
  parsed: { blocks: Block[]; pageCount: number };
  /** Parser id stored with the version (default: the DOCX parser). */
  parser?: string;
  /** Previous version to compare against when it isn't stored in the DB (first import). */
  previous?: { label: string; parsed: { blocks: Block[]; pageCount: number } };
  runId?: string | null;
  log?: (msg: string) => void;
};

export type IngestResult = {
  documentId: string;
  versionId: string;
  versionNo: number;
  skipped?: "duplicate";
  pagesReliable: boolean;
  sections: number;
  chunks: number;
  diff?: VersionDiff;
  costUsd: number;
};

export async function ingestDocumentVersion(input: IngestInput): Promise<IngestResult> {
  const log = input.log ?? (() => {});
  const sha256 = createHash("sha256").update(input.bytes).digest("hex");

  // Guard first, before any lookup can return: the same Drive file must never
  // be attached to another landscape's document.
  const drive = input.drive ?? null;
  const clash = drive ? rows<{ landscape_slug: string | null }>(
    await db.execute(sql`SELECT landscape_slug FROM "cat".documents WHERE drive_file_id = ${drive.fileId}`),
  )[0] : undefined;
  if (drive && clash && clash.landscape_slug !== input.landscapeSlug) {
    throw new Error(`Drive file ${drive.fileId} already belongs to ${clash.landscape_slug}, not ${input.landscapeSlug}`);
  }

  // Idempotent: the same content is never ingested twice. Either the exact
  // bytes, or the same Drive file with an unchanged modifiedTime AND matching
  // content (Drive md5 for binary files; parsed-structure fingerprint for
  // Google-native exports, which differ byte-wise every time). A newer
  // modifiedTime always re-ingests; an empty parse never counts as a match.
  const contentHash = contentFingerprint(input.parsed.blocks);
  const dup = rows<{ id: string; document_id: string; version_no: number }>(
    await db.execute(sql`
      SELECT v.id, v.document_id, v.version_no
      FROM "cat".document_versions v JOIN "cat".documents d ON d.id = v.document_id
      WHERE d.landscape_slug IS NOT DISTINCT FROM ${input.landscapeSlug} AND d.doc_type = ${input.docType}
        AND (v.sha256 = ${sha256}
         ${drive ? sql`OR (d.drive_file_id = ${drive.fileId} AND v.is_current
             AND v.drive_modified_time = ${drive.modifiedTime}::timestamptz
             AND ((${drive.md5 ?? null}::text IS NOT NULL AND v.drive_md5 = ${drive.md5 ?? null})
                  OR (${contentHash}::text IS NOT NULL AND v.content_hash = ${contentHash})))` : sql``})
      ORDER BY (v.sha256 = ${sha256}) DESC
      LIMIT 1`),
  )[0];
  if (dup) {
    log("  already ingested (same file), skipping");
    return { documentId: dup.document_id, versionId: dup.id, versionNo: dup.version_no, skipped: "duplicate", pagesReliable: false, sections: 0, chunks: 0, costUsd: 0 };
  }

  const reliable = pagesReliable(input.parsed.blocks, input.parsed.pageCount);
  const { sections, chunks } = buildSectionsAndChunks(input.parsed.blocks);
  log(`  ${sections.length} sections, ${chunks.length} chunks, pages ${reliable ? `reliable (${input.parsed.pageCount})` : "not available (section citations)"}`);

  // Document row. A landscape has one LIP lineage: a revised file that
  // replaces the August report (different Drive file) continues the same
  // document as a new version, so it gets a change summary and the old
  // version is removed. Lookup order: same Drive file, else the landscape's
  // existing synced document of this type.
  // Manual documents (no Drive file) continue the document with the same title.
  const existing = rows<{ id: string; landscape_slug: string | null }>(
    await db.execute(drive ? sql`
      SELECT id, landscape_slug FROM "cat".documents
      WHERE source = 'drive' AND landscape_slug IS NOT DISTINCT FROM ${input.landscapeSlug} AND doc_type = ${input.docType}
      ORDER BY (drive_file_id = ${drive.fileId}) DESC, updated_at DESC
      LIMIT 1` : sql`
      SELECT id, landscape_slug FROM "cat".documents
      WHERE source = 'manual' AND landscape_slug IS NOT DISTINCT FROM ${input.landscapeSlug}
        AND doc_type = ${input.docType} AND title = ${input.title}
      ORDER BY updated_at DESC
      LIMIT 1`),
  )[0];

  const doc = existing
    ? rows<{ id: string }>(
        await db.execute(sql`
          UPDATE "cat".documents
          SET title = ${input.title}, drive_file_id = ${drive?.fileId ?? null}, drive_path = ${drive?.path ?? null}, updated_at = now()
          WHERE id = ${existing.id}
          RETURNING id`),
      )[0]
    : rows<{ id: string }>(
        await db.execute(sql`
          INSERT INTO "cat".documents (landscape_slug, title, doc_type, source, drive_file_id, drive_path)
          VALUES (${input.landscapeSlug}, ${input.title}, ${input.docType}, ${drive ? "drive" : "manual"}, ${drive?.fileId ?? null}, ${drive?.path ?? null})
          RETURNING id`),
      )[0];

  const prevInDb = rows<{ id: string; version_no: number; label: string | null; r2_original_key: string; r2_parsed_key: string | null; r2_pdf_key: string | null }>(
    await db.execute(sql`
      SELECT id, version_no, label, r2_original_key, r2_parsed_key, r2_pdf_key FROM "cat".document_versions
      WHERE document_id = ${doc.id} AND is_current`),
  )[0];
  const maxNo = rows<{ n: number | null }>(
    await db.execute(sql`SELECT max(version_no) AS n FROM "cat".document_versions WHERE document_id = ${doc.id}`),
  )[0]?.n ?? 0;
  const versionNo = Math.max(maxNo, input.previous ? 1 : 0) + 1;

  // Originals and parse output to R2 first (cheap to clean up if later steps fail).
  const ext = input.fileName.match(/\.(\w+)$/)?.[1]?.toLowerCase() ?? (input.mime.includes("word") ? "docx" : "bin");
  const base = `docs/${input.landscapeSlug ?? "general"}/${doc.id}/v${versionNo}`;
  const originalKey = `${base}/original.${ext}`;
  const parsedKey = `${base}/parsed.json`;
  await putObject(originalKey, input.bytes, input.mime, { sha256 });
  await putObject(parsedKey, JSON.stringify({ parser: input.parser ?? PARSER, pageCount: input.parsed.pageCount, pagesReliable: reliable, blocks: input.parsed.blocks }), "application/json");

  let cost = 0;
  try {
    // Context lines + embeddings (the slow, billable part) before the transaction.
    const ctx = await contextualise({
      landscapeName: input.landscapeName,
      documentTitle: input.title,
      sections,
      chunks,
      runId: input.runId,
      onProgress: (() => { let last = 0; return (d: number, t: number) => { if (d === t || d - last >= 150) { last = d; log(`  context ${d}/${t}`); } }; })(),
    });
    cost += ctx.costUsd;
    const vectors = await embedDocuments(chunks.map((c, i) => `${ctx.contexts[i]}\n\n${c.text}`));
    log(`  embedded ${vectors.length} chunks`);

    // Change summary: against the stored current version, or the supplied previous file.
    let diff: VersionDiff | undefined;
    let fromLabel: string | null = null;
    let fromNo: number | null = null;
    if (input.previous) {
      diff = await diffVersions({
        documentTitle: input.title, landscapeName: input.landscapeName,
        oldLabel: input.previous.label, newLabel: input.versionLabel,
        oldBlocks: input.previous.parsed.blocks, newBlocks: input.parsed.blocks,
        oldPagesReliable: pagesReliable(input.previous.parsed.blocks, input.previous.parsed.pageCount), newPagesReliable: reliable,
        runId: input.runId,
      });
      fromLabel = input.previous.label; fromNo = versionNo - 1;
    } else if (prevInDb?.r2_parsed_key) {
      const { getObjectBytes } = await import("@/lib/storage/r2");
      const old = JSON.parse(new TextDecoder().decode(await getObjectBytes(prevInDb.r2_parsed_key))) as { blocks: Block[]; pageCount: number; pagesReliable: boolean };
      diff = await diffVersions({
        documentTitle: input.title, landscapeName: input.landscapeName,
        oldLabel: prevInDb.label ?? `v${prevInDb.version_no}`, newLabel: input.versionLabel,
        oldBlocks: old.blocks, newBlocks: input.parsed.blocks, oldPagesReliable: old.pagesReliable, newPagesReliable: reliable,
        runId: input.runId,
      });
      fromLabel = prevInDb.label ?? `v${prevInDb.version_no}`; fromNo = prevInDb.version_no;
    }
    if (diff) { cost += diff.costUsd; log(`  change summary: ${diff.changes.length} material changes`); }

    const versionId = await db.transaction(async (tx) => {
      const v = rows<{ id: string }>(
        await tx.execute(sql`
          INSERT INTO "cat".document_versions
            (document_id, version_no, label, status, r2_original_key, r2_parsed_key, sha256, mime, bytes,
             page_count, published_on, parser, parser_version, drive_modified_time, drive_md5, content_hash)
          VALUES (${doc.id}, ${versionNo}, ${input.versionLabel}, 'embedding', ${originalKey}, ${parsedKey}, ${sha256},
                  ${input.mime}, ${input.bytes.length}, ${reliable ? input.parsed.pageCount : null}, ${input.publishedOn ?? null},
                  ${input.parser ?? PARSER}, ${input.parser ?? PARSER}, ${drive?.modifiedTime ?? null}, ${drive?.md5 ?? null}, ${contentHash})
          RETURNING id`),
      )[0];

      if (reliable) {
        const pages = [...pagesText(input.parsed.blocks)];
        for (let i = 0; i < pages.length; i += BATCH) {
          const values = pages.slice(i, i + BATCH).map(([pageNo, text]) => sql`(${v.id}, ${pageNo}, ${text}, 'docx', ${text.length})`);
          await tx.execute(sql`INSERT INTO "cat".document_pages (version_id, page_no, text, method, char_count) VALUES ${sql.join(values, sql`, `)}`);
        }
      }

      const sectionIds: string[] = [];
      for (const s of sections) {
        const r = rows<{ id: string }>(
          await tx.execute(sql`
            INSERT INTO "cat".sections (version_id, parent_id, ord, heading, level, page_start, page_end, path)
            VALUES (${v.id}, ${s.parentOrd === null ? null : sectionIds[s.parentOrd]}, ${s.ord}, ${s.heading}, ${s.level},
                    ${reliable ? s.pageStart : null}, ${reliable ? s.pageEnd : null}, ${s.path})
            RETURNING id`),
        )[0];
        sectionIds.push(r.id);
      }

      for (let i = 0; i < chunks.length; i += BATCH) {
        const values = chunks.slice(i, i + BATCH).map((c) => sql`(
          'document', ${doc.id}, ${v.id}, ${c.sectionOrd === null ? null : sectionIds[c.sectionOrd]}, ${input.landscapeSlug},
          ${c.index}, ${c.kind}, ${c.text}, ${ctx.contexts[c.index]},
          ${reliable ? c.pageStart : null}, ${reliable ? c.pageEnd : null}, ${c.tokenCount}, false,
          ${toVectorLiteral(vectors[c.index])}::vector, ${EMBED_MODEL})`);
        await tx.execute(sql`
          INSERT INTO "cat".chunks
            (source_kind, document_id, version_id, section_id, landscape_slug, chunk_index, kind, text, context,
             page_start, page_end, token_count, is_current, embedding, embedding_model)
          VALUES ${sql.join(values, sql`, `)}`);
      }

      if (diff) {
        await tx.execute(sql`
          INSERT INTO "cat".version_diffs (document_id, from_version_id, to_version_id, from_label, from_version_no, summary_md, changes, model, cost_usd)
          VALUES (${doc.id}, ${prevInDb?.id ?? null}, ${v.id}, ${fromLabel}, ${fromNo}, ${diff.summaryMd}, ${JSON.stringify(diff.changes)}::jsonb,
                  'version_diff', ${diff.costUsd})`);
      }

      // Swap: retire the old current version, then publish the new one.
      if (prevInDb) await tx.execute(sql`UPDATE "cat".document_versions SET is_current = false, status = 'superseded' WHERE id = ${prevInDb.id}`);
      await tx.execute(sql`UPDATE "cat".document_versions SET status = 'ready', is_current = true, updated_at = now() WHERE id = ${v.id}`);
      await tx.execute(sql`UPDATE "cat".chunks SET is_current = true WHERE version_id = ${v.id}`);
      await tx.execute(sql`UPDATE "cat".documents SET current_version_id = ${v.id}, updated_at = now() WHERE id = ${doc.id}`);
      // Policy: the old version is deleted entirely; its change summary stays (FK -> NULL, label kept).
      if (prevInDb) await tx.execute(sql`DELETE FROM "cat".document_versions WHERE id = ${prevInDb.id}`);
      return v.id;
    });

    if (prevInDb) {
      for (const k of [prevInDb.r2_original_key, prevInDb.r2_parsed_key, prevInDb.r2_pdf_key]) if (k) await deleteObject(k).catch(() => {});
    }
    return { documentId: doc.id, versionId, versionNo, pagesReliable: reliable, sections: sections.length, chunks: chunks.length, diff, costUsd: cost };
  } catch (e) {
    // Nothing was published; remove the new objects so R2 holds no orphans.
    await deleteObject(originalKey).catch(() => {});
    await deleteObject(parsedKey).catch(() => {});
    throw e;
  }
}

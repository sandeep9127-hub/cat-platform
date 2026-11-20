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
  landscapeSlug: string;
  landscapeName: string;
  title: string;
  docType: "lip" | "report" | "other";
  versionLabel: string;
  publishedOn?: string | null; // YYYY-MM-DD
  bytes: Uint8Array;
  mime: string;
  fileName: string;
  drive: { fileId: string; path: string; modifiedTime: string; md5?: string | null };
  parsed: { blocks: Block[]; pageCount: number };
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

  // Idempotent: the same file is never ingested twice. Google-native files
  // (Docs/Sheets) export to different bytes every time, so for those "same"
  // means the same Drive file at the same modifiedTime.
  const dup = rows<{ id: string; document_id: string; version_no: number }>(
    await db.execute(sql`
      SELECT v.id, v.document_id, v.version_no
      FROM "cat".document_versions v JOIN "cat".documents d ON d.id = v.document_id
      WHERE v.sha256 = ${sha256}
         OR (d.drive_file_id = ${input.drive.fileId} AND v.is_current
             AND v.drive_modified_time = ${input.drive.modifiedTime}::timestamptz)
      LIMIT 1`),
  )[0];
  if (dup) {
    log("  already ingested (same file), skipping");
    return { documentId: dup.document_id, versionId: dup.id, versionNo: dup.version_no, skipped: "duplicate", pagesReliable: false, sections: 0, chunks: 0, costUsd: 0 };
  }

  const reliable = pagesReliable(input.parsed.blocks, input.parsed.pageCount);
  const { sections, chunks } = buildSectionsAndChunks(input.parsed.blocks);
  log(`  ${sections.length} sections, ${chunks.length} chunks, pages ${reliable ? `reliable (${input.parsed.pageCount})` : "not available (section citations)"}`);

  // Document row: one per Drive file lineage.
  const doc = rows<{ id: string }>(
    await db.execute(sql`
      INSERT INTO "cat".documents (landscape_slug, title, doc_type, source, drive_file_id, drive_path)
      VALUES (${input.landscapeSlug}, ${input.title}, ${input.docType}, 'drive', ${input.drive.fileId}, ${input.drive.path})
      ON CONFLICT (drive_file_id) WHERE drive_file_id IS NOT NULL
      DO UPDATE SET title = EXCLUDED.title, drive_path = EXCLUDED.drive_path, updated_at = now()
      RETURNING id`),
  )[0];

  const prevInDb = rows<{ id: string; version_no: number; label: string | null; r2_original_key: string; r2_parsed_key: string | null }>(
    await db.execute(sql`
      SELECT id, version_no, label, r2_original_key, r2_parsed_key FROM "cat".document_versions
      WHERE document_id = ${doc.id} AND is_current`),
  )[0];
  const maxNo = rows<{ n: number | null }>(
    await db.execute(sql`SELECT max(version_no) AS n FROM "cat".document_versions WHERE document_id = ${doc.id}`),
  )[0]?.n ?? 0;
  const versionNo = Math.max(maxNo, input.previous ? 1 : 0) + 1;

  // Originals and parse output to R2 first (cheap to clean up if later steps fail).
  const ext = input.fileName.match(/\.(\w+)$/)?.[1]?.toLowerCase() ?? (input.mime.includes("word") ? "docx" : "bin");
  const base = `docs/${input.landscapeSlug}/${doc.id}/v${versionNo}`;
  const originalKey = `${base}/original.${ext}`;
  const parsedKey = `${base}/parsed.json`;
  await putObject(originalKey, input.bytes, input.mime, { sha256 });
  await putObject(parsedKey, JSON.stringify({ parser: PARSER, pageCount: input.parsed.pageCount, pagesReliable: reliable, blocks: input.parsed.blocks }), "application/json");

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
             page_count, published_on, parser, parser_version, drive_modified_time, drive_md5)
          VALUES (${doc.id}, ${versionNo}, ${input.versionLabel}, 'embedding', ${originalKey}, ${parsedKey}, ${sha256},
                  ${input.mime}, ${input.bytes.length}, ${reliable ? input.parsed.pageCount : null}, ${input.publishedOn ?? null},
                  ${PARSER}, ${PARSER}, ${input.drive.modifiedTime}, ${input.drive.md5 ?? null})
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
      for (const k of [prevInDb.r2_original_key, prevInDb.r2_parsed_key]) if (k) await deleteObject(k).catch(() => {});
    }
    return { documentId: doc.id, versionId, versionNo, pagesReliable: reliable, sections: sections.length, chunks: chunks.length, diff, costUsd: cost };
  } catch (e) {
    // Nothing was published; remove the new objects so R2 holds no orphans.
    await deleteObject(originalKey).catch(() => {});
    await deleteObject(parsedKey).catch(() => {});
    throw e;
  }
}

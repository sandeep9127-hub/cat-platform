import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { downloadFile, GOOGLE_DOC, listTree, readSheetValues } from "@/lib/ingest/drive";
import { parseDocx } from "@/lib/ingest/docx";
import { attachPdfPages, pdfForDriveFile } from "@/lib/ingest/pdf-pages";
import { getObjectBytes } from "@/lib/storage/r2";
import { ingestDocumentVersion } from "@/lib/ingest/pipeline";
import { planFinalFolder, versionLabel } from "@/lib/ingest/plan";
import { parseInterventionSheet, stageInterventions } from "@/lib/ingest/sheets";
import { sendDigest, type SyncSummary } from "@/lib/notify/sync-digest";

/**
 * Daily Drive sync: bring the Hub in line with the "Final folder".
 *
 * Reports: a landscape's LIP is re-ingested only when its Drive file changed
 *   (new file, or newer modifiedTime). The pipeline writes a change summary,
 *   publishes the new version and deletes the old one.
 * Sheets: each live sheet is compared with the approved interventions;
 *   differences are staged as pending changes for editor approval (nothing on
 *   the site changes until approved).
 * Never deletes a document because its file vanished from Drive; that is
 *   reported as a problem for a person to decide.
 */

const rows = <T>(r: unknown) => (r as { rows: T[] }).rows;

export async function runDriveSync(opts: {
  triggeredBy: "cron" | "manual";
  folderId?: string;
  dryRun?: boolean;
  log?: (m: string) => void;
}): Promise<SyncSummary & { emailed: string }> {
  const log = opts.log ?? (() => {});
  const folderId = opts.folderId ?? process.env.DRIVE_FINAL_FOLDER_ID;
  if (!folderId) throw new Error("DRIVE_FINAL_FOLDER_ID is not set");

  const run = rows<{ id: string }>(await db.execute(sql`
    INSERT INTO "cat".drive_sync_runs (triggered_by) VALUES (${opts.triggeredBy}) RETURNING id`))[0];
  const summary: SyncSummary = { runId: run.id, triggeredBy: opts.triggeredBy, newVersions: [], sheetChanges: [], problems: [], costUsd: 0 };
  let seen = 0, changed = 0, added = 0;

  try {
    const files = await listTree(folderId, "Final folder");
    seen = files.length;
    const plan = planFinalFolder(files);
    for (const u of plan.unmatched) summary.problems.push(`Not matched to a landscape: ${u}`);

    // Synced documents whose landscape no longer has a report in the folder.
    const synced = rows<{ landscape_slug: string; title: string }>(await db.execute(sql`
      SELECT landscape_slug, title FROM "cat".documents WHERE source = 'drive' AND doc_type = 'lip'`));
    for (const d of synced)
      if (!plan.reports.some((p) => p.slug === d.landscape_slug))
        summary.problems.push(`${d.title}: no report for this landscape in the Final folder any more (kept as is)`);

    // ── Reports ──
    for (const p of plan.reports) {
      const name = LANDSCAPES[p.slug]?.name ?? p.slug;
      const cur = rows<{ drive_file_id: string; drive_modified_time: string | null }>(await db.execute(sql`
        SELECT d.drive_file_id, v.drive_modified_time
        FROM "cat".documents d LEFT JOIN "cat".document_versions v ON v.id = d.current_version_id
        WHERE d.source = 'drive' AND d.landscape_slug = ${p.slug} AND d.doc_type = 'lip'`))[0];
      const unchanged = cur && cur.drive_file_id === p.current.id && cur.drive_modified_time
        && new Date(cur.drive_modified_time).getTime() === new Date(p.current.modifiedTime).getTime();
      if (unchanged) continue;

      log(`report ${cur ? "changed" : "new"}: ${name} (${p.current.name})`);
      if (opts.dryRun) { cur ? changed++ : added++; continue; }
      try {
        const file = await downloadFile(p.current);
        const parsed = await parseDocx(file.bytes);
        const res = await ingestDocumentVersion({
          landscapeSlug: p.slug,
          landscapeName: name,
          title: `${name} Landscape Investment Plan`,
          docType: "lip",
          versionLabel: cur ? `Updated ${new Date(p.current.modifiedTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : versionLabel(p),
          publishedOn: p.current.modifiedTime.slice(0, 10),
          bytes: file.bytes,
          mime: file.mime,
          fileName: p.current.mimeType === GOOGLE_DOC ? `${p.current.name}.docx` : p.current.name,
          drive: { fileId: p.current.id, path: p.current.path, modifiedTime: p.current.modifiedTime, md5: p.current.md5Checksum ?? null },
          parsed,
          log: (m) => log(m),
        });
        summary.costUsd += res.costUsd;
        if (res.skipped) {
          // Same content (e.g. a re-export): just record the new modifiedTime so it isn't re-checked daily.
          await db.execute(sql`UPDATE "cat".document_versions SET drive_modified_time = ${p.current.modifiedTime} WHERE id = ${res.versionId}`);
          continue;
        }
        cur ? changed++ : added++;
        summary.newVersions.push({ landscape: name, title: `${name} Landscape Investment Plan`, label: `v${res.versionNo}`, summaryMd: res.diff?.summaryMd ?? null });
      } catch (e) {
        summary.problems.push(`${name} report failed to sync: ${(e as Error).message.slice(0, 200)}`);
      }
    }

    // ── Page numbers ──
    // Every current report gets a reader-facing PDF and page numbers: new
    // versions from above, and any older version still without one.
    if (!opts.dryRun) {
      let noRenderer = false;
      for (const p of plan.reports) {
        const name = LANDSCAPES[p.slug]?.name ?? p.slug;
        const v = rows<{ id: string; r2_original_key: string; drive_modified_time: string | null }>(await db.execute(sql`
          SELECT v.id, v.r2_original_key, v.drive_modified_time
          FROM "cat".documents d JOIN "cat".document_versions v ON v.id = d.current_version_id
          WHERE d.source = 'drive' AND d.doc_type = 'lip' AND d.landscape_slug = ${p.slug}
            AND d.drive_file_id = ${p.current.id} AND v.r2_pdf_key IS NULL`))[0];
        if (!v) continue;
        // A Google Doc's PDF comes from Drive's live copy: only use it while that
        // copy is exactly the version we ingested (Word files render the stored original).
        if (p.current.mimeType === GOOGLE_DOC && (!v.drive_modified_time
            || new Date(v.drive_modified_time).getTime() !== new Date(p.current.modifiedTime).getTime())) continue;
        try {
          const got = await pdfForDriveFile(p.current, await getObjectBytes(v.r2_original_key), { expectModifiedTime: v.drive_modified_time });
          if (!got) { noRenderer = true; continue; }
          const r = await attachPdfPages(v.id, got.pdf, got.method);
          log(`pages ${name}: ${r.pages} pages, ${r.matched}/${r.chunks} chunks placed (${got.method})`);
        } catch (e) {
          summary.problems.push(`${name}: page numbers not added (${(e as Error).message.slice(0, 150)}); citations show sections only`);
        }
      }
      if (noRenderer) summary.problems.push("Page numbers skipped for Word reports: LibreOffice is not installed where the sync ran");
    }

    // ── Sheets ──
    for (const s of plan.sheets) {
      const name = LANDSCAPES[s.slug]?.name ?? s.slug;
      try {
        const sheet = parseInterventionSheet(await readSheetValues(s.file.id, "Data"));
        if (!sheet.length) { summary.problems.push(`${name} live sheet is empty or unreadable (approved data kept)`); continue; }
        if (opts.dryRun) continue;
        // Always staged for approval, including a landscape seen for the first time.
        const r = await stageInterventions({ landscapeSlug: s.slug, sheet, driveFileId: s.file.id, syncRunId: run.id });
        if (r.added + r.updated + r.removed) {
          summary.sheetChanges.push({ landscape: name, added: r.added, updated: r.updated, removed: r.removed });
          log(`sheet ${name}: +${r.added} ~${r.updated} -${r.removed} pending approval`);
        }
      } catch (e) {
        summary.problems.push(`${name} live sheet failed to sync: ${(e as Error).message.slice(0, 200)}`);
      }
    }

    await db.execute(sql`
      UPDATE "cat".drive_sync_runs
      SET finished_at = now(), files_seen = ${seen}, files_new = ${added}, files_changed = ${changed},
          error = ${summary.problems.length ? summary.problems.join("\n").slice(0, 4000) : null}
      WHERE id = ${run.id}`);
  } catch (e) {
    await db.execute(sql`UPDATE "cat".drive_sync_runs SET finished_at = now(), error = ${(e as Error).message.slice(0, 4000)} WHERE id = ${run.id}`);
    throw e;
  }

  const emailed = opts.dryRun ? "disabled" : await sendDigest(summary).catch((e) => `failed: ${(e as Error).message}`);
  return { ...summary, emailed };
}

import { config } from "dotenv";

/**
 * First import of the Drive "Final folder" into the NEW CAT database.
 * Never touches the live site or the production database.
 *
 *   npx tsx scripts/import-final-folder.ts --dry-run          # plan + parse stats, no writes, no AI spend
 *   npx tsx scripts/import-final-folder.ts --only=chitrakonda # one landscape
 *   npx tsx scripts/import-final-folder.ts                    # all reports
 *
 * Reports: for each landscape the current report is the newest of
 *   "Landscape report - final/New updated reports/<X> LIP" and
 *   "Landscape report - final/Report as on 25/08/2026/<X> 25-08-2026 Report.docx".
 * Where a revision exists, the August report is used only as the comparison
 * baseline for the change summary and is not stored (policy: old versions are
 * deleted, only the summary is kept).
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT; // the new CAT database only

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const ONLY = [...args].find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null;

const FILE_NAME_TO_SLUG: Record<string, string> = {
  ahwa: "ahwa", chitrakonda: "chitrakonda", dantewada: "dantewada", dharashiv: "dharashiv",
  khasi: "khatarshnong-laitkroh", mau: "mau", patharpratima: "patharpratima", patratu: "patratu",
  rajnagar: "rajnagar", vempalli: "vempalli",
};

async function main() {
  const drive = await import("../lib/ingest/drive");
  const { parseDocx } = await import("../lib/ingest/docx");
  const { ingestDocumentVersion, pagesReliable } = await import("../lib/ingest/pipeline");
  const { LANDSCAPES } = await import("../lib/data/landscapes");
  const { poolSpentTodayUsd } = await import("../lib/ai/claude");

  const files = await drive.listTree(process.env.DRIVE_FINAL_FOLDER_ID!, "Final folder");
  const reports = files.filter((f) => f.path.includes("/Landscape report - final/") && (f.mimeType === drive.DOCX || f.mimeType === drive.GOOGLE_DOC));
  const slugOf = (name: string) => FILE_NAME_TO_SLUG[name.trim().split(/\s|_/)[0].toLowerCase()];

  type Plan = { slug: string; current: (typeof files)[number]; baseline?: (typeof files)[number] };
  const plan = new Map<string, Plan>();
  for (const f of reports) {
    const slug = slugOf(f.name);
    if (!slug) { console.warn(`! no landscape for ${f.path}`); continue; }
    const isRevision = f.path.includes("/New updated reports/");
    const p = plan.get(slug);
    if (!p) plan.set(slug, { slug, current: f });
    else if (isRevision) plan.set(slug, { slug, current: f, baseline: p.current });
    else plan.set(slug, { ...p, baseline: f });
  }

  const todo = [...plan.values()].filter((p) => !ONLY || ONLY.includes(p.slug)).sort((a, b) => a.slug.localeCompare(b.slug));
  console.log(`${DRY ? "DRY RUN: " : ""}${todo.length} landscape reports to import into the CAT database\n`);

  let total = 0;
  for (const p of todo) {
    const name = LANDSCAPES[p.slug]?.name ?? p.slug;
    const isRevised = !!p.baseline;
    const label = isRevised
      ? `Revised ${new Date(p.current.modifiedTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : "Report as on 25 Aug 2026";
    console.log(`▸ ${name}: ${p.current.path.replace("Final folder/Landscape report - final/", "")}${isRevised ? `  (compared with ${p.baseline!.name})` : ""}`);

    const t0 = Date.now();
    const cur = await drive.downloadFile(p.current);
    const parsed = await parseDocx(cur.bytes);
    let baselineParsed: Awaited<ReturnType<typeof parseDocx>> | undefined;
    if (p.baseline) baselineParsed = await parseDocx((await drive.downloadFile(p.baseline)).bytes);

    if (DRY) {
      const { buildSectionsAndChunks } = await import("../lib/ingest/chunk");
      const sc = buildSectionsAndChunks(parsed.blocks);
      console.log(`  ${(cur.bytes.length / 1e6).toFixed(1)} MB, ${sc.sections.length} sections, ${sc.chunks.length} chunks, pages ${pagesReliable(parsed.blocks, parsed.pageCount) ? parsed.pageCount : "n/a"}\n`);
      continue;
    }

    const res = await ingestDocumentVersion({
      landscapeSlug: p.slug,
      landscapeName: name,
      title: `${name} Landscape Investment Plan`,
      docType: "lip",
      versionLabel: label,
      publishedOn: p.current.modifiedTime.slice(0, 10),
      bytes: cur.bytes,
      mime: cur.mime,
      fileName: p.current.mimeType === drive.GOOGLE_DOC ? `${p.current.name}.docx` : p.current.name,
      drive: { fileId: p.current.id, path: p.current.path, modifiedTime: p.current.modifiedTime, md5: p.current.md5Checksum ?? null },
      parsed,
      previous: baselineParsed ? { label: "Report as on 25 Aug 2026", parsed: baselineParsed } : undefined,
      log: (m) => console.log(m),
    });
    total += res.costUsd;
    console.log(`  ✓ v${res.versionNo}${res.skipped ? " (skipped, already imported)" : ""}: ${res.chunks} chunks, $${res.costUsd.toFixed(3)}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    if (res.diff) console.log(`  changes since August:\n${res.diff.summaryMd.split("\n").map((l) => "    " + l).join("\n")}`);
    console.log();
  }
  if (!DRY) console.log(`Done. This run: $${total.toFixed(2)}. Ingestion spend today: $${(await poolSpentTodayUsd("ingestion")).toFixed(2)}`);
  process.exit(0);
}

main().catch((e) => { console.error("FAILED:", e.stack ?? e.message); process.exit(1); });

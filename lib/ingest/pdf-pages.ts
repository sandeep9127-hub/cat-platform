import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { getDocumentProxy } from "unpdf";
import { db } from "@/lib/db";
import { DOCX, exportGoogleDocPdf, getFileModifiedTime, GOOGLE_DOC } from "@/lib/ingest/drive";
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
const MAX_ZIP_ENTRIES = 5000;
const MAX_RELS_BYTES = 2 * 1024 * 1024;
const MAX_INFLATED_BYTES = 300 * 1024 * 1024;
const MAX_DOCX_INPUT_BYTES = 150 * 1024 * 1024;
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

// Locked-down LibreOffice profile: no macros, never update links or fields
// (so a document can't pull remote or local content into the render).
const PROFILE_XCU = `<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="BlockUntrustedRefererLinks" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>0</value></prop></item>
<item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Field" oor:op="fuse"><value>false</value></prop></item>
</oor:items>`;

/**
 * Remove external relationships that could make a renderer fetch something
 * (linked images, templates, OLE objects, sub-documents, frames, hyperlinks).
 */
export async function stripExternalTargets(docx: Uint8Array): Promise<Uint8Array> {
  if (docx.length > MAX_DOCX_INPUT_BYTES) throw new Error("Rejected document: file too large");
  const source = await JSZip.loadAsync(docx);
  const entries = Object.values(source.files).filter((f) => !f.dir);
  if (entries.length > MAX_ZIP_ENTRIES) throw new Error(`Rejected document: ${entries.length} zip entries`);
  // Inflate every entry with a running byte count (declared sizes are not
  // trusted), into a fresh archive, so nothing downstream inflates unbounded data.
  const zip = new JSZip();
  const budget = { left: MAX_INFLATED_BYTES };
  for (const f of entries) {
    const isRels = f.name.toLowerCase().endsWith(".rels");
    zip.file(f.name, await inflateCapped(f, budget, isRels ? MAX_RELS_BYTES : Infinity), { date: f.date });
  }
  const parser = new XMLParser({
    ignoreAttributes: false, attributeNamePrefix: "", processEntities: false,
    isArray: (name) => name === "Relationship",
  });
  const decode = (v: unknown) => String(v ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (const name of Object.keys(zip.files)) {
    if (!name.toLowerCase().endsWith(".rels") || zip.files[name].dir) continue;
    const xml = new TextDecoder().decode(await zip.file(name)!.async("uint8array"));
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error(`Rejected document: ${name} declares a DOCTYPE`);
    let doc: { Relationships?: { Relationship?: Record<string, unknown>[] } };
    try {
      doc = parser.parse(xml, true);
    } catch {
      throw new Error(`Rejected document: ${name} is not well-formed`);
    }
    const rels = doc.Relationships?.Relationship ?? [];
    // Every external relationship goes, hyperlinks included (they render as plain
    // text in the PDF). The Type attribute is document-controlled, so it can't be
    // trusted to exempt anything.
    const kept = rels.filter((r) => decode(r.TargetMode).trim().toLowerCase() !== "external");
    // Rebuild every .rels file from parsed attributes only (nothing else survives).
    const out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + kept.map((r) => `<Relationship ${["Id", "Type", "Target", "TargetMode"]
          .filter((k) => r[k] !== undefined).map((k) => `${k}="${esc(decode(r[k]))}"`).join(" ")}/>`).join("")
      + "</Relationships>";
    zip.file(name, out);
  }
  return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}

/** Inflate one zip entry, aborting as soon as it or the whole archive passes its cap. */
function inflateCapped(entry: JSZip.JSZipObject, budget: { left: number }, perEntryMax: number): Promise<Uint8Array> {
  type ZipStream = {
    on(ev: "data", cb: (chunk: Uint8Array) => void): ZipStream;
    on(ev: "error", cb: (e: Error) => void): ZipStream;
    on(ev: "end", cb: () => void): ZipStream;
    pause(): ZipStream;
    resume(): ZipStream;
  };
  return new Promise((resolve, reject) => {
    const parts: Uint8Array[] = [];
    let size = 0, done = false;
    const stream = (entry as unknown as { internalStream(t: "uint8array"): ZipStream }).internalStream("uint8array");
    stream
      .on("data", (chunk) => {
        if (done) return;
        size += chunk.length;
        budget.left -= chunk.length;
        if (size > perEntryMax || budget.left < 0) {
          done = true;
          stream.pause();
          reject(new Error(`Rejected document: too large when unpacked (${entry.name})`));
          return;
        }
        parts.push(chunk);
      })
      .on("error", (e) => { if (!done) { done = true; reject(e); } })
      .on("end", () => { if (!done) { done = true; resolve(new Uint8Array(Buffer.concat(parts))); } })
      .resume();
  });
}

/**
 * DOCX -> PDF with LibreOffice. Null if LibreOffice isn't installed.
 * Hardening: throwaway profile with macros and link/field updates off, a
 * external fetch targets stripped from the file (rels rebuilt via an XML parser),
 * no network on CI (unshare), a minimal environment (no
 * database URL or API keys reach the converter), a
 * private temp folder, a time limit, and a size check before reading output.
 * Input is a report from CAT's own Drive folder that already passed the DOCX
 * parser's size caps; the sync runs on an ephemeral GitHub runner.
 */
export async function renderDocxPdf(docx: Uint8Array): Promise<Uint8Array | null> {
  const soffice = sofficePath();
  if (!soffice) return null;
  const dir = await mkdtemp(join(tmpdir(), "cat-pdf-"));
  try {
    const profile = join(dir, "profile");
    await mkdir(join(profile, "user"), { recursive: true });
    await writeFile(join(profile, "user", "registrymodifications.xcu"), PROFILE_XCU);
    const input = join(dir, "report.docx");
    await writeFile(input, await stripExternalTargets(docx));
    const cleanEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: dir, TMPDIR: dir, LANG: "en_US.UTF-8" };
    const args = [
      `-env:UserInstallation=file://${profile}`,
      "--headless", "--norestore", "--nolockcheck", "--convert-to", "pdf:writer_pdf_Export", "--outdir", dir, input,
    ];
    // On CI (Linux, SOFFICE_NO_NETWORK=1): root only creates an empty network
    // namespace, then LibreOffice runs as the normal (unprivileged) user inside
    // it, with a clean environment. No kernel settings are relaxed.
    const isolate = process.platform === "linux" && process.env.SOFFICE_NO_NETWORK === "1";
    const [cmd, argv] = isolate
      ? ["sudo", ["-n", "unshare", "--net", "--", "sudo", "-n", "-u", userInfo().username, "env", "-i",
          ...Object.entries(cleanEnv).map(([k, v]) => `${k}=${v}`),
          // The limit is enforced inside the sandbox, as the same user as LibreOffice:
          // Node can't signal the root-owned sudo, so its own timeout isn't enough here.
          "timeout", "-k", "10", "280", soffice, ...args]]
      : [soffice, args];
    await run(cmd, argv, {
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      env: cleanEnv as unknown as NodeJS.ProcessEnv,
    });
    const out = join(dir, "report.pdf");
    if ((await stat(out)).size > MAX_PDF_BYTES) throw new Error("Rendered PDF too large");
    return new Uint8Array(await readFile(out));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/** The reader-facing PDF for a Drive file, or null when it can't be produced here. */
export async function pdfForDriveFile(
  file: { id: string; mimeType: string },
  docxBytes: Uint8Array,
  opts: { expectModifiedTime?: string | null } = {},
): Promise<{ pdf: Uint8Array; method: "drive-export" | "libreoffice" } | null> {
  if (file.mimeType === GOOGLE_DOC) {
    // Drive exports its live copy: confirm it is still the ingested version
    // immediately before and after exporting.
    // Fails closed: unknown or unreadable times count as "changed".
    const expected = opts.expectModifiedTime ? new Date(opts.expectModifiedTime).getTime() : NaN;
    if (Number.isNaN(expected)) throw new Error("Ingested version has no Drive modifiedTime; refusing a live export");
    const same = async () => {
      const live = await getFileModifiedTime(file.id);
      const t = live ? new Date(live).getTime() : NaN;
      return !Number.isNaN(t) && t === expected;
    };
    if (!(await same())) throw new Error("Google Doc changed since it was ingested; the next sync will re-import it first");
    const pdf = await exportGoogleDocPdf(file.id);
    if (!(await same())) throw new Error("Google Doc changed during export; skipped");
    return { pdf, method: "drive-export" };
  }
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
 * Locate each chunk in the PDF text, in three passes:
 *  1. a chunk whose opening phrase (7-word window, several tried) occurs exactly
 *     once in the PDF is placed there;
 *  2. a chunk whose phrases occur several times (repeated table headers, stock
 *     sentences) takes the occurrence that fits between its placed neighbours;
 *  3. whatever is still out of document order is dropped (longest increasing
 *     run kept), so a page is never guessed.
 * Unplaced chunks get null pages (Ask then cites the section only).
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
  const occurrences = (anchor: string, max = 8) => {
    const out: number[] = [];
    for (let i = doc.indexOf(anchor); i >= 0 && out.length < max; i = doc.indexOf(anchor, i + 1)) out.push(i);
    return out;
  };

  const WINDOW = 7, STEP = 5, TRIES = 8;
  const n = chunkTexts.length;
  const words = chunkTexts.map((t) => norm(t).split(" ").filter(Boolean));
  const windows = (w: string[], fromEnd: boolean) => {
    const out: string[] = [];
    for (let k = 0; k < TRIES; k++) {
      const s = fromEnd ? w.length - WINDOW - k * STEP : k * STEP;
      if (s < 0 || s + WINDOW > w.length) break;
      out.push(w.slice(s, s + WINDOW).join(" "));
    }
    return out;
  };

  // Pass 1: unique anchors; remember ambiguous candidates for pass 2.
  const pos: (number | null)[] = new Array(n).fill(null);
  const candidates: number[][] = new Array(n).fill(null).map(() => []);
  for (let i = 0; i < n; i++) {
    if (words[i].length < WINDOW) continue;
    for (const w of windows(words[i], false)) {
      const occ = occurrences(w);
      if (occ.length === 1) { pos[i] = occ[0]; break; }
      if (occ.length > 1 && !candidates[i].length) candidates[i] = occ;
    }
  }

  // Pass 2: ambiguous chunks take the occurrence between their placed neighbours.
  for (let i = 0; i < n; i++) {
    if (pos[i] !== null || !candidates[i].length) continue;
    let prev: number | null = null, next: number | null = null;
    for (let j = i - 1; j >= 0; j--) if (pos[j] !== null) { prev = pos[j]; break; }
    for (let j = i + 1; j < n; j++) if (pos[j] !== null) { next = pos[j]; break; }
    const fit = candidates[i].filter((c) => (prev === null || c >= prev) && (next === null || c <= next));
    if (fit.length === 1 || (fit.length > 1 && prev !== null)) pos[i] = fit[0];
  }

  // Pass 3: keep the longest non-decreasing run of positions; drop the rest.
  const idx = pos.map((p, i) => (p === null ? -1 : i)).filter((i) => i >= 0);
  const tails: number[] = [], tailIdx: number[] = [], parent = new Map<number, number>();
  for (const i of idx) {
    const v = pos[i]!;
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] <= v) lo = m + 1; else hi = m; }
    if (lo > 0) parent.set(i, tailIdx[lo - 1]);
    tails[lo] = v; tailIdx[lo] = i;
  }
  const keep = new Set<number>();
  for (let i: number | undefined = tailIdx[tails.length - 1]; i !== undefined; i = parent.get(i)) keep.add(i);

  return pos.map((p, i) => {
    if (p === null || !keep.has(i)) return { pageStart: null, pageEnd: null };
    const pageStart = pageAt(p);
    let end = p;
    for (const w of windows(words[i], true)) {
      const e = occurrences(w).find((o) => o >= p);
      if (e !== undefined) { end = e; break; }
    }
    let pageEnd = pageAt(end);
    if (pageEnd < pageStart || pageEnd - pageStart > 6) pageEnd = pageStart; // implausible span: trust the start
    return { pageStart, pageEnd };
  });
}

const MAX_PAGES = 2000;
const MAX_TEXT_CHARS = 20_000_000;

/** Text of each PDF page, read page by page and stopped as soon as a cap is hit. */
export async function pdfPageTexts(pdf: Uint8Array): Promise<string[]> {
  if (pdf.length > MAX_PDF_BYTES) throw new Error("PDF too large");
  const proxy = await getDocumentProxy(new Uint8Array(pdf));
  if (proxy.numPages > MAX_PAGES) throw new Error(`PDF has ${proxy.numPages} pages (limit ${MAX_PAGES})`);
  const pages: string[] = [];
  let total = 0;
  for (let i = 1; i <= proxy.numPages; i++) {
    const page = await proxy.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("");
    total += text.length;
    if (total > MAX_TEXT_CHARS) throw new Error("PDF text too large");
    pages.push(text);
    page.cleanup();
  }
  return pages;
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

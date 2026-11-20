import type { DriveFile } from "@/lib/ingest/drive";
import { DOCX, GOOGLE_DOC, GOOGLE_SHEET } from "@/lib/ingest/drive";

/**
 * What in the Drive "Final folder" maps to what in the Hub. Shared by the
 * first import and the daily sync so both read the folder the same way.
 *
 * Reports: one current LIP per landscape = the file in
 *   "Landscape report - final/New updated reports/" if present, otherwise the
 *   one in "Landscape report - final/Report as on 25/08/2026/".
 * Sheets: "5.2 data - final/Live Google Sheets/<Landscape>" (tab "Data").
 * Everything else in the folder (snapshots, backups) is ignored.
 */

export const FILE_NAME_TO_SLUG: Record<string, string> = {
  ahwa: "ahwa", chitrakonda: "chitrakonda", dantewada: "dantewada", dharashiv: "dharashiv",
  khasi: "khatarshnong-laitkroh", khatarshnong: "khatarshnong-laitkroh",
  mau: "mau", patharpratima: "patharpratima", patratu: "patratu", rajnagar: "rajnagar", vempalli: "vempalli",
};

export const slugOf = (name: string): string | undefined =>
  FILE_NAME_TO_SLUG[name.trim().split(/[\s_]/)[0].toLowerCase()];

export type ReportPlan = { slug: string; current: DriveFile; baseline?: DriveFile; isRevision: boolean };
export type SheetPlan = { slug: string; file: DriveFile };

export function planFinalFolder(files: DriveFile[]): { reports: ReportPlan[]; sheets: SheetPlan[]; unmatched: string[] } {
  const unmatched: string[] = [];
  const reports = new Map<string, ReportPlan>();
  for (const f of files) {
    if (!f.path.includes("/Landscape report - final/")) continue;
    if (f.mimeType !== DOCX && f.mimeType !== GOOGLE_DOC) continue;
    const slug = slugOf(f.name);
    if (!slug) { unmatched.push(f.path); continue; }
    const isRevision = f.path.includes("/New updated reports/");
    const p = reports.get(slug);
    if (!p) reports.set(slug, { slug, current: f, isRevision });
    else if (isRevision && !p.isRevision) reports.set(slug, { slug, current: f, baseline: p.current, isRevision: true });
    else if (!isRevision && p.isRevision) reports.set(slug, { ...p, baseline: f });
    else if (new Date(f.modifiedTime) > new Date(p.current.modifiedTime)) reports.set(slug, { ...p, current: f }); // two files in the same folder: newest wins
  }
  const sheets: SheetPlan[] = [];
  for (const f of files) {
    if (!f.path.includes("/Live Google Sheets/") || f.mimeType !== GOOGLE_SHEET) continue;
    const slug = slugOf(f.name);
    if (slug) sheets.push({ slug, file: f });
    else unmatched.push(f.path);
  }
  return {
    reports: [...reports.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    sheets: sheets.sort((a, b) => a.slug.localeCompare(b.slug)),
    unmatched,
  };
}

export function versionLabel(p: ReportPlan): string {
  const d = new Date(p.current.modifiedTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return p.isRevision ? `Revised ${d}` : p.current.path.includes("/Report as on 25/08/2026/") ? "Report as on 25 Aug 2026" : `Updated ${d}`;
}

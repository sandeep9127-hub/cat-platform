import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * A4 PDF of an Ask note card (docs/ask-ui-spec.md §4): CAT header with the
 * date, the title, the cited bullets, numbered source footnotes and a line
 * back to the Hub. Built from the stored note only, never from client input.
 * Standard Helvetica (no font download), so text is reduced to WinAnsi: ₹ is
 * written "Rs".
 */

export type NoteForPdf = {
  title: string;
  date: string;
  bullets: { text: string; sources: number[] }[];
  sources: { n: number; label: string }[];
};

const PAGE = { w: 595.28, h: 841.89 };
const M = { top: 56, right: 56, bottom: 64, left: 56 };
const W = PAGE.w - M.left - M.right;
const C = {
  ink: rgb(0.086, 0.075, 0.051),
  soft: rgb(0.34, 0.33, 0.3),
  teal: rgb(0.18, 0.459, 0.451),
  deep: rgb(0.2, 0.294, 0.29),
  line: rgb(0.84, 0.83, 0.8),
};

/** Keep only characters Helvetica (WinAnsi) can draw. */
function winAnsi(s: string): string {
  return s
    .replace(/₹\s?/g, "Rs ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[›»]/g, ">")
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = winAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function buildNotePdf(note: NoteForPdf, hubUrl: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(winAnsi(note.title));
  doc.setAuthor("CAT Transformation Hub");
  doc.setSubject("Note generated from the CAT landscape investment plans");
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - M.top;
  const header = () => {
    page.drawText("CAT", { x: M.left, y, size: 11, font: bold, color: C.teal });
    page.drawText("Transformation Hub", { x: M.left + 30, y, size: 11, font: sans, color: C.deep });
    const d = winAnsi(note.date);
    page.drawText(d, { x: PAGE.w - M.right - sans.widthOfTextAtSize(d, 10), y, size: 10, font: sans, color: C.soft });
    y -= 10;
    page.drawLine({ start: { x: M.left, y }, end: { x: PAGE.w - M.right, y }, thickness: 1.5, color: C.teal });
    y -= 26;
  };
  const ensure = (h: number) => {
    if (y - h < M.bottom) {
      page = doc.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - M.top;
      header();
    }
  };
  header();

  page.drawText("NOTE", { x: M.left, y, size: 9, font: bold, color: C.soft });
  y -= 20;
  for (const line of wrap(note.title, bold, 18, W)) {
    ensure(24);
    page.drawText(line, { x: M.left, y, size: 18, font: bold, color: C.ink });
    y -= 24;
  }
  y -= 8;

  for (const b of note.bullets) {
    const refs = b.sources.map((s) => `[${s}]`).join("");
    const lines = wrap(`${b.text} ${refs}`, sans, 11.5, W - 16);
    ensure(lines.length * 16 + 8);
    page.drawCircle({ x: M.left + 3, y: y + 4, size: 2, color: C.teal });
    for (const line of lines) {
      page.drawText(line, { x: M.left + 16, y, size: 11.5, font: sans, color: C.ink });
      y -= 16;
    }
    y -= 8;
  }

  y -= 6;
  ensure(40);
  page.drawLine({ start: { x: M.left, y }, end: { x: PAGE.w - M.right, y }, thickness: 0.6, color: C.line });
  y -= 18;
  page.drawText("Sources", { x: M.left, y, size: 10, font: bold, color: C.soft });
  y -= 15;
  for (const s of note.sources) {
    const lines = wrap(`[${s.n}] ${s.label}`, sans, 9.5, W);
    ensure(lines.length * 13 + 4);
    for (const line of lines) {
      page.drawText(line, { x: M.left, y, size: 9.5, font: sans, color: C.soft });
      y -= 13;
    }
    y -= 3;
  }

  // Footer on every page.
  const foot = winAnsi(`Made with Ask the Hub from the CAT landscape investment plans. Check the cited pages before quoting. ${hubUrl}`);
  for (const p of doc.getPages()) {
    const lines = wrap(foot, sans, 8, W);
    lines.forEach((line, i) => p.drawText(line, { x: M.left, y: M.bottom - 30 - i * 10, size: 8, font: sans, color: C.soft }));
  }
  return doc.save();
}

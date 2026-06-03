import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { FactSheetRow } from "@/lib/factsheet/generate";

// A4 portrait, consultancy margins.
const W = 595.28;
const H = 841.89;
const MX = 54;
const TOP = 800;
const BOTTOM = 64;

const TEAL = rgb(46 / 255, 117 / 255, 115 / 255);
const DEEP = rgb(51 / 255, 75 / 255, 74 / 255);
const INK = rgb(26 / 255, 38 / 255, 37 / 255);
const MUTED = rgb(107 / 255, 123 / 255, 122 / 255);

const SCALE: Record<string, string> = {
  pilot: "Pilot", block: "Block", district: "District", multi_district: "Multi-district",
  state: "State", multi_state: "Multi-state", national: "National",
};

export async function buildFactSheetPdf(s: FactSheetRow): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([W, H]);
  let y = TOP;

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = TOP;
  };
  const ensure = (need: number) => {
    if (y - need < BOTTOM) newPage();
  };

  function wrap(text: string, f: PDFFont, size: number, maxW: number): string[] {
    const words = (text || "").replace(/\s+/g, " ").trim().split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function para(text: string, f: PDFFont, size: number, color = INK, lh = 1.45, maxW = W - MX * 2) {
    for (const ln of wrap(text, f, size, maxW)) {
      ensure(size * lh);
      page.drawText(ln, { x: MX, y, size, font: f, color });
      y -= size * lh;
    }
  }

  function heading(label: string) {
    ensure(26);
    y -= 10;
    page.drawText(label.toUpperCase(), { x: MX, y, size: 8, font: bold, color: TEAL });
    y -= 6;
    page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.6, color: rgb(0.86, 0.87, 0.85) });
    y -= 12;
  }

  // ── Header
  page.drawText("SOLUTION FACT SHEET", { x: MX, y, size: 8, font: bold, color: TEAL });
  y -= 22;
  for (const ln of wrap(s.title, bold, 20, W - MX * 2)) {
    ensure(26);
    page.drawText(ln, { x: MX, y, size: 20, font: bold, color: INK });
    y -= 25;
  }
  if (s.one_liner) {
    y -= 2;
    para(s.one_liner, oblique, 11.5, MUTED);
  }

  // meta line
  const meta = [
    s.lead_organisation,
    [s.district, s.state_code].filter(Boolean).join(", "),
    s.scale_band ? SCALE[s.scale_band] ?? s.scale_band : null,
  ].filter(Boolean).join("   ·   ");
  if (meta) {
    y -= 6;
    para(meta, font, 9, MUTED);
  }

  if (s.summary) {
    heading("What it is");
    para(s.summary, font, 10.5);
  }

  if (Array.isArray(s.outcomes) && s.outcomes.length) {
    heading("Outcomes & evidence");
    for (const o of s.outcomes) {
      const text = `${o.figure ? o.figure + " — " : ""}${o.claim}`;
      ensure(14);
      page.drawText("•", { x: MX, y, size: 10.5, font: bold, color: TEAL });
      const lines = wrap(text, font, 10, W - MX * 2 - 14);
      for (const ln of lines) {
        ensure(10 * 1.4);
        page.drawText(ln, { x: MX + 14, y, size: 10, font, color: INK });
        y -= 10 * 1.4;
      }
      if (o.source_url) {
        ensure(9 * 1.3);
        page.drawText(`source: ${o.source_url}`, { x: MX + 14, y, size: 7.5, font, color: TEAL });
        y -= 9 * 1.3;
      }
      y -= 3;
    }
  }

  if (Array.isArray(s.principle_alignment) && s.principle_alignment.length) {
    heading("Principle alignment");
    para(s.principle_alignment.join("   ·   "), font, 10);
  }

  if ((s.implementers?.length ?? 0) > 0 || (s.funders?.length ?? 0) > 0) {
    heading("Who's behind it");
    if (s.implementers?.length) para(`Implementers: ${s.implementers.join(", ")}`, font, 10);
    if (s.funders?.length) para(`Funders: ${s.funders.join(", ")}`, font, 10);
  }

  if (Array.isArray(s.citations) && s.citations.length) {
    heading("Sources");
    s.citations.forEach((c, i) => {
      para(`${i + 1}. ${c.url}`, font, 8.5, TEAL, 1.4);
    });
  }

  // ── Footer on every page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MX, y: BOTTOM - 8 }, end: { x: W - MX, y: BOTTOM - 8 }, thickness: 0.5, color: rgb(0.86, 0.87, 0.85) });
    p.drawText("Transformation Hub  ·  Consortium for Agroecological Transformations", {
      x: MX, y: BOTTOM - 20, size: 7, font, color: MUTED,
    });
    const right = `Verified from public sources  ·  ${new Date(s.updated_at).toLocaleDateString("en-GB")}  ·  ${i + 1}/${pages.length}`;
    p.drawText(right, { x: W - MX - font.widthOfTextAtSize(right, 7), y: BOTTOM - 20, size: 7, font, color: MUTED });
  });

  return doc.save();
}

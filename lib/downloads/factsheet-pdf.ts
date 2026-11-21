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

/**
 * Optional field-guide art (PNG bytes): the theme drawing beside the title and
 * small pathway drawings beside each "at a glance" item. The download route
 * fetches them (lib/design/solution-art); without them the PDF is text-only.
 */
export type FactSheetArt = {
  hero?: Uint8Array | null;
  glance?: Partial<Record<string, Uint8Array | null>>;
};

export async function buildFactSheetPdf(s: FactSheetRow, art: FactSheetArt = {}): Promise<Uint8Array> {
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
    ensure(56); // keep a heading with at least a few lines of its section
    y -= 10;
    page.drawText(label.toUpperCase(), { x: MX, y, size: 8, font: bold, color: TEAL });
    y -= 6;
    page.drawLine({ start: { x: MX, y }, end: { x: W - MX, y }, thickness: 0.6, color: rgb(0.86, 0.87, 0.85) });
    y -= 12;
  }

  // Embed art up front (bad bytes just mean no picture, never a failed PDF).
  const embed = async (b?: Uint8Array | null) => {
    if (!b) return null;
    try { return await doc.embedPng(b); } catch { return null; }
  };
  const heroImg = await embed(art.hero);
  const glanceImg: Record<string, Awaited<ReturnType<typeof embed>>> = {};
  for (const [k, b] of Object.entries(art.glance ?? {})) glanceImg[k] = await embed(b);

  // ── Header: title block on the left, the theme's field drawing on the right
  const ART_W = heroImg ? 190 : 0;
  const textW = W - MX * 2 - (heroImg ? ART_W + 18 : 0);
  const headTop = y;
  page.drawText("SOLUTION FACT SHEET", { x: MX, y, size: 8, font: bold, color: TEAL });
  y -= 22;
  for (const ln of wrap(s.title, bold, 20, textW)) {
    ensure(26);
    page.drawText(ln, { x: MX, y, size: 20, font: bold, color: INK });
    y -= 25;
  }
  if (s.one_liner) {
    y -= 2;
    para(s.one_liner, oblique, 11.5, MUTED, 1.45, textW);
  }
  if (heroImg) {
    const h = (heroImg.height / heroImg.width) * ART_W;
    const imgY = Math.max(y + 4, headTop - h - 6);
    page.drawImage(heroImg, { x: W - MX - ART_W, y: imgY, width: ART_W, height: h });
    y = Math.min(y, imgY - 6);
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

  // Headline metrics row
  if (Array.isArray(s.metrics) && s.metrics.length) {
    y -= 8;
    ensure(34);
    const cols = Math.min(s.metrics.length, 4);
    const colW = (W - MX * 2) / cols;
    const rowY = y;
    s.metrics.slice(0, 4).forEach((m, i) => {
      const x = MX + i * colW;
      page.drawText(String(m.value).slice(0, 14), { x, y: rowY, size: 17, font: bold, color: INK });
      // Label wraps to at most two lines, each on its own baseline (they used
      // to be drawn on top of each other and run into the next column).
      wrap(m.label, font, 7.5, colW - 10).slice(0, 2).forEach((ln, li) => {
        page.drawText(ln, { x, y: rowY - 13 - li * 9.5, size: 7.5, font, color: MUTED });
      });
    });
    y = rowY - 36;
  }

  if (s.summary) {
    heading("What it is");
    para(s.summary, font, 10.5);
  }

  const insight = s.insight || {};
  const cards: [string, string | null | undefined][] = [
    ["What's working", insight.whats_working],
    ["What's hard", insight.whats_hard],
    ["Why it matters", insight.why_it_matters],
    ["What's next", insight.whats_next],
  ];
  if (cards.some(([, v]) => v)) {
    heading("At a glance");
    for (const [k, v] of cards) {
      if (!v) continue;
      const icon = glanceImg[k];
      const IND = icon ? 52 : 0; // drawing sits in a left gutter
      ensure(icon ? 40 : 20);
      const top = y;
      if (icon) {
        const iw = 40, ih = (icon.height / icon.width) * iw;
        page.drawImage(icon, { x: MX, y: top - ih + 8, width: iw, height: ih });
      }
      page.drawText(k.toUpperCase(), { x: MX + IND, y, size: 7.5, font: bold, color: TEAL });
      y -= 11;
      for (const ln of wrap(v, font, 9.5, W - MX * 2 - IND)) {
        ensure(9.5 * 1.4);
        page.drawText(ln, { x: MX + IND, y, size: 9.5, font, color: INK });
        y -= 9.5 * 1.4;
      }
      if (icon) y = Math.min(y, top - 34);
      y -= 6;
    }
  }

  if (Array.isArray(s.outcomes) && s.outcomes.length) {
    heading("Outcomes and evidence");
    for (const o of s.outcomes) {
      const text = `${o.figure ? o.figure + ": " : ""}${o.claim}`;
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

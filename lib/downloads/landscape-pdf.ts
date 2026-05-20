import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { LandscapeProfile } from "@/lib/data/landscapes";

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
const MARGIN = { top: 56, right: 56, bottom: 56, left: 56 };

const COLOR = {
  ink: rgb(0.10, 0.15, 0.15),
  inkSoft: rgb(0.30, 0.34, 0.34),
  muted: rgb(0.46, 0.50, 0.50),
  deepTeal: rgb(0.20, 0.29, 0.29),
  teal: rgb(0.18, 0.46, 0.45),
  amberDeep: rgb(0.78, 0.55, 0.18),
  paper: rgb(0.984, 0.972, 0.949),
  line: rgb(0.86, 0.86, 0.83),
};

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  serif: PDFFont;
  serifBold: PDFFont;
  mono: PDFFont;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  ctx.page.drawRectangle({
    x: 0, y: 0, width: PAGE.w, height: PAGE.h,
    color: COLOR.paper,
  });
  ctx.y = PAGE.h - MARGIN.top;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN.bottom) {
    newPage(ctx);
  }
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? line + " " + w : w;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width <= maxW) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLabel(ctx: Ctx, label: string) {
  ensure(ctx, 18);
  // amber accent rule
  ctx.page.drawRectangle({
    x: MARGIN.left, y: ctx.y - 1.5,
    width: 18, height: 1.2,
    color: COLOR.amberDeep,
  });
  ctx.page.drawText(label.toUpperCase(), {
    x: MARGIN.left + 24, y: ctx.y - 6,
    size: 8, font: ctx.mono, color: COLOR.teal,

  });
  ctx.y -= 20;
}

function drawHeading(ctx: Ctx, text: string, size = 20) {
  ensure(ctx, size + 8);
  ctx.page.drawText(text, {
    x: MARGIN.left, y: ctx.y - size,
    size, font: ctx.serifBold, color: COLOR.ink,
  });
  ctx.y -= size + 6;
}

function drawParagraph(ctx: Ctx, text: string, size = 10.5, color = COLOR.inkSoft) {
  const maxW = PAGE.w - MARGIN.left - MARGIN.right;
  const lines = wrap(text, ctx.serif, size, maxW);
  for (const line of lines) {
    ensure(ctx, size + 4);
    ctx.page.drawText(line, {
      x: MARGIN.left, y: ctx.y - size,
      size, font: ctx.serif, color, lineHeight: size * 1.45,
    });
    ctx.y -= size + 4;
  }
  ctx.y -= 4;
}

function drawKeyValue(ctx: Ctx, key: string, value: string) {
  const keyW = 160;
  ensure(ctx, 16);
  ctx.page.drawText(key.toUpperCase(), {
    x: MARGIN.left, y: ctx.y - 9,
    size: 7.5, font: ctx.mono, color: COLOR.muted,

  });
  ctx.page.drawText(value, {
    x: MARGIN.left + keyW, y: ctx.y - 11,
    size: 11, font: ctx.serif, color: COLOR.deepTeal,
  });
  ctx.y -= 18;
}

function drawDivider(ctx: Ctx) {
  ensure(ctx, 10);
  ctx.page.drawRectangle({
    x: MARGIN.left, y: ctx.y - 4,
    width: PAGE.w - MARGIN.left - MARGIN.right, height: 0.6,
    color: COLOR.line,
  });
  ctx.y -= 14;
}

export async function buildLandscapeProfilePdf(p: LandscapeProfile, stateName: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${p.name} · Landscape profile · CAT Platform`);
  doc.setAuthor("Consortium for Agroecological Transformations");
  doc.setSubject(`Landscape profile for ${p.name}`);
  doc.setKeywords(["CAT", "landscape", "food systems", p.name, p.district]);

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  const ctx: Ctx = { doc, page: doc.addPage([PAGE.w, PAGE.h]), y: 0, serif, serifBold, mono };
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: COLOR.paper });
  ctx.y = PAGE.h - MARGIN.top;

  // Brand header
  ctx.page.drawText("CAT PLATFORM", {
    x: MARGIN.left, y: ctx.y - 9,
    size: 8, font: mono, color: COLOR.deepTeal,

  });
  ctx.page.drawText("Consortium for Agroecological Transformations", {
    x: MARGIN.left, y: ctx.y - 21,
    size: 8, font: serif, color: COLOR.muted,
  });
  ctx.y -= 40;

  drawLabel(ctx, "Landscape profile");
  drawHeading(ctx, p.name, 30);
  ctx.page.drawText(`${p.district} · ${stateName}`, {
    x: MARGIN.left, y: ctx.y - 12,
    size: 12, font: serif, color: COLOR.inkSoft,
  });
  ctx.y -= 28;

  drawParagraph(ctx, p.context, 11.5, COLOR.ink);
  ctx.y -= 6;

  // Quick facts
  drawDivider(ctx);
  drawLabel(ctx, "Quick facts");
  drawKeyValue(ctx, "Region", p.region);
  drawKeyValue(ctx, "Agroclimatic zone", shorten(p.agroclimaticZone, 80));
  drawKeyValue(ctx, "Geographical area", p.area);
  drawKeyValue(ctx, "Population", p.population);
  drawKeyValue(ctx, "Households", p.households);
  drawKeyValue(ctx, "Inhabited villages", p.villages);
  drawKeyValue(
    ctx,
    "LIP status",
    p.lipStatus === "published" ? "Published" : "In preparation"
  );
  ctx.y -= 4;

  drawDivider(ctx);
  drawLabel(ctx, "Context");
  drawParagraph(ctx, p.bodyContext);

  drawDivider(ctx);
  drawLabel(ctx, "Agroclimatic zone");
  drawParagraph(ctx, p.agroclimaticZone);

  drawDivider(ctx);
  drawLabel(ctx, "Key landscape challenges");
  p.keyChallenges.forEach((c, i) => {
    ensure(ctx, 24);
    const num = String(i + 1).padStart(2, "0") + ".";
    ctx.page.drawText(num, {
      x: MARGIN.left, y: ctx.y - 10,
      size: 9, font: mono, color: COLOR.amberDeep,
    });
    const maxW = PAGE.w - MARGIN.left - MARGIN.right - 28;
    const lines = wrap(c, serif, 10.5, maxW);
    for (let j = 0; j < lines.length; j++) {
      ensure(ctx, 14);
      ctx.page.drawText(lines[j], {
        x: MARGIN.left + 28, y: ctx.y - 10,
        size: 10.5, font: serif, color: COLOR.inkSoft,
      });
      ctx.y -= 14;
    }
    ctx.y -= 4;
  });

  drawDivider(ctx);
  drawLabel(ctx, "Editorial note");
  drawParagraph(
    ctx,
    "This profile is curated by CAT editors. The data is sourced from the official CAT Landscape Profiles (February 2026). Programmes are read, not pitched. Limitations sit beside achievements. For the full landscape investment plan, where published, see the Library tab on cat-platform-fawn.vercel.app.",
    10
  );

  // Footer on every page
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    page.drawText("CAT Platform · Vol. 01 · 2026", {
      x: MARGIN.left, y: 28,
      size: 7.5, font: mono, color: COLOR.muted,

    });
    page.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: PAGE.w - MARGIN.right - 80, y: 28,
      size: 7.5, font: mono, color: COLOR.muted,

    });
  }

  return await doc.save();
}

function shorten(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

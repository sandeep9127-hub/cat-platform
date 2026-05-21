/**
 * Landscape Investment Brief — PDF generator
 *
 * McKinsey-style consultancy document: single sans-serif family, disciplined
 * margins, exhibit-style headings with a thin teal rule, horizontal bar
 * visualisations, hairline rules, page header + footer on every page, and
 * the official CAT mark embedded as a vector lockup on each page.
 *
 * Explicit non-features (per the editor):
 *   - No photographs anywhere. Photos disturb the design and inflate file
 *     size (the prior generator shipped 5.5 MB for a 6-page brief).
 *   - No decorative serif body type. Bodies are Helvetica throughout.
 *   - No filler whitespace. Every page is dense; the brief earns its length.
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { LandscapeProfile } from "@/lib/data/landscapes";
import type { BudgetSummary } from "@/lib/db/landscape-kb";

// ─── Geometry ────────────────────────────────────────────────────────────
// A4 portrait. Margins tightened to consultancy norms (52pt outer, generous
// internal grids).
const PAGE = { w: 595.28, h: 841.89 };
const M = { top: 56, right: 52, bottom: 56, left: 52 };
const CONTENT_W = PAGE.w - M.left - M.right;
// Reserve space above the bottom margin for the footer band.
const SAFE_BOTTOM = M.bottom + 26;

// ─── Colour palette ──────────────────────────────────────────────────────
// Cool near-black ink, deep teal accent, single amber stroke. Pure white
// page (consultancy default; the editorial paper cream was reading craft-y,
// not professional).
const C = {
  paper: rgb(1.0, 1.0, 1.0),
  ink: rgb(0.10, 0.13, 0.16),
  inkSoft: rgb(0.30, 0.34, 0.38),
  muted: rgb(0.52, 0.56, 0.60),
  navy: rgb(0.16, 0.20, 0.30), // CAT wordmark navy
  teal: rgb(0.176, 0.459, 0.455), // CAT symbol teal #2D7574
  tealSoft: rgb(0.78, 0.86, 0.85), // 25% teal — bar background
  periwinkle: rgb(0.392, 0.427, 0.588),
  amber: rgb(0.776, 0.549, 0.180),
  hairline: rgb(0.85, 0.87, 0.89),
  rowAlt: rgb(0.965, 0.970, 0.975),
};

// ─── Context object ──────────────────────────────────────────────────────
type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  pageTitle: string;
  pageNumber: number;
  brief: { landscapeName: string; district: string };
  sans: PDFFont;
  sansBold: PDFFont;
  mono: PDFFont;
};

// ─── ASCII safety (WinAnsi standard fonts can't encode ₹ or em-dashes) ───
function asciify(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/₹/g, "INR ");
}

function wrapPageDrawText(page: PDFPage) {
  const original = page.drawText.bind(page);
  (page as unknown as { drawText: typeof original }).drawText = ((
    text: string,
    opts?: Parameters<typeof original>[1]
  ) => original(asciify(text), opts)) as typeof original;
}

// ─── Text layout helpers ────────────────────────────────────────────────
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = asciify(text).replace(/\s+/g, " ").split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxW) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < SAFE_BOTTOM) {
    newPage(ctx, ctx.pageTitle);
  }
}

function drawBody(
  ctx: Ctx,
  text: string,
  opts: { x?: number; size?: number; color?: ReturnType<typeof rgb>; lineHeight?: number; maxW?: number; bold?: boolean } = {}
) {
  const size = opts.size ?? 10;
  const color = opts.color ?? C.inkSoft;
  const lineHeight = opts.lineHeight ?? size * 1.5;
  const maxW = opts.maxW ?? CONTENT_W;
  const x = opts.x ?? M.left;
  const font = opts.bold ? ctx.sansBold : ctx.sans;
  const lines = wrap(text, font, size, maxW);
  for (const line of lines) {
    ensure(ctx, lineHeight);
    ctx.page.drawText(line, { x, y: ctx.y - size, size, font, color });
    ctx.y -= lineHeight;
  }
}

function hairline(ctx: Ctx, opts: { gap?: number; color?: ReturnType<typeof rgb>; thickness?: number } = {}) {
  const gap = opts.gap ?? 12;
  ensure(ctx, gap * 2);
  ctx.page.drawRectangle({
    x: M.left,
    y: ctx.y - gap,
    width: CONTENT_W,
    height: opts.thickness ?? 0.4,
    color: opts.color ?? C.hairline,
  });
  ctx.y -= gap * 2;
}

// ─── CAT lockup ──────────────────────────────────────────────────────────
// Compact vector form of the CAT symbol (three concentric arches + two
// leaves), drawn at any height. Used in every page header.
function drawCatSymbol(page: PDFPage, x: number, y: number, height: number) {
  const cx = x + height / 2;
  const baseY = y + height * 0.42;
  // Arches — outer to inner
  const arcs = [
    { r: height * 0.42, stroke: 1.1 },
    { r: height * 0.30, stroke: 1.0 },
    { r: height * 0.18, stroke: 0.9 },
  ];
  for (const a of arcs) {
    page.drawSvgPath(`M ${-a.r} 0 A ${a.r} ${a.r} 0 0 1 ${a.r} 0`, {
      x: cx,
      y: baseY,
      borderColor: C.teal,
      borderWidth: a.stroke,
      scale: 1,
    });
  }
  // Two leaves rising from the base
  const leafScale = height * 0.018;
  page.drawSvgPath("M 0 1 C -5 4, -6 11, -2 16 C 0 13, 1 8, 0 1 Z", {
    x: cx,
    y: baseY,
    borderColor: C.periwinkle,
    borderWidth: 0.9,
    scale: leafScale,
  });
  page.drawSvgPath("M 0 1 C 5 4, 6 11, 2 16 C 0 13, -1 8, 0 1 Z", {
    x: cx,
    y: baseY,
    borderColor: C.periwinkle,
    borderWidth: 0.9,
    scale: leafScale,
  });
}

function drawCatLockup(
  ctx: Ctx,
  x: number,
  y: number,
  opts: { symbolHeight?: number; wordmark?: boolean } = {}
) {
  const sh = opts.symbolHeight ?? 22;
  drawCatSymbol(ctx.page, x, y, sh);
  if (opts.wordmark !== false) {
    const tx = x + sh + 8;
    const labelSize = 7.5;
    const lineH = labelSize * 1.22;
    const lines = ["Consortium for", "Agroecological", "Transformations"];
    for (let i = 0; i < lines.length; i++) {
      ctx.page.drawText(lines[i], {
        x: tx,
        y: y + sh - labelSize - 2 - i * lineH,
        size: labelSize,
        font: ctx.sansBold,
        color: C.navy,
      });
    }
  }
}

// ─── Page chrome ─────────────────────────────────────────────────────────
function newPage(ctx: Ctx, title: string) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  wrapPageDrawText(ctx.page);
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: C.paper });
  ctx.pageTitle = title;
  ctx.pageNumber += 1;
  drawPageHeader(ctx, title);
  ctx.y = PAGE.h - M.top - 30;
}

function drawPageHeader(ctx: Ctx, title: string) {
  // CAT symbol top-left
  drawCatSymbol(ctx.page, M.left, PAGE.h - M.top + 4, 14);
  // Tiny brand mark, navy
  ctx.page.drawText("CAT  ·  Transformation Hub", {
    x: M.left + 20,
    y: PAGE.h - M.top + 7,
    size: 7,
    font: ctx.sansBold,
    color: C.navy,
  });
  // Page title, right-aligned
  const titleUpper = title.toUpperCase();
  const titleW = ctx.mono.widthOfTextAtSize(titleUpper, 7);
  ctx.page.drawText(titleUpper, {
    x: PAGE.w - M.right - titleW,
    y: PAGE.h - M.top + 7,
    size: 7,
    font: ctx.mono,
    color: C.muted,
  });
  // Top rule
  ctx.page.drawRectangle({
    x: M.left,
    y: PAGE.h - M.top - 6,
    width: CONTENT_W,
    height: 0.4,
    color: C.hairline,
  });
}

function drawFooters(ctx: Ctx, citationUrl: string) {
  const pages = ctx.doc.getPages();
  const total = pages.length;
  // Skip the cover (page 1) — it has its own bottom band.
  for (let i = 1; i < total; i++) {
    const page = pages[i];
    // Bottom rule
    page.drawRectangle({
      x: M.left,
      y: M.bottom - 4,
      width: CONTENT_W,
      height: 0.4,
      color: C.hairline,
    });
    // Citation (left)
    page.drawText(citationUrl, {
      x: M.left,
      y: M.bottom - 18,
      size: 7,
      font: ctx.mono,
      color: C.muted,
    });
    // Page n / N (right)
    const counter = `${i + 1} / ${total}`;
    const w = ctx.mono.widthOfTextAtSize(counter, 7);
    page.drawText(counter, {
      x: PAGE.w - M.right - w,
      y: M.bottom - 18,
      size: 7,
      font: ctx.mono,
      color: C.muted,
    });
  }
}

// ─── Exhibit headings ────────────────────────────────────────────────────
// Each major section opens with: short amber eyebrow ("EXHIBIT 03 ·
// CONTEXT"), 0.4pt teal rule, then the bold title. McKinsey-style.
function drawExhibitHeader(ctx: Ctx, exhibitNumber: string, eyebrow: string, title: string) {
  ensure(ctx, 50);
  // Eyebrow
  ctx.page.drawText(`EXHIBIT ${exhibitNumber}  ·  ${eyebrow.toUpperCase()}`, {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
    // pdf-lib doesn't support letter-spacing; the all-caps + bold reads tight
    // enough in Helvetica at this size.
  });
  ctx.y -= 12;
  // Thin teal rule, 36pt long
  ctx.page.drawRectangle({
    x: M.left,
    y: ctx.y,
    width: 36,
    height: 1.4,
    color: C.teal,
  });
  ctx.y -= 14;
  // Title
  ctx.page.drawText(title, {
    x: M.left,
    y: ctx.y - 18,
    size: 18,
    font: ctx.sansBold,
    color: C.navy,
  });
  ctx.y -= 28;
}

// ─── INR formatting ──────────────────────────────────────────────────────
function inrShort(n: number): string {
  if (!n || !isFinite(n)) return "-";
  if (n >= 1e7) return `INR ${(n / 1e7).toFixed(n >= 1e8 ? 0 : 2)} cr`;
  if (n >= 1e5) return `INR ${(n / 1e5).toFixed(2)} lakh`;
  return `INR ${n.toLocaleString("en-IN")}`;
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function pctStr(part: number, whole: number): string {
  if (!whole) return "-";
  return `${Math.round((part / whole) * 100)}%`;
}

// ─── COVER (Page 1) ──────────────────────────────────────────────────────
function drawCover(ctx: Ctx, p: LandscapeProfile, stateName: string) {
  // No page chrome on cover — clean, centred composition.
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: C.paper });

  // CAT lockup, top-left
  drawCatLockup(ctx, M.left, PAGE.h - M.top - 26, { symbolHeight: 26 });

  // Edition meta, top-right
  const editionLine = "VOL. 01  ·  EDITION 2026";
  const editionW = ctx.mono.widthOfTextAtSize(editionLine, 8);
  ctx.page.drawText(editionLine, {
    x: PAGE.w - M.right - editionW,
    y: PAGE.h - M.top - 4,
    size: 8,
    font: ctx.mono,
    color: C.muted,
  });
  ctx.page.drawText("LANDSCAPE INVESTMENT BRIEF", {
    x: PAGE.w - M.right - ctx.sansBold.widthOfTextAtSize("LANDSCAPE INVESTMENT BRIEF", 7.5),
    y: PAGE.h - M.top - 18,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });

  // Title sits in the upper-third — keeps the cover from feeling top-heavy
  // but gives the gloss + bottom band room to breathe below.
  const titleY = PAGE.h * 0.70;
  // Eyebrow "Landscape" — small amber line
  ctx.page.drawText("LANDSCAPE", {
    x: M.left,
    y: titleY + 80,
    size: 9,
    font: ctx.sansBold,
    color: C.amber,
  });
  // Teal rule
  ctx.page.drawRectangle({
    x: M.left + 70,
    y: titleY + 84,
    width: CONTENT_W - 70,
    height: 0.6,
    color: C.teal,
  });
  // Big landscape name
  const nameSize = p.name.length > 16 ? 44 : 56;
  ctx.page.drawText(p.name, {
    x: M.left,
    y: titleY,
    size: nameSize,
    font: ctx.sansBold,
    color: C.navy,
  });
  // Subtitle — district · state
  ctx.page.drawText(`${p.district}  ·  ${stateName}`, {
    x: M.left,
    y: titleY - 26,
    size: 13,
    font: ctx.sans,
    color: C.inkSoft,
  });

  // Body gloss — single paragraph editorial context
  const glossY = titleY - 80;
  const glossLines = wrap(p.context, ctx.sans, 11, CONTENT_W * 0.78);
  for (let i = 0; i < Math.min(glossLines.length, 4); i++) {
    ctx.page.drawText(glossLines[i], {
      x: M.left,
      y: glossY - i * 16,
      size: 11,
      font: ctx.sans,
      color: C.ink,
    });
  }

  // Headline metrics strip — four numbers, equal columns, with mono labels.
  // Sits in the middle band between the gloss and the bottom imprint, so
  // the cover hands the reader real signal before they turn the page.
  const metricsY = PAGE.h * 0.40;
  ctx.page.drawRectangle({
    x: M.left,
    y: metricsY + 50,
    width: CONTENT_W,
    height: 0.4,
    color: C.hairline,
  });
  ctx.page.drawText("THIS BRIEF AT A GLANCE", {
    x: M.left,
    y: metricsY + 36,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  const coverMetrics = [
    { label: "POPULATION", value: p.population },
    { label: "HOUSEHOLDS", value: p.households },
    { label: "VILLAGES", value: p.villages },
    { label: "AREA", value: p.area },
  ];
  const colW = CONTENT_W / 4;
  for (let i = 0; i < coverMetrics.length; i++) {
    const cx = M.left + i * colW;
    ctx.page.drawText(coverMetrics[i].label, {
      x: cx,
      y: metricsY + 16,
      size: 7,
      font: ctx.sansBold,
      color: C.muted,
    });
    ctx.page.drawText(coverMetrics[i].value, {
      x: cx,
      y: metricsY - 8,
      size: 20,
      font: ctx.sansBold,
      color: C.navy,
    });
  }
  ctx.page.drawRectangle({
    x: M.left,
    y: metricsY - 24,
    width: CONTENT_W,
    height: 0.4,
    color: C.hairline,
  });

  // Bottom band — citation, date, URL
  const bandY = M.bottom + 40;
  ctx.page.drawRectangle({
    x: M.left,
    y: bandY + 18,
    width: 36,
    height: 1.4,
    color: C.teal,
  });
  ctx.page.drawText("CONSORTIUM FOR AGROECOLOGICAL TRANSFORMATIONS", {
    x: M.left,
    y: bandY,
    size: 8,
    font: ctx.sansBold,
    color: C.navy,
  });
  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  ctx.page.drawText(`Generated ${now}`, {
    x: M.left,
    y: bandY - 12,
    size: 8,
    font: ctx.sans,
    color: C.muted,
  });
  const urlText = `cat-platform-fawn.vercel.app/landscape/${p.slug}`;
  const urlW = ctx.mono.widthOfTextAtSize(urlText, 8);
  ctx.page.drawText(urlText, {
    x: PAGE.w - M.right - urlW,
    y: bandY,
    size: 8,
    font: ctx.mono,
    color: C.muted,
  });
}

// ─── CONTENTS (Page 2) ───────────────────────────────────────────────────
function drawContents(
  ctx: Ctx,
  items: { exhibit: string; title: string }[]
) {
  newPage(ctx, "Contents");
  drawExhibitHeader(ctx, "00", "Navigation", "Contents");

  drawBody(
    ctx,
    "This brief is a snapshot of the landscape as recorded in the Hub. Each exhibit stands on its own; the document is designed for tab-and-skim reading.",
    { size: 10, lineHeight: 14, color: C.inkSoft, maxW: CONTENT_W * 0.78 }
  );
  ctx.y -= 10;
  hairline(ctx);

  for (const item of items) {
    ensure(ctx, 26);
    // Exhibit number
    ctx.page.drawText(item.exhibit, {
      x: M.left,
      y: ctx.y - 12,
      size: 10,
      font: ctx.mono,
      color: C.amber,
    });
    // Title
    ctx.page.drawText(item.title, {
      x: M.left + 42,
      y: ctx.y - 12,
      size: 12,
      font: ctx.sansBold,
      color: C.navy,
    });
    // Trailing rule
    ctx.page.drawRectangle({
      x: M.left + 42,
      y: ctx.y - 16,
      width: CONTENT_W - 42,
      height: 0.3,
      color: C.hairline,
    });
    ctx.y -= 26;
  }
}

// ─── AT A GLANCE (Executive dashboard) ───────────────────────────────────
function drawAtAGlance(ctx: Ctx, p: LandscapeProfile, stateName: string, exhibit: string) {
  newPage(ctx, "At a glance");
  drawExhibitHeader(ctx, exhibit, "Executive snapshot", "At a glance");

  // Lede sentence
  drawBody(ctx, p.gloss, { size: 11, lineHeight: 16, color: C.ink, maxW: CONTENT_W * 0.82 });
  ctx.y -= 8;
  hairline(ctx);

  // Six headline tiles — Population, Households, Villages, Area,
  // Challenges identified, Plan status. Three columns × two rows.
  const tileW = CONTENT_W / 3;
  const tileH = 64;
  const tiles = [
    { label: "POPULATION", value: p.population, sub: "Persons" },
    { label: "HOUSEHOLDS", value: p.households, sub: "Reached by plan" },
    { label: "VILLAGES", value: p.villages, sub: "Inhabited" },
    { label: "LANDSCAPE AREA", value: p.area, sub: "Geographical" },
    {
      label: "CHALLENGES",
      value: String(p.keyChallenges.length),
      sub: "Identified in plan",
    },
    {
      label: "PLAN STATUS",
      value: p.lipStatus === "published" ? "Published" : "In prep.",
      sub: "Investment plan",
    },
  ];
  for (let i = 0; i < tiles.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = M.left + col * tileW;
    const ty = ctx.y - row * tileH;
    // Top hairline
    ctx.page.drawRectangle({ x: tx, y: ty, width: tileW - 8, height: 0.6, color: C.hairline });
    // Label
    ctx.page.drawText(tiles[i].label, {
      x: tx,
      y: ty - 12,
      size: 7,
      font: ctx.sansBold,
      color: C.muted,
    });
    // Value
    const value = tiles[i].value;
    const valueSize = value.length > 9 ? 18 : 22;
    ctx.page.drawText(value, {
      x: tx,
      y: ty - 12 - valueSize - 4,
      size: valueSize,
      font: ctx.sansBold,
      color: C.navy,
    });
    // Sub
    ctx.page.drawText(tiles[i].sub, {
      x: tx,
      y: ty - tileH + 6,
      size: 7.5,
      font: ctx.sans,
      color: C.muted,
    });
  }
  ctx.y -= tileH * 2 + 12;

  hairline(ctx);

  // Two-column metadata table
  const metaRows: { label: string; value: string }[] = [
    { label: "Region", value: p.region },
    { label: "Agroclimatic zone", value: shorten(p.agroclimaticZone, 90) },
    { label: "State", value: stateName },
    { label: "District", value: p.district },
  ];
  drawTwoColTable(ctx, metaRows);

  ctx.y -= 6;
  hairline(ctx);

  // Top challenges preview — first 3 from the full list, so the reader
  // gets the gist before Exhibit 03 covers them in full.
  ctx.page.drawText("TOP CHALLENGES IDENTIFIED", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 20;
  const preview = p.keyChallenges.slice(0, 3);
  preview.forEach((c, i) => {
    const text = shorten(c, 130);
    const lines = wrap(text, ctx.sans, 10, CONTENT_W - 32);
    ensure(ctx, lines.length * 14 + 8);
    ctx.page.drawText(String(i + 1).padStart(2, "0"), {
      x: M.left,
      y: ctx.y - 11,
      size: 10,
      font: ctx.sansBold,
      color: C.teal,
    });
    for (let k = 0; k < lines.length; k++) {
      ctx.page.drawText(lines[k], {
        x: M.left + 24,
        y: ctx.y - 11 - k * 13,
        size: 10,
        font: ctx.sans,
        color: C.inkSoft,
      });
    }
    ctx.y -= lines.length * 13 + 6;
  });
  if (p.keyChallenges.length > 3) {
    ctx.y -= 2;
    ctx.page.drawText(
      `+${p.keyChallenges.length - 3} more · see Exhibit on Key challenges`,
      {
        x: M.left + 24,
        y: ctx.y - 9,
        size: 8.5,
        font: ctx.sans,
        color: C.muted,
      }
    );
  }
}

function drawTwoColTable(ctx: Ctx, rows: { label: string; value: string }[]) {
  const labelW = 130;
  const valueW = CONTENT_W - labelW - 12;
  rows.forEach((r, i) => {
    const valueLines = wrap(r.value, ctx.sans, 10, valueW);
    const rowH = Math.max(20, valueLines.length * 14 + 6);
    ensure(ctx, rowH);
    // Alt row band (very subtle)
    if (i % 2 === 1) {
      ctx.page.drawRectangle({
        x: M.left,
        y: ctx.y - rowH + 4,
        width: CONTENT_W,
        height: rowH,
        color: C.rowAlt,
      });
    }
    ctx.page.drawText(r.label.toUpperCase(), {
      x: M.left + 4,
      y: ctx.y - 12,
      size: 7.5,
      font: ctx.sansBold,
      color: C.muted,
    });
    for (let k = 0; k < valueLines.length; k++) {
      ctx.page.drawText(valueLines[k], {
        x: M.left + labelW,
        y: ctx.y - 12 - k * 14,
        size: 10,
        font: ctx.sans,
        color: C.ink,
      });
    }
    ctx.y -= rowH;
  });
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────
function drawContext(ctx: Ctx, p: LandscapeProfile, exhibit: string) {
  newPage(ctx, "Context");
  drawExhibitHeader(ctx, exhibit, "Landscape context", "Context");
  drawBody(ctx, p.bodyContext, { size: 10.5, lineHeight: 15.5, color: C.inkSoft, maxW: CONTENT_W * 0.92 });

  ctx.y -= 10;
  hairline(ctx);

  // Agroclimatic sub-heading
  ctx.page.drawText("AGROCLIMATIC ZONE", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 18;
  drawBody(ctx, p.agroclimaticZone, { size: 10.5, lineHeight: 15.5, color: C.inkSoft });

  ctx.y -= 14;
  hairline(ctx);

  // "What this implies" — two-column commentary block so the bottom of the
  // context page isn't empty. Pulls together what the landscape's geography
  // means for the design of the investment plan.
  ctx.page.drawText("WHAT THIS IMPLIES FOR THE PLAN", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 18;
  const implies = [
    {
      heading: "Rainfed-first design",
      body:
        "Irrigation expansion is constrained by geology and rainfall variability. The plan is built around rainwater retention, soil cover and crop choices matched to single-season cropping windows.",
    },
    {
      heading: "Multi-lever portfolio",
      body:
        "No single intervention closes the gap. Climate resilience, ecological adaptation and emissions mitigation run in parallel — each contributing to landscape outcomes rather than each fighting for share of voice.",
    },
  ];
  const implColW = (CONTENT_W - 20) / 2;
  const implTop = ctx.y;
  for (let i = 0; i < implies.length; i++) {
    const cx = M.left + i * (implColW + 20);
    ctx.page.drawRectangle({
      x: cx,
      y: implTop,
      width: 28,
      height: 1.4,
      color: C.teal,
    });
    ctx.page.drawText(implies[i].heading, {
      x: cx,
      y: implTop - 16,
      size: 11,
      font: ctx.sansBold,
      color: C.navy,
    });
    const lines = wrap(implies[i].body, ctx.sans, 10, implColW - 4);
    for (let k = 0; k < lines.length; k++) {
      ctx.page.drawText(lines[k], {
        x: cx,
        y: implTop - 32 - k * 14,
        size: 10,
        font: ctx.sans,
        color: C.inkSoft,
      });
    }
  }
  ctx.y = implTop - 120;
}

// ─── KEY CHALLENGES ──────────────────────────────────────────────────────
function drawChallenges(ctx: Ctx, p: LandscapeProfile, exhibit: string) {
  newPage(ctx, "Key challenges");
  drawExhibitHeader(ctx, exhibit, "Findings", "Key landscape challenges");
  drawBody(
    ctx,
    `${p.keyChallenges.length} systemic constraints identified across rainfall, terrain, livelihoods, market access and infrastructure.`,
    { size: 10, lineHeight: 14.5, color: C.inkSoft, maxW: CONTENT_W * 0.82 }
  );
  ctx.y -= 12;
  hairline(ctx);

  p.keyChallenges.forEach((c, i) => {
    const num = String(i + 1).padStart(2, "0");
    const lines = wrap(c, ctx.sans, 10.5, CONTENT_W - 56);
    const rowH = Math.max(28, lines.length * 15 + 12);
    ensure(ctx, rowH);
    // Numeric chip
    ctx.page.drawText(num, {
      x: M.left,
      y: ctx.y - 12,
      size: 16,
      font: ctx.sansBold,
      color: C.teal,
    });
    // Body
    for (let k = 0; k < lines.length; k++) {
      ctx.page.drawText(lines[k], {
        x: M.left + 38,
        y: ctx.y - 12 - k * 15,
        size: 10.5,
        font: ctx.sans,
        color: C.ink,
      });
    }
    // Trailing hairline
    ctx.page.drawRectangle({
      x: M.left + 38,
      y: ctx.y - rowH + 4,
      width: CONTENT_W - 38,
      height: 0.3,
      color: C.hairline,
    });
    ctx.y -= rowH;
  });
}

// ─── FINANCE ─────────────────────────────────────────────────────────────
function drawFinance(ctx: Ctx, p: LandscapeProfile, budget: BudgetSummary, exhibit: string) {
  newPage(ctx, "Financials");
  drawExhibitHeader(ctx, exhibit, "Financials", "Investment plan");

  // Headline + caption
  ctx.page.drawText("TOTAL PLAN SIZE  ·  7-YEAR HORIZON", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.muted,
  });
  ctx.y -= 20;
  ctx.page.drawText(inrShort(budget.totalCostInr), {
    x: M.left,
    y: ctx.y - 32,
    size: 36,
    font: ctx.sansBold,
    color: C.teal,
  });
  ctx.y -= 48;

  // Headline tiles — 4 columns, with bottom hairline only
  const tileW = CONTENT_W / 4;
  const tiles = [
    {
      label: "EXTERNAL INVESTMENT",
      value: inrShort(budget.investmentRequiredInr),
      sub: `${pctStr(budget.investmentRequiredInr, budget.totalCostInr)} of plan`,
    },
    {
      label: "GOVT. CONVERGENCE",
      value: inrShort(budget.govtInr),
      sub: `${pctStr(budget.govtInr, budget.totalCostInr)} of plan`,
    },
    {
      label: "COMMUNITY CONTRIBUTION",
      value: inrShort(budget.communityInr),
      sub: `${pctStr(budget.communityInr, budget.totalCostInr)} of plan`,
    },
    {
      label: "INNOVATIVE FINANCE",
      value: inrShort(budget.returnableGrantInr + budget.outcomeFinanceInr),
      sub: "Returnable + outcome",
    },
  ];
  const tileY = ctx.y;
  ctx.page.drawRectangle({ x: M.left, y: tileY, width: CONTENT_W, height: 0.6, color: C.hairline });
  for (let i = 0; i < tiles.length; i++) {
    const tx = M.left + i * tileW;
    ctx.page.drawText(tiles[i].label, {
      x: tx,
      y: tileY - 12,
      size: 7,
      font: ctx.sansBold,
      color: C.muted,
    });
    ctx.page.drawText(tiles[i].value, {
      x: tx,
      y: tileY - 30,
      size: 16,
      font: ctx.sansBold,
      color: C.navy,
    });
    ctx.page.drawText(tiles[i].sub, {
      x: tx,
      y: tileY - 46,
      size: 7.5,
      font: ctx.sans,
      color: C.muted,
    });
  }
  ctx.page.drawRectangle({ x: M.left, y: tileY - 58, width: CONTENT_W, height: 0.4, color: C.hairline });
  ctx.y = tileY - 72;

  // FUNDING MIX with horizontal bars
  ctx.page.drawText("FUNDING MIX", {
    x: M.left,
    y: ctx.y - 8,
    size: 8,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 20;

  const sources = [
    { label: "Government", value: budget.govtInr },
    { label: "Community", value: budget.communityInr },
    { label: "Grants", value: budget.grantsInr },
    { label: "Returnable grant", value: budget.returnableGrantInr },
    { label: "Outcome-based finance", value: budget.outcomeFinanceInr },
    { label: "Debt", value: budget.debtInr },
  ].filter((s) => s.value > 0);
  const sumSources = sources.reduce((acc, s) => acc + s.value, 0);
  const maxBarW = CONTENT_W * 0.42;
  const labelColW = 140;
  const barX = M.left + labelColW;
  const valueColX = barX + maxBarW + 12;

  sources.forEach((s) => {
    ensure(ctx, 20);
    const proportion = s.value / sumSources;
    const barW = Math.max(1, proportion * maxBarW);
    // Label
    ctx.page.drawText(s.label, {
      x: M.left,
      y: ctx.y - 11,
      size: 10,
      font: ctx.sans,
      color: C.ink,
    });
    // Bar background
    ctx.page.drawRectangle({
      x: barX,
      y: ctx.y - 12,
      width: maxBarW,
      height: 6,
      color: C.tealSoft,
    });
    // Bar fill
    ctx.page.drawRectangle({
      x: barX,
      y: ctx.y - 12,
      width: barW,
      height: 6,
      color: C.teal,
    });
    // Pct
    const pctText = pctStr(s.value, sumSources);
    ctx.page.drawText(pctText, {
      x: valueColX,
      y: ctx.y - 11,
      size: 9,
      font: ctx.sansBold,
      color: C.teal,
    });
    // Value
    const valueText = inrShort(s.value);
    const valueW = ctx.sansBold.widthOfTextAtSize(valueText, 10);
    ctx.page.drawText(valueText, {
      x: PAGE.w - M.right - valueW,
      y: ctx.y - 11,
      size: 10,
      font: ctx.sansBold,
      color: C.navy,
    });
    ctx.y -= 18;
  });

  ctx.y -= 4;
  hairline(ctx);

  // TOP SPEND BY CATEGORY
  ctx.page.drawText("TOP SPEND BY CATEGORY", {
    x: M.left,
    y: ctx.y - 8,
    size: 8,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 20;

  const topCats = budget.byCategory.filter((c) => c.total > 0).slice(0, 5);
  const maxCatTotal = topCats[0]?.total ?? 1;

  // Category column ends before the bar column to avoid overlap.
  // labelColW = 140; numText column is 22; so category text gets the
  // remaining (labelColW - 22 - 8) = 110pt and is truncated with ellipsis
  // if longer.
  const catTextW = labelColW - 30;
  topCats.forEach((c, i) => {
    ensure(ctx, 22);
    const numText = String(i + 1).padStart(2, "0");
    ctx.page.drawText(numText, {
      x: M.left,
      y: ctx.y - 11,
      size: 9,
      font: ctx.mono,
      color: C.amber,
    });
    // Category name (truncated to label column width)
    const truncated = truncateToWidth(c.category, ctx.sans, 10, catTextW);
    ctx.page.drawText(truncated, {
      x: M.left + 22,
      y: ctx.y - 11,
      size: 10,
      font: ctx.sans,
      color: C.ink,
    });
    // Bar
    const proportion = c.total / maxCatTotal;
    const barW = Math.max(1, proportion * maxBarW);
    ctx.page.drawRectangle({
      x: barX,
      y: ctx.y - 12,
      width: maxBarW,
      height: 6,
      color: C.tealSoft,
    });
    ctx.page.drawRectangle({
      x: barX,
      y: ctx.y - 12,
      width: barW,
      height: 6,
      color: C.teal,
    });
    // Value
    const valueText = inrShort(c.total);
    const valueW = ctx.sansBold.widthOfTextAtSize(valueText, 10);
    ctx.page.drawText(valueText, {
      x: PAGE.w - M.right - valueW,
      y: ctx.y - 11,
      size: 10,
      font: ctx.sansBold,
      color: C.navy,
    });
    ctx.y -= 20;
  });

  ctx.y -= 6;
  drawBody(
    ctx,
    `Source: ${p.name} Landscape Investment Plan. Line-level detail at cat-platform-fawn.vercel.app/landscape/${p.slug}/budget.`,
    { size: 7.5, lineHeight: 11, color: C.muted }
  );
}

// ─── IMPLEMENTATION SNAPSHOT (replaces field_record; text only) ──────────
function drawImplementationSnapshot(ctx: Ctx, p: LandscapeProfile, exhibit: string) {
  newPage(ctx, "Implementation snapshot");
  drawExhibitHeader(ctx, exhibit, "Pathway", "Implementation snapshot");
  drawBody(
    ctx,
    "How the landscape moves from plan to ground. The pathway is built around three levers — climate resilience, ecological adaptation, and mitigation — applied through the entry-points below.",
    { size: 10, lineHeight: 14.5, color: C.inkSoft, maxW: CONTENT_W * 0.82 }
  );
  ctx.y -= 12;
  hairline(ctx);

  // Three-column "levers" panel
  const levers = [
    {
      label: "CLIMATE RESILIENCE",
      title: "Build resilience to shocks",
      body:
        "Rainwater retention structures, soil cover and crop diversification across rainfed plots to dampen the rainfall variability that drives single-season failure.",
    },
    {
      label: "ECOLOGICAL ADAPTATION",
      title: "Adapt to landscape ecology",
      body:
        "Crop and livelihood choices matched to the agroclimatic zone. Seeds, varieties and livestock systems are selected for the soil and rainfall profile.",
    },
    {
      label: "MITIGATION",
      title: "Mitigate emissions, restore land",
      body:
        "Tree cover, soil organic carbon, and reduced dependence on synthetic inputs across landscape commons and private parcels.",
    },
  ];
  const colW = (CONTENT_W - 16) / 3;
  const colTop = ctx.y;
  for (let i = 0; i < 3; i++) {
    const cx = M.left + i * (colW + 8);
    ctx.page.drawRectangle({
      x: cx,
      y: colTop,
      width: colW,
      height: 0.8,
      color: C.teal,
    });
    ctx.page.drawText(levers[i].label, {
      x: cx,
      y: colTop - 14,
      size: 7.5,
      font: ctx.sansBold,
      color: C.amber,
    });
    ctx.page.drawText(levers[i].title, {
      x: cx,
      y: colTop - 30,
      size: 11,
      font: ctx.sansBold,
      color: C.navy,
    });
    const bodyLines = wrap(levers[i].body, ctx.sans, 9.5, colW - 6);
    for (let k = 0; k < bodyLines.length; k++) {
      ctx.page.drawText(bodyLines[k], {
        x: cx,
        y: colTop - 48 - k * 13,
        size: 9.5,
        font: ctx.sans,
        color: C.inkSoft,
      });
    }
  }
  ctx.y = colTop - 140;

  hairline(ctx);

  // Entry-points list — concrete activities that operationalise the levers.
  // Lifts the bottom half of the page from empty to useful.
  ctx.page.drawText("ENTRY POINTS", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 20;
  const entryPoints = [
    {
      label: "NRM",
      title: "Natural resource management",
      body: "Soil and water conservation structures, common-land restoration, watershed treatment.",
    },
    {
      label: "AGRI",
      title: "Agriculture & horticulture",
      body: "Crop diversification, climate-resilient varieties, low-external-input cultivation.",
    },
    {
      label: "LIVESTOCK",
      title: "Livestock & fisheries",
      body: "Breed improvement, fodder development, disease management, allied livelihoods.",
    },
    {
      label: "MARKETS",
      title: "Markets & value chains",
      body: "Farmer producer organisations, aggregation infrastructure, post-harvest processing.",
    },
    {
      label: "FINANCE",
      title: "Finance & convergence",
      body: "Government scheme convergence, returnable-grant deployment, outcome-based finance pilots.",
    },
  ];
  entryPoints.forEach((ep) => {
    ensure(ctx, 24);
    ctx.page.drawText(ep.label, {
      x: M.left,
      y: ctx.y - 11,
      size: 7.5,
      font: ctx.sansBold,
      color: C.amber,
    });
    ctx.page.drawText(ep.title, {
      x: M.left + 78,
      y: ctx.y - 11,
      size: 10.5,
      font: ctx.sansBold,
      color: C.navy,
    });
    const bodyText = shorten(ep.body, 110);
    ctx.page.drawText(bodyText, {
      x: M.left + 78,
      y: ctx.y - 11 - 14,
      size: 9.5,
      font: ctx.sans,
      color: C.inkSoft,
    });
    // trailing hairline
    ctx.page.drawRectangle({
      x: M.left + 78,
      y: ctx.y - 34,
      width: CONTENT_W - 78,
      height: 0.3,
      color: C.hairline,
    });
    ctx.y -= 38;
  });
}

// ─── COLOPHON (last page) ────────────────────────────────────────────────
function drawColophon(ctx: Ctx, p: LandscapeProfile, exhibit: string) {
  newPage(ctx, "About this brief");
  drawExhibitHeader(ctx, exhibit, "Editorial note", "About this brief");

  drawBody(
    ctx,
    "This brief is generated from the Transformation Hub, the public, curated dashboard of credible food-systems work in India by the Consortium for Agroecological Transformations. Every entry is read by a CAT editor before it goes live. Limitations sit beside achievements.",
    { size: 10, lineHeight: 14.5, color: C.inkSoft, maxW: CONTENT_W * 0.88 }
  );
  ctx.y -= 6;
  drawBody(
    ctx,
    "Programmes are read, not pitched. The bar is honesty, not affiliation. Where investment-plan finance is shown, the underlying line-level data is queryable in the budget explorer at the URL on this page.",
    { size: 10, lineHeight: 14.5, color: C.inkSoft, maxW: CONTENT_W * 0.88 }
  );
  ctx.y -= 14;
  hairline(ctx);

  // How to cite
  ctx.page.drawText("HOW TO CITE THIS BRIEF", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 20;
  const year = new Date().getFullYear();
  const citation = `Consortium for Agroecological Transformations. (${year}). ${p.name} Landscape Investment Brief. Transformation Hub. cat-platform-fawn.vercel.app/landscape/${p.slug}`;
  drawBody(ctx, citation, { size: 10, lineHeight: 14, color: C.ink });
  ctx.y -= 8;

  hairline(ctx);

  // Imprint block
  drawCatLockup(ctx, M.left, ctx.y - 30, { symbolHeight: 24 });
  ctx.page.drawText("CONSORTIUM FOR AGROECOLOGICAL TRANSFORMATIONS", {
    x: M.left + 110,
    y: ctx.y - 16,
    size: 8,
    font: ctx.sansBold,
    color: C.navy,
  });
  ctx.page.drawText("Transformation Hub  ·  cat-platform-fawn.vercel.app", {
    x: M.left + 110,
    y: ctx.y - 28,
    size: 8,
    font: ctx.sans,
    color: C.muted,
  });
  ctx.y -= 60;

  hairline(ctx);

  // Methodology + revision panel — three small columns at the bottom so the
  // page closes with useful provenance rather than empty space.
  ctx.page.drawText("METHODOLOGY", {
    x: M.left,
    y: ctx.y - 8,
    size: 7.5,
    font: ctx.sansBold,
    color: C.amber,
  });
  ctx.y -= 18;
  const methodCols = [
    {
      label: "DATA SOURCE",
      body:
        "Landscape profile content drawn from the published CAT landscape profile dossier; investment plan figures from the underlying ingested investment plan.",
    },
    {
      label: "EDITORIAL CHECK",
      body:
        "Every Hub entry is read by a CAT editor before it goes live. Drafts surfaced by discovery agents are reviewed against public sources before promotion.",
    },
    {
      label: "REVISION",
      body:
        "Generated live at the time of download. The canonical record is the Hub page itself; the brief is its print-friendly snapshot.",
    },
  ];
  const methodColW = (CONTENT_W - 24) / 3;
  const methodTop = ctx.y;
  for (let i = 0; i < methodCols.length; i++) {
    const cx = M.left + i * (methodColW + 12);
    ctx.page.drawRectangle({
      x: cx,
      y: methodTop,
      width: 24,
      height: 0.8,
      color: C.teal,
    });
    ctx.page.drawText(methodCols[i].label, {
      x: cx,
      y: methodTop - 14,
      size: 7.5,
      font: ctx.sansBold,
      color: C.muted,
    });
    const lines = wrap(methodCols[i].body, ctx.sans, 9, methodColW - 4);
    for (let k = 0; k < Math.min(lines.length, 6); k++) {
      ctx.page.drawText(lines[k], {
        x: cx,
        y: methodTop - 28 - k * 12,
        size: 9,
        font: ctx.sans,
        color: C.inkSoft,
      });
    }
  }
}

function shorten(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "...";
}

function truncateToWidth(s: string, font: PDFFont, size: number, maxW: number): string {
  const text = asciify(s);
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  const ellipsis = "...";
  const ellipsisW = font.widthOfTextAtSize(ellipsis, size);
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (font.widthOfTextAtSize(text.slice(0, mid), size) + ellipsisW <= maxW) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo).trimEnd() + ellipsis;
}

// ─── Public API ──────────────────────────────────────────────────────────
export type BriefSection =
  | "cover"
  | "at_a_glance"
  | "context"
  | "challenges"
  | "finance"
  | "field_record"
  | "colophon";

export const ALL_BRIEF_SECTIONS: BriefSection[] = [
  "cover",
  "at_a_glance",
  "context",
  "challenges",
  "finance",
  "field_record",
  "colophon",
];

export type BriefOpts = {
  budget?: BudgetSummary;
  sections?: BriefSection[];
};

export async function buildLandscapeBriefPdf(
  p: LandscapeProfile,
  stateName: string,
  opts: BriefOpts = {}
): Promise<Uint8Array> {
  const want = (s: BriefSection): boolean =>
    !opts.sections || opts.sections.includes(s);
  const doc = await PDFDocument.create();
  doc.setTitle(`${p.name} · Landscape Investment Brief`);
  doc.setAuthor("Consortium for Agroecological Transformations");
  doc.setSubject(`Landscape investment brief for ${p.name}`);
  doc.setKeywords([
    "CAT",
    "Transformation Hub",
    "landscape",
    "food systems",
    p.name,
    p.district,
  ]);
  doc.setProducer("Transformation Hub");
  doc.setCreator("Transformation Hub");

  // Standard WinAnsi fonts only. Helvetica family + Courier for tiny mono
  // captions / counters. Times Roman has been removed — the document is
  // sans-throughout to match consultancy convention.
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  const coverPage = doc.addPage([PAGE.w, PAGE.h]);
  wrapPageDrawText(coverPage);
  const ctx: Ctx = {
    doc,
    page: coverPage,
    y: 0,
    pageTitle: "Cover",
    pageNumber: 1,
    brief: { landscapeName: p.name, district: p.district },
    sans,
    sansBold,
    mono,
  };

  // Cover
  if (want("cover")) drawCover(ctx, p, stateName);

  // Compute exhibit numbering on the fly (only exhibits we'll render)
  const planned: { key: BriefSection; title: string }[] = [];
  if (want("at_a_glance")) planned.push({ key: "at_a_glance", title: "At a glance" });
  if (want("context")) planned.push({ key: "context", title: "Context" });
  if (want("challenges")) planned.push({ key: "challenges", title: "Key challenges" });
  if (want("finance") && opts.budget && opts.budget.totalCostInr > 0) {
    planned.push({ key: "finance", title: "Investment plan" });
  }
  if (want("field_record")) {
    planned.push({ key: "field_record", title: "Implementation snapshot" });
  }
  if (want("colophon")) planned.push({ key: "colophon", title: "About this brief" });

  // Contents page (only when there are 3+ exhibits to navigate)
  if (planned.length >= 3) {
    drawContents(
      ctx,
      planned.map((p, i) => ({
        exhibit: String(i + 1).padStart(2, "0"),
        title: p.title,
      }))
    );
  }

  // Render each requested exhibit with sequential numbering
  for (let i = 0; i < planned.length; i++) {
    const exhibit = String(i + 1).padStart(2, "0");
    switch (planned[i].key) {
      case "at_a_glance":
        drawAtAGlance(ctx, p, stateName, exhibit);
        break;
      case "context":
        drawContext(ctx, p, exhibit);
        break;
      case "challenges":
        drawChallenges(ctx, p, exhibit);
        break;
      case "finance":
        if (opts.budget) drawFinance(ctx, p, opts.budget, exhibit);
        break;
      case "field_record":
        drawImplementationSnapshot(ctx, p, exhibit);
        break;
      case "colophon":
        drawColophon(ctx, p, exhibit);
        break;
    }
  }

  // Footers (page n / N + citation), applied after page count is known
  const citationUrl = `cat-platform-fawn.vercel.app/landscape/${p.slug}`;
  drawFooters(ctx, citationUrl);

  return await doc.save();
}

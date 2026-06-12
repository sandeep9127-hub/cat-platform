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
import type { BudgetSummary, LandscapeInsights } from "@/lib/db/landscape-kb";

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
  cream: rgb(0.98, 0.976, 0.961), // CAT paper #faf9f5 — reversed-band text
  ink: rgb(0.10, 0.13, 0.16),
  inkSoft: rgb(0.30, 0.34, 0.38),
  muted: rgb(0.52, 0.56, 0.60),
  navy: rgb(0.16, 0.20, 0.30), // legacy CAT wordmark navy (retained, unused)
  deepTeal: rgb(0.2, 0.294, 0.29), // CAT deep teal #334B4A — headings, numbers
  teal: rgb(0.18, 0.459, 0.451), // CAT symbol teal #2E7573
  tealSoft: rgb(0.78, 0.86, 0.85), // 25% teal — bar background
  periwinkle: rgb(0.369, 0.412, 0.565), // CAT periwinkle #5E6990
  amber: rgb(0.776, 0.549, 0.180),
  amberBright: rgb(0.973, 0.792, 0.486), // CAT amber #F8CA7C — on dark bands
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
// Pixel-perfect vector reconstruction. These six SVG paths are extracted
// directly from public/images/cat-logo-full.svg — the same asset the web
// header uses — so the PDF mark and the site mark render from identical
// geometry. Native SVG viewBox is 84 × 83 (the symbol portion).
//
// Path 0,1 — periwinkle (#646D96) leaf wings rising from the base.
// Path 2-5 — nested teal (#2D7574) arches stacked outward to inward.
const CAT_SYMBOL_PATHS: { d: string; color: ReturnType<typeof rgb> }[] = [
  {
    color: C.periwinkle,
    d: "M42.0731 82.9996C18.8713 82.9996 0 64.3798 0 41.4996C0 40.1814 0.0688313 38.8348 0.200758 37.4826L0.321213 36.2266H1.60033C27.8021 36.3171 50.8491 53.794 57.6577 78.7223L57.9904 79.9388L56.7916 80.3801C52.0824 82.117 47.1265 82.9996 42.0731 82.9996ZM2.89092 39.0215C2.83356 39.8532 2.81061 40.6849 2.81061 41.4996C2.81061 62.8522 20.4257 80.2273 42.0731 80.2273C46.3579 80.2273 50.5623 79.5484 54.589 78.2131C47.8263 55.548 26.8557 39.6552 2.89092 39.0215Z",
  },
  {
    color: C.periwinkle,
    d: "M42.0731 82.9996C37.0198 82.9996 32.0639 82.117 27.3547 80.3801L26.1559 79.9388L26.4886 78.7223C33.2914 53.7884 56.3442 36.3171 82.546 36.2266H83.8251L83.9455 37.4826C84.0774 38.8405 84.1463 40.1927 84.1463 41.4996C84.1463 64.3798 65.275 82.9996 42.0731 82.9996ZM29.5516 78.2131C33.5839 79.554 37.7884 80.2273 42.0731 80.2273C63.7206 80.2273 81.3357 62.8522 81.3357 41.4996C81.3357 40.6906 81.307 39.8589 81.2554 39.0215C57.2906 39.6552 36.32 55.548 29.5573 78.2131H29.5516Z",
  },
  {
    color: C.teal,
    d: "M4.28473 31.0387C9.01688 14.3652 24.4236 2.77232 42.0731 2.77232C59.7226 2.77232 74.8139 14.1502 79.7124 30.5295C80.6302 30.3824 81.5651 30.241 82.523 30.1165C77.3951 12.3623 60.8526 0 42.0731 0C23.2936 0 6.38409 12.6056 1.45691 30.6993C2.21979 30.7728 3.17196 30.886 4.28473 31.0444V31.0387Z",
  },
  {
    color: C.teal,
    d: "M42.01 26.9307C35.0351 26.9307 29.1156 31.423 27.0392 37.6296C27.8881 38.0086 28.737 38.416 29.5974 38.8403C31.192 33.5616 36.1479 29.703 42.01 29.703C47.8721 29.703 52.5297 33.341 54.2677 38.3821C55.0765 37.9804 55.9197 37.5787 56.8087 37.1826C54.6004 31.2136 48.8071 26.9363 42.01 26.9363V26.9307Z",
  },
  {
    color: C.teal,
    d: "M42.01 17.624C31.0716 17.624 21.7851 24.6397 18.4755 34.3428C19.3416 34.6257 20.2307 34.9256 21.1255 35.2481C24.0508 26.6312 32.2991 20.3963 42.0043 20.3963C51.7095 20.3963 59.6653 26.4219 62.7225 34.8124C63.5772 34.5069 64.4663 34.2071 65.3783 33.9185C61.9424 24.4417 52.7764 17.6297 42.0043 17.6297L42.01 17.624Z",
  },
  {
    color: C.teal,
    d: "M42.0101 8.54297C26.8729 8.54297 14.0416 18.4441 9.80847 32.0229C10.6861 32.2096 11.5981 32.4189 12.5503 32.6565C16.4851 20.3055 28.2036 11.3153 42.0043 11.3153C55.805 11.3153 67.2482 20.0962 71.315 32.2322C72.2098 32.0115 73.1275 31.7965 74.0625 31.5929C69.6975 18.2348 56.9809 8.54297 42.0043 8.54297H42.0101Z",
  },
];

const CAT_SYMBOL_VIEWBOX = { w: 84.15, h: 83 };

/**
 * Draws the official CAT symbol at the requested PIXEL height, with its
 * top-left corner at (x, y). pdf-lib's drawSvgPath flips the y-axis so
 * SVG y=0 (visual top) corresponds to the `y` parameter as the TOP of
 * the rendered symbol in PDF coordinates.
 */
function drawCatSymbol(page: PDFPage, x: number, y: number, height: number) {
  const scale = height / CAT_SYMBOL_VIEWBOX.h;
  // Symbol natural top is SVG y=0. Pass y_top = y + height so the path's
  // y=0 sits at PDF y_top and y=83 sits at PDF y_top - 83*scale = y.
  const yTop = y + height;
  for (const p of CAT_SYMBOL_PATHS) {
    page.drawSvgPath(p.d, {
      x,
      y: yTop,
      color: p.color,
      scale,
    });
  }
}

function drawCatLockup(
  ctx: Ctx,
  x: number,
  y: number,
  opts: { symbolHeight?: number; wordmark?: boolean; compact?: boolean } = {}
) {
  const sh = opts.symbolHeight ?? 28;
  drawCatSymbol(ctx.page, x, y, sh);
  if (opts.wordmark === false) return;

  const tx = x + sh + 10;
  if (opts.compact) {
    // Two-line compact lockup for cover + colophon. Larger, more legible
    // than the previous three-line stack.
    const big = 10.5;
    const small = 8;
    ctx.page.drawText("Consortium for Agroecological", {
      x: tx,
      y: y + sh - big - 1,
      size: big,
      font: ctx.sansBold,
      color: C.deepTeal,
    });
    ctx.page.drawText("Transformations", {
      x: tx,
      y: y + sh - big - 1 - (big * 1.2),
      size: big,
      font: ctx.sansBold,
      color: C.deepTeal,
    });
    // Acronym tag
    ctx.page.drawText("CAT  ·  India", {
      x: tx,
      y: y + 2,
      size: small,
      font: ctx.mono,
      color: C.amber,
    });
    return;
  }

  // Default: three-line lockup, but at a readable size
  const labelSize = 9;
  const lineH = labelSize * 1.20;
  const lines = ["Consortium for", "Agroecological", "Transformations"];
  for (let i = 0; i < lines.length; i++) {
    ctx.page.drawText(lines[i], {
      x: tx,
      y: y + sh - labelSize - 2 - i * lineH,
      size: labelSize,
      font: ctx.sansBold,
      color: C.deepTeal,
    });
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
  // Symbol-only header mark — at 16pt the brand symbol now reads as a
  // recognizable badge thanks to the filled crescents. Wordmark is
  // omitted because it's unreadable at this size; the acronym carries
  // brand identity instead.
  drawCatSymbol(ctx.page, M.left, PAGE.h - M.top + 2, 16);
  ctx.page.drawText("CAT", {
    x: M.left + 22,
    y: PAGE.h - M.top + 10,
    size: 9,
    font: ctx.sansBold,
    color: C.deepTeal,
  });
  ctx.page.drawText("TRANSFORMATION HUB", {
    x: M.left + 22,
    y: PAGE.h - M.top + 2,
    size: 6.5,
    font: ctx.sansBold,
    color: C.muted,
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
    color: C.deepTeal,
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

  // CAT lockup, top-left — full compact two-line wordmark
  drawCatLockup(ctx, M.left, PAGE.h - M.top - 36, {
    symbolHeight: 36,
    compact: true,
  });

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
  // CAT tri-colour signature rule (teal · periwinkle · amber) — brand mark
  {
    const segs = [C.teal, C.periwinkle, C.amber];
    const segW = 20;
    for (let s = 0; s < segs.length; s++) {
      ctx.page.drawRectangle({
        x: M.left + 70 + s * (segW + 4),
        y: titleY + 83,
        width: segW,
        height: 2.4,
        color: segs[s],
      });
    }
  }
  // Big landscape name
  const nameSize = p.name.length > 16 ? 44 : 56;
  ctx.page.drawText(p.name, {
    x: M.left,
    y: titleY,
    size: nameSize,
    font: ctx.sansBold,
    color: C.deepTeal,
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
      color: C.deepTeal,
    });
  }
  ctx.page.drawRectangle({
    x: M.left,
    y: metricsY - 24,
    width: CONTENT_W,
    height: 0.4,
    color: C.hairline,
  });

  // Bottom band — a solid deep-teal CAT panel, full-bleed, with an amber hairline
  // on its top edge. Reads as a branded, presentation-grade document anchor.
  const bandH = 66;
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: bandH, color: C.deepTeal });
  ctx.page.drawRectangle({ x: 0, y: bandH - 2, width: PAGE.w, height: 2, color: C.amber });
  const textY = bandH - 26;
  ctx.page.drawText("CONSORTIUM FOR AGROECOLOGICAL TRANSFORMATIONS", {
    x: M.left,
    y: textY,
    size: 8,
    font: ctx.sansBold,
    color: C.cream,
  });
  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  ctx.page.drawText(`Landscape Investment Brief  ·  Generated ${now}`, {
    x: M.left,
    y: textY - 13,
    size: 8,
    font: ctx.sans,
    color: C.tealSoft,
  });
  const urlText = `hub.agroecologyindia.org/landscape/${p.slug}`;
  const urlW = ctx.mono.widthOfTextAtSize(urlText, 8);
  ctx.page.drawText(urlText, {
    x: PAGE.w - M.right - urlW,
    y: textY,
    size: 8,
    font: ctx.mono,
    color: C.amberBright,
  });
}

// ─── CONTENTS (Page 2) ───────────────────────────────────────────────────
// Start a chapter in the flowing report. Break to a fresh page only when the
// current one can't hold the chapter header plus its opening block; otherwise
// add air + a divider and keep going, so pages fill densely instead of one
// half-empty page per chapter.
function sectionBreak(ctx: Ctx, title: string, minRoom = 180) {
  if (ctx.pageNumber <= 1 || ctx.y - minRoom < SAFE_BOTTOM) {
    newPage(ctx, title);
    return;
  }
  ctx.pageTitle = title;
  ctx.y -= 32;
  ctx.page.drawRectangle({ x: M.left, y: ctx.y, width: CONTENT_W, height: 0.4, color: C.hairline });
  ctx.y -= 24;
}

// ─── CHAPTER 1 — WHY THIS LANDSCAPE IS SPECIAL ───────────────────────────
// Folds the old "at a glance", "context" and "challenges" exhibits into one
// opening chapter: the hook, the headline facts, the deeper context, the
// setting, and what the landscape is up against.
function drawWhySpecial(ctx: Ctx, p: LandscapeProfile, stateName: string, exhibit: string) {
  sectionBreak(ctx, "Why this landscape is special", 240);
  drawExhibitHeader(ctx, exhibit, "The landscape", `Why ${p.name} matters`);

  // The hook — gloss, set larger.
  drawBody(ctx, p.gloss, { size: 12, lineHeight: 17, color: C.ink, maxW: CONTENT_W * 0.86 });
  ctx.y -= 10;
  hairline(ctx);

  // Headline facts — four tiles.
  const tileW = CONTENT_W / 4;
  const facts = [
    { label: "POPULATION", value: p.population },
    { label: "HOUSEHOLDS", value: p.households },
    { label: "VILLAGES", value: p.villages },
    { label: "AREA", value: p.area },
  ];
  const ty = ctx.y;
  ctx.page.drawRectangle({ x: M.left, y: ty, width: CONTENT_W, height: 0.6, color: C.hairline });
  for (let i = 0; i < facts.length; i++) {
    const tx = M.left + i * tileW;
    ctx.page.drawText(facts[i].label, { x: tx, y: ty - 12, size: 7, font: ctx.sansBold, color: C.muted });
    const v = facts[i].value;
    const vs = v.length > 9 ? 18 : 22;
    ctx.page.drawText(v, { x: tx, y: ty - 16 - vs, size: vs, font: ctx.sansBold, color: C.deepTeal });
  }
  ctx.y = ty - 64;
  hairline(ctx);

  // The deeper why — body context.
  drawBody(ctx, p.bodyContext, { size: 10.5, lineHeight: 15.5, color: C.inkSoft, maxW: CONTENT_W * 0.92 });
  ctx.y -= 10;
  hairline(ctx);

  // Setting — region / agroclimatic zone / admin.
  drawTwoColTable(ctx, [
    { label: "Region", value: p.region },
    { label: "Agroclimatic zone", value: shorten(p.agroclimaticZone, 160) },
    { label: "State", value: stateName },
    { label: "District", value: p.district },
  ]);
  ctx.y -= 8;
  hairline(ctx);

  // What it is up against — the key challenges, folded in.
  ensure(ctx, 40);
  ctx.page.drawText("WHAT IT IS UP AGAINST", { x: M.left, y: ctx.y - 8, size: 7.5, font: ctx.sansBold, color: C.amber });
  ctx.y -= 20;
  p.keyChallenges.forEach((c, i) => {
    const lines = wrap(c, ctx.sans, 10, CONTENT_W - 30);
    ensure(ctx, lines.length * 13 + 10);
    ctx.page.drawText(String(i + 1).padStart(2, "0"), { x: M.left, y: ctx.y - 11, size: 10, font: ctx.sansBold, color: C.teal });
    for (let k = 0; k < lines.length; k++) {
      ctx.page.drawText(lines[k], { x: M.left + 24, y: ctx.y - 11 - k * 13, size: 10, font: ctx.sans, color: C.inkSoft });
    }
    ctx.y -= lines.length * 13 + 8;
  });
}

function drawTwoColTable(ctx: Ctx, rows: { label: string; value: string }[]) {
  const labelW = 178;
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
    // Truncate the label so long category names never collide with the value.
    ctx.page.drawText(truncateToWidth(r.label.toUpperCase(), ctx.sansBold, 7.5, labelW - 14), {
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

// ─── CHAPTER 2 — SUMMARY OF INTERVENTIONS ────────────────────────────────
// What the plan actually does, from the costed line items: delivery packages
// sized by share of the programme, then the intervention categories.
function drawInterventions(ctx: Ctx, p: LandscapeProfile, ins: LandscapeInsights, exhibit: string) {
  sectionBreak(ctx, "Summary of interventions", 200);
  drawExhibitHeader(ctx, exhibit, "The plan", "Summary of interventions");

  const pkgs = ins.byPackage.filter((x) => x.total > 0);
  const cats = ins.byCategory.filter((x) => x.total > 0);
  drawBody(
    ctx,
    `The plan organises ${ins.totals.lineCount} costed interventions into ${pkgs.length} delivery package${pkgs.length === 1 ? "" : "s"} across ${cats.length} intervention categor${cats.length === 1 ? "y" : "ies"}. Each package below is sized by its share of the total programme.`,
    { size: 10.5, lineHeight: 15.5, color: C.inkSoft, maxW: CONTENT_W * 0.9 }
  );
  ctx.y -= 12;
  hairline(ctx);

  // Delivery packages as horizontal share bars.
  ctx.page.drawText("DELIVERY PACKAGES BY SHARE OF PLAN", { x: M.left, y: ctx.y - 8, size: 8, font: ctx.sansBold, color: C.amber });
  ctx.y -= 22;
  const maxPkg = Math.max(...pkgs.map((x) => x.total), 1);
  const labelColW = 168;
  const maxBarW = CONTENT_W - labelColW - 78;
  const barX = M.left + labelColW;
  pkgs.slice(0, 10).forEach((pk) => {
    ensure(ctx, 22);
    const name = truncateToWidth(pk.package, ctx.sans, 9.5, labelColW - 8);
    ctx.page.drawText(name, { x: M.left, y: ctx.y - 10, size: 9.5, font: ctx.sans, color: C.ink });
    const w = (pk.total / maxPkg) * maxBarW;
    ctx.page.drawRectangle({ x: barX, y: ctx.y - 11, width: maxBarW, height: 5, color: C.tealSoft });
    ctx.page.drawRectangle({ x: barX, y: ctx.y - 11, width: Math.max(1, w), height: 5, color: C.teal });
    ctx.page.drawText(`${inrShort(pk.total)} · ${pctStr(pk.total, ins.totals.total)}`, {
      x: barX + maxBarW + 8, y: ctx.y - 10, size: 8.5, font: ctx.sansBold, color: C.deepTeal,
    });
    ctx.y -= 20;
  });

  ctx.y -= 6;
  hairline(ctx);

  // Intervention categories — what each covers, with line counts.
  ctx.page.drawText("BY INTERVENTION CATEGORY", { x: M.left, y: ctx.y - 8, size: 8, font: ctx.sansBold, color: C.amber });
  ctx.y -= 18;
  drawTwoColTable(
    ctx,
    cats.slice(0, 8).map((c) => ({
      label: c.category,
      value: `${inrShort(c.total)}  ·  ${pctStr(c.total, ins.totals.total)} of plan  ·  ${c.lines} line${c.lines === 1 ? "" : "s"}`,
    }))
  );
}

// ─── FINANCE ─────────────────────────────────────────────────────────────
function drawCosting(ctx: Ctx, p: LandscapeProfile, budget: BudgetSummary, exhibit: string) {
  sectionBreak(ctx, "Costing", 250);
  drawExhibitHeader(ctx, exhibit, "The money", "Costing the plan");

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
      color: C.deepTeal,
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
      color: C.deepTeal,
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
      color: C.deepTeal,
    });
    ctx.y -= 20;
  });

  ctx.y -= 6;
  drawBody(
    ctx,
    `Source: ${p.name} Landscape Investment Plan. Line-level detail at hub.agroecologyindia.org/landscape/${p.slug}/budget.`,
    { size: 7.5, lineHeight: 11, color: C.muted }
  );
}

// ─── IMPLEMENTATION SNAPSHOT (replaces field_record; text only) ──────────
// ─── CHAPTER 4 — THE METRICS (LIP Chapter 6) ─────────────────────────────
function drawMetrics(ctx: Ctx, p: LandscapeProfile, ins: LandscapeInsights, exhibit: string) {
  sectionBreak(ctx, "The metrics", 210);
  drawExhibitHeader(ctx, exhibit, "Chapter 6 · Reach & targets", "The metrics");
  drawBody(
    ctx,
    "What the plan sets out to move on the ground, in the landscape's own units. Reach figures are programme engagements summed across interventions (a household can appear in several lines), not unique counts. The denominators below give the unique base.",
    { size: 10, lineHeight: 14.5, color: C.inkSoft, maxW: CONTENT_W * 0.86 }
  );
  ctx.y -= 12;
  hairline(ctx);

  // Reach tiles — engagements, hectares, livestock, costed lines.
  const tileW = CONTENT_W / 4;
  const tiles = [
    { label: "HOUSEHOLD ENGAGEMENTS", value: compactNum(ins.totals.householdEngagements), sub: "Across interventions" },
    { label: "HECTARES", value: compactNum(ins.totals.hectares), sub: "Area touched" },
    { label: "LIVESTOCK", value: compactNum(ins.totals.animals), sub: "Animals supported" },
    { label: "INTERVENTION LINES", value: String(ins.totals.lineCount), sub: "Costed activities" },
  ];
  const ty = ctx.y;
  ctx.page.drawRectangle({ x: M.left, y: ty, width: CONTENT_W, height: 0.6, color: C.hairline });
  for (let i = 0; i < tiles.length; i++) {
    const tx = M.left + i * tileW;
    ctx.page.drawText(tiles[i].label, { x: tx, y: ty - 12, size: 6.5, font: ctx.sansBold, color: C.muted });
    const vs = tiles[i].value.length > 8 ? 18 : 22;
    ctx.page.drawText(tiles[i].value, { x: tx, y: ty - 16 - vs, size: vs, font: ctx.sansBold, color: C.deepTeal });
    ctx.page.drawText(tiles[i].sub, { x: tx, y: ty - 64, size: 7, font: ctx.sans, color: C.muted });
  }
  ctx.y = ty - 78;
  hairline(ctx);

  // Unique denominators from the landscape profile (true base, not engagements).
  ctx.page.drawText("LANDSCAPE DENOMINATORS (UNIQUE)", { x: M.left, y: ctx.y - 8, size: 8, font: ctx.sansBold, color: C.amber });
  ctx.y -= 18;
  drawTwoColTable(ctx, [
    { label: "Population", value: p.population },
    { label: "Households", value: p.households },
    { label: "Inhabited villages", value: p.villages },
    { label: "Landscape area", value: p.area },
    { label: "Programme horizon", value: "7 years" },
  ]);
  ctx.y -= 8;
  hairline(ctx);

  // Reach by intervention category.
  const cats = ins.byCategory.filter((c) => c.householdEngagements > 0 || c.hectares > 0).slice(0, 8);
  if (cats.length) {
    ctx.page.drawText("REACH BY INTERVENTION CATEGORY", { x: M.left, y: ctx.y - 8, size: 8, font: ctx.sansBold, color: C.amber });
    ctx.y -= 18;
    drawTwoColTable(
      ctx,
      cats.map((c) => ({
        label: c.category,
        value: `${compactNum(c.householdEngagements)} hh engagements  ·  ${compactNum(c.hectares)} ha`,
      }))
    );
  }
}

function compactNum(n: number): string {
  if (!n || !isFinite(n) || n <= 0) return "-";
  return Math.round(n).toLocaleString("en-IN");
}

// ─── COLOPHON (last page) ────────────────────────────────────────────────
function drawColophon(ctx: Ctx, p: LandscapeProfile, exhibit: string) {
  sectionBreak(ctx, "About this brief", 140);
  drawExhibitHeader(ctx, exhibit, "Editorial note", "About this brief");

  drawBody(
    ctx,
    "This brief is generated from the Transformation Hub, the publicly readable dashboard of food-systems work in India run by the Consortium for Agroecological Transformations. Every entry is checked against its sources by a CAT editor before it goes up. The Hub publishes what didn't work alongside what did.",
    { size: 10, lineHeight: 14.5, color: C.inkSoft, maxW: CONTENT_W * 0.88 }
  );
  ctx.y -= 6;
  drawBody(
    ctx,
    "Whether a programme is on the Hub depends on whether it stands up to a serious read, regardless of who runs it. Where investment-plan finance is shown, the underlying line-level data is queryable in the budget explorer at the URL on this page.",
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
  const citation = `Consortium for Agroecological Transformations. (${year}). ${p.name} Landscape Investment Brief. Transformation Hub. hub.agroecologyindia.org/landscape/${p.slug}`;
  drawBody(ctx, citation, { size: 10, lineHeight: 14, color: C.ink });
  ctx.y -= 8;

  hairline(ctx);

  // Imprint block — full compact lockup with site URL as caption
  drawCatLockup(ctx, M.left, ctx.y - 36, { symbolHeight: 36, compact: true });
  ctx.page.drawText("Transformation Hub  ·  hub.agroecologyindia.org", {
    x: M.left,
    y: ctx.y - 50,
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
  | "why_special"
  | "interventions"
  | "costing"
  | "metrics"
  | "colophon";

export const ALL_BRIEF_SECTIONS: BriefSection[] = [
  "cover",
  "why_special",
  "interventions",
  "costing",
  "metrics",
  "colophon",
];

export type BriefOpts = {
  budget?: BudgetSummary;
  insights?: LandscapeInsights;
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

  // Compute chapter numbering on the fly (only chapters we'll render). The
  // report follows the LIP narrative: why it matters, what the plan does, what
  // it costs, what it sets out to move.
  const hasIns = Boolean(opts.insights);
  const planned: { key: BriefSection; title: string }[] = [];
  if (want("why_special")) planned.push({ key: "why_special", title: "Why this landscape is special" });
  if (want("interventions") && hasIns && opts.insights!.totals.lineCount > 0) {
    planned.push({ key: "interventions", title: "Summary of interventions" });
  }
  if (want("costing") && opts.budget && opts.budget.totalCostInr > 0) {
    planned.push({ key: "costing", title: "Costing" });
  }
  if (want("metrics") && hasIns) {
    planned.push({ key: "metrics", title: "The metrics" });
  }
  if (want("colophon")) planned.push({ key: "colophon", title: "About this brief" });

  // No contents page — at 4 pages the report reads straight through, chapters
  // flowing one into the next.

  // Render each requested chapter with sequential numbering
  for (let i = 0; i < planned.length; i++) {
    const exhibit = String(i + 1).padStart(2, "0");
    switch (planned[i].key) {
      case "why_special":
        drawWhySpecial(ctx, p, stateName, exhibit);
        break;
      case "interventions":
        if (opts.insights) drawInterventions(ctx, p, opts.insights, exhibit);
        break;
      case "costing":
        if (opts.budget) drawCosting(ctx, p, opts.budget, exhibit);
        break;
      case "metrics":
        if (opts.insights) drawMetrics(ctx, p, opts.insights, exhibit);
        break;
      case "colophon":
        drawColophon(ctx, p, exhibit);
        break;
    }
  }

  // Footers (page n / N + citation), applied after page count is known
  const citationUrl = `hub.agroecologyindia.org/landscape/${p.slug}`;
  drawFooters(ctx, citationUrl);

  return await doc.save();
}

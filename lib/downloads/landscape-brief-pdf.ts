import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, type PDFImage } from "pdf-lib";
import type { LandscapeProfile, LandscapePhoto } from "@/lib/data/landscapes";
import type { BudgetSummary } from "@/lib/db/landscape-kb";

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait
const M = { top: 56, right: 56, bottom: 56, left: 56 };

const COLOR = {
  ink: rgb(0.10, 0.15, 0.15),
  inkSoft: rgb(0.30, 0.34, 0.34),
  muted: rgb(0.46, 0.50, 0.50),
  navy: rgb(0.215, 0.247, 0.353), // #373F5A — official wordmark navy
  deepTeal: rgb(0.20, 0.29, 0.29),
  teal: rgb(0.176, 0.459, 0.455), // #2D7574 — official symbol teal
  periwinkle: rgb(0.392, 0.427, 0.588), // #646D96 — official symbol periwinkle
  amber: rgb(0.973, 0.792, 0.486),
  amberDeep: rgb(0.776, 0.549, 0.180),
  sage: rgb(0.624, 0.722, 0.651), // sage accent
  paper: rgb(0.984, 0.972, 0.949),
  cream: rgb(0.957, 0.929, 0.870),
  line: rgb(0.86, 0.86, 0.83),
  lineSoft: rgb(0.91, 0.90, 0.86),
};

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  serif: PDFFont;
  serifBold: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
  mono: PDFFont;
};

const CONTENT_W = PAGE.w - M.left - M.right;

function wrapPageDrawText(page: PDFPage) {
  const original = page.drawText.bind(page);
  (page as unknown as { drawText: typeof original }).drawText = ((
    text: string,
    opts?: Parameters<typeof original>[1]
  ) => original(asciify(text), opts)) as typeof original;
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.w, PAGE.h]);
  wrapPageDrawText(ctx.page);
  ctx.page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.w,
    height: PAGE.h,
    color: COLOR.paper,
  });
  ctx.y = PAGE.h - M.top;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < M.bottom + 30) {
    newPage(ctx);
  }
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.replace(/\s+/g, " ").split(" ");
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

function drawText(
  ctx: Ctx,
  text: string,
  opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; lineHeight?: number; maxW?: number }
) {
  const size = opts.size ?? 10.5;
  const font = opts.font ?? ctx.serif;
  const color = opts.color ?? COLOR.inkSoft;
  const lineHeight = opts.lineHeight ?? size * 1.5;
  const maxW = opts.maxW ?? CONTENT_W;
  const x = opts.x ?? M.left;
  const lines = wrap(asciify(text), font, size, maxW);
  for (const line of lines) {
    ensure(ctx, lineHeight);
    ctx.page.drawText(line, { x, y: ctx.y - size, size, font, color });
    ctx.y -= lineHeight;
  }
}

function drawSectionOpener(ctx: Ctx, number: string, label: string) {
  ensure(ctx, 28);
  // sage rule
  ctx.page.drawRectangle({
    x: M.left,
    y: ctx.y - 6,
    width: 14,
    height: 1.2,
    color: COLOR.sage,
  });
  // number in sage
  ctx.page.drawText(number, {
    x: M.left + 20,
    y: ctx.y - 10,
    size: 8.5,
    font: ctx.mono,
    color: COLOR.sage,
  });
  // dot separator
  ctx.page.drawText("·", {
    x: M.left + 38,
    y: ctx.y - 10,
    size: 8.5,
    font: ctx.mono,
    color: COLOR.muted,
  });
  // label in navy
  ctx.page.drawText(label.toUpperCase(), {
    x: M.left + 46,
    y: ctx.y - 10,
    size: 8.5,
    font: ctx.sansBold,
    color: COLOR.navy,
  });
  ctx.y -= 26;
}

function drawHeading(ctx: Ctx, text: string, size = 28, color = COLOR.navy) {
  const lines = wrap(text, ctx.sansBold, size, CONTENT_W);
  for (const line of lines) {
    ensure(ctx, size + 10);
    ctx.page.drawText(line, {
      x: M.left,
      y: ctx.y - size,
      size,
      font: ctx.sansBold,
      color,
    });
    ctx.y -= size + 6;
  }
  ctx.y -= 4;
}

function drawDivider(ctx: Ctx) {
  ensure(ctx, 18);
  ctx.page.drawRectangle({
    x: M.left,
    y: ctx.y - 4,
    width: CONTENT_W,
    height: 0.5,
    color: COLOR.line,
  });
  ctx.y -= 18;
}

/**
 * Official CAT lockup drawn into the PDF — symbol + wordmark + supertext.
 * Compact horizontal lockup sized to fit at the top of a page header.
 */
function drawCatLockup(ctx: Ctx, x: number, y: number, height = 28) {
  const symW = height; // square symbol on the left
  // arches
  for (const r of [11, 8, 4.5]) {
    ctx.page.drawSvgPath(
      `M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`,
      {
        x: x + symW / 2,
        y: y + height * 0.45,
        borderColor: COLOR.teal,
        borderWidth: 1.5,
        scale: 1,
      }
    );
  }
  // leaves
  ctx.page.drawSvgPath(
    "M 0 1 C -5 4, -6 11, -2 16 C 0 13, 1 8, 0 1 Z",
    {
      x: x + symW / 2,
      y: y + height * 0.45,
      borderColor: COLOR.periwinkle,
      borderWidth: 1.2,
      scale: 1,
    }
  );
  ctx.page.drawSvgPath(
    "M 0 1 C 5 4, 6 11, 2 16 C 0 13, -1 8, 0 1 Z",
    {
      x: x + symW / 2,
      y: y + height * 0.45,
      borderColor: COLOR.periwinkle,
      borderWidth: 1.2,
      scale: 1,
    }
  );
  // wordmark: three lines
  const tx = x + symW + 8;
  const labelSize = 9.5;
  const lineH = labelSize * 1.18;
  ctx.page.drawText("Consortium for", {
    x: tx,
    y: y + height - labelSize - 2,
    size: labelSize,
    font: ctx.sansBold,
    color: COLOR.navy,
  });
  ctx.page.drawText("Agroecological", {
    x: tx,
    y: y + height - labelSize - 2 - lineH,
    size: labelSize,
    font: ctx.sansBold,
    color: COLOR.navy,
  });
  ctx.page.drawText("Transformations", {
    x: tx,
    y: y + height - labelSize - 2 - lineH * 2,
    size: labelSize,
    font: ctx.sansBold,
    color: COLOR.navy,
  });
}

/** Try to read a JPEG from public/. Returns null if missing or unreadable. */
async function readJpg(relativePath: string): Promise<Buffer | null> {
  try {
    const cleaned = relativePath.replace(/^\//, "");
    const full = path.join(process.cwd(), "public", cleaned);
    return await readFile(full);
  } catch {
    return null;
  }
}

/** Embed a JPEG photo into the doc and draw it at the requested position. */
async function drawPhoto(
  ctx: Ctx,
  photo: LandscapePhoto,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<PDFImage | null> {
  const bytes = await readJpg(photo.src);
  if (!bytes) return null;
  const img = await ctx.doc.embedJpg(bytes);
  // Cover crop: pdf-lib draws the whole image at the given dimensions.
  // To get cover-crop behaviour, we draw at the larger of the two scale
  // factors and clip via a rectangle clipping path. Simpler approach for
  // an editorial brief: just letterbox to the given box maintaining aspect.
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let drawW = w;
  let drawH = h;
  let drawX = x;
  let drawY = y;
  if (imgAspect > boxAspect) {
    // image is wider — scale to cover height, crop sides
    drawH = h;
    drawW = h * imgAspect;
    drawX = x - (drawW - w) / 2;
  } else {
    drawW = w;
    drawH = w / imgAspect;
    drawY = y - (drawH - h) / 2;
  }
  // Clip by drawing a paper rectangle frame after the image
  ctx.page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
  return img;
}

function formatMonth(iso: string): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const [y, m] = iso.split("-");
  const idx = Number(m) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${y}` : iso;
}

function inrShort(n: number): string {
  if (!n || !isFinite(n)) return "—";
  // PDF standard fonts (WinAnsi) cannot encode ₹ U+20B9, so we use "INR" in
  // the PDF brief. The DOCX brief renders ₹ correctly through Word's font system.
  if (n >= 1e7) return `INR ${(n / 1e7).toFixed(n >= 1e8 ? 0 : 2)} cr`;
  if (n >= 1e5) return `INR ${(n / 1e5).toFixed(2)} lakh`;
  return `INR ${n.toLocaleString("en-IN")}`;
}

// Replace characters not encodable by WinAnsi standard fonts with safe ASCII
// equivalents. Belt-and-braces — if any prose contains an em dash or curly
// quote it doesn't crash the encoder.
function asciify(s: string): string {
  return s
    .replace(/[–—]/g, "-") // en/em dash
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/₹/g, "INR ");
}

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

// ─── Pages ───────────────────────────────────────────────────────────────

async function drawCover(ctx: Ctx, p: LandscapeProfile, stateName: string) {
  // CAT lockup top-left
  drawCatLockup(ctx, M.left, PAGE.h - M.top + 6, 30);

  // Edition tag, top-right
  ctx.page.drawText("VOL. 01 · EDITION 2026", {
    x: PAGE.w - M.right - ctx.mono.widthOfTextAtSize("VOL. 01 · EDITION 2026", 8),
    y: PAGE.h - M.top - 8,
    size: 8,
    font: ctx.mono,
    color: COLOR.muted,
  });

  ctx.y = PAGE.h - M.top - 56;

  // Anchor photograph — 5:2 strip at top
  const anchorH = CONTENT_W * (2 / 5);
  const anchorY = ctx.y - anchorH;
  if (p.photos && p.photos.length > 0) {
    await drawPhoto(ctx, p.photos[0], M.left, anchorY, CONTENT_W, anchorH);
    // Soft bottom darkening for the caption overlay
    ctx.page.drawRectangle({
      x: M.left,
      y: anchorY,
      width: CONTENT_W,
      height: 38,
      color: rgb(0.10, 0.15, 0.15),
      opacity: 0.55,
    });
    // Caption inside the photo's bottom
    ctx.page.drawText(p.photos[0].caption, {
      x: M.left + 14,
      y: anchorY + 22,
      size: 10,
      font: ctx.sans,
      color: COLOR.paper,
    });
    ctx.page.drawText(`${p.photos[0].credit} · ${formatMonth(p.photos[0].date)}`, {
      x: M.left + 14,
      y: anchorY + 9,
      size: 7.5,
      font: ctx.mono,
      color: rgb(0.973, 0.792, 0.486),
    });
  } else {
    // Sage gradient panel fallback
    ctx.page.drawRectangle({
      x: M.left,
      y: anchorY,
      width: CONTENT_W,
      height: anchorH,
      color: rgb(0.91, 0.94, 0.91),
    });
    ctx.page.drawText("Procedural mark", {
      x: M.left + 14,
      y: anchorY + 14,
      size: 8,
      font: ctx.mono,
      color: COLOR.muted,
    });
  }
  ctx.y = anchorY - 28;

  drawSectionOpener(ctx, "VOL. 01", "Landscape investment brief");

  // Title
  drawHeading(ctx, p.name, 36, COLOR.navy);

  // Subtitle
  ensure(ctx, 16);
  ctx.page.drawText(`${p.district} · ${stateName}`, {
    x: M.left,
    y: ctx.y - 12,
    size: 12,
    font: ctx.sans,
    color: COLOR.inkSoft,
  });
  ctx.y -= 26;

  // Editorial context paragraph (italic-feel via Times)
  drawText(ctx, p.context, {
    size: 11.5,
    font: ctx.serif,
    color: COLOR.ink,
    lineHeight: 17,
  });

  // Bottom strip: URL and generated date
  const stripY = M.bottom + 4;
  ctx.page.drawRectangle({
    x: M.left,
    y: stripY + 14,
    width: CONTENT_W,
    height: 0.5,
    color: COLOR.line,
  });
  const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  ctx.page.drawText("cat-platform-fawn.vercel.app", {
    x: M.left,
    y: stripY,
    size: 8,
    font: ctx.mono,
    color: COLOR.muted,
  });
  ctx.page.drawText(`Generated ${now}`, {
    x: PAGE.w - M.right - ctx.mono.widthOfTextAtSize(`Generated ${now}`, 8),
    y: stripY,
    size: 8,
    font: ctx.mono,
    color: COLOR.muted,
  });
}

function drawAtAGlance(ctx: Ctx, p: LandscapeProfile, stateName: string) {
  newPage(ctx);
  drawSectionOpener(ctx, "01", "At a glance");

  drawHeading(ctx, "At a glance", 22, COLOR.navy);
  ctx.y -= 4;

  const rows: { label: string; value: string }[] = [
    { label: "Region", value: p.region },
    { label: "Agroclimatic zone", value: shorten(p.agroclimaticZone, 84) },
    { label: "State", value: stateName },
    { label: "District", value: p.district },
    { label: "Geographical area", value: p.area },
    { label: "Population", value: p.population },
    { label: "Households", value: p.households },
    { label: "Inhabited villages", value: p.villages },
    { label: "Investment plan status", value: p.lipStatus === "published" ? "Published" : "In preparation" },
    { label: "Key challenges identified", value: String(p.keyChallenges.length) },
  ];

  // Two-column grid
  const colW = CONTENT_W / 2;
  const rowH = 36;
  rows.forEach((r, i) => {
    const col = i % 2;
    const x = M.left + col * colW;
    if (col === 0) ensure(ctx, rowH);
    const y = ctx.y;
    ctx.page.drawText(r.label.toUpperCase(), {
      x,
      y: y - 9,
      size: 7.5,
      font: ctx.mono,
      color: COLOR.muted,
    });
    const valueSize = 11.5;
    const valueLines = wrap(r.value, ctx.sansBold, valueSize, colW - 12);
    ctx.page.drawText(valueLines[0] ?? "", {
      x,
      y: y - 9 - 14,
      size: valueSize,
      font: ctx.sansBold,
      color: COLOR.deepTeal,
    });
    if (col === 1) ctx.y -= rowH;
  });
  if (rows.length % 2 !== 0) ctx.y -= rowH;
  ctx.y -= 12;
}

function drawContext(ctx: Ctx, p: LandscapeProfile) {
  newPage(ctx);
  drawSectionOpener(ctx, "02", "Context");
  drawHeading(ctx, "Context", 22, COLOR.navy);
  ctx.y -= 2;
  drawText(ctx, p.bodyContext, { size: 11, lineHeight: 17, color: COLOR.inkSoft });

  ctx.y -= 8;
  drawDivider(ctx);
  drawSectionOpener(ctx, "03", "Agroclimatic zone");
  drawHeading(ctx, "Agroclimatic zone", 20, COLOR.navy);
  ctx.y -= 2;
  drawText(ctx, p.agroclimaticZone, { size: 11, lineHeight: 17, color: COLOR.inkSoft });
}

function drawChallenges(ctx: Ctx, p: LandscapeProfile) {
  newPage(ctx);
  drawSectionOpener(ctx, "04", "Key landscape challenges");
  drawHeading(ctx, "Key landscape challenges", 22, COLOR.navy);
  ctx.y -= 4;
  p.keyChallenges.forEach((c, i) => {
    ensure(ctx, 32);
    const num = String(i + 1).padStart(2, "0");
    ctx.page.drawText(num, {
      x: M.left,
      y: ctx.y - 10,
      size: 11,
      font: ctx.mono,
      color: COLOR.amberDeep,
    });
    const lines = wrap(c, ctx.serif, 11, CONTENT_W - 36);
    for (let j = 0; j < lines.length; j++) {
      ensure(ctx, 17);
      ctx.page.drawText(lines[j], {
        x: M.left + 32,
        y: ctx.y - 10,
        size: 11,
        font: ctx.serif,
        color: COLOR.inkSoft,
      });
      ctx.y -= 17;
    }
    ctx.y -= 6;
  });
}

function drawFinance(ctx: Ctx, p: LandscapeProfile, budget: BudgetSummary) {
  newPage(ctx);
  drawSectionOpener(ctx, "05", "Investment plan at a glance");
  drawHeading(ctx, "Investment plan at a glance", 22, COLOR.navy);
  ctx.y -= 4;

  // Headline figure
  ensure(ctx, 60);
  ctx.page.drawText("Total plan size · 7-year horizon", {
    x: M.left,
    y: ctx.y - 9,
    size: 8.5,
    font: ctx.mono,
    color: COLOR.muted,
  });
  ctx.page.drawText(inrShort(budget.totalCostInr), {
    x: M.left,
    y: ctx.y - 9 - 38,
    size: 38,
    font: ctx.sansBold,
    color: COLOR.deepTeal,
  });
  ctx.y -= 64;

  // Four-tile finance summary
  drawDivider(ctx);
  const tileW = CONTENT_W / 4;
  const tileH = 60;
  const tiles = [
    { label: "External investment", value: inrShort(budget.investmentRequiredInr), sub: `${pct(budget.investmentRequiredInr, budget.totalCostInr)} of plan` },
    { label: "Government convergence", value: inrShort(budget.govtInr), sub: `${pct(budget.govtInr, budget.totalCostInr)} of plan` },
    { label: "Community contribution", value: inrShort(budget.communityInr), sub: `${pct(budget.communityInr, budget.totalCostInr)} of plan` },
    { label: "Returnable / outcome", value: inrShort(budget.returnableGrantInr + budget.outcomeFinanceInr), sub: "Innovative finance" },
  ];
  ensure(ctx, tileH + 4);
  const tilesYTop = ctx.y;
  tiles.forEach((t, i) => {
    const x = M.left + i * tileW;
    ctx.page.drawText(t.label.toUpperCase(), {
      x: x + 2,
      y: tilesYTop - 9,
      size: 7,
      font: ctx.mono,
      color: COLOR.muted,
    });
    ctx.page.drawText(t.value, {
      x: x + 2,
      y: tilesYTop - 9 - 18,
      size: 16,
      font: ctx.sansBold,
      color: COLOR.deepTeal,
    });
    ctx.page.drawText(t.sub, {
      x: x + 2,
      y: tilesYTop - 9 - 36,
      size: 8,
      font: ctx.sans,
      color: COLOR.muted,
    });
  });
  ctx.y -= tileH + 8;

  drawDivider(ctx);

  // Funding mix table
  ctx.page.drawText("FUNDING MIX", {
    x: M.left,
    y: ctx.y - 9,
    size: 8.5,
    font: ctx.mono,
    color: COLOR.teal,
  });
  ctx.y -= 22;
  const sources = [
    { label: "Government", value: budget.govtInr },
    { label: "Community", value: budget.communityInr },
    { label: "Grants", value: budget.grantsInr },
    { label: "Returnable grant", value: budget.returnableGrantInr },
    { label: "Outcome-based finance", value: budget.outcomeFinanceInr },
    { label: "Debt", value: budget.debtInr },
  ].filter((s) => s.value > 0);
  const sumSources = sources.reduce((acc, s) => acc + s.value, 0);
  sources.forEach((s) => {
    ensure(ctx, 18);
    ctx.page.drawText(s.label, {
      x: M.left,
      y: ctx.y - 10,
      size: 10.5,
      font: ctx.sans,
      color: COLOR.ink,
    });
    const valueText = inrShort(s.value);
    const pctText = `${pct(s.value, sumSources)} `;
    const valueW = ctx.sansBold.widthOfTextAtSize(valueText, 10.5);
    const pctW = ctx.mono.widthOfTextAtSize(pctText, 9);
    ctx.page.drawText(valueText, {
      x: PAGE.w - M.right - valueW,
      y: ctx.y - 10,
      size: 10.5,
      font: ctx.sansBold,
      color: COLOR.deepTeal,
    });
    ctx.page.drawText(pctText, {
      x: PAGE.w - M.right - valueW - pctW - 12,
      y: ctx.y - 10,
      size: 9,
      font: ctx.mono,
      color: COLOR.amberDeep,
    });
    ctx.y -= 18;
  });

  ctx.y -= 8;
  drawDivider(ctx);

  // Top spend categories
  ctx.page.drawText("TOP SPEND BY CATEGORY", {
    x: M.left,
    y: ctx.y - 9,
    size: 8.5,
    font: ctx.mono,
    color: COLOR.teal,
  });
  ctx.y -= 22;
  const topCats = budget.byCategory.filter((c) => c.total > 0).slice(0, 5);
  topCats.forEach((c, i) => {
    ensure(ctx, 22);
    const numText = String(i + 1).padStart(2, "0");
    ctx.page.drawText(numText, {
      x: M.left,
      y: ctx.y - 10,
      size: 9,
      font: ctx.mono,
      color: COLOR.amberDeep,
    });
    const lines = wrap(c.category, ctx.sans, 10.5, CONTENT_W - 130);
    ctx.page.drawText(lines[0] ?? "", {
      x: M.left + 24,
      y: ctx.y - 10,
      size: 10.5,
      font: ctx.sans,
      color: COLOR.ink,
    });
    const valueText = inrShort(c.total);
    const valueW = ctx.sansBold.widthOfTextAtSize(valueText, 10.5);
    ctx.page.drawText(valueText, {
      x: PAGE.w - M.right - valueW,
      y: ctx.y - 10,
      size: 10.5,
      font: ctx.sansBold,
      color: COLOR.deepTeal,
    });
    ctx.y -= 18;
  });

  ctx.y -= 12;
  drawText(
    ctx,
    `Drawn from the ${p.name} Landscape Investment Plan. Live explorer with line-level filters at cat-platform-fawn.vercel.app/landscape/${p.slug}/budget.`,
    { size: 9, lineHeight: 13, color: COLOR.muted }
  );
}

async function drawFieldRecord(ctx: Ctx, p: LandscapeProfile) {
  if (!p.photos || p.photos.length <= 1) return;
  newPage(ctx);
  drawSectionOpener(ctx, "06", "Field record");
  drawHeading(ctx, `Photographs from ${p.name}`, 22, COLOR.navy);
  ctx.y -= 2;
  drawText(
    ctx,
    "Documentary frames from CAT field work in the landscape. Treated as primary source material, not decoration.",
    { size: 10.5, lineHeight: 16, color: COLOR.inkSoft, font: ctx.serif }
  );
  ctx.y -= 8;

  // Two-column grid of remaining photos (skip the anchor at index 0)
  const remaining = p.photos.slice(1, 5); // cap at 4
  const gap = 12;
  const colW = (CONTENT_W - gap) / 2;
  const aspect = 4 / 3;
  const imgH = colW / aspect;
  const captionH = 36;

  for (let i = 0; i < remaining.length; i += 2) {
    ensure(ctx, imgH + captionH + 12);
    const yTop = ctx.y;
    for (let j = 0; j < 2 && i + j < remaining.length; j++) {
      const x = M.left + j * (colW + gap);
      const photo = remaining[i + j];
      const photoY = yTop - imgH;
      await drawPhoto(ctx, photo, x, photoY, colW, imgH);
      // Caption block below
      ctx.page.drawText(photo.caption, {
        x,
        y: photoY - 14,
        size: 9.5,
        font: ctx.sans,
        color: COLOR.navy,
        maxWidth: colW,
      });
      ctx.page.drawText(`${photo.credit} · ${formatMonth(photo.date)}`, {
        x,
        y: photoY - 14 - 12,
        size: 7.5,
        font: ctx.mono,
        color: COLOR.muted,
      });
    }
    ctx.y -= imgH + captionH;
  }
}

function drawColophon(ctx: Ctx, p: LandscapeProfile) {
  newPage(ctx);
  drawSectionOpener(ctx, "—", "Editorial note");
  drawHeading(ctx, "About this brief", 22, COLOR.navy);
  ctx.y -= 2;

  drawText(
    ctx,
    `This brief is generated live from the Transformation Hub, the public, curated dashboard of credible food systems work in India by the Consortium for Agroecological Transformations. Every entry is read by a CAT editor before it goes live. Limitations sit beside achievements.`,
    { size: 10.5, lineHeight: 16, color: COLOR.inkSoft }
  );
  ctx.y -= 8;

  drawText(
    ctx,
    `Programmes are read, not pitched. The Hub treats photographs as primary sources, not decoration. The bar is honesty, not affiliation.`,
    { size: 10.5, lineHeight: 16, color: COLOR.inkSoft, font: ctx.serif }
  );
  ctx.y -= 12;
  drawDivider(ctx);

  // Citation block
  ctx.page.drawText("HOW TO CITE THIS BRIEF", {
    x: M.left,
    y: ctx.y - 9,
    size: 8.5,
    font: ctx.mono,
    color: COLOR.teal,
  });
  ctx.y -= 20;
  const year = new Date().getFullYear();
  const citation = `Consortium for Agroecological Transformations. (${year}). ${p.name} Landscape Investment Brief. Transformation Hub. cat-platform-fawn.vercel.app/landscape/${p.slug}`;
  drawText(ctx, citation, { size: 10, lineHeight: 14, color: COLOR.ink, font: ctx.sans });
}

// ─── Page footers ────────────────────────────────────────────────────────

function drawFooters(ctx: Ctx) {
  const pages = ctx.doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // Skip cover, since cover has its own bottom strip
    if (i === 0) continue;
    const total = pages.length;
    page.drawText(`${i + 1} of ${total}`, {
      x: PAGE.w - M.right - 30,
      y: 28,
      size: 7.5,
      font: ctx.mono,
      color: COLOR.muted,
    });
    page.drawText("Transformation Hub · Vol. 01 · 2026", {
      x: M.left,
      y: 28,
      size: 7.5,
      font: ctx.mono,
      color: COLOR.muted,
    });
  }
}

// ─── Main builder ────────────────────────────────────────────────────────

export type BriefOpts = {
  budget?: BudgetSummary;
};

export async function buildLandscapeBriefPdf(
  p: LandscapeProfile,
  stateName: string,
  opts: BriefOpts = {}
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${p.name} · Landscape Investment Brief`);
  doc.setAuthor("Consortium for Agroecological Transformations");
  doc.setSubject(`Landscape investment brief for ${p.name}`);
  doc.setKeywords(["CAT", "Transformation Hub", "landscape", "food systems", p.name, p.district]);

  // Use standard fonts. `asciify` substitutes anything outside WinAnsi
  // (rupee sign, en/em dashes, smart quotes, ellipsis) before drawing.
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  const coverPage = doc.addPage([PAGE.w, PAGE.h]);
  wrapPageDrawText(coverPage);
  const ctx: Ctx = {
    doc,
    page: coverPage,
    y: 0,
    serif,
    serifBold,
    sans,
    sansBold,
    mono,
  };
  ctx.page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: COLOR.paper });
  ctx.y = PAGE.h - M.top;

  // Page 1 · Cover
  await drawCover(ctx, p, stateName);

  // Page 2 · At a glance
  drawAtAGlance(ctx, p, stateName);

  // Page 3 · Context + agroclimatic zone
  drawContext(ctx, p);

  // Page 4 · Key challenges
  drawChallenges(ctx, p);

  // Page 5 · Investment plan finance (conditional)
  if (opts.budget && opts.budget.totalCostInr > 0) {
    drawFinance(ctx, p, opts.budget);
  }

  // Page 6 · Field record (conditional)
  if (p.photos && p.photos.length > 1) {
    await drawFieldRecord(ctx, p);
  }

  // Last page · Colophon
  drawColophon(ctx, p);

  // Page footers
  drawFooters(ctx);

  return await doc.save();
}

function shorten(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

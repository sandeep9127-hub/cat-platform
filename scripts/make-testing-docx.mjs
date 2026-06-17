#!/usr/bin/env node
/**
 * Convert TESTING.md into an editable Word document (.docx) for the team:
 * headings, paragraphs, bullets, and real Word tables with empty Pass/Fail and
 * Notes cells to fill in. Usage: node scripts/make-testing-docx.mjs [out.docx]
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType,
} from "docx";

const SRC = "TESTING.md";
const OUT = process.argv[2] || "/Users/sandeepnayak/Desktop/CAT_Hub_Testing_Script.docx";
const TEAL = "2E7573", DEEP = "16130D", LINE = "D7D4CC", CREAM = "F3F1EA";

const lines = readFileSync(SRC, "utf8").replace(/\r/g, "").split("\n");

// Inline parser: **bold**, `code`, [text](url) -> text. Returns TextRun[].
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m;
  const push = (t, opts) => t && out.push(new TextRun({ text: t, font: "Calibri", ...base, ...opts }));
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[2] !== undefined) push(m[2], { bold: true });
    else if (m[3] !== undefined) push(m[3], { font: "Consolas", color: TEAL });
    else if (m[4] !== undefined) push(m[4], { color: TEAL });
    last = re.lastIndex;
  }
  push(text.slice(last));
  return out.length ? out : [new TextRun({ text: "", font: "Calibri", ...base })];
}

function cell(text, { header = false, widthPct } = {}) {
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: header ? { type: ShadingType.CLEAR, fill: CREAM, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: [new Paragraph({ children: runs(text, header ? { bold: true, color: DEEP } : {}), spacing: { after: 0 } })],
  });
}

const blocks = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];

  // Table: a run of lines starting with "|"
  if (line.trim().startsWith("|")) {
    const tbl = [];
    while (i < lines.length && lines[i].trim().startsWith("|")) { tbl.push(lines[i]); i++; }
    const parsed = tbl
      .map((r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()))
      .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")); // drop the |---| separator
    const cols = Math.max(...parsed.map((r) => r.length));
    const w = Math.floor(100 / cols);
    const rows = parsed.map((cells, ri) =>
      new TableRow({
        tableHeader: ri === 0,
        children: Array.from({ length: cols }, (_, ci) => cell(cells[ci] ?? "", { header: ri === 0, widthPct: w })),
      })
    );
    blocks.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE },
        left: { style: BorderStyle.SINGLE, size: 4, color: LINE }, right: { style: BorderStyle.SINGLE, size: 4, color: LINE },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      },
      rows,
    }));
    blocks.push(new Paragraph({ text: "", spacing: { after: 120 } }));
    continue;
  }

  // Headings
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    const lvl = h[1].length;
    const level = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][lvl - 1];
    blocks.push(new Paragraph({
      heading: level,
      spacing: { before: lvl <= 2 ? 280 : 200, after: 120 },
      children: runs(h[2].replace(/[#]/g, ""), { color: lvl <= 2 ? TEAL : DEEP, bold: true }),
    }));
    i++; continue;
  }

  // Horizontal rule
  if (/^---+$/.test(line.trim())) {
    blocks.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 1 } }, spacing: { after: 160 } }));
    i++; continue;
  }

  // Bullets
  const b = line.match(/^[-*]\s+(.*)$/);
  if (b) { blocks.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: runs(b[1]) })); i++; continue; }

  // Blockquote
  const q = line.match(/^>\s+(.*)$/);
  if (q) { blocks.push(new Paragraph({ spacing: { after: 80 }, indent: { left: 240 }, children: runs(q[1], { italics: true, color: "57544C" }) })); i++; continue; }

  // Blank
  if (line.trim() === "") { i++; continue; }

  // Paragraph
  blocks.push(new Paragraph({ spacing: { after: 100 }, children: runs(line) }));
  i++;
}

const doc = new Document({
  creator: "CAT Platform", title: "CAT Hub - Manual Testing Script",
  styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    children: blocks,
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync(OUT, buf);
console.log(`wrote ${OUT} (${(buf.length / 1024).toFixed(0)} KB, ${blocks.length} blocks)`);

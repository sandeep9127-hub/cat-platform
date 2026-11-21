import type { Block } from "@/lib/ingest/docx";

/**
 * Turn a text PDF's pages into the same blocks the DOCX parser produces
 * (headings, paragraphs, list items, each with its page), so PDFs go through
 * the same chunking, context, embedding and citation steps. Running headers and
 * footers (lines repeated on most pages, "n/13" page counters) are dropped.
 * Scanned PDFs (no text layer) yield no blocks and are rejected by the caller.
 */

const PAGE_COUNTER = /^(page\s*)?\d{1,4}(\s*(\/|of)\s*\d{1,4})?$/i;
const NUMBERED_HEADING = /^((\d{1,2}(\.\d{1,2}){0,3})|([A-Z]\.)|((Chapter|Section|Part|Annex|Appendix)\s+\w+))[\s.:)-]+[A-Z]/;
const LIST_ITEM = /^([•●▪◦\-–*]|\(?[a-z0-9]{1,3}[.)])\s+/i;

export function pdfToBlocks(pageTexts: string[]): { blocks: Block[]; pageCount: number } {
  const pages = pageTexts.map((t) => t.split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean));

  // Lines that repeat on at least 40% of pages (min 3) are running headers/footers.
  const seen = new Map<string, number>();
  for (const lines of pages) for (const l of new Set(lines)) seen.set(l, (seen.get(l) ?? 0) + 1);
  const repeated = new Set([...seen].filter(([, n]) => pages.length >= 3 && n >= Math.max(3, pages.length * 0.4)).map(([l]) => l));

  const blocks: Block[] = [];
  let para: { text: string; pageStart: number; pageEnd: number; list: boolean } | null = null;
  const flush = () => {
    if (para && para.text.length > 1) blocks.push({ kind: "para", ...para });
    para = null;
  };

  pages.forEach((lines, i) => {
    const page = i + 1;
    for (const line of lines) {
      if (repeated.has(line) || PAGE_COUNTER.test(line)) continue;
      const short = line.length <= 90;
      const endsSentence = /[.;:,?!”"')]$/.test(line);
      const letters = line.replace(/[^A-Za-z]/g, "");
      const allCaps = letters.length >= 4 && letters === letters.toUpperCase();
      const heading = short && !endsSentence && (allCaps || NUMBERED_HEADING.test(line)) && !LIST_ITEM.test(line);
      if (heading) {
        flush();
        // Small capitals come out letter-spaced ("A GROECOLOGY"): rejoin them.
        const text = allCaps ? line.replace(/\b([A-Z]) (?=[A-Z]{2,})/g, "$1") : line;
        // A heading wrapped onto a second line continues the previous heading.
        const prev = blocks[blocks.length - 1];
        if (prev?.kind === "heading" && prev.page === page && allCaps && prev.text === prev.text.toUpperCase() && !NUMBERED_HEADING.test(line)) {
          prev.text = `${prev.text} ${text}`;
          continue;
        }
        blocks.push({ kind: "heading", level: allCaps && !NUMBERED_HEADING.test(line) ? 1 : Math.min(3, 1 + ((line.match(/^\d+(\.\d+)*/)?.[0].split(".").length ?? 1))), text, page });
        continue;
      }
      const isList = LIST_ITEM.test(line);
      if (isList) flush();
      if (!para) para = { text: line, pageStart: page, pageEnd: page, list: isList };
      else {
        // Join wrapped lines; repair words hyphenated across lines.
        para.text = para.text.endsWith("-") && /^[a-z]/.test(line) ? para.text.slice(0, -1) + line : `${para.text} ${line}`;
        para.pageEnd = page;
      }
      // A line that ends a sentence and is clearly shorter than a full line ends the paragraph.
      if (endsSentence && line.length < 70) flush();
    }
  });
  flush();
  return { blocks, pageCount: pages.length };
}

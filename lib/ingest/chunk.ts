import type { Block } from "@/lib/ingest/docx";

/**
 * Turn parsed blocks into sections and retrieval chunks.
 *
 * - Chunks never cross a heading, so each sits in exactly one section.
 * - Target ~450 tokens (≈1,800 chars), hard max ≈2,800 chars. Paragraphs are
 *   kept whole unless a single one exceeds the max (then split on sentences).
 * - Tables are their own chunks, rendered as pipe rows. Long tables are split
 *   by rows with the header row repeated, so every chunk is readable alone.
 */

export type Section = {
  ord: number;
  heading: string;
  level: number;
  path: string; // "5 Water > 5.2 Farm ponds"
  parentOrd: number | null;
  pageStart: number;
  pageEnd: number;
};

export type Chunk = {
  index: number;
  sectionOrd: number | null;
  kind: "narrative" | "table" | "budget";
  text: string;
  pageStart: number;
  pageEnd: number;
  tokenCount: number;
};

const TARGET = 1800;
const MAX = 2800;
const approxTokens = (s: string) => Math.ceil(s.length / 4);

function splitLong(text: string): string[] {
  if (text.length <= MAX) return [text];
  const sentences = text.split(/(?<=[.!?;:])\s+/);
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if (s.length > MAX) {
      if (buf) { out.push(buf); buf = ""; }
      for (let i = 0; i < s.length; i += TARGET) out.push(s.slice(i, i + TARGET));
      continue;
    }
    if ((buf + " " + s).length > TARGET && buf) { out.push(buf); buf = s; }
    else buf = buf ? `${buf} ${s}` : s;
  }
  if (buf) out.push(buf);
  return out;
}

const looksLikeBudget = (rows: string[][]) => {
  const flat = rows.flat().join(" ");
  const numbers = flat.match(/\d[\d,]{2,}/g)?.length ?? 0;
  return /(₹|rs\.?|inr|lakh|crore|budget|cost|amount)/i.test(flat) && numbers >= 4;
};

function tableChunks(rows: string[][]): string[] {
  const render = (r: string[]) => `| ${r.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`;
  const [header, ...rest] = rows;
  const head = render(header);
  if (!rest.length) return [head];
  const out: string[] = [];
  let buf = head;
  for (const r of rest) {
    const line = render(r);
    if ((buf + "\n" + line).length > MAX && buf !== head) { out.push(buf); buf = `${head}\n${line}`; }
    else buf += `\n${line}`;
  }
  out.push(buf);
  return out.flatMap((t) => (t.length > MAX * 2 ? splitLong(t) : [t]));
}

export function buildSectionsAndChunks(blocks: Block[]): { sections: Section[]; chunks: Chunk[] } {
  const sections: Section[] = [];
  const chunks: Chunk[] = [];
  const stack: Section[] = [];
  let current: Section | null = null;

  let buf: string[] = [];
  let bufStart = 1;
  let bufEnd = 1;

  const push = (text: string, kind: Chunk["kind"], pageStart: number, pageEnd: number) => {
    const t = text.trim();
    if (t.length < 20) return;
    chunks.push({
      index: chunks.length,
      sectionOrd: current?.ord ?? null,
      kind,
      text: t,
      pageStart,
      pageEnd,
      tokenCount: approxTokens(t),
    });
  };
  const flush = () => {
    if (buf.length) push(buf.join("\n\n"), "narrative", bufStart, bufEnd);
    buf = [];
  };

  for (const b of blocks) {
    if (b.kind === "heading") {
      flush();
      while (stack.length && stack[stack.length - 1].level >= b.level) stack.pop();
      const parent = stack[stack.length - 1] ?? null;
      const sec: Section = {
        ord: sections.length,
        heading: b.text,
        level: b.level,
        path: [...stack.map((s) => s.heading), b.text].join(" > "),
        parentOrd: parent?.ord ?? null,
        pageStart: b.page,
        pageEnd: b.page,
      };
      sections.push(sec);
      stack.push(sec);
      current = sec;
      continue;
    }
    if (current) current.pageEnd = Math.max(current.pageEnd, b.kind === "para" ? b.pageEnd : b.pageEnd);
    if (b.kind === "table") {
      flush();
      const kind = looksLikeBudget(b.rows) ? "budget" : "table";
      for (const t of tableChunks(b.rows)) push(t, kind, b.pageStart, b.pageEnd);
      continue;
    }
    const pieces = splitLong(b.list ? `• ${b.text}` : b.text);
    for (const piece of pieces) {
      const size = buf.reduce((n, s) => n + s.length + 2, 0);
      if (buf.length && size + piece.length > TARGET) flush();
      if (!buf.length) bufStart = b.pageStart;
      buf.push(piece);
      bufEnd = b.pageEnd;
    }
  }
  flush();

  // Propagate page ranges up to parent sections.
  for (let i = sections.length - 1; i >= 0; i--) {
    const s = sections[i];
    if (s.parentOrd !== null) {
      const p = sections[s.parentOrd];
      p.pageEnd = Math.max(p.pageEnd, s.pageEnd);
    }
  }
  return { sections, chunks };
}

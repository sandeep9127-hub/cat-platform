import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

/**
 * Parse a DOCX into reading-order blocks: headings, paragraphs and tables,
 * with page numbers.
 *
 * - Images, drawings and text boxes are skipped entirely (the old pipeline
 *   stored base64 images as "text", 94% of its data).
 * - Page numbers come from the page-break markers Word saves when it last
 *   laid the document out (w:lastRenderedPageBreak) plus explicit page and
 *   section breaks, so they match what readers see when they open the file.
 * - Headings come from paragraph styles ("Heading 1".."Heading 6", "Title")
 *   or an outline level, resolved through styles.xml.
 */

export type Block =
  | { kind: "heading"; level: number; text: string; page: number }
  | { kind: "para"; text: string; pageStart: number; pageEnd: number; list: boolean }
  | { kind: "table"; rows: string[][]; pageStart: number; pageEnd: number };

type Node = Record<string, unknown>;

const MAX_DOCX_BYTES = 150 * 1024 * 1024; // the largest CAT report is ~34 MB, mostly images
const MAX_XML_BYTES = 60 * 1024 * 1024;   // document.xml text + markup, unpacked

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: false,
  // DOCX uses only the five predefined XML entities and numeric references.
  // The library's entity expansion has a hard cap (1,000) that long reports
  // exceed, so decode them ourselves; DTD/custom entities are never expanded.
  processEntities: false,
});

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] !== "#") return NAMED[e.toLowerCase()];
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
  });
}

const SKIP = new Set(["w:drawing", "w:pict", "w:object", "mc:AlternateContent", "w:txbxContent", "w:instrText", "w:delText", "w:fldSimple"]);

function tagOf(n: Node): string | undefined {
  return Object.keys(n).find((k) => k !== ":@");
}
function childrenOf(n: Node): Node[] {
  const t = tagOf(n);
  return t ? ((n[t] as Node[]) ?? []) : [];
}
function attr(n: Node, name: string): string | undefined {
  return ((n[":@"] as Record<string, string>) ?? {})[name];
}
function find(n: Node, tag: string): Node | undefined {
  return childrenOf(n).find((c) => tagOf(c) === tag);
}

type StyleInfo = { headingLevel: number | null; isList: boolean };

function readStyles(xml: string | undefined): Map<string, StyleInfo> {
  const map = new Map<string, StyleInfo>();
  if (!xml) return map;
  const root = parser.parse(xml) as Node[];
  const styles = root.flatMap((n) => (tagOf(n) === "w:styles" ? childrenOf(n) : []));
  for (const s of styles) {
    if (tagOf(s) !== "w:style") continue;
    const id = attr(s, "w:styleId");
    if (!id) continue;
    const name = (attr(find(s, "w:name") ?? {}, "w:val") ?? "").toLowerCase();
    const pPr = find(s, "w:pPr");
    const outline = pPr ? attr(find(pPr, "w:outlineLvl") ?? {}, "w:val") : undefined;
    let level: number | null = null;
    const m = name.match(/^heading\s*(\d)$/);
    if (m) level = Number(m[1]);
    else if (name === "title") level = 1;
    else if (outline !== undefined && Number(outline) < 6) level = Number(outline) + 1;
    map.set(id, { headingLevel: level, isList: /list/.test(name) });
  }
  return map;
}

/**
 * Inflate one zip entry as text, aborting as soon as more than MAX_XML_BYTES
 * have been produced (declared sizes in the zip directory can lie).
 */
async function readEntryCapped(zip: JSZip, name: string): Promise<string | undefined> {
  const entry = zip.file(name);
  if (!entry) return undefined;
  return new Promise<string>((resolve, reject) => {
    const parts: Uint8Array[] = [];
    let total = 0;
    // internalStream is part of JSZip's runtime API but missing from its typings.
    type ZipStream = {
      on(ev: "data", cb: (chunk: Uint8Array) => void): ZipStream;
      on(ev: "error", cb: (e: Error) => void): ZipStream;
      on(ev: "end", cb: () => void): ZipStream;
      pause(): ZipStream;
      resume(): ZipStream;
    };
    const stream = (entry as unknown as { internalStream(type: "uint8array"): ZipStream }).internalStream("uint8array");
    stream
      .on("data", (chunk: Uint8Array) => {
        total += chunk.length;
        if (total > MAX_XML_BYTES) {
          stream.pause();
          reject(new Error(`DOCX part ${name} too large when unpacked (> ${MAX_XML_BYTES} bytes)`));
          return;
        }
        parts.push(chunk);
      })
      .on("error", reject)
      .on("end", () => resolve(new TextDecoder().decode(Buffer.concat(parts))))
      .resume();
  });
}

export async function parseDocx(bytes: Uint8Array): Promise<{ blocks: Block[]; pageCount: number }> {
  if (bytes.length > MAX_DOCX_BYTES) throw new Error(`DOCX too large: ${bytes.length} bytes`);
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await readEntryCapped(zip, "word/document.xml");
  if (!docXml) throw new Error("Not a DOCX: word/document.xml missing");
  const styles = readStyles(await readEntryCapped(zip, "word/styles.xml"));

  const root = parser.parse(docXml) as Node[];
  const doc = root.find((n) => tagOf(n) === "w:document");
  const body = doc ? find(doc, "w:body") : undefined;
  if (!body) throw new Error("DOCX has no body");

  let page = 1;
  const blocks: Block[] = [];

  // Text of a paragraph; advances `page` on page-break markers inside it.
  const paragraphText = (p: Node): string => {
    let out = "";
    const walk = (n: Node) => {
      const t = tagOf(n);
      if (!t || SKIP.has(t)) return;
      if (t === "w:lastRenderedPageBreak") { page++; return; }
      if (t === "w:br") {
        if (attr(n, "w:type") === "page") page++;
        else out += "\n";
        return;
      }
      if (t === "w:tab") { out += "\t"; return; }
      if (t === "w:t") {
        for (const c of childrenOf(n)) if (typeof c["#text"] === "string" || typeof c["#text"] === "number") out += decodeXml(String(c["#text"]));
        return;
      }
      for (const c of childrenOf(n)) walk(c);
    };
    for (const c of childrenOf(p)) if (tagOf(c) !== "w:pPr") walk(c);
    return out.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
  };

  const visit = (n: Node) => {
    const t = tagOf(n);
    if (t === "w:p") {
      const pPr = find(n, "w:pPr");
      const styleId = pPr ? attr(find(pPr, "w:pStyle") ?? {}, "w:val") : undefined;
      const info = styleId ? styles.get(styleId) : undefined;
      const outline = pPr ? attr(find(pPr, "w:outlineLvl") ?? {}, "w:val") : undefined;
      const isList = !!(pPr && find(pPr, "w:numPr")) || !!info?.isList;
      const pageStart = page;
      const text = paragraphText(n);
      // A section break in the paragraph properties starts a new page after it.
      if (pPr && find(pPr, "w:sectPr")) page++;
      if (!text) return;
      const level = info?.headingLevel ?? (outline !== undefined && Number(outline) < 6 ? Number(outline) + 1 : null);
      if (level && text.length <= 200) blocks.push({ kind: "heading", level, text, page: pageStart });
      else blocks.push({ kind: "para", text, pageStart, pageEnd: page, list: isList });
      return;
    }
    if (t === "w:tbl") {
      const pageStart = page;
      const rows: string[][] = [];
      for (const tr of childrenOf(n)) {
        if (tagOf(tr) !== "w:tr") continue;
        const cells: string[] = [];
        for (const tc of childrenOf(tr)) {
          if (tagOf(tc) !== "w:tc") continue;
          const parts: string[] = [];
          for (const p of childrenOf(tc)) if (tagOf(p) === "w:p") { const x = paragraphText(p); if (x) parts.push(x); }
          cells.push(parts.join(" ").replace(/\s+/g, " ").trim());
        }
        if (cells.some(Boolean)) rows.push(cells);
      }
      if (rows.length) blocks.push({ kind: "table", rows, pageStart, pageEnd: page });
      return;
    }
    if (t === "w:sdt") {
      const content = find(n, "w:sdtContent");
      if (content) for (const c of childrenOf(content)) visit(c);
      return;
    }
  };
  for (const c of childrenOf(body)) visit(c);

  return { blocks, pageCount: page };
}

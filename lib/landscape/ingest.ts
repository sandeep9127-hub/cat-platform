import { sql } from "drizzle-orm";
import mammoth from "mammoth";
import { db } from "@/lib/db";

// convertToMarkdown exists at runtime but is missing from mammoth's TS types.
const convertToMarkdown = (
  mammoth as unknown as {
    convertToMarkdown: (
      input: { buffer: Buffer },
      opts?: unknown
    ) => Promise<{ value: string }>;
  }
).convertToMarkdown;

/**
 * Server-side landscape-report ingestion. Mirrors scripts/ingest-landscape.mjs
 * but operates on an in-memory buffer (uploaded via the admin) and APPENDS a
 * document rather than wiping the landscape — so a landscape can hold several
 * reports, and a single one can be removed. Narrative chunks are embedded with
 * NVIDIA nv-embedqa-e5-v5 and stored in landscape_document_chunks (pgvector),
 * which the chatbot already reads from. No redeploy, no external services.
 */

const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";
const CHUNK_TARGET_CHARS = 1000;
const CHUNK_OVERLAP_CHARS = 120;
const EMBED_CONCURRENCY = 6;

async function embedOne(text: string): Promise<number[]> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY missing");
  const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      input: [text],
      model: EMBED_MODEL,
      input_type: "passage",
      encoding_format: "float",
      truncate: "END",
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA embed failed: ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

/** Embed many strings with bounded concurrency (keeps us well under function limits). */
async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = new Array(texts.length);
  let cursor = 0;
  async function worker() {
    while (cursor < texts.length) {
      const i = cursor++;
      out[i] = await embedOne(texts[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(EMBED_CONCURRENCY, texts.length) }, worker));
  return out;
}

type Chunk = { text: string; section: string };

function chunkText(text: string): Chunk[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let buf = "";
  let bufSection = "";
  for (const p of paras) {
    const heading = p.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      if (buf) { chunks.push({ text: buf.trim(), section: bufSection }); buf = ""; }
      bufSection = heading[2].trim().slice(0, 240);
      continue;
    }
    if ((buf + "\n\n" + p).length > CHUNK_TARGET_CHARS && buf) {
      chunks.push({ text: buf.trim(), section: bufSection });
      buf = buf.slice(-CHUNK_OVERLAP_CHARS) + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) chunks.push({ text: buf.trim(), section: bufSection });
  return chunks.filter((c) => c.text.length > 100);
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await convertToMarkdown(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
      ],
    }
  );
  return value;
}

/** Extract text from a (digital, text-based) PDF via unpdf — serverless-native,
 *  no Python. Scanned/image PDFs would need OCR (a later MarkItDown upgrade). */
async function extractPdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

/** Pick the right extractor from the file name / mime. */
async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return extractPdf(buffer);
  return extractDocx(buffer);
}

export type IngestResult = { documentId: string; chunkCount: number; title: string };

/** Ingest one DOCX landscape report for a slug. Returns the new document + chunk count. */
export async function ingestLandscapeReport(opts: {
  slug: string;
  title: string;
  buffer: Buffer;
  fileName: string;
  year?: number;
}): Promise<IngestResult> {
  const { slug, title, buffer, fileName } = opts;
  const year = opts.year ?? new Date().getFullYear();

  const md = await extractText(buffer, fileName);
  const chunks = chunkText(md);
  if (chunks.length === 0) throw new Error("No extractable text found in this document.");

  const inserted = await db.execute(sql`
    INSERT INTO "cat".landscape_documents (landscape_slug, title, type, language, publication_year, is_published)
    VALUES (${slug}, ${title}, 'lip', 'english', ${year}, true)
    RETURNING id
  `);
  const documentId = (inserted as unknown as { rows: { id: string }[] }).rows[0].id;

  const embeddings = await embedAll(chunks.map((c) => c.text));

  for (let i = 0; i < chunks.length; i++) {
    const vec = `[${embeddings[i].join(",")}]`;
    await db.execute(sql`
      INSERT INTO "cat".landscape_document_chunks
        (document_id, landscape_slug, chunk_index, chunk_text, chunk_kind, section_path, embedding)
      VALUES (${documentId}, ${slug}, ${i}, ${chunks[i].text},
              'narrative'::"cat".landscape_chunk_kind, ${chunks[i].section || null}, ${vec}::vector)
    `);
  }

  return { documentId, chunkCount: chunks.length, title };
}

/** Remove a single ingested document and its chunks. */
export async function deleteLandscapeDocument(documentId: string): Promise<void> {
  await db.execute(sql`DELETE FROM "cat".landscape_document_chunks WHERE document_id = ${documentId}`);
  await db.execute(sql`DELETE FROM "cat".landscape_documents WHERE id = ${documentId}`);
}

export type LandscapeDocRow = {
  id: string;
  landscape_slug: string;
  title: string;
  type: string;
  publication_year: number | null;
  chunk_count: number;
};

/** List ingested documents (with chunk counts) for the admin, optionally by slug. */
export async function listLandscapeDocuments(slug?: string): Promise<LandscapeDocRow[]> {
  const r = slug
    ? await db.execute(sql`
        SELECT d.id, d.landscape_slug, d.title, d.type, d.publication_year,
               (SELECT count(*)::int FROM "cat".landscape_document_chunks c WHERE c.document_id = d.id) chunk_count
        FROM "cat".landscape_documents d WHERE d.landscape_slug = ${slug} ORDER BY d.title`)
    : await db.execute(sql`
        SELECT d.id, d.landscape_slug, d.title, d.type, d.publication_year,
               (SELECT count(*)::int FROM "cat".landscape_document_chunks c WHERE c.document_id = d.id) chunk_count
        FROM "cat".landscape_documents d ORDER BY d.landscape_slug, d.title`);
  return (r as unknown as { rows: LandscapeDocRow[] }).rows;
}

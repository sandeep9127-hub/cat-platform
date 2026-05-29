#!/usr/bin/env node
/**
 * One-shot ingestion of HLPE Report 14 (the agroecology principles source)
 * into the shared landscape_document_chunks table under the pseudo-slug
 * "hlpe", so the Hub assistant can answer principle questions from it.
 *
 * Extraction is done up front with poppler's `pdftotext -layout` into a
 * .txt; this script chunks that text, embeds each chunk via NVIDIA hosted
 * embedqa (same model the agent queries with), and inserts the rows.
 *
 * Usage:
 *   pdftotext -layout HLPE-Report-14_EN.pdf /tmp/hlpe.txt
 *   node scripts/ingest-hlpe.mjs /tmp/hlpe.txt
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import { promises as fs } from "node:fs";
import dns from "node:dns";

dns.setDefaultResultOrder("verbatim");

const SLUG = "hlpe";
const TXT_PATH = process.argv[2] || "/tmp/hlpe.txt";
const TITLE = "HLPE Report 14 · Agroecological and other innovative approaches (2019)";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_KEY) throw new Error("NVIDIA_API_KEY missing");

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  max: 4,
  idleTimeoutMillis: 20_000,
});

const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";
const CHUNK_TARGET_CHARS = 1100;
const CHUNK_OVERLAP_CHARS = 140;

async function embedOne(text, inputType = "passage") {
  const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${NVIDIA_KEY}` },
    body: JSON.stringify({
      input: [text],
      model: EMBED_MODEL,
      input_type: inputType,
      encoding_format: "float",
      truncate: "END",
    }),
  });
  if (!res.ok) throw new Error(`Embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * Clean the pdftotext output and chunk it. We detect section headings
 * heuristically: numbered headings ("2.1 Definitions"), all-caps lines,
 * and the report's chapter markers. Page-number lines and figure/table
 * captions are dropped to keep chunks readable.
 */
function looksLikeHeading(line) {
  const t = line.trim();
  if (t.length < 4 || t.length > 90) return false;
  // numbered: "2", "2.1", "3.4.2  Title"
  if (/^\d+(\.\d+){0,3}\s+\S/.test(t)) return true;
  // chapter/section words
  if (/^(CHAPTER|PART|SECTION|BOX|RECOMMENDATIONS?|CONCLUSION|INTRODUCTION|EXECUTIVE SUMMARY)\b/i.test(t)) return true;
  return false;
}

function chunkText(raw) {
  // Normalise: drop stray page numbers on their own line, collapse spaces
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => !/^\s*\d{1,3}\s*$/.test(l)); // bare page numbers

  // Reassemble into paragraphs on blank-line boundaries, tracking the
  // most recent heading as the section path.
  const paras = [];
  let buf = "";
  let section = "Front matter";
  for (const line of lines) {
    if (line.trim() === "") {
      if (buf.trim()) {
        paras.push({ text: buf.trim().replace(/\s{2,}/g, " "), section });
        buf = "";
      }
      continue;
    }
    if (looksLikeHeading(line) && !buf.trim()) {
      section = line.trim().slice(0, 200);
      continue;
    }
    buf += (buf ? " " : "") + line.trim();
  }
  if (buf.trim()) paras.push({ text: buf.trim().replace(/\s{2,}/g, " "), section });

  // Pack paragraphs into ~1100-char chunks with light overlap, keeping the
  // section label of the first paragraph in each chunk.
  const chunks = [];
  let cur = "";
  let curSection = section;
  for (const p of paras) {
    if (!cur) curSection = p.section;
    if ((cur + " " + p.text).length > CHUNK_TARGET_CHARS && cur) {
      chunks.push({ text: cur.trim(), section: curSection });
      cur = cur.slice(-CHUNK_OVERLAP_CHARS) + " " + p.text;
      curSection = p.section;
    } else {
      cur = cur ? cur + " " + p.text : p.text;
    }
  }
  if (cur.trim()) chunks.push({ text: cur.trim(), section: curSection });
  // Drop boilerplate-only and tiny chunks
  return chunks.filter((c) => c.text.length > 160);
}

async function main() {
  console.log(`\n→ Ingesting HLPE Report 14 (slug: ${SLUG})`);
  const raw = await fs.readFile(TXT_PATH, "utf8");
  console.log(`  read ${raw.length} chars from ${TXT_PATH}`);

  // 1. Idempotent: clear prior hlpe ingestion
  await pool.query(`DELETE FROM "cat".landscape_documents WHERE landscape_slug = $1`, [SLUG]);
  console.log("  cleared previous rows");

  // 2. Document row
  const { rows: docRows } = await pool.query(
    `INSERT INTO "cat".landscape_documents
       (landscape_slug, title, type, source_url, language, publication_year, is_published)
     VALUES ($1, $2, 'other'::"cat".landscape_doc_type, $3, 'english'::"cat".language, 2019, true)
     RETURNING id`,
    [SLUG, TITLE, "https://www.fao.org/3/ca5602en/ca5602en.pdf"]
  );
  const docId = docRows[0].id;
  console.log("  document inserted");

  // 3. Chunk
  const chunks = chunkText(raw);
  console.log(`  ${chunks.length} chunks`);

  // 4. Embed + insert in batches
  const BATCH = 8;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embs = [];
    for (const c of batch) embs.push(await embedOne(c.text, "passage"));
    const params = [];
    const values = batch
      .map((c, j) => {
        const base = j * 6;
        params.push(docId, SLUG, i + j, c.text, c.section || null, `[${embs[j].join(",")}]`);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 'narrative'::"cat".landscape_chunk_kind, $${base + 5}, $${base + 6}::vector)`;
      })
      .join(",");
    await pool.query(
      `INSERT INTO "cat".landscape_document_chunks
         (document_id, landscape_slug, chunk_index, chunk_text, chunk_kind, section_path, embedding)
       VALUES ${values}`,
      params
    );
    process.stdout.write(`  ${Math.min(i + BATCH, chunks.length)}/${chunks.length}\r`);
  }
  console.log(`\n  done — ${chunks.length} chunks embedded`);
  await pool.end();
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

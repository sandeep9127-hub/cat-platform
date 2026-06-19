/**
 * Ingest a "Chapter 7" impact-&-alignment workbook (AEP / SDG / Biodiversity /
 * NRM / Nutrition matrices) into the landscape RAG so Ask can cite which
 * interventions align to which agroecology principles, SDGs, biodiversity /
 * NRM / nutrition outcomes.
 *
 * Each sheet maps interventions (rows) → Y/N flags across that theme's
 * dimensions (columns). We flatten every intervention-row into one self-
 * contained sentence (theme + intervention + cause/effect + the dimensions it
 * positively affects), embed it, and store it under a `dataset`-type document
 * for the slug. Idempotent: clears prior dataset docs for the slug first, and
 * is separate from the lip/budget docs so a LIP re-ingest won't wipe it.
 *
 * Usage: node scripts/ingest-alignment.mjs <slug> <chapter7.xlsx>
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import ExcelJS from "exceljs";
import { Pool } from "pg";
import dns from "node:dns";
dns.setDefaultResultOrder("verbatim");

const [SLUG, XLSX] = process.argv.slice(2);
if (!SLUG || !XLSX) throw new Error("Usage: ingest-alignment.mjs <slug> <chapter7.xlsx>");

const NVIDIA_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_KEY) throw new Error("NVIDIA_API_KEY missing");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
});

const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";
async function embedOne(text, attempt = 0) {
  const MAX = 6;
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${NVIDIA_KEY}` },
      body: JSON.stringify({ input: [text], model: EMBED_MODEL, input_type: "passage", encoding_format: "float", truncate: "END" }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < MAX) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20_000)));
        return embedOne(text, attempt + 1);
      }
      throw new Error(`Embed ${res.status}: ${body}`);
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    if (attempt < MAX && /fetch failed|network|ECONN|ETIMEDOUT|socket|terminated/i.test(String(e?.message || e))) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20_000)));
      return embedOne(text, attempt + 1);
    }
    throw e;
  }
}

const txt = (cell) => (cell?.text ?? String(cell?.value ?? "")).trim();
const isY = (s) => /^y(es)?$/i.test(s.trim());

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX);

  const chunks = []; // { text, section }
  wb.eachSheet((ws) => {
    const title = txt(ws.getRow(1).getCell(1)) || ws.name;
    // Find the header row (has "Sr No" / "Intervention").
    let headerRn = 0;
    for (let r = 1; r <= Math.min(6, ws.rowCount); r++) {
      const row = ws.getRow(r);
      if (/^sr\.?\s*no/i.test(txt(row.getCell(1))) || /intervention/i.test(txt(row.getCell(2)))) { headerRn = r; break; }
    }
    if (!headerRn) return;
    const headerRow = ws.getRow(headerRn);
    const lastCol = ws.columnCount;
    // Dimension names live in cols 4..lastCol. A sub-header row (SDG names)
    // directly under the header has empty c1-c3 but text in c4 → merge it in.
    const subRow = ws.getRow(headerRn + 1);
    const hasSub = !txt(subRow.getCell(1)) && !txt(subRow.getCell(2)) && !!txt(subRow.getCell(4));
    const dimNames = [];
    for (let c = 4; c <= lastCol; c++) {
      let name = txt(headerRow.getCell(c));
      if (hasSub) { const sub = txt(subRow.getCell(c)); if (sub) name = name ? `${name} (${sub})` : sub; }
      dimNames[c] = name;
    }
    const dataStart = headerRn + (hasSub ? 2 : 1);
    for (let r = dataStart; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const intervention = txt(row.getCell(2));
      if (!intervention) continue;
      const effect = txt(row.getCell(3));
      const yes = [];
      for (let c = 4; c <= lastCol; c++) {
        if (dimNames[c] && isY(txt(row.getCell(c)))) yes.push(dimNames[c]);
      }
      const parts = [`${SLUG[0].toUpperCase() + SLUG.slice(1)} landscape — ${title}.`, `Intervention: ${intervention}.`];
      if (effect) parts.push(`Cause and effect: ${effect}.`);
      parts.push(`Positive impact on: ${yes.length ? yes.join(", ") : "none recorded"}.`);
      chunks.push({ text: parts.join(" "), section: `Chapter 7 — Impact & Alignment / ${title}` });
    }
  });

  console.log(`→ ${chunks.length} alignment chunks from ${chunks.length ? "" : "(none — check sheet structure)"}${XLSX.split("/").pop()}`);
  if (!chunks.length) { await pool.end(); return; }

  // Clear prior dataset docs for this slug (idempotent), then insert a fresh one.
  await pool.query(`DELETE FROM "cat".landscape_documents WHERE landscape_slug = $1 AND type = 'dataset'`, [SLUG]);
  const { rows } = await pool.query(
    `INSERT INTO "cat".landscape_documents (landscape_slug, title, type, language, publication_year, is_published)
     VALUES ($1, $2, 'dataset', 'english', 2026, true) RETURNING id`,
    [SLUG, "Impact & Alignment matrix (Chapter 7)"]
  );
  const docId = rows[0].id;

  console.log("  embedding via NVIDIA...");
  const BATCH = 8;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const slice = chunks.slice(i, i + BATCH);
    const embs = await Promise.all(slice.map((c) => embedOne(c.text)));
    const params = [];
    const values = slice
      .map((c, j) => {
        const b = j * 6;
        params.push(docId, SLUG, i + j, c.text, c.section, `[${embs[j].join(",")}]`);
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, 'narrative'::"cat".landscape_chunk_kind, $${b + 5}, $${b + 6}::vector)`;
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
  console.log(`\n✓ Done. ${chunks.length} alignment chunks embedded for ${SLUG}.`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

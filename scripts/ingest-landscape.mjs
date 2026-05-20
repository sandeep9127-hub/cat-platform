#!/usr/bin/env node
/**
 * One-shot landscape ingestion: takes a LIP DOCX and a budget XLSX,
 * extracts chunks + budget rows, embeds chunks via NVIDIA hosted embedqa,
 * upserts into landscape_documents / landscape_document_chunks /
 * landscape_budget_lines for a given landscape slug.
 *
 * Usage:
 *   node scripts/ingest-landscape.mjs <slug> <lip.docx> <budget.xlsx>
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import { promises as fs } from "node:fs";
import path from "node:path";
import dns from "node:dns";
import mammoth from "mammoth";
import ExcelJS from "exceljs";

dns.setDefaultResultOrder("verbatim");

const [, , SLUG, DOCX_PATH, XLSX_PATH] = process.argv;
if (!SLUG || !DOCX_PATH || !XLSX_PATH) {
  console.error("Usage: ingest-landscape.mjs <slug> <lip.docx> <budget.xlsx>");
  process.exit(1);
}

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
const EMBED_DIMS = 1024;
// NVIDIA embedqa caps individual inputs at 512 tokens (~1200 chars typically).
// We keep chunks comfortably under that.
const CHUNK_TARGET_CHARS = 1000;
const CHUNK_OVERLAP_CHARS = 120;

/** Embed a single string. NVIDIA's truncate=END handles slight overruns gracefully. */
async function embedOne(text, inputType = "passage") {
  const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${NVIDIA_KEY}`,
    },
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

async function embed(texts, inputType = "passage") {
  const out = [];
  for (const t of texts) {
    out.push(await embedOne(t, inputType));
  }
  return out;
}

/** Chunk a long text into ~1800-char windows on paragraph boundaries. */
function chunkText(text) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = "";
  let bufSection = "";
  for (const p of paras) {
    // Detect a heading from `#` markers we emit in extractDocx (e.g. "## Chapter 5: …")
    const headingMatch = p.match(/^(#{1,4})\s+(.*)/);
    if (headingMatch) {
      if (buf) {
        chunks.push({ text: buf.trim(), section: bufSection });
        buf = "";
      }
      bufSection = headingMatch[2].trim().slice(0, 240);
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

async function extractDocx(filePath) {
  const buf = await fs.readFile(filePath);
  // mammoth gives us Markdown-ish text with headings as #s.
  const opts = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
    ],
  };
  const { value } = await mammoth.convertToMarkdown({ buffer: buf }, opts);
  return value;
}

async function extractBudget(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet("5.2 Package Distribution");
  if (!sheet) throw new Error("Sheet '5.2 Package Distribution' not found");
  const rows = [];
  const numCols = sheet.actualColumnCount || 57;
  for (let r = 5; r <= sheet.actualRowCount; r++) {
    const row = sheet.getRow(r);
    if (!row.getCell(1).value && !row.getCell(2).value) continue;
    const num = (c) => {
      const v = row.getCell(c).value;
      if (v == null) return null;
      if (typeof v === "number") return v;
      if (v && typeof v === "object" && "result" in v) return Number(v.result);
      const n = Number(String(v).replace(/[,\s₹]/g, ""));
      return isFinite(n) ? n : null;
    };
    const str = (c) => {
      const v = row.getCell(c).value;
      if (v == null) return null;
      if (typeof v === "object" && "richText" in v) {
        return v.richText.map((t) => t.text).join("");
      }
      if (typeof v === "object" && "result" in v) return String(v.result);
      return String(v).trim().slice(0, 400) || null;
    };
    rows.push({
      cat_no: str(1),
      category: str(2),
      intervention: str(3),
      sno: str(4),
      subintervention: str(5),
      package: str(6),
      capital_cost: num(7),
      capital_description: str(8),
      recurring_cost: num(9),
      recurring_description: str(10),
      years: num(11),
      per_unit_cost: num(13),
      units: num(14),
      // Phase totals at end of sheet (cols 42-50)
      total_cost: num(42) ?? num(15),
      govt: num(43) ?? num(16),
      govt_scheme: str(44) ?? str(17),
      community: num(44) ?? num(18),
      investment_required: num(45) ?? num(19),
      grants: num(46) ?? num(20),
      returnable_grant: num(47) ?? num(21),
      outcome_finance: num(48) ?? num(22),
      debt: num(49) ?? num(23),
      impact_households: num(24),
      impact_hectares: num(25),
      impact_animals: num(26),
      climate_tag: str(52),
      equity_tag: str(53),
      gender_tag: str(54),
      economic_tag: str(55),
      institution_type: str(56),
      capital_type: str(57),
      row_index: r,
    });
  }
  return rows;
}

async function main() {
  const docxFull = path.resolve(DOCX_PATH);
  const xlsxFull = path.resolve(XLSX_PATH);
  const docTitle = path.basename(DOCX_PATH).replace(/\.[^.]+$/, "");
  const budgetTitle = path.basename(XLSX_PATH).replace(/\.[^.]+$/, "");

  console.log(`\n→ Ingesting Patratu landscape (${SLUG})`);
  console.log(`  LIP:    ${docxFull}`);
  console.log(`  budget: ${xlsxFull}`);

  // 1. Clear previous ingestion for this landscape (idempotent)
  await pool.query(`DELETE FROM "cat".landscape_budget_lines WHERE landscape_slug = $1`, [SLUG]);
  await pool.query(`DELETE FROM "cat".landscape_documents WHERE landscape_slug = $1`, [SLUG]);
  console.log("  cleared previous rows");

  // 2. Insert documents
  const { rows: docRows } = await pool.query(
    `INSERT INTO "cat".landscape_documents
       (landscape_slug, title, type, language, publication_year, is_published)
     VALUES ($1, $2, 'lip', 'english', 2026, true), ($1, $3, 'budget', 'english', 2026, true)
     RETURNING id, type`,
    [SLUG, docTitle, budgetTitle]
  );
  const lipDocId = docRows.find((d) => d.type === "lip").id;
  const budgetDocId = docRows.find((d) => d.type === "budget").id;
  console.log("  documents inserted");

  // 3. Extract + chunk LIP narrative
  console.log("  extracting LIP DOCX...");
  const md = await extractDocx(docxFull);
  const chunks = chunkText(md);
  console.log(`  ${chunks.length} narrative chunks`);

  // 4. Embed in batches
  console.log("  embedding chunks via NVIDIA...");
  const BATCH = 8;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const texts = batch.map((c) => c.text);
    const embs = await embed(texts, "passage");
    const params = [];
    const values = batch
      .map((c, j) => {
        const base = j * 6;
        params.push(
          lipDocId,
          SLUG,
          i + j,
          c.text,
          c.section || null,
          `[${embs[j].join(",")}]`
        );
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
  console.log(`  ${chunks.length}/${chunks.length} chunks embedded   `);

  // 5. Budget rows
  console.log("  extracting budget XLSX...");
  const budget = await extractBudget(xlsxFull);
  console.log(`  ${budget.length} budget rows`);
  for (const b of budget) {
    await pool.query(
      `INSERT INTO "cat".landscape_budget_lines
        (landscape_slug, source_document_id, category, category_no, intervention,
         subintervention, package, capital_cost_inr, capital_description,
         recurring_cost_inr, recurring_description, years, per_unit_cost_inr, units,
         total_intervention_cost_inr, govt_inr, govt_scheme, community_inr,
         investment_required_inr, grants_inr, returnable_grant_inr, outcome_finance_inr,
         debt_inr, impact_households, impact_hectares, impact_animals,
         climate_tag, equity_tag, gender_tag, economic_tag, institution_type, capital_type, row_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33)`,
      [
        SLUG,
        budgetDocId,
        b.category,
        b.cat_no,
        b.intervention,
        b.subintervention,
        b.package,
        b.capital_cost,
        b.capital_description,
        b.recurring_cost,
        b.recurring_description,
        b.years,
        b.per_unit_cost,
        b.units,
        b.total_cost,
        b.govt,
        b.govt_scheme,
        b.community,
        b.investment_required,
        b.grants,
        b.returnable_grant,
        b.outcome_finance,
        b.debt,
        b.impact_households,
        b.impact_hectares,
        b.impact_animals,
        b.climate_tag,
        b.equity_tag,
        b.gender_tag,
        b.economic_tag,
        b.institution_type,
        b.capital_type,
        b.row_index,
      ]
    );
  }
  console.log(`  ${budget.length} budget rows inserted`);

  // 6. Also embed budget summaries (one chunk per package) so RAG can answer budget questions
  console.log("  embedding budget summaries by package...");
  const { rows: pkgRows } = await pool.query(
    `SELECT package,
            SUM(total_intervention_cost_inr) AS total,
            SUM(govt_inr) AS govt,
            SUM(community_inr) AS community,
            SUM(investment_required_inr) AS investment,
            string_agg(DISTINCT intervention, '; ') AS interventions
     FROM "cat".landscape_budget_lines
     WHERE landscape_slug = $1 AND package IS NOT NULL
     GROUP BY package
     ORDER BY package`,
    [SLUG]
  );
  const budgetSummaries = pkgRows.map((r) => ({
    text: `Budget package: ${r.package}. Total intervention cost: ₹${Number(r.total ?? 0).toLocaleString("en-IN")}. Government convergence: ₹${Number(r.govt ?? 0).toLocaleString("en-IN")}. Community contribution: ₹${Number(r.community ?? 0).toLocaleString("en-IN")}. Investment required: ₹${Number(r.investment ?? 0).toLocaleString("en-IN")}. Interventions included: ${r.interventions ?? ""}.`,
    section: r.package,
  }));
  if (budgetSummaries.length) {
    const embs = await embed(budgetSummaries.map((b) => b.text), "passage");
    const params = [];
    const values = budgetSummaries
      .map((b, j) => {
        const base = j * 6;
        params.push(
          budgetDocId,
          SLUG,
          chunks.length + j,
          b.text,
          b.section,
          `[${embs[j].join(",")}]`
        );
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 'budget_summary'::"cat".landscape_chunk_kind, $${base + 5}, $${base + 6}::vector)`;
      })
      .join(",");
    await pool.query(
      `INSERT INTO "cat".landscape_document_chunks
         (document_id, landscape_slug, chunk_index, chunk_text, chunk_kind, section_path, embedding)
       VALUES ${values}`,
      params
    );
  }
  console.log(`  ${budgetSummaries.length} budget summaries embedded`);

  // 7. Update page_count
  await pool.query(`UPDATE "cat".landscape_documents SET page_count = $1 WHERE id = $2`, [
    chunks.length,
    lipDocId,
  ]);

  await pool.end();
  console.log(`\n✓ Done. ${chunks.length} narrative + ${budgetSummaries.length} budget chunks, ${budget.length} budget rows.`);
}

main().catch((e) => {
  console.error(e);
  pool.end();
  process.exit(1);
});

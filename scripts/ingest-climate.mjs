#!/usr/bin/env node
/**
 * Ingest a CAT C-GEM Climate Valuation workbook for one landscape.
 *
 * Reads the per-intervention PRIMARY-track climate values (sheet 03, section A,
 * which assigns each intervention to ONE track so totals don't double-count) and
 * the carbon-investor totals (sheet 04), and writes:
 *   - cat.landscape_climate_lines   (one row per primary intervention)
 *   - cat.landscape_climate_meta    (per-landscape carbon tonnage + $ + model)
 * Plus one climate-summary chunk into landscape_document_chunks so the Ask
 * assistant can answer climate-value questions.
 *
 * Idempotent: clears the slug's climate rows first. Writes to the same DB as the
 * budget/RAG ingest. Usage:
 *   node scripts/ingest-climate.mjs <slug> <CGEM.xlsx>
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";
import path from "node:path";
import dns from "node:dns";
import ExcelJS from "exceljs";

dns.setDefaultResultOrder("verbatim");

const [, , SLUG, XLSX_PATH] = process.argv;
if (!SLUG || !XLSX_PATH) {
  console.error("Usage: ingest-climate.mjs <slug> <CGEM.xlsx>");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL missing");
const NVIDIA_KEY = process.env.NVIDIA_API_KEY;

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 4 });
const EMBED_MODEL = "nvidia/nv-embedqa-e5-v5";

const num = (cell) => {
  const v = cell?.value;
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v) return Number(v.result);
  const n = Number(String(v).replace(/[,\s₹$]/g, ""));
  return isFinite(n) ? n : null;
};
const str = (cell) => {
  const v = cell?.value;
  if (v == null) return null;
  if (typeof v === "object" && "richText" in v) return v.richText.map((t) => t.text).join("");
  if (typeof v === "object" && "result" in v) return String(v.result);
  return String(v).trim() || null;
};
const fmtInt = (n) => (n == null ? null : Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

async function embedOne(text, attempt = 0) {
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${NVIDIA_KEY}` },
      body: JSON.stringify({ input: [text], model: EMBED_MODEL, input_type: "passage", encoding_format: "float", truncate: "END" }),
    });
    if (!res.ok) {
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 6) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20000)));
        return embedOne(text, attempt + 1);
      }
      throw new Error(`Embed ${res.status}`);
    }
    return (await res.json()).data[0].embedding;
  } catch (e) {
    if (attempt < 6 && /fetch failed|network|ECONN|ETIMEDOUT|socket|terminated/i.test(String(e?.message))) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20000)));
      return embedOne(text, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  const full = path.resolve(XLSX_PATH);
  console.log(`\n→ Ingesting climate valuation for ${SLUG}\n  ${full}`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "cat".landscape_climate_lines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      landscape_slug text NOT NULL,
      package text, sub_intervention text, primacy text,
      primary_value_7yr_inr bigint, row_index int, created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS landscape_climate_lines_slug_idx ON "cat".landscape_climate_lines (landscape_slug);
    CREATE TABLE IF NOT EXISTS "cat".landscape_climate_meta (
      landscape_slug text PRIMARY KEY,
      carbon_tco2e_7yr numeric, carbon_value_7yr_inr bigint, carbon_value_7yr_usd bigint,
      fx numeric, model_version text, updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS "cat".landscape_climate_view_lines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      landscape_slug text NOT NULL,
      lens text NOT NULL,                 -- carbon | adaptation | resilience
      sub_intervention text, unit text,
      value_7yr_inr bigint, tco2e_7yr numeric,
      metric text, tier text, row_index int, created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS landscape_climate_view_lines_idx ON "cat".landscape_climate_view_lines (landscape_slug, lens);
  `);
  // Allow the climate doc type + chunk kind (standalone so they autocommit before use).
  for (const ddl of [
    `ALTER TYPE "cat".landscape_doc_type ADD VALUE IF NOT EXISTS 'climate'`,
    `ALTER TYPE "cat".landscape_chunk_kind ADD VALUE IF NOT EXISTS 'climate_summary'`,
  ]) {
    await pool.query(ddl).catch((e) => console.log("  (enum note:", e.message, ")"));
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(full);

  // --- 03_Calculations, section A (primary, rows 6 until "PRIMARY TRACK TOTAL") ---
  const calc = wb.getWorksheet("03_Calculations");
  if (!calc) throw new Error("Sheet '03_Calculations' not found");
  const lines = [];
  for (let r = 6; r <= calc.actualRowCount; r++) {
    const row = calc.getRow(r);
    const c1 = str(row.getCell(1));
    if (c1 && /PRIMARY TRACK TOTAL/i.test(c1)) break; // end of section A
    const primacy = str(row.getCell(3));
    const val = num(row.getCell(8));
    if (!c1 || !primacy) continue;
    lines.push({
      package: c1,
      sub: str(row.getCell(2)),
      primacy,
      value: Math.round(val ?? 0),
      row_index: r,
    });
  }

  // --- 04_View_Carbon_Investor: sum main (primary carbon) lines before SUPPLEMENTARY ---
  const carbon = wb.getWorksheet("04_View_Carbon_Investor");
  let cTco2e = 0, cInr = 0, cUsd = 0;
  if (carbon) {
    let supp = false;
    for (let r = 6; r <= carbon.actualRowCount; r++) {
      const a = str(carbon.getRow(r).getCell(1));
      if (!a) continue;
      if (/SUPPLEMENTARY/i.test(a)) { supp = true; continue; }
      if (/SUBTOTAL|TOTAL/i.test(a)) continue;
      if (supp) continue;
      cInr += num(carbon.getRow(r).getCell(10)) ?? 0;
      cUsd += num(carbon.getRow(r).getCell(11)) ?? 0;
      cTco2e += num(carbon.getRow(r).getCell(12)) ?? 0;
    }
  }

  // --- 01_Assumptions: FX (row 14, col 2) ---
  const assum = wb.getWorksheet("01_Assumptions");
  const fx = assum ? num(assum.getRow(14).getCell(2)) : 84;

  // --- write ---
  await pool.query(`DELETE FROM "cat".landscape_climate_lines WHERE landscape_slug = $1`, [SLUG]);
  await pool.query(`DELETE FROM "cat".landscape_climate_meta WHERE landscape_slug = $1`, [SLUG]);
  await pool.query(`DELETE FROM "cat".landscape_climate_view_lines WHERE landscape_slug = $1`, [SLUG]);
  for (const l of lines) {
    await pool.query(
      `INSERT INTO "cat".landscape_climate_lines (landscape_slug, package, sub_intervention, primacy, primary_value_7yr_inr, row_index)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [SLUG, l.package, l.sub, l.primacy, l.value, l.row_index]
    );
  }
  await pool.query(
    `INSERT INTO "cat".landscape_climate_meta (landscape_slug, carbon_tco2e_7yr, carbon_value_7yr_inr, carbon_value_7yr_usd, fx, model_version)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [SLUG, Math.round(cTco2e), Math.round(cInr), Math.round(cUsd), fx, "C-GEM V3"]
  );

  // --- Funder-lens views (04/05/06): primary lines per lens, with a metric string ---
  const VIEWS = [
    {
      lens: "carbon", sheet: "04_View_Carbon_Investor", valueCol: 10,
      build: (row) => {
        const unit = str(row.getCell(2)), ghg = num(row.getCell(3)), subtype = str(row.getCell(4)), price = num(row.getCell(5)), tco = num(row.getCell(12));
        const metric = [ghg != null ? `${ghg} tCO₂e/${unit || "unit"}` : null, subtype, price != null ? `$${price}/t` : null].filter(Boolean).join(" · ");
        return { unit, tco2e: tco, metric, tier: str(row.getCell(14)) };
      },
    },
    {
      lens: "adaptation", sheet: "05_View_Adaptation_Finance", valueCol: 10,
      build: (row) => {
        const unit = str(row.getCell(2)), margin = num(row.getCell(5));
        return { unit, tco2e: null, metric: margin ? `₹${fmtInt(margin)}/${unit || "unit"} margin uplift` : null, tier: str(row.getCell(12)) };
      },
    },
    {
      lens: "resilience", sheet: "06_View_Resilience_Donor", valueCol: 10,
      build: (row) => {
        const unit = str(row.getCell(2)), prot = num(row.getCell(5)), shock = num(row.getCell(4));
        const metric = [prot ? `₹${fmtInt(prot)}/${unit || "HH"} protected` : null, shock != null ? `${Math.round(shock * 100)}% shock risk` : null].filter(Boolean).join(" · ");
        return { unit, tco2e: null, metric, tier: str(row.getCell(12)) };
      },
    },
  ];
  let viewCount = 0;
  for (const v of VIEWS) {
    const ws = wb.getWorksheet(v.sheet);
    if (!ws) continue;
    let supp = false;
    for (let r = 6; r <= ws.actualRowCount; r++) {
      const sub = str(ws.getRow(r).getCell(1));
      if (!sub) continue;
      if (/SUPPLEMENTARY/i.test(sub)) { supp = true; continue; }
      if (/SUBTOTAL|TOTAL/i.test(sub)) continue;
      if (supp) continue; // primary lines only (match the band totals)
      const value = Math.round(num(ws.getRow(r).getCell(v.valueCol)) ?? 0);
      const d = v.build(ws.getRow(r));
      await pool.query(
        `INSERT INTO "cat".landscape_climate_view_lines (landscape_slug, lens, sub_intervention, unit, value_7yr_inr, tco2e_7yr, metric, tier, row_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [SLUG, v.lens, sub, d.unit, value, d.tco2e ?? null, d.metric, d.tier, r]
      );
      viewCount++;
    }
  }
  console.log(`  ${viewCount} funder-lens view lines inserted`);

  const byTrack = {};
  for (const l of lines) byTrack[l.primacy] = (byTrack[l.primacy] ?? 0) + l.value;
  const total = lines.reduce((s, l) => s + l.value, 0);
  console.log(`  ${lines.length} primary climate lines inserted`);
  console.log(`  by track:`, Object.fromEntries(Object.entries(byTrack).map(([k, v]) => [k, `Rs ${(v / 1e7).toFixed(2)}cr`])));
  console.log(`  total Rs ${(total / 1e7).toFixed(2)}cr · carbon ${Math.round(cTco2e)} tCO2e / $${Math.round(cUsd).toLocaleString()}`);

  // --- RAG: one climate-value summary chunk (so Ask can answer) ---
  if (NVIDIA_KEY) {
    const cr = (n) => `₹${(n / 1e7).toFixed(2)} crore`;
    const text =
      `Climate valuation (C-GEM model, evidence-tiered) for the ${SLUG} landscape. ` +
      `Total modelled climate value over 7 years: ${cr(total)}, split by primary track — ` +
      Object.entries(byTrack).map(([k, v]) => `${k}: ${cr(v)}`).join(", ") + ". " +
      `Carbon/mitigation: approximately ${Math.round(cTco2e).toLocaleString()} tCO2e over 7 years, ` +
      `worth about $${Math.round(cUsd).toLocaleString()} (${cr(cInr)}) at benchmark carbon prices. ` +
      `Climate value is split across mitigation (carbon), adaptation (input savings, yield uplift, margin expansion), ` +
      `and resilience (household income protected against climate shocks).`;
    const { rows: docRows } = await pool.query(
      `INSERT INTO "cat".landscape_documents (landscape_slug, title, type, language, publication_year, is_published)
       VALUES ($1, $2, 'climate', 'english', 2026, true)
       RETURNING id`,
      [SLUG, `${SLUG} Climate Valuation (C-GEM)`]
    );
    const docId = docRows[0].id;
    // remove any prior climate chunks for this slug, then insert the fresh one
    await pool.query(
      `DELETE FROM "cat".landscape_document_chunks WHERE landscape_slug = $1 AND chunk_kind = 'climate_summary'`,
      [SLUG]
    ).catch(() => {});
    const emb = await embedOne(text);
    const maxIdxR = await pool.query(
      `SELECT coalesce(max(chunk_index), 0) + 1 AS n FROM "cat".landscape_document_chunks WHERE landscape_slug = $1`,
      [SLUG]
    );
    const idx = maxIdxR.rows[0].n;
    await pool.query(
      `INSERT INTO "cat".landscape_document_chunks (document_id, landscape_slug, chunk_index, chunk_text, chunk_kind, section_path, embedding)
       VALUES ($1,$2,$3,$4,'climate_summary'::"cat".landscape_chunk_kind,$5,$6::vector)`,
      [docId, SLUG, idx, text, "Climate Valuation", `[${emb.join(",")}]`]
    );
    console.log("  climate summary chunk embedded");
  }

  await pool.end();
  console.log("\n✓ Done.");
}

main().catch((e) => { console.error(e); pool.end(); process.exit(1); });

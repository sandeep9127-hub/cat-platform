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

/** Embed a single string. NVIDIA's truncate=END handles slight overruns gracefully.
 *  Retries transient upstream failures (429/5xx, network blips) with exponential
 *  backoff — the hosted endpoint occasionally 502s mid-batch on long documents. */
async function embedOne(text, inputType = "passage", attempt = 0) {
  const MAX_ATTEMPTS = 6;
  try {
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
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20_000)));
        return embedOne(text, inputType, attempt + 1);
      }
      throw new Error(`Embed ${res.status}: ${body}`);
    }
    const data = await res.json();
    return data.data[0].embedding;
  } catch (e) {
    const msg = String(e?.message || e);
    if (attempt < MAX_ATTEMPTS && /fetch failed|network|ECONN|ETIMEDOUT|socket|terminated/i.test(msg)) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 20_000)));
      return embedOne(text, inputType, attempt + 1);
    }
    throw e;
  }
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

const numCell = (row, c) => {
  const v = row.getCell(c).value;
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v) return Number(v.result);
  const n = Number(String(v).replace(/[,\s₹]/g, ""));
  return isFinite(n) ? n : null;
};
const strCell = (row, c) => {
  const v = row.getCell(c).value;
  if (v == null) return null;
  if (typeof v === "object" && "richText" in v) return v.richText.map((t) => t.text).join("");
  if (typeof v === "object" && "result" in v) return String(v.result);
  return String(v).trim().slice(0, 400) || null;
};

async function extractBudget(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  // Newer workbooks split the line-item budget ("5.2") from the thematic grouping
  // ("Thematic Investment"); older ones used a single "5.2 Package Distribution".
  // The latest export renames the line-item sheet to "Landscape Clean" and shifts
  // its columns (7-year totals at c34-c37, tags at c40-c45, package label in c6) —
  // handled by the header-resolved branch below.
  const sheet =
    wb.getWorksheet("5.2") ||
    wb.getWorksheet("5.2 Package Distribution") ||
    wb.getWorksheet("Landscape Clean");
  if (!sheet)
    throw new Error("Budget sheet '5.2' / '5.2 Package Distribution' / 'Landscape Clean' not found");

  // Map each Original Sub-Intervention -> its thematic delivery package (the
  // grouping shown as "delivery packages by share of plan"). In the 5.2 sheet
  // col6 is the Original Sub-Intervention; the thematic name lives in the
  // "Thematic Investment" sheet (col6), keyed there by Original Sub-Intervention
  // in col46. Falls back to the broad category when no thematic match exists.
  // Two lookups from the Thematic Investment sheet: by Original Sub-Intervention
  // (col46) AND by Sub-Intervention (col5). Some lines (e.g. Technical Assistance
  // cadres) have a blank/None Original Sub-Intervention, so the col5 fallback is
  // what resolves them to their thematic package instead of falling back to the
  // raw category label.
  const tiSheet = wb.getWorksheet("Thematic Investment");
  const thematicByOrig = new Map();
  const thematicBySub = new Map();
  if (tiSheet) {
    for (let r = 4; r <= tiSheet.actualRowCount; r++) {
      const trow = tiSheet.getRow(r);
      const thematic = strCell(trow, 6);
      if (!thematic || thematic.trim().toLowerCase() === "none") continue;
      const orig = strCell(trow, 46);
      const sub = strCell(trow, 5);
      if (orig) thematicByOrig.set(orig.trim().toLowerCase(), thematic.trim());
      if (sub) thematicBySub.set(sub.trim().toLowerCase(), thematic.trim());
    }
  }

  // Per-thematic financing instrument split, parsed from the "Instrument Mix"
  // sheet (e.g. "70% Grant / 30% RG", "100% Debt"). Newer workbooks express the
  // catalytic split at the thematic level rather than per budget line — leaving
  // the line-level grant/RG/debt columns blank — so we distribute each line's
  // investment_required across instruments using its thematic's mix. Without
  // this the "Who pays" panel would omit ~2/3 of the plan.
  const mixByThematic = new Map();
  const mixSheet = wb.getWorksheet("Instrument Mix ") || wb.getWorksheet("Instrument Mix");
  if (mixSheet) {
    for (let r = 2; r <= mixSheet.actualRowCount; r++) {
      const th = strCell(mixSheet.getRow(r), 1);
      const mixStr = strCell(mixSheet.getRow(r), 12);
      if (!th || !mixStr) continue;
      const frac = { grant: 0, rg: 0, debt: 0, obf: 0 };
      for (const part of mixStr.split("/")) {
        const m = part.match(/(\d+(?:\.\d+)?)\s*%\s*(returnable|rg|debt|obf|outcome|grant)/i);
        if (!m) continue;
        const p = Number(m[1]) / 100;
        const label = m[2].toLowerCase();
        if (label.startsWith("rg") || label.startsWith("return")) frac.rg += p;
        else if (label.startsWith("debt")) frac.debt += p;
        else if (label.startsWith("obf") || label.startsWith("outcome")) frac.obf += p;
        else frac.grant += p;
      }
      mixByThematic.set(th.trim().toLowerCase(), frac);
    }
  }

  // --- "Landscape Clean" layout (header-resolved columns) ----------------
  // This export shifts every column relative to the legacy "5.2" sheet, so we
  // resolve indices by matching the header row (row 4) rather than hard-coding
  // them. The package label sits directly in the line sheet (c6); 7-year totals
  // live in the "...P1+P2" columns; grant/RG/debt come from the thematic mix.
  const headerRow = sheet.getRow(4);
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const findCol = (re) => {
    for (let c = 1; c <= sheet.actualColumnCount; c++) {
      if (re.test(norm(strCell(headerRow, c)))) return c;
    }
    return null;
  };
  const projTotalCol = findCol(/total intervention cost for project period/);
  if (projTotalCol) {
    const col = {
      catNo: findCol(/^cat no/),
      category: findCol(/^category$/),
      intervention: findCol(/^intervention$/),
      sno: findCol(/^s\.? ?no/),
      sub: findCol(/^sub intervention/),
      pkg: findCol(/^thematic investment$/),
      capital: findCol(/^capital ?\/? ?one-time cost/),
      capDesc: findCol(/^description capital/),
      recurring: findCol(/^per year recurring cost/),
      recDesc: findCol(/^description recurring/),
      years: findCol(/^no of years/),
      perUnit: findCol(/^total per unit cost/),
      units: findCol(/^no of units-p1/),
      total: projTotalCol,
      govt: findCol(/^total govt-p1\+p2/),
      community: findCol(/^total community-p1\+p2/),
      invest: findCol(/^total investment required-p1\+p2/),
      govtScheme: findCol(/^govt scheme description -?p1/),
      hhP1: findCol(/^impact no household-p1/),
      hhP2: findCol(/^impact no household-p2/),
      haP1: findCol(/^impact no hectares-p1/),
      haP2: findCol(/^impact no hectares-p2/),
      anP1: findCol(/^impact no animals-p1/),
      anP2: findCol(/^impact no animals-p2/),
      climate: findCol(/^climate$/),
      equity: findCol(/^equity$/),
      gender: findCol(/^gender$/),
      economic: findCol(/^economic purpose/),
      institution: findCol(/^institution type/),
      capitalType: findCol(/^capital contributed to/),
    };
    const cleanRows = [];
    for (let r = 5; r <= sheet.actualRowCount; r++) {
      const row = sheet.getRow(r);
      if (!row.getCell(1).value && !row.getCell(2).value) continue;
      const sub = col.sub ? strCell(row, col.sub) : null;
      const category = col.category ? strCell(row, col.category) : null;
      // Skip any trailing "Grand Total" summary row (no sub-intervention).
      if (!sub && /grand total/i.test(category || "")) continue;
      const n = (c) => (c ? numCell(row, c) : null);
      const s = (c) => (c ? strCell(row, c) : null);
      const sum2 = (a, b) => {
        const t = (n(a) || 0) + (n(b) || 0);
        return t || null;
      };
      const pkg = s(col.pkg) || category;
      const investment = n(col.invest) ?? 0;
      // No line-level instrument split in this layout — distribute the line's
      // investment_required across instruments using its thematic mix.
      let grants = null,
        returnable = null,
        outcome = null,
        debt = null;
      if (investment > 0) {
        const frac =
          mixByThematic.get(String(pkg).trim().toLowerCase()) || { grant: 1, rg: 0, debt: 0, obf: 0 };
        grants = Math.round(investment * frac.grant) || null;
        returnable = Math.round(investment * frac.rg) || null;
        debt = Math.round(investment * frac.debt) || null;
        outcome = Math.round(investment * frac.obf) || null;
      }
      cleanRows.push({
        cat_no: s(col.catNo),
        category,
        intervention: s(col.intervention),
        sno: s(col.sno),
        subintervention: sub,
        package: pkg,
        capital_cost: n(col.capital),
        capital_description: s(col.capDesc),
        recurring_cost: n(col.recurring),
        recurring_description: s(col.recDesc),
        years: n(col.years),
        per_unit_cost: n(col.perUnit),
        units: n(col.units),
        total_cost: n(col.total),
        govt: n(col.govt),
        govt_scheme: s(col.govtScheme),
        community: n(col.community),
        investment_required: investment || null,
        grants,
        returnable_grant: returnable,
        outcome_finance: outcome,
        debt,
        impact_households: sum2(col.hhP1, col.hhP2),
        impact_hectares: sum2(col.haP1, col.haP2),
        impact_animals: sum2(col.anP1, col.anP2),
        climate_tag: s(col.climate),
        equity_tag: s(col.equity),
        gender_tag: s(col.gender),
        economic_tag: s(col.economic),
        institution_type: s(col.institution),
        capital_type: s(col.capitalType),
        row_index: r,
      });
    }
    return cleanRows;
  }

  // --- Legacy "5.2" layout (unchanged) -----------------------------------
  const rows = [];
  for (let r = 5; r <= sheet.actualRowCount; r++) {
    const row = sheet.getRow(r);
    if (!row.getCell(1).value && !row.getCell(2).value) continue;
    const origSub = strCell(row, 6);
    const subInt = strCell(row, 5);
    const pkg =
      (origSub && thematicByOrig.get(origSub.trim().toLowerCase())) ||
      (subInt && thematicBySub.get(subInt.trim().toLowerCase())) ||
      strCell(row, 2);
    const sumImpact = (a, b) => {
      const t = (numCell(row, a) || 0) + (numCell(row, b) || 0);
      return t || null;
    };
    const investment = numCell(row, 45) ?? numCell(row, 19) ?? 0;
    // Prefer explicit line-level instrument columns; otherwise split the
    // investment_required across instruments using the thematic mix.
    let grants = numCell(row, 46) ?? numCell(row, 20);
    let returnable = numCell(row, 47) ?? numCell(row, 21);
    let outcome = numCell(row, 48) ?? numCell(row, 22);
    let debt = numCell(row, 49) ?? numCell(row, 23);
    const haveLineSplit = [grants, returnable, outcome, debt].some((x) => x != null && x !== 0);
    if (!haveLineSplit && investment > 0) {
      const frac = mixByThematic.get(String(pkg).trim().toLowerCase()) || { grant: 1, rg: 0, debt: 0, obf: 0 };
      grants = Math.round(investment * frac.grant) || null;
      returnable = Math.round(investment * frac.rg) || null;
      debt = Math.round(investment * frac.debt) || null;
      outcome = Math.round(investment * frac.obf) || null;
    }
    rows.push({
      cat_no: strCell(row, 1),
      category: strCell(row, 2),
      intervention: strCell(row, 3),
      sno: strCell(row, 4),
      subintervention: strCell(row, 5),
      package: pkg,
      capital_cost: numCell(row, 7),
      capital_description: strCell(row, 8),
      recurring_cost: numCell(row, 9),
      recurring_description: strCell(row, 10),
      years: numCell(row, 11),
      per_unit_cost: numCell(row, 13),
      units: numCell(row, 14),
      // Project-period financing totals (cols 42-49)
      total_cost: numCell(row, 42) ?? numCell(row, 15),
      govt: numCell(row, 43) ?? numCell(row, 16),
      govt_scheme: strCell(row, 17),
      community: numCell(row, 44) ?? numCell(row, 18),
      investment_required: investment || null,
      grants,
      returnable_grant: returnable,
      outcome_finance: outcome,
      debt,
      // Impact = phase 1 (24-26) + phase 2 (38-40)
      impact_households: sumImpact(24, 38),
      impact_hectares: sumImpact(25, 39),
      impact_animals: sumImpact(26, 40),
      climate_tag: strCell(row, 52),
      equity_tag: strCell(row, 53),
      gender_tag: strCell(row, 54),
      economic_tag: strCell(row, 55),
      institution_type: strCell(row, 56),
      capital_type: strCell(row, 57),
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

  console.log(`\n→ Ingesting ${SLUG} landscape`);
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

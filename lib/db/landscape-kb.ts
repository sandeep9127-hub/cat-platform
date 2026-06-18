import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Drizzle's node-postgres adapter returns a pg.QueryResult ({ rows, rowCount, ... }).
 * Some other drivers in the wild return the rows array directly. Normalise both.
 */
function rowsOf<T>(r: unknown): T[] {
  if (!r) return [];
  if (Array.isArray(r)) return r as T[];
  const obj = r as { rows?: T[] };
  return Array.isArray(obj.rows) ? obj.rows : [];
}

export async function landscapeHasLip(slug: string): Promise<boolean> {
  const r = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM "cat".landscape_documents WHERE landscape_slug = ${slug} AND is_published = true`
  );
  const rows = rowsOf<{ n: number }>(r);
  return (rows[0]?.n ?? 0) > 0;
}

export type LandscapeDocument = {
  id: string;
  title: string;
  type: string;
  publicationYear: number | null;
  pageCount: number | null;
  language: string;
  uploadedAt: Date;
};

export async function listLandscapeDocuments(slug: string): Promise<LandscapeDocument[]> {
  const r = await db.execute(
    sql`SELECT id, title, type::text AS type, publication_year AS "publicationYear",
              page_count AS "pageCount", language::text AS language, uploaded_at AS "uploadedAt"
        FROM "cat".landscape_documents
        WHERE landscape_slug = ${slug} AND is_published = true
        ORDER BY uploaded_at DESC`
  );
  return rowsOf<LandscapeDocument>(r);
}

export type BudgetLine = {
  id: string;
  category: string | null;
  categoryNo: string | null;
  intervention: string | null;
  subintervention: string | null;
  package: string | null;
  capitalCostInr: string | null;
  recurringCostInr: string | null;
  years: number | null;
  perUnitCostInr: string | null;
  units: string | null;
  totalCostInr: string | null;
  govtInr: string | null;
  communityInr: string | null;
  investmentRequiredInr: string | null;
  grantsInr: string | null;
  returnableGrantInr: string | null;
  outcomeFinanceInr: string | null;
  debtInr: string | null;
  impactHouseholds: string | null;
  impactHectares: string | null;
  impactAnimals: string | null;
  climateTag: string | null;
  equityTag: string | null;
  genderTag: string | null;
  economicTag: string | null;
  capitalType: string | null;
  institutionType: string | null;
  // Per-phase split (early phase = Yr 1-3 or 1-4; late phase = the rest).
  phase1TotalCostInr: string | null;
  phase2TotalCostInr: string | null;
  phase1GovtInr: string | null;
  phase2GovtInr: string | null;
  phase1CommunityInr: string | null;
  phase2CommunityInr: string | null;
  phase1InvestmentRequiredInr: string | null;
  phase2InvestmentRequiredInr: string | null;
  phase1Label: string | null;
  phase2Label: string | null;
};

export async function listBudgetLines(slug: string): Promise<BudgetLine[]> {
  const r = await db.execute(
    sql`SELECT id, category, category_no AS "categoryNo", intervention, subintervention,
              package, capital_cost_inr AS "capitalCostInr",
              recurring_cost_inr AS "recurringCostInr", years,
              per_unit_cost_inr AS "perUnitCostInr", units::text AS units,
              total_intervention_cost_inr AS "totalCostInr",
              govt_inr AS "govtInr", community_inr AS "communityInr",
              investment_required_inr AS "investmentRequiredInr",
              grants_inr AS "grantsInr", returnable_grant_inr AS "returnableGrantInr",
              outcome_finance_inr AS "outcomeFinanceInr", debt_inr AS "debtInr",
              impact_households AS "impactHouseholds", impact_hectares AS "impactHectares",
              impact_animals AS "impactAnimals",
              climate_tag AS "climateTag", equity_tag AS "equityTag", gender_tag AS "genderTag",
              economic_tag AS "economicTag", capital_type AS "capitalType",
              institution_type AS "institutionType",
              phase1_total_cost_inr AS "phase1TotalCostInr", phase2_total_cost_inr AS "phase2TotalCostInr",
              phase1_govt_inr AS "phase1GovtInr", phase2_govt_inr AS "phase2GovtInr",
              phase1_community_inr AS "phase1CommunityInr", phase2_community_inr AS "phase2CommunityInr",
              phase1_investment_required_inr AS "phase1InvestmentRequiredInr",
              phase2_investment_required_inr AS "phase2InvestmentRequiredInr",
              phase1_label AS "phase1Label", phase2_label AS "phase2Label"
        FROM "cat".landscape_budget_lines
        WHERE landscape_slug = ${slug}
        ORDER BY category_no, row_index`
  );
  return rowsOf<BudgetLine>(r);
}

export type BudgetSummary = {
  totalCostInr: number;
  govtInr: number;
  communityInr: number;
  investmentRequiredInr: number;
  grantsInr: number;
  returnableGrantInr: number;
  outcomeFinanceInr: number;
  debtInr: number;
  byCategory: { category: string; total: number; investment: number }[];
  byPackage: { package: string; total: number; investment: number }[];
};

export async function budgetSummary(slug: string): Promise<BudgetSummary> {
  const totalsR = await db.execute(
    sql`SELECT
          coalesce(SUM(total_intervention_cost_inr), 0) AS total,
          coalesce(SUM(govt_inr), 0) AS govt,
          coalesce(SUM(community_inr), 0) AS community,
          coalesce(SUM(investment_required_inr), 0) AS investment,
          coalesce(SUM(grants_inr), 0) AS grants,
          coalesce(SUM(returnable_grant_inr), 0) AS returnable,
          coalesce(SUM(outcome_finance_inr), 0) AS outcome,
          coalesce(SUM(debt_inr), 0) AS debt
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}`
  );
  const t = rowsOf<Record<string, string>>(totalsR)[0] ?? {};
  const byCatR = await db.execute(
    sql`SELECT coalesce(category, '(uncategorised)') AS category,
              SUM(total_intervention_cost_inr) AS total,
              SUM(investment_required_inr) AS investment
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}
        GROUP BY category ORDER BY SUM(total_intervention_cost_inr) DESC NULLS LAST`
  );
  const byPkgR = await db.execute(
    sql`SELECT coalesce(package, '(unassigned)') AS package,
              SUM(total_intervention_cost_inr) AS total,
              SUM(investment_required_inr) AS investment
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}
        GROUP BY package ORDER BY SUM(total_intervention_cost_inr) DESC NULLS LAST`
  );
  return {
    totalCostInr: Number(t.total ?? 0),
    govtInr: Number(t.govt ?? 0),
    communityInr: Number(t.community ?? 0),
    investmentRequiredInr: Number(t.investment ?? 0),
    grantsInr: Number(t.grants ?? 0),
    returnableGrantInr: Number(t.returnable ?? 0),
    outcomeFinanceInr: Number(t.outcome ?? 0),
    debtInr: Number(t.debt ?? 0),
    byCategory: rowsOf<{ category: string; total: string; investment: string }>(byCatR).map((r) => ({
      category: r.category,
      total: Number(r.total ?? 0),
      investment: Number(r.investment ?? 0),
    })),
    byPackage: rowsOf<{ package: string; total: string; investment: string }>(byPkgR).map((r) => ({
      package: r.package,
      total: Number(r.total ?? 0),
      investment: Number(r.investment ?? 0),
    })),
  };
}

/**
 * Which landscape slugs currently have ingested (embedded) chunks. This is what
 * lets the Ask scope filter light up automatically: upload a landscape plan,
 * its chunks land in this table, and it becomes a selectable, searchable scope
 * with no code change. (The pseudo-slug "hlpe" — the principles report — is a
 * knowledge base, not a landscape, and is filtered out by callers via LANDSCAPES.)
 */
export async function getIngestedLandscapeSlugs(): Promise<string[]> {
  const r = await db.execute<{ slug: string }>(
    sql`SELECT DISTINCT landscape_slug AS slug FROM "cat".landscape_document_chunks`
  );
  return rowsOf<{ slug: string }>(r).map((x) => x.slug);
}

/**
 * Everything the /insights window needs for one landscape, in a single trip.
 * Pure structured budget data (high accuracy, hand-controlled) — no scraped
 * magnitudes. Note: per-line impact_* sums are CUMULATIVE across interventions
 * (a household appears in several lines), so callers must label them as
 * "engagements", never as unique reach (use the landscape profile for that).
 */
export type LandscapeInsights = {
  totals: {
    total: number;
    govt: number;
    community: number;
    investment: number;
    grants: number;
    returnable: number;
    outcome: number;
    debt: number;
    householdEngagements: number;
    hectares: number;
    animals: number;
    lineCount: number;
  };
  byCategory: {
    category: string;
    total: number;
    investment: number;
    householdEngagements: number;
    hectares: number;
    lines: number;
  }[];
  byPackage: { package: string; total: number }[];
  lines: {
    category: string | null;
    intervention: string | null;
    package: string | null;
    total: number;
    investment: number;
    households: number;
    hectares: number;
  }[];
};

export async function landscapeInsights(slug: string): Promise<LandscapeInsights> {
  const num = (v: unknown) => Number(v ?? 0);
  const totR = await db.execute(
    sql`SELECT
          coalesce(SUM(total_intervention_cost_inr),0) total,
          coalesce(SUM(govt_inr),0) govt,
          coalesce(SUM(community_inr),0) community,
          coalesce(SUM(investment_required_inr),0) investment,
          coalesce(SUM(grants_inr),0) grants,
          coalesce(SUM(returnable_grant_inr),0) returnable,
          coalesce(SUM(outcome_finance_inr),0) outcome,
          coalesce(SUM(debt_inr),0) debt,
          coalesce(SUM(impact_households),0) hh,
          coalesce(SUM(impact_hectares),0) ha,
          coalesce(SUM(impact_animals),0) animals,
          count(*) lines
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}`
  );
  const t = rowsOf<Record<string, string>>(totR)[0] ?? {};
  const catR = await db.execute(
    sql`SELECT coalesce(category,'Uncategorised') category, count(*) lines,
          coalesce(SUM(total_intervention_cost_inr),0) total,
          coalesce(SUM(investment_required_inr),0) investment,
          coalesce(SUM(impact_households),0) hh,
          coalesce(SUM(impact_hectares),0) ha
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}
        GROUP BY category ORDER BY SUM(total_intervention_cost_inr) DESC NULLS LAST`
  );
  const pkgR = await db.execute(
    sql`SELECT coalesce(package,'Unassigned') package,
          coalesce(SUM(total_intervention_cost_inr),0) total
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}
        GROUP BY package ORDER BY SUM(total_intervention_cost_inr) DESC NULLS LAST`
  );
  const lineR = await db.execute(
    sql`SELECT category, intervention, package,
          coalesce(total_intervention_cost_inr,0) total,
          coalesce(investment_required_inr,0) investment,
          coalesce(impact_households,0) households,
          coalesce(impact_hectares,0) hectares
        FROM "cat".landscape_budget_lines WHERE landscape_slug = ${slug}
        ORDER BY category_no, row_index`
  );
  return {
    totals: {
      total: num(t.total), govt: num(t.govt), community: num(t.community),
      investment: num(t.investment), grants: num(t.grants), returnable: num(t.returnable),
      outcome: num(t.outcome), debt: num(t.debt),
      householdEngagements: num(t.hh), hectares: num(t.ha), animals: num(t.animals),
      lineCount: num(t.lines),
    },
    byCategory: rowsOf<Record<string, string>>(catR).map((r) => ({
      category: r.category, total: num(r.total), investment: num(r.investment),
      householdEngagements: num(r.hh), hectares: num(r.ha), lines: num(r.lines),
    })),
    byPackage: rowsOf<Record<string, string>>(pkgR).map((r) => ({
      package: r.package, total: num(r.total),
    })),
    lines: rowsOf<Record<string, string>>(lineR).map((r) => ({
      category: r.category ?? null, intervention: r.intervention ?? null, package: r.package ?? null,
      total: num(r.total), investment: num(r.investment),
      households: num(r.households), hectares: num(r.hectares),
    })),
  };
}

/** Vector search across chunks scoped to a landscape. */
export async function searchLandscapeChunks(
  slug: string,
  queryEmbedding: number[],
  limit = 8
) {
  const r = await db.execute(
    sql`SELECT id, document_id AS "documentId", chunk_text AS "chunkText",
              chunk_kind::text AS "chunkKind", section_path AS "sectionPath",
              1 - (embedding <=> ${`[${queryEmbedding.join(",")}]`}::vector) AS score
        FROM "cat".landscape_document_chunks
        WHERE landscape_slug = ${slug}
        ORDER BY embedding <=> ${`[${queryEmbedding.join(",")}]`}::vector
        LIMIT ${limit}`
  );
  return rowsOf<{
    id: string;
    documentId: string;
    chunkText: string;
    chunkKind: string;
    sectionPath: string | null;
    score: number;
  }>(r);
}

export type ClimateSummary = {
  /** Modelled 7-year climate value, in INR, by primary track. */
  totalInr: number;
  mitigationInr: number;
  adaptationInr: number;
  resilienceInr: number;
  /** Carbon (mitigation) specifics for the carbon-investor callout. */
  carbonTco2e7yr: number;
  carbonValueInr: number;
  carbonValueUsd: number;
  /** All-tracks 7-yr GHG (incl. co-benefit carbon) — the full footprint. */
  ghgTotalTco2e: number;
  /** Tonnes on a registry pathway today; the rest is shadow-priced (needs MRV). */
  carbonCreditableTco2e: number;
  /** Non-primary-track value the same interventions also generate; disclosed, not summed. */
  cobenefitTotalInr: number;
  modelVersion: string | null;
};

/**
 * Per-landscape climate valuation. Aggregates the per-intervention
 * PRIMARY-track values (no double-counting) into the three tracks, and reads the
 * carbon tonnage/$ from the meta row. Returns null if the landscape has no
 * climate valuation loaded yet, so the page can hide the section.
 */
export async function climateSummary(slug: string): Promise<ClimateSummary | null> {
  const byTrackR = await db.execute(
    sql`SELECT primacy, coalesce(SUM(primary_value_7yr_inr), 0) AS v
        FROM "cat".landscape_climate_lines WHERE landscape_slug = ${slug}
        GROUP BY primacy`
  );
  const tracks = rowsOf<{ primacy: string; v: string }>(byTrackR);
  if (tracks.length === 0) return null;
  const pick = (re: RegExp) =>
    tracks.filter((t) => re.test(t.primacy || "")).reduce((s, t) => s + Number(t.v ?? 0), 0);
  const mitigationInr = pick(/mitigation/i);
  const adaptationInr = pick(/adaptation/i);
  const resilienceInr = pick(/resilience/i);

  const metaR = await db.execute(
    sql`SELECT carbon_tco2e_7yr, carbon_value_7yr_inr, carbon_value_7yr_usd, model_version,
               ghg_total_tco2e, carbon_creditable_tco2e, cobenefit_total_inr
        FROM "cat".landscape_climate_meta WHERE landscape_slug = ${slug}`
  );
  const m = rowsOf<Record<string, string>>(metaR)[0] ?? {};
  return {
    totalInr: mitigationInr + adaptationInr + resilienceInr,
    mitigationInr,
    adaptationInr,
    resilienceInr,
    carbonTco2e7yr: Number(m.carbon_tco2e_7yr ?? 0),
    carbonValueInr: Number(m.carbon_value_7yr_inr ?? 0),
    carbonValueUsd: Number(m.carbon_value_7yr_usd ?? 0),
    ghgTotalTco2e: Number(m.ghg_total_tco2e ?? 0),
    carbonCreditableTco2e: Number(m.carbon_creditable_tco2e ?? 0),
    cobenefitTotalInr: Number(m.cobenefit_total_inr ?? 0),
    modelVersion: (m.model_version as string) ?? null,
  };
}

/** Cheap check: does this landscape have a climate valuation loaded? (Gates the tab.) */
export async function landscapeHasClimate(slug: string): Promise<boolean> {
  const r = await db.execute(
    sql`SELECT 1 FROM "cat".landscape_climate_lines WHERE landscape_slug = ${slug} LIMIT 1`
  );
  return rowsOf<unknown>(r).length > 0;
}

export type ClimateViewLine = {
  subIntervention: string;
  unit: string | null;
  value7yrInr: number;
  tco2e7yr: number | null;
  metric: string | null;
  tier: string | null;
};

/** The three funder-lens views (carbon / adaptation / resilience), each a list of
 *  primary interventions sorted by 7-year value. Empty arrays if none loaded. */
export async function climateViews(
  slug: string
): Promise<{ carbon: ClimateViewLine[]; adaptation: ClimateViewLine[]; resilience: ClimateViewLine[] }> {
  const r = await db.execute(
    sql`SELECT lens, sub_intervention, unit, value_7yr_inr, tco2e_7yr, metric, tier
        FROM "cat".landscape_climate_view_lines WHERE landscape_slug = ${slug}
        ORDER BY value_7yr_inr DESC NULLS LAST`
  );
  const out: Record<string, ClimateViewLine[]> = { carbon: [], adaptation: [], resilience: [] };
  for (const row of rowsOf<Record<string, unknown>>(r)) {
    const lens = String(row.lens);
    if (!out[lens]) continue;
    out[lens].push({
      subIntervention: String(row.sub_intervention ?? ""),
      unit: (row.unit as string) ?? null,
      value7yrInr: Number(row.value_7yr_inr ?? 0),
      tco2e7yr: row.tco2e_7yr != null ? Number(row.tco2e_7yr) : null,
      metric: (row.metric as string) ?? null,
      tier: (row.tier as string) ?? null,
    });
  }
  return { carbon: out.carbon, adaptation: out.adaptation, resilience: out.resilience };
}

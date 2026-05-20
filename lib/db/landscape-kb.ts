import { sql } from "drizzle-orm";
import { db } from "./index";

export async function landscapeHasLip(slug: string): Promise<boolean> {
  const r = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM "cat".landscape_documents WHERE landscape_slug = ${slug} AND is_published = true`
  );
  const rows = (r as unknown as Array<{ n: number }>);
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
  return r as unknown as LandscapeDocument[];
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
              economic_tag AS "economicTag"
        FROM "cat".landscape_budget_lines
        WHERE landscape_slug = ${slug}
        ORDER BY category_no, row_index`
  );
  return r as unknown as BudgetLine[];
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
  const t = (totalsR as unknown as Array<Record<string, string>>)[0];
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
    totalCostInr: Number(t?.total ?? 0),
    govtInr: Number(t?.govt ?? 0),
    communityInr: Number(t?.community ?? 0),
    investmentRequiredInr: Number(t?.investment ?? 0),
    grantsInr: Number(t?.grants ?? 0),
    returnableGrantInr: Number(t?.returnable ?? 0),
    outcomeFinanceInr: Number(t?.outcome ?? 0),
    debtInr: Number(t?.debt ?? 0),
    byCategory: (byCatR as unknown as Array<{ category: string; total: string; investment: string }>).map((r) => ({
      category: r.category,
      total: Number(r.total ?? 0),
      investment: Number(r.investment ?? 0),
    })),
    byPackage: (byPkgR as unknown as Array<{ package: string; total: string; investment: string }>).map((r) => ({
      package: r.package,
      total: Number(r.total ?? 0),
      investment: Number(r.investment ?? 0),
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
  return r as unknown as Array<{
    id: string;
    documentId: string;
    chunkText: string;
    chunkKind: string;
    sectionPath: string | null;
    score: number;
  }>;
}

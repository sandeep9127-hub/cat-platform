import { sql } from "drizzle-orm";
import { db } from "./index";

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  stateName: string;
  startYear: number;
  endYear: number | null;
  scaleBand: string;
  catEndorsement: "cat_authored" | "cat_endorsed" | "cat_listed";
  themeName: string;
  themeColour: string;
  themeSlug: string;
  rank: number;
  highlight: string;
};

export type SearchFilters = {
  q?: string;
  themes?: string[];
  states?: string[];
  scales?: string[];
  endorsement?: "cat_authored" | "cat_endorsed" | "cat_listed";
  yearFrom?: number;
  yearTo?: number;
};

export async function searchEntries(filters: SearchFilters, limit = 30): Promise<SearchHit[]> {
  const q = (filters.q ?? "").trim();
  const themes = filters.themes ?? [];
  const states = filters.states ?? [];
  const scales = filters.scales ?? [];
  const hasQuery = q.length > 0;

  // Build WHERE clauses conditionally so we never bind empty arrays / nulls
  // through to Postgres-incompatible casts.
  const conditions = [sql`e.editorial_status = 'published'`];

  if (hasQuery) {
    conditions.push(sql`e.fts @@ websearch_to_tsquery('english', ${q})`);
  }
  if (themes.length > 0) {
    conditions.push(sql`t.slug IN (${sql.join(themes.map((s) => sql`${s}`), sql`, `)})`);
  }
  if (states.length > 0) {
    conditions.push(sql`g.state_code IN (${sql.join(states.map((s) => sql`${s}`), sql`, `)})`);
  }
  if (scales.length > 0) {
    conditions.push(sql`e.scale_band::text IN (${sql.join(scales.map((s) => sql`${s}`), sql`, `)})`);
  }
  if (filters.endorsement) {
    conditions.push(sql`e.cat_endorsement::text = ${filters.endorsement}`);
  }
  if (filters.yearFrom != null) {
    conditions.push(sql`e.start_year >= ${filters.yearFrom}`);
  }
  if (filters.yearTo != null) {
    conditions.push(sql`e.start_year <= ${filters.yearTo}`);
  }

  const whereClause = conditions.reduce(
    (acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`)
  );

  const rankExpr = hasQuery
    ? sql`ts_rank(e.fts, websearch_to_tsquery('english', ${q}))`
    : sql`0::float`;
  const highlightExpr = hasQuery
    ? sql`ts_headline(
        'english',
        coalesce(e.what_was_achieved, e.context, e.tagline),
        websearch_to_tsquery('english', ${q}),
        'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=18,MinWords=6'
      )`
    : sql`''::text`;
  const orderExpr = hasQuery
    ? sql`ts_rank(e.fts, websearch_to_tsquery('english', ${q})) DESC NULLS LAST, e.published_date DESC NULLS LAST`
    : sql`e.published_date DESC NULLS LAST`;

  const rows = await db.execute<{
    id: string;
    slug: string;
    title: string;
    tagline: string;
    state_name: string;
    start_year: number;
    end_year: number | null;
    scale_band: string;
    cat_endorsement: SearchHit["catEndorsement"];
    theme_name: string;
    theme_colour: string;
    theme_slug: string;
    rank: number;
    highlight: string;
  }>(sql`
    SELECT
      e.id,
      e.slug,
      e.title,
      e.tagline,
      g.name AS state_name,
      e.start_year,
      e.end_year,
      e.scale_band::text AS scale_band,
      e.cat_endorsement::text AS cat_endorsement,
      t.name AS theme_name,
      t.colour_hex AS theme_colour,
      t.slug AS theme_slug,
      ${rankExpr} AS rank,
      ${highlightExpr} AS highlight
    FROM "cat"."entries" e
    INNER JOIN "cat"."geographies" g ON g.id = e.primary_geography_id
    INNER JOIN "cat"."themes" t ON t.id = e.primary_theme_id
    WHERE ${whereClause}
    ORDER BY ${orderExpr}
    LIMIT ${limit}
  `);

  const out: SearchHit[] = [];
  for (const r of rows as unknown as Array<Record<string, unknown>>) {
    out.push({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      tagline: r.tagline as string,
      stateName: r.state_name as string,
      startYear: r.start_year as number,
      endYear: r.end_year as number | null,
      scaleBand: r.scale_band as string,
      catEndorsement: r.cat_endorsement as SearchHit["catEndorsement"],
      themeName: r.theme_name as string,
      themeColour: r.theme_colour as string,
      themeSlug: r.theme_slug as string,
      rank: Number(r.rank ?? 0),
      highlight: (r.highlight as string) ?? "",
    });
  }
  return out;
}

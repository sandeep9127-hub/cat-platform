import { landscapeInsights, type LandscapeInsights } from "@/lib/db/landscape-kb";
import { landscapeLineTotals } from "./snapshot";

/**
 * The Insights tab's figures from the published Phase 1 snapshot, so every
 * budget number on the Hub comes from one source. The snapshot holds costs and
 * who pays (7-year totals); reach (households, hectares per category) is not in
 * the sheet and still comes from the plan's reach columns, matched by category.
 * Returns null when the snapshot doesn't cover the landscape.
 */
export async function insightsFromSnapshot(slug: string): Promise<LandscapeInsights | null> {
  const t = await landscapeLineTotals(slug);
  if (!t) return null;
  const reach = await landscapeInsights(slug).catch(() => null);
  const reachBy = new Map((reach?.byCategory ?? []).map((c) => [c.category.toLowerCase(), c]));
  return {
    totals: {
      total: t.total, govt: t.govt, community: t.community, investment: t.investment,
      // The sheet doesn't split investment required into grants, returnable grants, outcome finance and debt.
      grants: 0, returnable: 0, outcome: 0, debt: 0,
      householdEngagements: reach?.totals.householdEngagements ?? 0,
      hectares: reach?.totals.hectares ?? 0,
      animals: reach?.totals.animals ?? 0,
      lineCount: t.lines,
    },
    byCategory: t.byCategory.map((c) => {
      const r = reachBy.get(c.category.toLowerCase());
      return { category: c.category, total: c.total, investment: c.investment, lines: c.lines, householdEngagements: r?.householdEngagements ?? 0, hectares: r?.hectares ?? 0 };
    }),
    byPackage: t.byTheme.map((x) => ({ package: x.theme, total: x.total })),
    lines: [],
  };
}

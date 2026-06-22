import { NextRequest, NextResponse } from "next/server";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { landscapeInsights } from "@/lib/db/landscape-kb";

/**
 * Visualize (Phase 1) — deterministic, DB-grounded chart specs for a landscape.
 *
 * The Ask assistant's answers cite landscapes; when one is cited, the client can
 * offer to chart that landscape's REAL numbers (never AI-invented figures — this
 * is the whole accuracy guarantee). This route turns landscapeInsights() into a
 * small set of chart specs the client renders as SVG. No LLM involved here.
 */
export const dynamic = "force-dynamic";

type Slice = { label: string; value: number; color: string };
export type VizSpec = {
  id: string;
  kind: "donut" | "bar";
  title: string;
  unit: string; // e.g. "₹ crore"
  series: Slice[];
  note?: string;
};

// Brand palette for categorical bars (CAT ramp).
const BAR_RAMP = [
  "#2E7573", "#5E6990", "#946616", "#95B1AF", "#929CC5",
  "#C68F95", "#334B4A", "#B8CCCA", "#AFBADC", "#F8CA7C",
];
const cr = (n: number) => Math.round((n / 1e7) * 100) / 100; // paise → ₹ crore, 2dp

export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  const profile = LANDSCAPES[slug];
  if (!profile) {
    return NextResponse.json({ error: "Unknown landscape" }, { status: 404 });
  }

  const ins = await landscapeInsights(slug);
  if (!ins || ins.totals.total <= 0) {
    // No budget ingested yet → nothing accurate to chart.
    return NextResponse.json({ name: profile.name, charts: [] });
  }

  const t = ins.totals;
  const charts: VizSpec[] = [];

  // 1) Funding mix — who carries the cost (donut). Only non-zero slices.
  const fundingRaw: Slice[] = [
    { label: "Government", value: cr(t.govt), color: "#334B4A" },
    { label: "Community", value: cr(t.community), color: "#929CC5" },
    { label: "Grants", value: cr(t.grants), color: "#C68C2E" },
    { label: "Returnable grant", value: cr(t.returnable), color: "#C68F95" },
    { label: "Debt", value: cr(t.debt), color: "#5E6990" },
    { label: "Outcome finance", value: cr(t.outcome), color: "#95B1AF" },
  ].filter((s) => s.value > 0);
  if (fundingRaw.length >= 2) {
    charts.push({
      id: "funding-mix",
      kind: "donut",
      title: `${profile.name} — funding mix`,
      unit: "₹ crore",
      series: fundingRaw,
      note: `7-year plan · ₹${cr(t.total).toLocaleString("en-IN")} cr total`,
    });
  }

  // 2) Investment by theme (bar) — top categories by total cost.
  const byCat = [...ins.byCategory]
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((c, i) => ({
      label: c.category || "Other",
      value: cr(c.total),
      color: BAR_RAMP[i % BAR_RAMP.length],
    }));
  if (byCat.length >= 2) {
    charts.push({
      id: "by-theme",
      kind: "bar",
      title: `${profile.name} — investment by theme`,
      unit: "₹ crore",
      series: byCat,
      note: `Top ${byCat.length} of ${ins.byCategory.length} themes by 7-year cost`,
    });
  }

  return NextResponse.json({ name: profile.name, charts });
}

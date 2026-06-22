import { NextRequest, NextResponse } from "next/server";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { landscapeInsights } from "@/lib/db/landscape-kb";
import { kimiChat, kimiEnabled, safeJsonParse, type ChatMessage } from "@/lib/ai/kimi";
import { rateLimit, getClientIp } from "@/lib/security/ratelimit";

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
  kind: "donut" | "bar" | "line";
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

/**
 * Visualize (Phase 2) — AI-proposed charts from an answer's OWN figures.
 *
 * For any answer (not just landscape-cited), extract numeric figures the answer
 * explicitly states and propose chart specs. Strict rule in the prompt: only use
 * numbers present in the text — never invent — and the answer itself is already
 * RAG-grounded + cited. Charts are flagged ai:true and carry a verify note.
 */
const AI_VIZ_SYSTEM = `You turn an analytical answer into chart specifications. Rules:
- Use ONLY numeric figures explicitly stated in the answer text. NEVER invent, infer, or estimate numbers. If a figure is not written in the text, do not include it.
- Group related figures into a chart. Return at most 3 charts; each chart 2–8 data points.
- "kind" must be "donut" (parts of a whole that sum to a total), "bar" (comparisons / rankings), or "line" (a trend / sequence over ordered steps, e.g. years or phases).
- Give each chart a short "title" and a "unit" (e.g. "₹ crore", "%", "households", "" if unitless).
- If the answer has no chartable numeric figures, return {"charts": []}.
- If the user gives an instruction, honour it (chart type, which figures, ordering) — but still only use numbers present in the text.
Return ONLY JSON: {"charts":[{"kind":"bar","title":"...","unit":"...","series":[{"label":"...","value":12.3}]}]}`;

const AI_RAMP = [
  "#2E7573", "#5E6990", "#C68C2E", "#95B1AF", "#929CC5",
  "#C68F95", "#334B4A", "#B8CCCA",
];

type AiChart = { kind?: string; title?: string; unit?: string; series?: { label?: string; value?: number }[] };

export async function POST(req: NextRequest) {
  if (!kimiEnabled()) return NextResponse.json({ charts: [] });
  const ip = getClientIp(req);
  const limited = await rateLimit({ key: "visualize", ip, limit: 20, windowSec: 60 });
  if (!limited.ok) return NextResponse.json({ charts: [] }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { text?: string; instruction?: string };
  const text = (body.text ?? "").slice(0, 6000).trim();
  const instruction = (body.instruction ?? "").slice(0, 280).trim();
  if (text.length < 40 || !/\d/.test(text)) return NextResponse.json({ charts: [] });

  const userContent = instruction
    ? `ANSWER:\n${text}\n\nUSER INSTRUCTION: ${instruction}`
    : text;
  const messages: ChatMessage[] = [
    { role: "system", content: AI_VIZ_SYSTEM },
    { role: "user", content: userContent },
  ];
  let parsed: { charts?: AiChart[] } | null = null;
  try {
    const { text: out } = await kimiChat(messages, { jsonMode: true, temperature: 0.1, maxTokens: 900 });
    parsed = safeJsonParse<{ charts?: AiChart[] }>(out);
  } catch {
    return NextResponse.json({ charts: [] });
  }

  const charts: VizSpec[] = [];
  for (const c of (parsed?.charts ?? []).slice(0, 3)) {
    const kind = c.kind === "donut" ? "donut" : c.kind === "line" ? "line" : "bar";
    const series = (c.series ?? [])
      .filter((s) => s && typeof s.value === "number" && isFinite(s.value as number) && (s.label ?? "").trim())
      .slice(0, 8)
      .map((s, i) => ({ label: String(s.label).trim(), value: Number(s.value), color: AI_RAMP[i % AI_RAMP.length] }));
    if (series.length < 2) continue;
    charts.push({
      id: `ai-${charts.length}`,
      kind,
      title: (c.title || "Suggested chart").slice(0, 80),
      unit: (c.unit || "").slice(0, 16),
      series,
      note: "AI-suggested from this answer — verify against the cited sources",
    });
  }
  return NextResponse.json({ charts });
}

import type { Hit } from "@/lib/rag/search";
import { LANDSCAPES } from "@/lib/data/landscapes";

/** Shared by the three Ask modes: plain answers (v2.ts), Compare (compare.ts) and the matchmaker (match.ts). */

/**
 * Refusal floor on the top Voyage rerank score. Calibrated 21 Nov 2026 with
 * scripts/calibrate-ask-floor.ts: 20 real in-scope questions scored 0.61–0.93
 * (median 0.89); 10 out-of-scope ones 0.25–0.49. 0.55 sits in the gap.
 */
export const REFUSAL_FLOOR = 0.55;
/** Passages below this are dropped even when the top hit clears the floor. */
export const PASSAGE_MIN = 0.4;
/** Plain Ask and Compare read the landscape plans and their intervention budgets. */
export const LIP_KINDS = ["document", "intervention"];

export type Citation = {
  index: number;
  type: "landscape" | "factsheet";
  label: string;
  url: string;
  preview: string;
  score: number;
  document: string | null;
  section: string | null;
  pageStart: number | null;
  pageEnd: number | null;
};

export const pages = (h: { pageStart: number | null; pageEnd: number | null }) =>
  h.pageStart == null ? null : h.pageEnd && h.pageEnd !== h.pageStart ? `pp. ${h.pageStart}–${h.pageEnd}` : `p. ${h.pageStart}`;

export function landscapeName(slug: string | null): string {
  return (slug && LANDSCAPES[slug]?.name) || slug || "CAT";
}

/** A citation as the UI shows it. `factsheetTitle` names an Atlas programme (the matchmaker looks it up). */
export function toCitation(h: Hit, index: number, factsheetTitle?: string): Citation {
  const preview = h.text.replace(/\s+/g, " ").trim();
  const base = {
    index,
    preview: preview.length > 240 ? `${preview.slice(0, 238)}…` : preview,
    score: Number(h.score.toFixed(3)),
    pageStart: h.pageStart,
    pageEnd: h.pageEnd,
  };
  if (h.sourceKind === "factsheet") {
    const title = factsheetTitle ?? h.sourceRef ?? "Atlas programme";
    return {
      ...base,
      type: "factsheet",
      label: `${title} · Solutions Atlas`,
      url: h.sourceRef ? `/factsheet/${encodeURIComponent(h.sourceRef)}` : "/atlas",
      document: title,
      section: "Solutions Atlas",
    };
  }
  const doc =
    h.sourceKind === "intervention"
      ? `${landscapeName(h.landscapeSlug)} intervention budget`
      : h.documentTitle ?? `${landscapeName(h.landscapeSlug)} report`;
  // Intervention chunks have no section; their first line is the intervention's name.
  const section =
    h.sourceKind === "intervention"
      ? h.text.split("\n")[0].replace(/\.$/, "").trim().slice(0, 120) || null
      : h.sectionPath?.split(" > ").slice(-2).join(" › ") ?? null;
  return {
    ...base,
    type: "landscape",
    label: [doc, section, pages(h)].filter(Boolean).join(" · "),
    // Reports are shared only on request (no download), so citations link to the
    // landscape page and show the page number as text.
    url: h.landscapeSlug ? `/landscape/${h.landscapeSlug}` : "/library",
    document: h.documentTitle,
    section: h.sectionPath,
  };
}

/** Assistant history goes back as plain text: markers point at sources that are no longer attached. */
export function historyText(content: string): string {
  return content.replace(/\[\d+\]/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

/** Keep only [n] markers that point at a citation in range. */
export function cleanMarkers(text: string, max: number): string {
  return text.replace(/\[(\d+)\]/g, (m, n) => (Number(n) >= 1 && Number(n) <= max ? m : ""));
}

export const SSE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
  Connection: "keep-alive",
};

export const sseLine = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

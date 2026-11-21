export type Citation = {
  index: number;
  type: "entry" | "landscape" | "factsheet" | "principle";
  label: string;
  url: string;
  preview: string;
  score: number;
  document?: string | null;
  section?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
};

import type { CompareArtifact } from "./Compare";
import type { MatchArtifact } from "./Match";

export type Phase = "searching" | "reading" | "writing" | "done";

export type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  refused?: boolean;
  /** Reader pressed Stop before the answer finished. */
  interrupted?: boolean;
  /** Request failed; the message shows an inline error with Retry. */
  error?: string;
  phase?: Phase;
  startedAt?: number;
  elapsedMs?: number;
  followUps?: string[];
  closest?: { label: string; url: string } | null;
  /** Which request owns this placeholder, so late events never patch a newer answer. */
  reqId?: number;
  /** Compare and the matchmaker answer with a structured block under the summary. */
  mode?: "compare" | "match";
  artifact?: CompareArtifact | MatchArtifact | null;
};

export type ScopeOption = { slug: string; label: string; ready: boolean };

/** 3-bar relevance from a rerank score (docs/ask-ui-spec.md §1). Retune here only. */
export function relevance(score: number): { label: string; bars: 1 | 2 | 3 } {
  if (score >= 0.85) return { label: "Strong match", bars: 3 };
  if (score >= 0.7) return { label: "Good match", bars: 2 };
  return { label: "Related", bars: 1 };
}

/** "Document" and "section · page" from a citation (v2 fields, or the legacy label). */
export function citeParts(c: Citation): { title: string; detail: string } {
  const parts = c.label.split(" · ");
  const title = c.document || parts[0] || c.label;
  const detail = parts.slice(1).join(" · ");
  return { title, detail };
}

export function pageLabel(c: Citation): string | null {
  if (c.pageStart == null) return null;
  return c.pageEnd && c.pageEnd !== c.pageStart ? `pages ${c.pageStart}–${c.pageEnd}` : `page ${c.pageStart}`;
}

/** Citation numbers used by an answer, in order of first use: [n] markers, then table cells or match cards. */
export function citedNumbers(text: string, max: number, artifact?: Msg["artifact"]): number[] {
  const seen: number[] = [];
  const add = (n: number) => {
    if (n >= 1 && n <= max && !seen.includes(n)) seen.push(n);
  };
  for (const m of text.matchAll(/\[(\d+)\]/g)) add(Number(m[1]));
  if (artifact?.type === "compare") artifact.rows.forEach((r) => r.cells.forEach((c) => c.sources.forEach(add)));
  if (artifact?.type === "match") artifact.matches.forEach((m) => add(m.citation));
  return seen;
}

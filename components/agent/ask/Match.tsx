"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type MatchArtifact = {
  type: "match";
  problem: string;
  needs: { phrase: string; label: string }[];
  matches: {
    citation: number;
    title: string | null;
    where: string;
    url: string;
    fit: "strong" | "partial";
    why: string;
    reasons: { need: number; verdict: "meets" | "partly" | "not_in_documents"; text: string }[];
    evidence: string | null;
  }[];
};

const VERDICT = {
  meets: { glyph: "✓", cls: "text-teal", sr: "Meets" },
  partly: { glyph: "◐", cls: "text-amber-deep", sr: "Partly" },
  not_in_documents: { glyph: "○", cls: "text-ink-soft", sr: "Not in the documents" },
} as const;

/**
 * Solution matchmaker (docs/ask-ui-spec.md §3): the reader's problem stays on
 * screen with its key needs underlined; ranked programme cards carry a plain
 * fit label, one reason per need, and a cited outcome from the fact sheet.
 */
export function MatchCards({ a, chip }: { a: MatchArtifact; chip: (n: number, key: string) => React.ReactNode }) {
  const [lit, setLit] = useState<number | null>(null);
  return (
    <div className="space-y-3 max-w-[68ch]">
      <Problem text={a.problem} needs={a.needs} lit={lit} />
      <ol className="list-none p-0 m-0 space-y-2.5">
        {a.matches.map((m, i) => (
          <li key={m.citation} className="border border-line bg-paper rounded-[8px] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-ink-soft font-semibold tabular-nums text-[13px]">{i + 1}</span>
              <span className="font-semibold text-[15px] text-ink">{m.title}</span>
              {chip(m.citation, `t-${m.citation}`)}
              <span
                className={`ml-auto text-[11px] font-semibold uppercase tracking-[0.06em] rounded-full px-2 py-0.5 ${
                  m.fit === "strong" ? "bg-teal text-paper" : "bg-amber/30 text-amber-deep"
                }`}
              >
                {m.fit === "strong" ? "Strong fit" : "Partial fit"}
              </span>
            </div>
            {m.where && <p className="text-[12.5px] text-ink-soft -mt-1.5">{m.where}</p>}
            {m.why && <p className="text-[14px] leading-[1.55] text-ink">{m.why}</p>}
            {m.reasons.length > 0 && (
              <ul className="list-none p-0 m-0 space-y-1" aria-label="Why it fits">
                {m.reasons.map((r, ri) => {
                  const v = VERDICT[r.verdict];
                  return (
                    <li
                      key={ri}
                      onMouseEnter={() => setLit(r.need)}
                      onMouseLeave={() => setLit(null)}
                      onFocus={() => setLit(r.need)}
                      onBlur={() => setLit(null)}
                      tabIndex={0}
                      className="flex gap-2 items-baseline rounded-[4px] px-1 py-0.5 hover:bg-cream focus:bg-cream outline-none text-[13.5px] leading-[1.5]"
                    >
                      <span className={`w-4 shrink-0 font-bold ${v.cls}`} aria-hidden>
                        {v.glyph}
                      </span>
                      <span>
                        <span className="sr-only">{v.sr}: </span>
                        <span className="font-medium text-ink">{a.needs[r.need]?.label}</span>
                        <span className="text-ink-soft">: {r.text}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {m.evidence && (
              <p className="text-[12.5px] text-ink-soft border-t border-dashed border-line pt-2">
                <span className="font-semibold text-ink">Evidence:</span> {m.evidence}
                {chip(m.citation, `e-${m.citation}`)}
              </p>
            )}
            <Link href={m.url} className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal hover:text-deep-teal">
              Open in Atlas <ArrowRight size={13} strokeWidth={2} aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The reader's problem with its needs underlined; the hovered reason's need is highlighted. */
function Problem({ text, needs, lit }: { text: string; needs: MatchArtifact["needs"]; lit: number | null }) {
  const lower = text.toLowerCase();
  const spans = needs
    .map((n, i) => ({ i, at: n.phrase ? lower.indexOf(n.phrase.toLowerCase()) : -1, len: n.phrase.length }))
    .filter((s) => s.at >= 0)
    .sort((x, y) => x.at - y.at)
    .filter((s, k, arr) => k === 0 || s.at >= arr[k - 1].at + arr[k - 1].len);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.at > pos) parts.push(text.slice(pos, s.at));
    parts.push(
      <mark
        key={s.i}
        className={`bg-transparent text-inherit border-b-2 px-[1px] transition-colors ${
          lit === s.i ? "bg-amber/40 border-amber-deep" : "border-line"
        }`}
      >
        {text.slice(s.at, s.at + s.len)}
      </mark>,
    );
    pos = s.at + s.len;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return (
    <div className="border border-line bg-cream/60 rounded-[8px] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft mb-1">Your problem</p>
      <p className="text-[14px] leading-[1.6] text-ink">{parts}</p>
    </div>
  );
}

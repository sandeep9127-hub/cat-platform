"use client";

import { useState } from "react";
import { ArrowRight, ArrowUp, Quote } from "lucide-react";

/**
 * Home-page "Ask the Hub" band (Ask UI spec, item E3).
 *
 * Shows one stored, real example answer (question, short answer with [n]
 * citation chips) and a small composer that hands off to /agent. Example text
 * is never hard-coded here: it comes from lib/ask/examples.ts
 * (exampleForToday(), rotating daily between 3 stored answers), owned by the
 * Ask session. With no example, the band shows the composer only.
 */
export type AskExampleCitation = {
  /** Full label: "document · section path · page". */
  label: string;
  /** Retrieval score 0..1; shown only as a relevance word, never raw. */
  score?: number;
  /** Pre-computed relevance word, if the source already provides one. */
  relevance?: string;
  url?: string;
};

export type AskExample = {
  question: string;
  /** Landscape slug the question is scoped to, if any. */
  scope?: string | null;
  /** Short answer with [n] markers that point into `citations` (1-based). */
  answer: string;
  citations: AskExampleCitation[];
};

/** Relevance words from the calibration run (spec section 1). Kept in one place to retune. */
function relevanceFor(c: AskExampleCitation): { word: string; bars: number } {
  if (c.relevance) {
    const w = c.relevance.toLowerCase();
    return { word: c.relevance, bars: w.startsWith("strong") ? 3 : w.startsWith("good") ? 2 : 1 };
  }
  const s = c.score ?? 0;
  if (s >= 0.85) return { word: "Strong match", bars: 3 };
  if (s >= 0.7) return { word: "Good match", bars: 2 };
  return { word: "Related", bars: 1 };
}

function askHref(q: string, scope?: string | null) {
  const p = new URLSearchParams({ q });
  if (scope) p.set("scope", scope);
  return `/agent?${p.toString()}`;
}

export function AskHubBand({ example }: { example: AskExample | null }) {
  const [open, setOpen] = useState<number | null>(null);

  // Split the answer into text and [n] chips.
  // A chip keeps any punctuation right after it on the same line.
  const parts = example ? example.answer.split(/(\[\d+\][.,;:!?]?)/g) : [];
  const active = example && open != null ? example.citations[open - 1] : null;

  return (
    <section className="border-t border-line" aria-labelledby="ask-band-title">
      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-14 items-start">
        <div>
          <p className="eyebrow">Ask the Hub</p>
          <h2 id="ask-band-title" className="font-sans font-semibold text-[clamp(28px,3.2vw,40px)] tracking-[-0.03em] leading-[1.08] text-ink mt-3 max-w-[18ch]">
            Ask the landscape plans a question
          </h2>
          <p className="text-[16.5px] text-ink-soft leading-[1.55] mt-4 max-w-[46ch]">
            Every answer quotes the page it came from. If something isn&apos;t in the plans, the Hub says so.
          </p>
        </div>

        <div className="space-y-4">
          {example && (
            <figure className="m-0 rounded-card border border-line bg-paper p-5 sm:p-6">
              <figcaption className="text-[12px] font-medium text-muted flex items-center gap-1.5">
                <Quote size={13} strokeWidth={1.8} aria-hidden />
                Example answer
              </figcaption>
              <p className="text-[17px] font-semibold text-ink tracking-[-0.01em] leading-snug mt-3">{example.question}</p>
              <p className="text-[15.5px] text-ink-soft leading-[1.6] mt-2">
                {parts.map((part, i) => {
                  const m = part.match(/^\[(\d+)\]([.,;:!?]?)$/);
                  if (!m) return <span key={i}>{part}</span>;
                  const n = Number(m[1]);
                  if (!example.citations[n - 1]) return m[2] || null;
                  const on = open === n;
                  return (
                    <span key={i} className="whitespace-nowrap">
                    <button
                      type="button"
                      aria-expanded={on}
                      aria-controls="ask-band-cite"
                      aria-label={`Source ${n}`}
                      onClick={() => setOpen(on ? null : n)}
                      className={`mx-0.5 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-tight text-[12px] font-semibold align-[2px] transition-colors ${
                        on ? "bg-teal text-paper" : "bg-teal/10 text-teal hover:bg-teal hover:text-paper"
                      }`}
                    >
                      {n}
                    </button>
                    {m[2]}
                    </span>
                  );
                })}
              </p>

              {active && (
                <div id="ask-band-cite" role="note" className="mt-3 rounded-card border border-line bg-cream/60 px-3.5 py-3 text-[13.5px]">
                  <p className="m-0 text-ink leading-snug">{active.label}</p>
                  <p className="m-0 mt-1.5 flex items-center gap-2 text-muted text-[12.5px]">
                    <span className="inline-flex items-end gap-[2px]" aria-hidden>
                      {[1, 2, 3].map((b) => (
                        <span
                          key={b}
                          className={`w-[3px] rounded-sm ${b <= relevanceFor(active).bars ? "bg-teal" : "bg-line"}`}
                          style={{ height: 4 + b * 3 }}
                        />
                      ))}
                    </span>
                    {relevanceFor(active).word}
                    {active.url && (
                      <a href={active.url} className="ml-auto text-teal hover:text-deep-teal">
                        Open source
                      </a>
                    )}
                  </p>
                </div>
              )}

              <a
                href={askHref(example.question, example.scope)}
                className="mt-4 inline-flex items-center gap-1.5 min-h-10 text-[14px] font-medium text-teal hover:text-deep-teal"
              >
                Ask this <ArrowRight size={15} strokeWidth={1.9} aria-hidden />
              </a>
            </figure>
          )}

          {/* Composer: a plain GET form, so it works before JS loads. */}
          <form action="/agent" method="get" className="flex items-center gap-2 rounded-full border border-line bg-paper pl-5 pr-1.5 py-1.5 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
            <label htmlFor="ask-band-q" className="sr-only">
              Ask your own question
            </label>
            <input
              id="ask-band-q"
              name="q"
              type="text"
              required
              autoComplete="off"
              placeholder="Ask your own question"
              className="flex-1 min-w-0 bg-transparent text-[16px] text-ink placeholder:text-muted outline-none py-2"
            />
            <button
              type="submit"
              aria-label="Ask"
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-deep-teal text-paper hover:bg-teal transition-colors"
            >
              <ArrowUp size={18} strokeWidth={2} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

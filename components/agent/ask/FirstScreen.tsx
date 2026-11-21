"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { RelevanceMeter } from "./Sources";
import type { ScopeOption } from "./types";

export type AskExample = {
  question: string;
  scope?: string | null;
  answer: string;
  citations: { label: string; score?: number; url?: string }[];
};

/**
 * Ask's empty state (docs/ask-ui-spec.md §0, option A): a real cited answer
 * first, then the composer, landscape chips and a proof line from live counts.
 */
export function FirstScreen({
  example,
  composer,
  landscapes,
  scope,
  onPickLandscape,
  onAsk,
  stats,
}: {
  example: AskExample | null;
  composer: React.ReactNode;
  landscapes: ScopeOption[];
  scope: string;
  onPickLandscape: (slug: string) => void;
  onAsk: (question: string, scope?: string | null) => void;
  stats: { landscapes: number; interventions: number } | null;
}) {
  const [openCite, setOpenCite] = useState<number | null>(null);
  const ready = landscapes.filter((l) => l.ready);
  const count = stats?.landscapes || ready.length;
  const cite = openCite != null ? example?.citations[openCite - 1] : null;

  return (
    <div className="max-w-[720px] mx-auto pt-6 sm:pt-12 pb-6 space-y-5">
      <div className="space-y-2">
        <h1 className="font-sans font-semibold text-[clamp(26px,3.6vw,38px)] tracking-[-0.03em] leading-[1.1] text-ink text-balance">
          Ask the {count || ""} landscape plans
        </h1>
        <p className="text-[15px] leading-[1.6] text-ink-soft max-w-[52ch]">
          Every answer quotes the page it came from. If something isn&apos;t in the plans, the Hub says so.
        </p>
      </div>

      {example && (
        <section aria-label="Example answer" className="border border-line bg-paper rounded-[8px] p-4 sm:p-5 space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">Example answer</p>
          <p className="font-semibold text-[15px] text-ink">{example.question}</p>
          <p className="text-[15px] leading-[1.65] text-ink">
            {example.answer.split(/(\[\d+\])/).map((part, i) => {
              const m = part.match(/^\[(\d+)\]$/);
              if (!m) return <span key={i}>{part}</span>;
              const n = Number(m[1]);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOpenCite(openCite === n ? null : n)}
                  aria-pressed={openCite === n}
                  aria-label={`Source ${n}`}
                  className={`align-super ml-0.5 inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-[4px] text-[11px] font-semibold tabular-nums transition-colors ${
                    openCite === n ? "bg-teal text-paper" : "bg-teal-wash text-teal hover:bg-teal hover:text-paper"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </p>
          {cite ? (
            <div className="border-t border-line pt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-soft">
              <span className="text-ink">{cite.label}</span>
              {typeof cite.score === "number" && <RelevanceMeter score={cite.score} />}
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-soft">Tap a number to see where it came from.</p>
          )}
          <button
            type="button"
            onClick={() => onAsk(example.question, example.scope)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal hover:text-deep-teal"
          >
            Ask this <ArrowRight size={14} strokeWidth={2} aria-hidden />
          </button>
        </section>
      )}

      {composer}

      {ready.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Pick a landscape">
          {ready.map((l) => (
            <button
              key={l.slug}
              type="button"
              onClick={() => onPickLandscape(l.slug)}
              aria-pressed={scope === l.slug}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                scope === l.slug ? "border-teal bg-teal-wash text-ink" : "border-line bg-paper text-ink-soft hover:border-teal"
              }`}
            >
              {l.label.replace(/ landscape$/i, "")}
            </button>
          ))}
        </div>
      )}

      {(count > 0 || stats) && (
        <p className="text-[12.5px] text-ink-soft">
          {[
            count ? `${count} landscape plans` : null,
            stats?.interventions ? `${stats.interventions.toLocaleString("en-IN")} interventions` : null,
            "Answers in about 5 s",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

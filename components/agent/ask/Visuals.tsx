"use client";

import { useState } from "react";
import { ArrowDown, Check, Copy, Download } from "lucide-react";
import type { Citation } from "./types";

type Chip = (n: number, key: string) => React.ReactNode;

/** Caption text with its [n] markers as chips. */
function WithChips({ text, chip, max }: { text: string; chip: Chip; max: number }) {
  return (
    <>
      {text.split(/(\[\d+\])/).map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        const n = m ? Number(m[1]) : 0;
        return m && n >= 1 && n <= max ? chip(n, `c${i}`) : <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ─── Note card (spec §4) ─── */

export type NoteArtifact = {
  type: "note";
  title: string;
  date: string;
  documents: number;
  bullets: { text: string; sources: number[] }[];
  cited: number[];
};

export function NoteCard({
  a,
  citations,
  chip,
  messageId,
  plainText,
  onToast,
}: {
  a: NoteArtifact;
  citations: Citation[];
  chip: Chip;
  messageId?: string;
  plainText: string;
  onToast: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <article className="border border-line-soft bg-paper rounded-[8px] p-4 sm:p-5 space-y-3 max-w-[68ch] shadow-[0_1px_2px_rgba(51,75,74,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        Note · {a.date} · from {a.documents} document{a.documents === 1 ? "" : "s"}
      </p>
      <h3 className="font-semibold text-[18px] tracking-[-0.02em] leading-snug text-ink">{a.title}</h3>
      <ul className="list-disc pl-5 space-y-2 text-[15px] leading-[1.6] text-ink">
        {a.bullets.map((b, i) => (
          <li key={i}>
            {b.text}
            {b.sources.map((n) => chip(n, `n${i}-${n}`))}
          </li>
        ))}
      </ul>
      <ol className="list-none p-0 m-0 border-t border-line pt-2.5 space-y-1 text-[12px] text-ink-soft">
        {a.cited.map((n) => (
          <li key={n}>
            <span className="tabular-nums font-semibold text-teal">{n}</span> {citations[n - 1]?.label}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-1 pt-0.5">
        {messageId && (
          <a
            href={`/api/agent/note?m=${encodeURIComponent(messageId)}`}
            download
            onClick={() => onToast("Downloading the note as a PDF")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft hover:text-deep-teal px-2 py-1.5 rounded-[6px] hover:bg-cream"
          >
            <Download size={13} strokeWidth={1.8} aria-hidden /> Download PDF
          </a>
        )}
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              ?.writeText(plainText)
              .then(() => {
                setCopied(true);
                onToast("Note copied");
                window.setTimeout(() => setCopied(false), 1800);
              })
              .catch(() => {})
          }
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft hover:text-deep-teal px-2 py-1.5 rounded-[6px] hover:bg-cream"
        >
          {copied ? <Check size={13} strokeWidth={2.2} className="text-teal" aria-hidden /> : <Copy size={13} strokeWidth={1.8} aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </article>
  );
}

/* ─── Chart (spec §4): horizontal bars drawn as code (no chart library) ─── */

export type ChartArtifact = {
  type: "chart";
  title: string;
  unit: string;
  categories: string[];
  series: { name: string; values: number[] }[];
  caption: string;
};

// Teal first, slate second (spec); a light teal third. Amber is kept for highlights.
const SERIES_FILL = ["var(--teal)", "#646d95", "#95B1AF"];

export function ChartView({ a, chip, max }: { a: ChartArtifact; chip: Chip; max: number }) {
  const [table, setTable] = useState(false);
  const top = Math.max(...a.series.flatMap((s) => s.values), 0.0001);
  const fmt = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const barH = a.series.length > 1 ? 9 : 14;
  return (
    <figure className="border border-line bg-paper rounded-[8px] p-4 space-y-3 max-w-[68ch] m-0">
      <figcaption className="space-y-0.5">
        <span className="block font-semibold text-[15px] text-ink">{a.title}</span>
        <span className="block text-[12px] text-ink-soft">{a.unit}</span>
      </figcaption>
      {a.series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft" aria-hidden>
          {a.series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: SERIES_FILL[i % SERIES_FILL.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      {!table ? (
        <div className="space-y-2.5" role="img" aria-label={`${a.title}. ${a.categories.map((c, ci) => `${c}: ${a.series.map((s) => `${s.name} ${fmt(s.values[ci])}`).join(", ")}`).join("; ")} (${a.unit}).`}>
          {a.categories.map((c, ci) => (
            <div key={c} className="grid grid-cols-[minmax(0,38%)_minmax(0,1fr)] gap-3 items-center">
              <span className="text-[12.5px] text-ink leading-tight text-right">{c}</span>
              <div className="space-y-[3px]">
                {a.series.map((s, si) => {
                  const w = (s.values[ci] / top) * 80;
                  return (
                    <div key={s.name} className="flex items-center gap-1.5">
                      <span
                        className="rounded-[2px] shrink-0"
                        style={{ width: `${Math.max(w, s.values[ci] > 0 ? 0.8 : 0)}%`, height: barH, background: SERIES_FILL[si % SERIES_FILL.length] }}
                      />
                      <span className="text-[11.5px] tabular-nums text-ink-soft">{fmt(s.values[ci])}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-cream">
                <th className="text-left font-semibold px-2.5 py-1.5 border-b border-line">Category</th>
                {a.series.map((s) => (
                  <th key={s.name} className="text-right font-semibold px-2.5 py-1.5 border-b border-line">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.categories.map((c, ci) => (
                <tr key={c}>
                  <td className="px-2.5 py-1.5 border-b border-line-soft">{c}</td>
                  {a.series.map((s) => (
                    <td key={s.name} className="px-2.5 py-1.5 border-b border-line-soft text-right tabular-nums">{fmt(s.values[ci])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[13px] leading-[1.55] text-ink-soft">
        <WithChips text={a.caption} chip={chip} max={max} />
      </p>
      <button type="button" onClick={() => setTable((v) => !v)} aria-pressed={table} className="text-[12.5px] font-medium text-teal hover:text-deep-teal">
        {table ? "Show the chart" : "Show the numbers"}
      </button>
    </figure>
  );
}

/* ─── Diagram (spec §4): steps in teal, funders in amber, outcome filled ─── */

export type DiagramArtifact = {
  type: "diagram";
  title: string;
  steps: { label: string; detail: string; kind: "step" | "funder" | "outcome"; sources: number[] }[];
};

export function DiagramView({ a, caption, chip, max }: { a: DiagramArtifact; caption: string; chip: Chip; max: number }) {
  return (
    <figure className="border border-line bg-paper rounded-[8px] p-4 space-y-3 max-w-[68ch] m-0">
      <figcaption className="font-semibold text-[15px] text-ink">{a.title}</figcaption>
      <ol className="list-none p-0 m-0">
        {a.steps.map((s, i) => (
          <li key={i}>
            <div
              className={`rounded-[6px] border px-3 py-2 ${
                s.kind === "funder"
                  ? "border-amber bg-amber/20"
                  : s.kind === "outcome"
                    ? "border-teal bg-teal text-paper"
                    : "border-teal bg-teal-wash"
              }`}
            >
              <span className={`block text-[13.5px] font-semibold ${s.kind === "outcome" ? "text-paper" : "text-ink"}`}>
                {s.kind === "funder" && <span className="sr-only">Funder: </span>}
                {s.label}
                {s.sources.map((n) => chip(n, `d${i}-${n}`))}
              </span>
              {s.detail && <span className={`block text-[12.5px] leading-[1.45] mt-0.5 ${s.kind === "outcome" ? "text-paper/90" : "text-ink-soft"}`}>{s.detail}</span>}
            </div>
            {i < a.steps.length - 1 && (
              <div className="flex justify-center py-0.5 text-teal" aria-hidden>
                <ArrowDown size={16} strokeWidth={2} />
              </div>
            )}
          </li>
        ))}
      </ol>
      {caption && (
        <p className="text-[13px] leading-[1.55] text-ink-soft">
          <WithChips text={caption} chip={chip} max={max} />
        </p>
      )}
    </figure>
  );
}

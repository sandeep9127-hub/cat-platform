"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Citation } from "./types";

export type CompareArtifact = {
  type: "compare";
  topic: string;
  landscapes: { slug: string; name: string }[];
  rows: { group: string; aspect: string; same: boolean; cells: { landscape: string; text: string | null; sources: number[] }[] }[];
};

/**
 * Side-by-side comparison (docs/ask-ui-spec.md §2): rows of aspects grouped,
 * one column per landscape, a citation chip in every filled cell, an amber
 * "Not in the documents" tag where a plan is silent, and a differences toggle.
 */
export function CompareTable({
  a,
  citations,
  chip,
}: {
  a: CompareArtifact;
  citations: Citation[];
  chip: (n: number, key: string) => React.ReactNode;
}) {
  const [diffOnly, setDiffOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const rows = diffOnly ? a.rows.filter((r) => !r.same) : a.rows;
  const groups = useMemo(() => {
    const out: { group: string; rows: CompareArtifact["rows"] }[] = [];
    for (const r of rows) {
      const g = out.find((x) => x.group === r.group);
      if (g) g.rows.push(r);
      else out.push({ group: r.group, rows: [r] });
    }
    return out;
  }, [rows]);

  const copyCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const head = ["Group", "Aspect", ...a.landscapes.map((l) => l.name)].map(esc).join(",");
    const body = a.rows.map((r) =>
      [r.group, r.aspect, ...r.cells.map((c) => (c.text ? `${c.text} [${c.sources.join(", ")}]` : "Not in the documents"))].map(esc).join(","),
    );
    const used = [...new Set(a.rows.flatMap((r) => r.cells.flatMap((c) => c.sources)))].sort((x, y) => x - y);
    const sources = used.map((n) => esc(`[${n}] ${citations[n - 1]?.label ?? ""}`));
    navigator.clipboard
      ?.writeText([head, ...body, "", esc("Sources"), ...sources].join("\n"))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-2 text-[13px] text-ink-soft cursor-pointer">
          <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="accent-[var(--teal)]" />
          Show only differences
        </label>
        <button type="button" onClick={copyCsv} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft hover:text-deep-teal">
          {copied ? <Check size={13} strokeWidth={2.2} className="text-teal" aria-hidden /> : <Copy size={13} strokeWidth={1.8} aria-hidden />}
          {copied ? "Copied" : "Copy table"}
        </button>
      </div>
      <div className="overflow-x-auto border border-line rounded-[6px] bg-paper">
        <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
          <caption className="sr-only">Comparison of {a.landscapes.map((l) => l.name).join(" and ")} on {a.topic}</caption>
          <thead>
            <tr className="bg-cream">
              <th scope="col" className="sticky left-0 bg-cream text-left font-semibold px-3 py-2.5 border-b border-line w-[26%]">
                {a.topic}
              </th>
              {a.landscapes.map((l) => (
                <th key={l.slug} scope="col" className="text-left font-semibold px-3 py-2.5 border-b border-line">
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <FragmentGroup key={g.group} group={g.group} span={a.landscapes.length + 1}>
                {g.rows.map((r, ri) => (
                  <tr key={`${g.group}-${ri}`}>
                    <th scope="row" className="sticky left-0 bg-paper text-left align-top font-medium text-ink-soft px-3 py-2.5 border-b border-line-soft">
                      {r.aspect}
                    </th>
                    {r.cells.map((c) => (
                      <td
                        key={c.landscape}
                        className={`align-top px-3 py-2.5 border-b border-line-soft leading-[1.5] ${!r.same && c.text ? "bg-teal-wash/60" : ""}`}
                      >
                        {c.text ? (
                          <>
                            {c.text}
                            {c.sources.map((n) => chip(n, `${r.aspect}-${c.landscape}-${n}`))}
                          </>
                        ) : (
                          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-deep bg-amber/25 rounded-[3px] px-1.5 py-0.5">
                            Not in the documents
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </FragmentGroup>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={a.landscapes.length + 1} className="px-3 py-3 text-ink-soft">
                  The landscapes match on every aspect here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentGroup({ group, span, children }: { group: string; span: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <th colSpan={span} scope="colgroup" className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft bg-cream/60 px-3 py-1.5 border-b border-line-soft">
          {group}
        </th>
      </tr>
      {children}
    </>
  );
}

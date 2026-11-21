"use client";

import type { ReactNode } from "react";

/**
 * Small, safe markdown renderer for answers: paragraphs, bullet and numbered
 * lists, simple pipe tables, **bold**, *italic*, and [n] citation chips.
 * It builds React nodes only (no HTML strings), so model output can't inject markup.
 */

type ChipRenderer = (n: number, key: string) => ReactNode;

function inline(text: string, chip: ChipRenderer, maxCite: number, keyBase: string): ReactNode[] {
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[\d+\])/g;
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const tok = m[0];
    const key = `${keyBase}-${k++}`;
    if (tok.startsWith("**")) out.push(<strong key={key} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("[")) {
      const n = Number(tok.slice(1, -1));
      out.push(maxCite > 0 && n >= 1 && n <= maxCite ? chip(n, key) : tok);
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = i + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSeparator = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function Markdown({ text, chip, maxCite }: { text: string; chip: ChipRenderer; maxCite: number }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const key = `b${b++}`;
    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isSeparator(lines[i])) rows.push(cells(lines[i]));
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={key} className="overflow-x-auto border border-line rounded-[4px] my-1">
          <table className="w-full text-[14px] border-collapse">
            <thead className="bg-cream">
              <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold px-3 py-2 border-b border-line">{inline(c, chip, maxCite, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="align-top px-3 py-2 border-b border-line-soft">{inline(c, chip, maxCite, `${key}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key} className={`${ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1.5`}>
          {items.map((it, j) => <li key={j}>{inline(it, chip, maxCite, `${key}i${j}`)}</li>)}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isTableRow(lines[i]) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
      para.push(lines[i].replace(/^#{1,6}\s+/, ""));
      i++;
    }
    blocks.push(<p key={key}>{inline(para.join(" "), chip, maxCite, key)}</p>);
  }
  return <div className="space-y-3.5">{blocks}</div>;
}

"use client";

import { Download } from "lucide-react";

type Row = Record<string, string | number | null>;

/** Client-side CSV download. Builds the file in the browser from passed rows. */
export function DownloadButton({
  rows,
  filename,
  label = "Download data (CSV)",
}: {
  rows: Row[];
  filename: string;
  label?: string;
}) {
  function toCsv(data: Row[]): string {
    if (!data.length) return "";
    const headers = Object.keys(data[0]);
    const esc = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      headers.join(","),
      ...data.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\n");
  }

  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-deep-teal hover:bg-cream/60 transition-colors"
    >
      <Download size={13} strokeWidth={1.9} aria-hidden />
      {label}
    </button>
  );
}

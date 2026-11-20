"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print font-mono text-[11px] uppercase tracking-[0.12em] px-4 py-2 rounded-card bg-deep-teal text-paper hover:bg-teal transition-colors"
    >
      Print / Save as PDF
    </button>
  );
}

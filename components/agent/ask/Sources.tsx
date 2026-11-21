"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, FileText, X } from "lucide-react";
import { citeParts, pageLabel, relevance, type Citation } from "./types";

export function RelevanceMeter({ score }: { score: number }) {
  const r = relevance(score);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft font-medium" title={r.label}>
      <span className="inline-flex gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span key={b} className={`w-1 h-2.5 rounded-[1px] ${b <= r.bars ? "bg-teal" : "bg-line"}`} />
        ))}
      </span>
      {r.label}
    </span>
  );
}

function SourceCard({ c, active, onSelect, muted }: { c: Citation; active: boolean; onSelect: () => void; muted?: boolean }) {
  const { title, detail } = citeParts(c);
  const page = pageLabel(c);
  const ref = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);
  return (
    <li ref={ref} className={muted ? "opacity-70" : ""}>
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={active}
        className={`w-full text-left bg-paper border rounded-[8px] px-3 py-2.5 transition-colors ${
          active ? "border-teal shadow-[0_0_0_1px_var(--teal)]" : "border-line hover:border-ink-soft/40"
        }`}
      >
        <span className="flex items-baseline gap-2">
          <span className="text-teal font-semibold tabular-nums text-[13px]">{c.index}</span>
          <span className="font-semibold text-[13.5px] text-ink leading-snug">{title}</span>
        </span>
        {detail && <span className="block text-[12.5px] text-ink-soft leading-snug mt-0.5 pl-5">{detail}</span>}
        <span className="block mt-1.5 pl-5">
          <RelevanceMeter score={c.score} />
        </span>
      </button>
      {active && (
        <div className="mt-1.5 ml-5 border border-line bg-paper rounded-[4px] p-3 space-y-2">
          <div className="flex justify-between gap-2 text-[11.5px] text-ink-soft">
            <span className="truncate">{detail || title}</span>
            {page && <span className="shrink-0 tabular-nums">{page}</span>}
          </div>
          <p className="text-[13px] leading-[1.55] text-ink bg-amber/30 rounded-[2px] px-2 py-1.5">{c.preview}</p>
          {/* Reports are shared on request only: the page shows as text, the link goes to the landscape. */}
          <Link href={c.url} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal hover:text-deep-teal">
            About this landscape <ArrowRight size={12} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      )}
    </li>
  );
}

function SourceList({ citations, cited, activeN, onSelect }: {
  citations: Citation[];
  cited: number[];
  activeN: number | null;
  onSelect: (n: number) => void;
}) {
  const first = cited.map((n) => citations.find((c) => c.index === n)).filter(Boolean) as Citation[];
  // Before the text arrives nothing is "cited" yet: show everything as read.
  const shown = first.length ? first : citations;
  const also = first.length ? citations.filter((c) => !cited.includes(c.index)) : [];
  return (
    <>
      <ul className="list-none p-0 m-0 space-y-2">
        {shown.map((c) => (
          <SourceCard key={c.index} c={c} active={activeN === c.index} onSelect={() => onSelect(c.index)} />
        ))}
      </ul>
      {also.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft mt-4 mb-2">Also read</p>
          <ul className="list-none p-0 m-0 space-y-2">
            {also.map((c) => (
              <SourceCard key={c.index} c={c} muted active={activeN === c.index} onSelect={() => onSelect(c.index)} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** Desktop: sources beside the conversation. */
export function SourcesPanel(props: {
  citations: Citation[];
  cited: number[];
  activeN: number | null;
  onSelect: (n: number) => void;
}) {
  return (
    <div className="h-full flex flex-col border border-line rounded-[8px] bg-cream overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2 text-[13px] font-semibold text-ink">
        <FileText size={14} strokeWidth={1.8} className="text-teal" aria-hidden />
        Sources <span className="text-ink-soft font-medium">· {props.citations.length}</span>
      </div>
      <div className="overflow-y-auto p-3 flex-1">
        {props.citations.length ? (
          <SourceList {...props} />
        ) : (
          <p className="text-[13px] text-ink-soft px-1 py-2">Sources for the selected answer appear here.</p>
        )}
      </div>
    </div>
  );
}

/** Phones and tablets: sources in a bottom sheet. Escape or the scrim closes it. */
export function SourcesSheet(props: {
  open: boolean;
  onClose: () => void;
  citations: Citation[];
  cited: number[];
  activeN: number | null;
  onSelect: (n: number) => void;
}) {
  const { open, onClose } = props;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div className={`lg:hidden fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-ink/25 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sources"
        className={`absolute inset-x-0 bottom-0 max-h-[78vh] flex flex-col bg-paper border-t border-line rounded-t-[16px] shadow-[0_-10px_30px_rgba(22,19,13,0.15)] transition-transform duration-300 ease-out-expo ${
          open ? "translate-y-0" : "translate-y-[105%]"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="w-9 h-1 rounded-full bg-line mx-auto mt-2 mb-1" aria-hidden />
        <div className="px-4 py-2.5 border-b border-line flex items-center gap-2 text-[14px] font-semibold text-ink">
          Sources <span className="text-ink-soft font-medium">· {props.citations.length}</span>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close sources" className="ml-auto w-9 h-9 grid place-items-center rounded-full hover:bg-cream">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="overflow-y-auto p-3">
          <SourceList citations={props.citations} cited={props.cited} activeN={props.activeN} onSelect={props.onSelect} />
        </div>
      </div>
    </div>
  );
}

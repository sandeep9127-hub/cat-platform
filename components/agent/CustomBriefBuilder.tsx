"use client";

import { useMemo, useState } from "react";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { FileDown, Layers, Settings2, X } from "lucide-react";

type Section = {
  key: "cover" | "at_a_glance" | "context" | "challenges" | "finance" | "field_record" | "colophon";
  label: string;
  description: string;
  /** When true, requires data on the landscape; greys out if missing. */
  requires?: "budget" | "photos";
};

const SECTIONS: Section[] = [
  { key: "cover", label: "Cover", description: "Brand + title + anchor photo (or signature)" },
  { key: "at_a_glance", label: "At a glance", description: "Quick facts grid" },
  { key: "context", label: "Context", description: "Body context + agroclimatic zone" },
  { key: "challenges", label: "Key challenges", description: "Numbered list of landscape challenges" },
  {
    key: "finance",
    label: "Investment plan finance",
    description: "Total plan, funding mix, top categories",
    requires: "budget",
  },
  {
    key: "field_record",
    label: "Field record",
    description: "Captioned documentary photographs",
    requires: "photos",
  },
  { key: "colophon", label: "Editorial note + citation", description: "How to cite + about" },
];

const LANDSCAPE_LIST = Object.values(LANDSCAPES).map((p) => ({
  slug: p.slug,
  name: p.name,
  district: p.district,
  hasBudget: p.lipStatus === "published" || p.slug === "patratu",
  hasPhotos: Boolean(p.photos && p.photos.length > 0),
}));

export function CustomBriefBuilder() {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState<string>(LANDSCAPE_LIST[0]?.slug ?? "patratu");
  const [selected, setSelected] = useState<Set<Section["key"]>>(
    new Set(["cover", "at_a_glance", "context", "challenges", "colophon"])
  );

  const landscape = useMemo(
    () => LANDSCAPE_LIST.find((l) => l.slug === slug),
    [slug]
  );

  function toggle(k: Section["key"]) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(SECTIONS.map((s) => s.key)));
  }
  function selectNone() {
    setSelected(new Set(["cover"]));
  }

  const sectionsParam = Array.from(selected).join(",");
  const downloadUrl = `/api/landscape/${slug}/download?format=pdf${
    selected.size === SECTIONS.length ? "" : `&sections=${sectionsParam}`
  }`;
  const canDownload = selected.size > 0;

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-deep-teal to-teal text-paper font-mono text-[10.5px] uppercase tracking-[0.16em] shadow-[0_8px_24px_-8px_rgba(46,117,115,0.55),inset_0_1px_0_rgba(255,255,255,0.18)] hover:from-teal hover:to-deep-teal transition-all"
      >
        <Settings2 size={13} strokeWidth={1.8} />
        Build a custom brief
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-labelledby="custom-brief-title"
            className="fixed z-[71] inset-x-4 top-12 bottom-12 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-12 sm:bottom-12 sm:w-[560px] rounded-[12px] border border-line/80 bg-paper overflow-hidden flex flex-col"
            style={{
              boxShadow:
                "0 32px 80px -20px rgba(26,38,37,0.55), 0 8px 24px -8px rgba(26,38,37,0.25)",
              backgroundImage:
                "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,243,232,0.4) 100%)",
            }}
          >
            <header
              className="relative px-6 py-4 border-b border-line text-paper"
              style={{
                background: "linear-gradient(135deg, #334B4A 0%, #2E7573 60%, #334B4A 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <Layers size={16} strokeWidth={1.7} className="text-amber" />
                <div className="min-w-0">
                  <h2
                    id="custom-brief-title"
                    className="font-sans text-[16px] leading-none tracking-[-0.012em] font-medium"
                  >
                    Build a custom brief
                  </h2>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/70 mt-1.5">
                    Pick a landscape, pick the sections you want
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto p-1.5 rounded hover:bg-paper/10 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Landscape picker */}
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold inline-flex items-center gap-2">
                <span className="w-3 h-px bg-amber-deep" />
                Landscape
              </span>
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-2 w-full px-3.5 py-2.5 bg-paper border border-line rounded-[6px] font-sans text-[14px] text-ink shadow-[inset_0_1px_0_rgba(26,38,37,0.03)] focus:outline-none focus:border-teal focus:shadow-[inset_0_1px_0_rgba(26,38,37,0.03),0_0_0_3px_rgba(46,117,115,0.18)] transition-all"
              >
                {LANDSCAPE_LIST.map((l) => (
                  <option key={l.slug} value={l.slug}>
                    {l.name} · {l.district}
                  </option>
                ))}
              </select>

              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold inline-flex items-center gap-2">
                  <span className="w-3 h-px bg-amber-deep" />
                  Sections · {selected.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-deep-teal hover:text-teal"
                  >
                    All
                  </button>
                  <span className="text-line">·</span>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-deep-teal hover:text-teal"
                  >
                    Cover only
                  </button>
                </div>
              </div>

              <ul className="mt-3 list-none p-0 m-0 flex flex-col gap-2">
                {SECTIONS.map((s) => {
                  const checked = selected.has(s.key);
                  const requirementMissing =
                    (s.requires === "budget" && !landscape?.hasBudget) ||
                    (s.requires === "photos" && !landscape?.hasPhotos);
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => !requirementMissing && toggle(s.key)}
                        disabled={requirementMissing}
                        className={`group relative w-full text-left rounded-[6px] border p-3.5 transition-all ${
                          requirementMissing
                            ? "border-line bg-cream/40 opacity-60 cursor-not-allowed"
                            : checked
                              ? "border-teal bg-paper shadow-[0_1px_2px_rgba(26,38,37,0.04),0_6px_16px_-12px_rgba(46,117,115,0.30)]"
                              : "border-line bg-paper hover:border-line-soft"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`shrink-0 mt-0.5 w-4 h-4 rounded-[3px] border-2 inline-flex items-center justify-center transition-colors ${
                              requirementMissing
                                ? "border-line"
                                : checked
                                  ? "border-teal bg-teal"
                                  : "border-line"
                            }`}
                            aria-hidden
                          >
                            {checked && !requirementMissing && (
                              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                <path
                                  d="M1.5 4.5L3.5 6.5L7.5 2"
                                  stroke="#FBF8F2"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-sans text-[14px] font-medium text-[color:var(--navy-teal)]">
                                {s.label}
                              </span>
                              {requirementMissing && (
                                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                                  {s.requires === "budget"
                                    ? "needs investment plan"
                                    : "needs photos"}
                                </span>
                              )}
                            </div>
                            <p className="font-sans text-[12.5px] text-ink-soft mt-1 leading-snug">
                              {s.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="font-mono italic text-[10.5px] uppercase tracking-[0.14em] text-muted mt-6 leading-relaxed">
                Brief is generated from curated data only. We never invent. Sections that need
                data not yet ingested are greyed out above.
              </p>
            </div>

            <footer className="px-6 py-4 border-t border-line bg-paper flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-soft hover:text-deep-teal"
              >
                Cancel
              </button>
              <a
                href={canDownload ? downloadUrl : "#"}
                aria-disabled={!canDownload}
                onClick={(e) => {
                  if (!canDownload) e.preventDefault();
                  else setTimeout(() => setOpen(false), 400);
                }}
                download
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] font-mono text-[10.5px] uppercase tracking-[0.16em] font-semibold text-paper transition-all ${
                  canDownload
                    ? "bg-gradient-to-br from-deep-teal to-teal hover:from-teal hover:to-deep-teal shadow-[0_8px_22px_-8px_rgba(46,117,115,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "bg-line cursor-not-allowed opacity-60"
                }`}
              >
                <FileDown size={13} strokeWidth={1.8} />
                Generate PDF
              </a>
            </footer>
          </div>
        </>
      )}
    </>
  );
}

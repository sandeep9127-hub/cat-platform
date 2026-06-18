"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { IndiaMap, type MapEntry } from "@/components/map/IndiaMap";
import { EntryListItem, type EntryListItemData } from "@/components/entries/EntryListItem";

type Props = {
  mapEntries: MapEntry[];
  listEntries: EntryListItemData[];
  totalStates: number;
  /**
   * When set, the right-rail list is truncated to this many rows on first
   * load (used on the landing page so the home doesn't try to render all 35+
   * programmes). A "Read more in the Solutions Atlas →" CTA is shown below.
   * If the user filters by a state, the cap is dropped — the user has asked
   * to focus, so honour that.
   */
  cap?: number;
  /**
   * When set, the right-rail is paginated at this many rows per page with
   * prev / next / page-number controls below. Used on /map so the section
   * height stays sensible relative to the India map column. Ignored when
   * `cap` is also set (cap wins; home uses cap, /map uses pageSize).
   */
  pageSize?: number;
  /**
   * Destination for the "Read more" CTA. Defaults to `/map`.
   */
  readMoreHref?: string;
  /**
   * "split" (default): map + list in a 2-col grid (home).
   * "list": render only the list + pagination, no map and no grid wrapper —
   * used by the /map "explorer" where the map lives in its own sticky column
   * and filtering is driven by the sidebar (URL), not map clicks.
   */
  layout?: "split" | "list";
};

const STATE_NAMES: Record<string, string> = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar",
  CG: "Chhattisgarh", GA: "Goa", GJ: "Gujarat", HR: "Haryana",
  HP: "Himachal Pradesh", JK: "Jammu & Kashmir", JH: "Jharkhand",
  KA: "Karnataka", KL: "Kerala", MP: "Madhya Pradesh", MH: "Maharashtra",
  MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland",
  OD: "Odisha", PB: "Punjab", RJ: "Rajasthan", SK: "Sikkim",
  TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura", UP: "Uttar Pradesh",
  UK: "Uttarakhand", WB: "West Bengal", DL: "Delhi",
};

export function AtlasSection({
  mapEntries,
  listEntries,
  totalStates,
  cap,
  pageSize,
  readMoreHref = "/map",
  layout = "split",
}: Props) {
  const [filterState, setFilterState] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(
    () =>
      filterState
        ? listEntries.filter(
            (e) => mapEntries.find((m) => m.id === e.id)?.stateCode === filterState
          )
        : listEntries,
    [filterState, listEntries, mapEntries]
  );

  // The cap applies only when unfiltered. Once a state filter is on, show all
  // that matched (the user has narrowed on purpose).
  const shouldCap = cap != null && !filterState && filtered.length > cap;

  // Pagination applies only when no cap is set AND the list is longer than
  // one page. Reset page → 1 whenever the filter changes.
  const shouldPaginate =
    !shouldCap && pageSize != null && filtered.length > pageSize;
  const pageCount = shouldPaginate
    ? Math.max(1, Math.ceil(filtered.length / pageSize!))
    : 1;

  useEffect(() => {
    setPage(1);
  }, [filterState]);

  // Clamp page if filter shrinks the list below current page
  const currentPage = Math.min(page, pageCount);
  const pageStart = shouldPaginate ? (currentPage - 1) * pageSize! : 0;
  const pageEnd = shouldPaginate ? pageStart + pageSize! : filtered.length;

  const visibleEntries = shouldCap
    ? filtered.slice(0, cap)
    : shouldPaginate
      ? filtered.slice(pageStart, pageEnd)
      : filtered;
  const hiddenCount = shouldCap ? filtered.length - cap! : 0;

  const list = (
      <div className="flex flex-col" ref={listTopRef}>
        {/* Filter-clear chip — sits above the list whenever a state is active */}
        {filterState && (
          <div className="mb-2 flex items-center justify-between gap-3 py-3 px-4 bg-amber/30 border border-amber-deep/40 rounded-[2px] reveal-in">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-deep-teal">
              Showing{" "}
              <strong className="text-amber-deep font-semibold">
                {STATE_NAMES[filterState] ?? filterState}
              </strong>
              {" · "}
              <span className="text-deep-teal">
                {visibleEntries.length} of {listEntries.length}
              </span>
            </span>
            <button
              onClick={() => setFilterState(null)}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-deep-teal hover:text-ink transition-colors font-semibold focus-visible:outline-2 focus-visible:outline-deep-teal focus-visible:outline-offset-2"
            >
              Show all ×
            </button>
          </div>
        )}

        {visibleEntries.length === 0 ? (
          <div className="py-10 font-serif italic text-ink-soft text-[18px] max-w-[40ch]">
            No programmes published in this state yet. The library grows as CAT editors
            approve drafts from the ingestion queue.
          </div>
        ) : (
          <>
            {visibleEntries.map((data, i) => (
              <div
                key={data.id}
                className="reveal-stagger"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <EntryListItem data={data} />
              </div>
            ))}
            {shouldCap && (
              <Link
                href={readMoreHref}
                className="group mt-3 self-start inline-flex items-center gap-2.5 px-5 py-3 rounded-[4px] text-deep-teal font-semibold font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors duration-200 bg-amber hover:bg-amber-deep hover:text-paper"
              >
                <span>
                  Read all {filtered.length} in the Solutions Atlas
                </span>
                <span className="text-amber-deep/70 normal-case tracking-normal">
                  + {hiddenCount} more
                </span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={2}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </Link>
            )}
            {shouldPaginate && (
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                onChange={(p) => {
                  setPage(p);
                  // Scroll the rail back to the top so the next page starts
                  // at row 1 instead of mid-scroll.
                  listTopRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                rangeStart={pageStart + 1}
                rangeEnd={Math.min(pageEnd, filtered.length)}
                total={filtered.length}
              />
            )}
          </>
        )}
      </div>
  );

  // List-only: the /map explorer renders the map in its own sticky column.
  if (layout === "list") return list;

  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-12">
      <IndiaMap
        entries={mapEntries}
        totalStates={totalStates}
        totalProgrammes={mapEntries.length}
        onFilterState={setFilterState}
        activeState={filterState}
      />
      {list}
    </section>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
  rangeStart,
  rangeEnd,
  total,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
  rangeStart: number;
  rangeEnd: number;
  total: number;
}) {
  // Build a compact page list: 1 … (page-1, page, page+1) … pageCount
  // For small page counts (≤7), show all. Otherwise show ellipsis around
  // the current page.
  const pages: (number | "…")[] = [];
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    const start = Math.max(2, page - 1);
    const end = Math.min(pageCount - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < pageCount - 2) pages.push("…");
    pages.push(pageCount);
  }

  return (
    <div className="mt-5 pt-5 border-t border-line-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
        Showing{" "}
        <strong className="text-deep-teal font-semibold tabular-nums">
          {rangeStart}–{rangeEnd}
        </strong>{" "}
        of{" "}
        <strong className="text-deep-teal font-semibold tabular-nums">{total}</strong>
      </span>
      <nav
        aria-label="Solutions atlas pagination"
        className="inline-flex items-center gap-1"
      >
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-line text-deep-teal hover:bg-teal-wash hover:border-teal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2} aria-hidden />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="w-7 text-center font-mono text-[11px] text-muted"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full font-mono text-[11px] tabular-nums tracking-[0.06em] transition-colors ${
                p === page
                  ? "bg-deep-teal text-paper font-semibold"
                  : "text-deep-teal hover:bg-teal-wash"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-line text-deep-teal hover:bg-teal-wash hover:border-teal disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} strokeWidth={2} aria-hidden />
        </button>
      </nav>
    </div>
  );
}

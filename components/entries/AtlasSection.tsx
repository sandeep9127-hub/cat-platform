"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
   * Destination for the "Read more" CTA. Defaults to `/map`.
   */
  readMoreHref?: string;
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
  readMoreHref = "/map",
}: Props) {
  const [filterState, setFilterState] = useState<string | null>(null);

  const filtered = filterState
    ? listEntries.filter(
        (e) => mapEntries.find((m) => m.id === e.id)?.stateCode === filterState
      )
    : listEntries;

  // The cap applies only when unfiltered — once the user picks a state, they're
  // narrowing on purpose, so show all of what matched.
  const shouldCap = cap != null && !filterState && filtered.length > cap;
  const visibleEntries = shouldCap ? filtered.slice(0, cap) : filtered;
  const hiddenCount = shouldCap ? filtered.length - cap! : 0;

  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-12">
      <IndiaMap
        entries={mapEntries}
        totalStates={totalStates}
        totalProgrammes={mapEntries.length}
        onFilterState={setFilterState}
        activeState={filterState}
      />
      <div className="flex flex-col">
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
                className="group mt-3 self-start inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-deep-teal font-semibold font-mono text-[10.5px] uppercase tracking-[0.16em] transition-all hover:-translate-y-0.5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(248,202,124,0.95) 0%, rgba(224,166,90,0.95) 100%)",
                  boxShadow:
                    "0 8px 22px -10px rgba(198,140,46,0.55), inset 0 1px 0 rgba(255,255,255,0.30)",
                }}
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
          </>
        )}
      </div>
    </section>
  );
}

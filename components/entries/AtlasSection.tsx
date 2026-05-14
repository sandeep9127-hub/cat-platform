"use client";

import { useState } from "react";
import { IndiaMap, type MapEntry } from "@/components/map/IndiaMap";
import { EntryListItem, type EntryListItemData } from "@/components/entries/EntryListItem";

type Props = {
  mapEntries: MapEntry[];
  listEntries: EntryListItemData[];
  totalStates: number;
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

export function AtlasSection({ mapEntries, listEntries, totalStates }: Props) {
  const [filterState, setFilterState] = useState<string | null>(null);

  const visibleEntries = filterState
    ? listEntries.filter(
        (e) => mapEntries.find((m) => m.id === e.id)?.stateCode === filterState
      )
    : listEntries;

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
          visibleEntries.map((data, i) => (
            <div
              key={data.id}
              className="reveal-stagger"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <EntryListItem data={data} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}

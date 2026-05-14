"use client";

import { useState } from "react";
import { IndiaMap, type MapEntry } from "@/components/map/IndiaMap";
import { EntryListItem, type EntryListItemData } from "@/components/entries/EntryListItem";

type Props = {
  mapEntries: MapEntry[];
  listEntries: EntryListItemData[];
  totalStates: number;
};

export function AtlasSection({ mapEntries, listEntries, totalStates }: Props) {
  const [filterState, setFilterState] = useState<string | null>(null);

  const visibleEntries = filterState
    ? listEntries.filter((e) =>
        mapEntries.find((m) => m.id === e.id)?.stateCode === filterState
      )
    : listEntries;

  return (
    <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pb-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-12">
      <IndiaMap
        entries={mapEntries}
        totalStates={totalStates}
        totalProgrammes={mapEntries.length}
        onFilterState={setFilterState}
      />
      <div className="flex flex-col">
        {visibleEntries.length === 0 ? (
          <div className="py-16 font-serif italic text-ink-soft text-[18px] max-w-[40ch]">
            No programmes published in this state yet. The library grows as CAT editors approve
            drafts from the ingestion queue.
          </div>
        ) : (
          visibleEntries.map((data) => <EntryListItem key={data.id} data={data} />)
        )}
      </div>
    </section>
  );
}

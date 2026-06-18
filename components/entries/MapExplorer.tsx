"use client";

import { useState, type ReactNode } from "react";
import { List, Map as MapIcon } from "lucide-react";

/**
 * /map layout shell. Desktop (lg+): map left (58%) + list right (42%), map
 * sticky — both always visible. Mobile (< lg): a "List | Map" segmented toggle
 * shows one full-width at a time (default List), so the tall map isn't buried
 * below the list.
 */
export function MapExplorer({ map, list }: { map: ReactNode; list: ReactNode }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <>
      {/* Mobile-only view toggle */}
      <div className="lg:hidden mb-5 inline-flex rounded-full border border-line p-0.5 bg-paper">
        {(["list", "map"] as const).map((v) => {
          const on = view === v;
          const Icon = v === "list" ? List : MapIcon;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={on}
              className={
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors " +
                (on ? "bg-deep-teal text-paper" : "text-ink-soft hover:text-deep-teal")
              }
            >
              <Icon size={14} strokeWidth={1.8} aria-hidden />
              {v === "list" ? "List" : "Map"}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] gap-8 lg:gap-12 items-start">
        {/* Map — left on desktop (sticky); on mobile only when "Map" is active */}
        <div
          className={
            "lg:col-start-1 lg:row-start-1 lg:sticky lg:top-24 lg:self-start lg:!block " +
            (view === "map" ? "block" : "hidden")
          }
        >
          {map}
        </div>
        {/* List — right on desktop; on mobile only when "List" is active */}
        <div
          className={
            "min-w-0 lg:col-start-2 lg:row-start-1 lg:!block " +
            (view === "list" ? "block" : "hidden")
          }
        >
          {list}
        </div>
      </div>
    </>
  );
}

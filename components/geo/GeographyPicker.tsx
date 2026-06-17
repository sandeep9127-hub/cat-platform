"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, X, MapPin } from "lucide-react";
import type { GeoHit } from "@/lib/db/geo";

type Props = {
  /** Form field name — a hidden input emits the selected geography id for native form posts. */
  name?: string;
  /** Restrict to one level: "village" | "block" | "district" | "state". Omit for any. */
  type?: string;
  /** Restrict to one state by code (e.g. "JH") to narrow the search. */
  state?: string;
  /** Pre-selected value (edit mode). */
  defaultValue?: GeoHit | null;
  placeholder?: string;
  /** Fires with the chosen geography (or null when cleared). */
  onChange?: (hit: GeoHit | null) => void;
};

const LEVEL_HINT: Record<string, string> = {
  village: "village",
  block: "block / tehsil",
  district: "district",
  state: "state",
};

/**
 * Canonical geography picker. Type to search — fuzzy and typo-tolerant — and pick
 * from suggestions that show the full path (so the right "Rampur" is obvious).
 * The form stores the geography id, never the typed string, which is what makes
 * tagging uniform and kills spelling / wrong-village / mis-tag errors.
 */
export function GeographyPicker({ name, type, state, defaultValue = null, placeholder, onChange }: Props) {
  const [selected, setSelected] = useState<GeoHit | null>(defaultValue);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const pick = useCallback(
    (hit: GeoHit | null) => {
      setSelected(hit);
      setQuery("");
      setHits([]);
      setOpen(false);
      onChange?.(hit);
    },
    [onChange]
  );

  // Debounced fuzzy search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q });
        if (type) params.set("type", type);
        if (state) params.set("state", state);
        const res = await fetch(`/api/geo/search?${params}`, { signal: ctrl.signal });
        const data = (await res.json()) as { hits: GeoHit[] };
        setHits(data.hits ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted or failed — keep prior */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, type, state]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[active]) pick(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const levelHint = type ? LEVEL_HINT[type] ?? type : "place";

  return (
    <div ref={boxRef} className="relative">
      {name && <input type="hidden" name={name} value={selected?.id ?? ""} />}

      {selected ? (
        // Selected chip — canonical, with path. Clear to search again.
        <div className="flex items-center gap-2.5 rounded-[10px] border border-line bg-line-soft px-3 py-2.5">
          <MapPin size={15} className="text-teal shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="font-sans text-[14px] text-ink leading-tight truncate">{selected.name}</div>
            {selected.path.length > 0 && (
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted truncate">
                {selected.path.join(" · ")}
                {!selected.verified && <span className="text-amber-deep ml-2">· pending review</span>}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => pick(null)}
            className="shrink-0 text-muted hover:text-ink rounded-full p-1 transition-colors"
            aria-label="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => hits.length > 0 && setOpen(true)}
              placeholder={placeholder ?? `Type a ${levelHint} name…`}
              className="w-full rounded-[10px] border border-line bg-paper pl-9 pr-3 py-2.5 font-sans text-[14px] text-ink placeholder:text-muted outline-none focus:border-teal transition-colors"
            />
          </div>

          {open && (query.trim().length >= 2) && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-30 mt-1.5 w-full max-h-[300px] overflow-auto rounded-[10px] border border-line bg-paper shadow-lg list-none p-1 m-0"
              style={{ boxShadow: "0 10px 30px -12px rgba(26,38,37,0.35)" }}
            >
              {loading && hits.length === 0 ? (
                <li className="px-3 py-2.5 font-sans text-[13px] text-muted">Searching…</li>
              ) : hits.length === 0 ? (
                <li className="px-3 py-2.5 font-sans text-[13px] text-muted">
                  No match. Check spelling, or ask an admin to add this {levelHint}.
                </li>
              ) : (
                hits.map((h, i) => (
                  <li key={h.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(h)}
                      className="w-full text-left rounded-[7px] px-3 py-2 transition-colors"
                      style={{ background: i === active ? "var(--line-soft, #EEF2EA)" : "transparent" }}
                    >
                      <div className="font-sans text-[14px] text-ink leading-tight">
                        {h.name}
                        <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{h.type}</span>
                      </div>
                      {h.path.length > 0 && (
                        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted truncate">
                          {h.path.join(" · ")}
                        </div>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

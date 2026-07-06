"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X, Plus } from "lucide-react";
import { suggestDomains, resolveDomain, isLibraryDomain } from "@/lib/data/domains";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

/**
 * Type-ahead, multi-select picker for organisation domains. Suggestions come from
 * the curated library (lib/data/domains); picking one adds a canonical chip. If a
 * typed term isn't in the library, an "Add …" row lets the submitter add it as a
 * custom chip (visually marked "new") — kept, but flagged for admin review so the
 * vocabulary stays clean. Mirrors the GeographyPicker interaction for consistency.
 */
export function DomainPicker({ value, onChange, placeholder }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const suggestions = useMemo(() => suggestDomains(q, value).slice(0, 8), [q, value]);
  // Show an "add custom" row only when the query is non-empty, not already a
  // library term, and not already chosen.
  const trimmed = q.trim();
  const canAddCustom =
    trimmed.length > 1 &&
    !resolveDomain(trimmed) &&
    !value.some((v) => v.toLowerCase() === trimmed.toLowerCase());
  const rows = suggestions.length + (canAddCustom ? 1 : 0);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function add(label: string) {
    // Canonicalise library hits to their label; keep custom text as-typed.
    const canonical = resolveDomain(label) ?? label.trim();
    if (!canonical) return;
    if (!value.some((v) => v.toLowerCase() === canonical.toLowerCase())) {
      onChange([...value, canonical]);
    }
    setQ("");
    setOpen(true);
    inputRef.current?.focus();
  }

  function remove(label: string) {
    onChange(value.filter((v) => v !== label));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, rows - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active < suggestions.length) add(suggestions[active].label);
      else if (canAddCustom) add(trimmed);
    } else if (e.key === "Backspace" && !q && value.length) {
      remove(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="dp" ref={boxRef}>
      {value.length > 0 && (
        <div className="dp-chips">
          {value.map((v) => {
            const custom = !isLibraryDomain(v);
            return (
              <span key={v} className={`dp-chip${custom ? " dp-chip-custom" : ""}`}>
                {v}
                {custom && <span className="dp-new" title="Not in the standard list — will be reviewed">new</span>}
                <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>×</button>
              </span>
            );
          })}
        </div>
      )}

      <div className="dp-input">
        <Search size={15} aria-hidden />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Type a domain — pick from the list or add your own"}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </div>

      {open && rows > 0 && (
        <ul className="dp-list" id={listId} role="listbox">
          {suggestions.map((d, i) => (
            <li
              key={d.slug}
              role="option"
              aria-selected={i === active}
              className={i === active ? "on" : ""}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); add(d.label); }}
            >
              <span>{d.label}</span>
              <span className="dp-group">{d.group}</span>
            </li>
          ))}
          {canAddCustom && (
            <li
              role="option"
              aria-selected={active === suggestions.length}
              className={`dp-add${active === suggestions.length ? " on" : ""}`}
              onMouseEnter={() => setActive(suggestions.length)}
              onMouseDown={(e) => { e.preventDefault(); add(trimmed); }}
            >
              <Plus size={14} aria-hidden />
              <span>Add “{trimmed}”</span>
              <span className="dp-group">not in list · reviewed</span>
            </li>
          )}
        </ul>
      )}

      <style>{`
        .dp { position: relative; }
        .dp-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .dp-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px;
          padding: 4px 6px 4px 10px; border-radius: 999px; background: rgba(46,117,115,.10);
          color: var(--ink, #1f261f); border: 1px solid rgba(46,117,115,.20); }
        .dp-chip-custom { background: rgba(198,140,46,.10); border-color: rgba(198,140,46,.28); }
        .dp-new { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; font-weight: 600;
          color: #9a6a12; background: rgba(198,140,46,.16); padding: 1px 5px; border-radius: 999px; }
        .dp-chip button { border: 0; background: none; cursor: pointer; font-size: 15px; line-height: 1;
          color: var(--muted, #736f64); padding: 0 2px; }
        .dp-chip button:hover { color: var(--ink, #1f261f); }
        .dp-input { display: flex; align-items: center; gap: 8px; padding: 11px 13px;
          border: 1px solid var(--line, #e2ddd1); border-radius: 12px; background: rgba(31,38,31,.02); color: var(--muted, #736f64); }
        .dp-input:focus-within { border-color: rgba(46,117,115,.55); background: #fff; }
        .dp-input input { flex: 1; border: 0; outline: 0; background: none; font-size: 14.5px; color: var(--ink, #1f261f); min-width: 0; }
        .dp-list { position: absolute; z-index: 40; left: 0; right: 0; margin-top: 6px; padding: 5px;
          list-style: none; background: #fff; border: 1px solid var(--line, #e2ddd1); border-radius: 12px;
          box-shadow: 0 14px 40px -20px rgba(26,38,37,.35); max-height: 300px; overflow-y: auto; }
        .dp-list li { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 8px;
          cursor: pointer; font-size: 14px; color: var(--ink, #1f261f); }
        .dp-list li.on { background: rgba(46,117,115,.09); }
        .dp-list li .dp-group { margin-left: auto; font-size: 10.5px; text-transform: uppercase;
          letter-spacing: .07em; color: var(--muted, #9a968b); }
        .dp-add { color: #9a6a12; }
        .dp-add.on { background: rgba(198,140,46,.10); }
      `}</style>
    </div>
  );
}

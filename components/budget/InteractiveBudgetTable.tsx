"use client";

import { useEffect, useMemo, useState } from "react";
import { COLUMNS, toNumber, type Column, type InterventionRecord } from "@/lib/budget/columns";

/**
 * Airtable-style, view-only investment table: search, filters, sort, column
 * groups, grouping with live subtotals, and a detail panel per row. Used by the
 * editor view and by private share links. Deliberately no export or download.
 */

type Group = Column["group"];
type GroupBy = "category" | "theme" | "landscape" | "none";
const OPTIONAL_GROUPS: Group[] = ["Unit cost", "Phase 1", "Phase 2", "Totals", "Tags"];
const TAGS: { key: string; label: string }[] = [
  { key: "climate", label: "Climate" }, { key: "equity", label: "Equity" }, { key: "gender", label: "Gender" },
  { key: "economic_purpose", label: "Economic purpose" }, { key: "institution_type", label: "Institution" },
  { key: "capital", label: "Capital" },
];
const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const intl = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const pinned = (c: Column) => c.key === "row_key" || c.key === "sub_intervention";
const numeric = (c: Column) => c.kind === "money" || c.kind === "number";

type Cur = "INR" | "USD" | "EUR";
type Rates = Record<Cur, number>; // INR per 1 unit
const SYM: Record<Cur, string> = { INR: "₹", USD: "$", EUR: "€" };
/** Exact amount in the chosen currency (INR with Indian grouping). */
const moneyFmt = (cur: Cur, rates: Rates) => (n: number) =>
  cur === "INR" ? `₹${inr.format(n)}` : `${SYM[cur]}${intl.format(n / rates[cur])}`;
/** Headline amount: crore for INR, millions for USD/EUR. */
const bigFmt = (cur: Cur, rates: Rates) => (n: number) =>
  cur === "INR"
    ? `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} cr`
    : `${SYM[cur]}${(n / rates[cur] / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;

function fmt(c: Column, v: string | number | null, money: (n: number) => string) {
  if (v === null || v === undefined || v === "") return null;
  if (numeric(c)) {
    const n = toNumber(v);
    return n === null ? String(v) : c.kind === "money" ? money(n) : inr.format(n);
  }
  return String(v);
}
const sumOf = (rows: InterventionRecord[], get: (r: InterventionRecord) => unknown) =>
  rows.reduce((t, r) => t + (toNumber(get(r) as string | number | null) ?? 0), 0);

export function InteractiveBudgetTable({
  rows,
  landscapeNames,
  multi = false,
  changed = [],
}: {
  rows: InterventionRecord[];
  landscapeNames: Record<string, string>;
  multi?: boolean;
  /** "<landscape>:<row_key>" of rows changed by an approved sheet edit recently. */
  changed?: string[];
}) {
  const [cur, setCur] = useState<Cur>("INR");
  const [rates, setRates] = useState<Rates>({ INR: 1, USD: 95, EUR: 100 });
  const [ratesAsOf, setRatesAsOf] = useState<string | null>(null);
  useEffect(() => {
    // Live ECB reference rates (indicative); keeps the fallback if unavailable.
    fetch("/api/rates").then((r) => (r.ok ? r.json() : null)).then((j: { USD?: number; EUR?: number; asOf?: string } | null) => {
      if (j?.USD && j?.EUR && isFinite(j.USD) && isFinite(j.EUR)) { setRates({ INR: 1, USD: j.USD, EUR: j.EUR }); setRatesAsOf(j.asOf ?? null); }
    }).catch(() => {});
  }, []);
  const money = useMemo(() => moneyFmt(cur, rates), [cur, rates]);
  const big = useMemo(() => bigFmt(cur, rates), [cur, rates]);
  const changedSet = useMemo(() => new Set(changed), [changed]);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Set<Group>>(new Set(["Totals"]));
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>(multi ? "landscape" : "category");
  const [open, setOpen] = useState<InterventionRecord | null>(null);

  const facet = (get: (r: InterventionRecord) => string | null | undefined) =>
    [...new Set(rows.map(get).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
  const facets = useMemo(() => ({
    landscape: facet((r) => r.landscape_slug),
    category: facet((r) => r.category),
    theme: facet((r) => r.thematic_investment),
    payee: facet((r) => (r.totals?.payee as string | null) ?? null),
    ...Object.fromEntries(TAGS.map((t) => [t.key, facet((r) => r.tags?.[t.key] ?? null)])),
  }) as Record<string, string[]>, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchIndex = useMemo(
    () => rows.map((r) => [landscapeNames[r.landscape_slug] ?? "", ...COLUMNS.map((c) => c.get(r) ?? "")].join(" ").toLowerCase()),
    [rows, landscapeNames],
  );

  const filtered = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const value = (r: InterventionRecord, k: string) =>
      k === "landscape" ? r.landscape_slug : k === "category" ? r.category : k === "theme" ? r.thematic_investment
        : k === "payee" ? (r.totals?.payee as string | null) : r.tags?.[k];
    let out = rows.filter((r, i) =>
      terms.every((t) => searchIndex[i].includes(t))
      && Object.entries(filters).every(([k, v]) => !v || value(r, k) === v)
      && (!onlyChanged || changedSet.has(`${r.landscape_slug}:${r.row_key}`)));
    if (sort) {
      const col = COLUMNS.find((c) => c.key === sort.key)!;
      out = [...out].sort((a, b) => {
        const x = col.get(a), y = col.get(b);
        if (numeric(col)) return ((toNumber(x) ?? -Infinity) - (toNumber(y) ?? -Infinity)) * sort.dir;
        return String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true }) * sort.dir;
      });
    }
    return out;
  }, [rows, searchIndex, q, filters, sort]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ name: "", rows: filtered }];
    const key = (r: InterventionRecord) =>
      groupBy === "category" ? r.category : groupBy === "theme" ? r.thematic_investment ?? "No theme" : landscapeNames[r.landscape_slug] ?? r.landscape_slug;
    const m = new Map<string, InterventionRecord[]>();
    for (const r of filtered) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return [...m.entries()].map(([name, rs]) => ({ name, rows: rs }));
  }, [filtered, groupBy, landscapeNames]);

  const cols = useMemo(() => [
    ...COLUMNS.filter(pinned),
    ...COLUMNS.filter((c) => !pinned(c) && (c.group === "Intervention" || shown.has(c.group))
      && !(c.key === "category" && groupBy === "category") && !(c.key === "thematic_investment" && groupBy === "theme")),
  ], [shown, groupBy, multi]);

  const grand = sumOf(filtered, (r) => r.totals?.grand_total);
  const ask = sumOf(filtered, (r) => r.totals?.investment);
  const govt = sumOf(filtered, (r) => r.totals?.govt);
  const community = sumOf(filtered, (r) => r.totals?.community);
  const households = sumOf(filtered, (r) => r.phase1?.households) + sumOf(filtered, (r) => r.phase2?.households);
  const activeFilters = Object.values(filters).filter(Boolean).length + (q ? 1 : 0);

  const sticky = (c: Column) =>
    c.key === "row_key" ? "sticky left-0 z-10 w-[60px] min-w-[60px] max-w-[60px]"
      : c.key === "sub_intervention" ? "sticky left-[60px] z-10 w-[300px] min-w-[300px] max-w-[300px] shadow-[1px_0_0_#ddd]" : "";
  const Select = ({ k, label, options, name }: { k: string; label: string; options: string[]; name?: (v: string) => string }) =>
    options.length > 1 ? (
      <label className="flex flex-col gap-0.5 text-[11px] uppercase tracking-[0.08em] text-muted font-mono">
        {label}
        <select value={filters[k] ?? ""} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}
          className="rounded-[6px] border border-line bg-paper px-2 py-1 text-[13px] normal-case tracking-normal font-sans text-ink max-w-[220px]">
          <option value="">All</option>
          {options.map((o) => <option key={o} value={o}>{name ? name(o) : o}</option>)}
        </select>
      </label>
    ) : null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-[10px] border border-line bg-cream/50 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-0.5 text-[11px] uppercase tracking-[0.08em] text-muted font-mono grow min-w-[220px] max-w-[360px]">
            Search
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. seed bank, solar, FPO"
              className="rounded-[6px] border border-line bg-paper px-2.5 py-1.5 text-[13.5px] normal-case tracking-normal font-sans text-ink" />
          </label>
          {multi && <Select k="landscape" label="Landscape" options={facets.landscape} name={(s) => landscapeNames[s] ?? s} />}
          <Select k="category" label="Category" options={facets.category} />
          <Select k="theme" label="Thematic investment" options={facets.theme} />
          <Select k="payee" label="Payee" options={facets.payee} />
          {TAGS.map((t) => <Select key={t.key} k={t.key} label={t.label} options={facets[t.key] ?? []} />)}
          {activeFilters > 0 && (
            <button type="button" onClick={() => { setFilters({}); setQ(""); }}
              className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-red-alert pb-1.5">
              Clear {activeFilters}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="text-muted mr-1">Columns:</span>
          {OPTIONAL_GROUPS.map((g) => {
            const on = shown.has(g);
            return (
              <button key={g} type="button" aria-pressed={on}
                onClick={() => { const s = new Set(shown); on ? s.delete(g) : s.add(g); setShown(s); }}
                className={`rounded-full border px-2.5 py-0.5 ${on ? "bg-teal text-paper border-teal" : "border-line text-ink-soft hover:border-teal"}`}>
                {g}
              </button>
            );
          })}
          <span className="text-muted ml-3 mr-1">Group by:</span>
          {(["category", "theme", ...(multi ? ["landscape"] : []), "none"] as GroupBy[]).map((g) => (
            <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => setGroupBy(g)}
              className={`rounded-full border px-2.5 py-0.5 ${groupBy === g ? "bg-deep-teal text-paper border-deep-teal" : "border-line text-ink-soft hover:border-teal"}`}>
              {g === "none" ? "No grouping" : g === "theme" ? "Theme" : g[0].toUpperCase() + g.slice(1)}
            </button>
          ))}
          <span className="text-muted ml-3 mr-1">Currency:</span>
          {(["INR", "USD", "EUR"] as Cur[]).map((c) => (
            <button key={c} type="button" aria-pressed={cur === c} onClick={() => setCur(c)}
              className={`rounded-full border px-2.5 py-0.5 ${cur === c ? "bg-deep-teal text-paper border-deep-teal" : "border-line text-ink-soft hover:border-teal"}`}>
              {c}
            </button>
          ))}
          {changedSet.size > 0 && (
            <button type="button" aria-pressed={onlyChanged} onClick={() => setOnlyChanged(!onlyChanged)}
              className={`ml-3 rounded-full border px-2.5 py-0.5 ${onlyChanged ? "bg-amber text-ink border-amber" : "border-amber/60 text-ink-soft hover:border-amber"}`}>
              <span className="inline-block h-2 w-2 rounded-full bg-amber mr-1.5 align-middle" aria-hidden="true" />
              Changed recently ({changedSet.size})
            </button>
          )}
        </div>
        {cur !== "INR" && (
          <p className="text-[12px] text-muted">
            {cur} amounts are indicative, converted at ECB reference rates{ratesAsOf ? ` of ${ratesAsOf}` : ""} (₹{rates[cur].toFixed(2)} = 1 {cur}). The plans are budgeted in rupees.
          </p>
        )}
      </div>

      {/* Summary of what's shown */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ["Rows", `${filtered.length} of ${rows.length}`], ["Total cost", big(grand)], ["Investment ask", big(ask)],
          ["Government", big(govt)], ["Community", big(community)], ["Households (both phases)", inr.format(households)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[8px] border border-line bg-paper px-3 py-2">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="text-[17px] tabular-nums text-deep-teal">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-line bg-paper">
        <table className="border-collapse text-[12.5px] leading-snug">
          <thead className="sticky top-0 z-20 bg-cream">
            <tr>
              {cols.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 1 ? "ascending" : "descending") : "none"}
                    className={`${sticky(c)} bg-cream border-b border-line px-0 py-0 text-left font-medium text-ink whitespace-nowrap`}>
                    <button type="button"
                      onClick={() => setSort(active ? (sort!.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}
                      className={`w-full px-3 py-2 flex items-center gap-1 hover:text-teal ${numeric(c) ? "justify-end" : ""}`}>
                      {c.group !== "Intervention" && <span className="text-muted font-normal">{c.group} ·</span>}
                      {c.label}
                      <span className="text-muted w-3">{active ? (sort!.dir === 1 ? "↑" : "↓") : ""}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map((g, gi) => (
              <GroupRows key={`${gi}:${g.name}`} name={g.name} rows={g.rows} cols={cols} sticky={sticky}
                landscapeNames={multi && groupBy !== "landscape" ? landscapeNames : null} onOpen={setOpen}
                money={money} changed={changedSet} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted">No rows match. Clear a filter or the search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <DetailPanel row={open} landscapeName={landscapeNames[open.landscape_slug] ?? open.landscape_slug} onClose={() => setOpen(null)}
        money={money} changed={changedSet.has(`${open.landscape_slug}:${open.row_key}`)} />}
    </div>
  );
}

function GroupRows({ name, rows, cols, sticky, landscapeNames, onOpen, money, changed }: {
  name: string; rows: InterventionRecord[]; cols: Column[]; sticky: (c: Column) => string;
  landscapeNames: Record<string, string> | null; onOpen: (r: InterventionRecord) => void;
  money: (n: number) => string; changed: Set<string>;
}) {
  return (
    <>
      {name && (
        <tr className="bg-cream/80">
          <td colSpan={2} className="sticky left-0 z-10 bg-cream px-3 py-1.5 font-medium text-deep-teal">
            {name} <span className="text-muted font-normal">· {rows.length}</span>
          </td>
          {cols.slice(2).map((c) => (
            <td key={c.key} className="px-3 py-1.5 text-right tabular-nums text-ink-soft whitespace-nowrap">
              {c.kind === "money" ? money(sumOf(rows, c.get)) : ""}
            </td>
          ))}
        </tr>
      )}
      {rows.map((r) => (
        <tr key={`${r.landscape_slug}:${r.row_key}`} tabIndex={0} onClick={() => onOpen(r)}
          onKeyDown={(e) => { if (e.key === "Enter") onOpen(r); }}
          className="bg-paper hover:bg-teal/5 focus:bg-teal/10 cursor-pointer align-top outline-none">
          {cols.map((c) => {
            const v = fmt(c, c.get(r), money);
            return (
              <td key={c.key} className={`${sticky(c)} bg-inherit border-t border-line px-3 py-1.5 ${numeric(c) ? "text-right whitespace-nowrap tabular-nums" : c.kind === "long" || c.key === "sub_intervention" ? "" : "whitespace-nowrap"}`}>
                {c.key === "row_key" && changed.has(`${r.landscape_slug}:${r.row_key}`) ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-amber mr-1.5 align-middle" title="Changed in a recent update" aria-label="Changed recently" />
                ) : null}
                {c.key === "sub_intervention" && landscapeNames ? (
                  <span className="block text-[11px] text-muted">{landscapeNames[r.landscape_slug]}</span>
                ) : null}
                {v === null ? <span className="text-muted/60">–</span>
                  : c.kind === "long" ? <span className="line-clamp-2 min-w-[220px] max-w-[320px]">{v}</span> : v}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function DetailPanel({ row, landscapeName, onClose, money, changed }: {
  row: InterventionRecord; landscapeName: string; onClose: () => void; money: (n: number) => string; changed: boolean;
}) {
  const groups: Group[] = ["Intervention", "Unit cost", "Phase 1", "Phase 2", "Totals", "Tags"];
  return (
    <div role="dialog" aria-modal="true" aria-label={row.sub_intervention}
      className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <aside className="h-full w-full max-w-[520px] overflow-y-auto bg-paper shadow-xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {landscapeName} · {row.row_key}
              {changed ? <span className="ml-2 normal-case tracking-normal text-amber">· changed in a recent update</span> : null}
            </p>
            <h2 className="font-serif text-[21px] text-deep-teal leading-tight mt-1">{row.sub_intervention}</h2>
          </div>
          <button type="button" onClick={onClose} autoFocus aria-label="Close"
            className="ml-auto rounded-[6px] border border-line px-2 py-1 font-mono text-[11px] uppercase text-muted hover:text-ink">Close</button>
        </div>
        {groups.map((g) => {
          const cs = COLUMNS.filter((c) => c.group === g && c.key !== "sub_intervention" && c.key !== "row_key");
          const items = cs.map((c) => [c, fmt(c, c.get(row), money)] as const).filter(([, v]) => v !== null);
          return items.length ? (
            <section key={g}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-teal mb-1.5">{g}</h3>
              <dl className="space-y-1.5 text-[13.5px]">
                {items.map(([c, v]) => (
                  <div key={c.key} className={c.kind === "long" ? "" : "flex gap-3"}>
                    <dt className="text-muted min-w-[150px]">{c.label}</dt>
                    <dd className={`text-ink ${numeric(c) ? "tabular-nums" : ""} ${c.kind === "long" ? "mt-0.5 whitespace-pre-line" : ""}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null;
        })}
      </aside>
    </div>
  );
}

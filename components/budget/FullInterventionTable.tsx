import { COLUMNS, toNumber, type Column, type InterventionRecord } from "@/lib/budget/table";

/**
 * The full investment table: every sheet column, grouped headers, the
 * intervention name pinned on the left, a subtotal row per category and a
 * grand total. Server component, no client JS.
 */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const GROUPS: Column["group"][] = ["Intervention", "Unit cost", "Phase 1", "Phase 2", "Totals", "Tags"];
const GROUP_TINT: Record<Column["group"], string> = {
  Intervention: "bg-cream", "Unit cost": "bg-paper", "Phase 1": "bg-teal/5", "Phase 2": "bg-teal/10",
  Totals: "bg-amber/15", Tags: "bg-paper",
};

function cell(c: Column, r: InterventionRecord) {
  const v = c.get(r);
  if (v === null || v === undefined || v === "") return <span className="text-muted/60">–</span>;
  if (c.kind === "money" || c.kind === "number") {
    const n = toNumber(v);
    return n === null ? String(v) : `${c.kind === "money" ? "₹" : ""}${inr.format(n)}`;
  }
  if (c.kind === "long") {
    const s = String(v);
    return (
      <span className="max-w-[340px] min-w-[220px] line-clamp-3" title={s}>
        {s}
      </span>
    );
  }
  return String(v);
}

function sum(rows: InterventionRecord[], c: Column): number | null {
  if (c.kind !== "money") return null;
  let t = 0, any = false;
  for (const r of rows) {
    const n = toNumber(c.get(r));
    if (n !== null) { t += n; any = true; }
  }
  return any ? t : null;
}

export function FullInterventionTable({ rows }: { rows: InterventionRecord[] }) {
  const categories: { name: string; rows: InterventionRecord[] }[] = [];
  for (const r of rows) {
    const last = categories[categories.length - 1];
    if (last && last.name === r.category) last.rows.push(r);
    else categories.push({ name: r.category, rows: [r] });
  }
  const pinned = (c: Column) => c.key === "row_key" || c.key === "sub_intervention";
  const sticky = (c: Column) =>
    c.key === "row_key"
      ? "sticky left-0 z-10 bg-inherit w-[60px] min-w-[60px] max-w-[60px]"
      : c.key === "sub_intervention"
        ? "sticky left-[60px] z-10 bg-inherit w-[300px] min-w-[300px] max-w-[300px] shadow-[1px_0_0_var(--color-line,#ddd)]"
        : "";
  // Pinned columns first so they stay on the left while scrolling.
  const cols = [...COLUMNS.filter(pinned), ...COLUMNS.filter((c) => !pinned(c))];

  return (
    <div className="overflow-x-auto rounded-[10px] border border-line bg-paper">
      <table className="border-collapse text-[12.5px] leading-snug">
        <thead className="sticky top-0 z-20">
          <tr>
            <th colSpan={2} className="sticky left-0 z-30 bg-cream border-b border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-muted" />
            {GROUPS.map((g) => {
              const n = cols.filter((c) => c.group === g && !pinned(c)).length;
              return n ? (
                <th key={g} colSpan={n} className={`${GROUP_TINT[g]} border-b border-l border-line px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.1em] text-deep-teal`}>
                  {g}
                </th>
              ) : null;
            })}
          </tr>
          <tr className="bg-cream">
            {cols.map((c) => (
              <th key={c.key} scope="col"
                className={`${sticky(c)} border-b border-line px-3 py-2 text-left font-medium text-ink whitespace-nowrap ${c.kind === "money" || c.kind === "number" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => (
            <CategoryRows key={`${i}:${cat.name}`} name={cat.name} rows={cat.rows} cols={cols} sticky={sticky} />
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-amber/20 font-medium">
            {cols.map((c, i) => {
              const t = sum(rows, c);
              return (
                <td key={c.key} className={`${sticky(c)} border-t-2 border-line px-3 py-2 whitespace-nowrap ${t !== null ? "text-right" : ""}`}>
                  {i === 1 ? `Total, ${rows.length} rows` : t !== null ? `₹${inr.format(t)}` : ""}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CategoryRows({ name, rows, cols, sticky }: {
  name: string; rows: InterventionRecord[]; cols: Column[]; sticky: (c: Column) => string;
}) {
  return (
    <>
      {rows.map((r) => (
        <tr key={`${r.landscape_slug}:${r.row_key}`} className="bg-paper hover:bg-cream/60 align-top">
          {cols.map((c) => (
            <td key={c.key} className={`${sticky(c)} border-t border-line px-3 py-1.5 ${c.kind === "money" || c.kind === "number" ? "text-right whitespace-nowrap tabular-nums" : c.kind === "long" || c.key === "sub_intervention" ? "" : "whitespace-nowrap"}`}>
              {cell(c, r)}
            </td>
          ))}
        </tr>
      ))}
      <tr className="bg-cream/70 text-ink-soft">
        {cols.map((c, i) => {
          const t = sum(rows, c);
          return (
            <td key={c.key} className={`${sticky(c)} border-t border-line px-3 py-1.5 whitespace-nowrap text-[12px] ${t !== null ? "text-right tabular-nums" : ""}`}>
              {i === 1 ? `Subtotal: ${name}` : t !== null ? `₹${inr.format(t)}` : ""}
            </td>
          );
        })}
      </tr>
    </>
  );
}

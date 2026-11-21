import Link from "next/link";
import { fieldValue, listPendingChanges, type PendingChange } from "@/lib/admin/budget-changes";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Budget changes · Admin" };

const TYPE_STYLE: Record<PendingChange["change_type"], string> = {
  add: "bg-teal/10 text-deep-teal border-teal/30",
  update: "bg-amber/20 text-deep-teal border-amber/40",
  remove: "bg-red-alert/10 text-red-alert border-red-alert/30",
};

const LABELS: Record<string, string> = {
  capital_cost: "Capital cost", recurring_per_year: "Recurring / year", recurring_years: "Recurring years",
  recurring_total: "Recurring total", unit_cost_total: "Unit cost total", sub_intervention: "Sub-intervention",
  intervention: "Intervention", category: "Category", unit: "Unit", capital_desc: "Cost build-up",
  recurring_desc: "Recurring description", thematic_investment: "Theme", sort_order: "Order",
};
const label = (f: string) => {
  const [a, b] = f.split(".");
  if (!b) return LABELS[a] ?? a;
  const group = a === "phase1" ? "Phase 1" : a === "phase2" ? "Phase 2" : a === "totals" ? "Totals" : "Tags";
  return `${group} · ${b.replace(/_/g, " ")}`;
};
const short = (s: string) => (s.length > 90 ? `${s.slice(0, 90)}…` : s);

function ChangeRow({ c }: { c: PendingChange }) {
  const row = (c.after ?? c.before) as Record<string, unknown>;
  const fields = c.change_type === "update" ? c.changed_fields : [];
  return (
    <li className="border-t border-line py-3 flex gap-3">
      <input type="checkbox" name="id" value={c.id} defaultChecked className="mt-1 accent-teal" aria-label={`Select ${row.sub_intervention}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-[5px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${TYPE_STYLE[c.change_type]}`}>
            {c.change_type}
          </span>
          <span className="font-mono text-[11px] text-muted">{c.row_key}</span>
          <span className="text-[14px] text-ink">{String(row.sub_intervention ?? "")}</span>
        </div>
        <div className="text-[12.5px] text-muted mt-0.5">
          {String(row.category ?? "")} · {String(row.intervention ?? "")}
        </div>
        {fields.length > 0 && (
          <table className="mt-2 text-[12.5px] w-full max-w-[760px]">
            <tbody>
              {fields.map((f) => (
                <tr key={f} className="align-top">
                  <td className="pr-3 py-0.5 text-muted whitespace-nowrap">{label(f)}</td>
                  <td className="pr-3 py-0.5 line-through text-muted/80">{short(fieldValue(c.before, f)) || "—"}</td>
                  <td className="py-0.5 text-ink">{short(fieldValue(c.after, f)) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {c.change_type !== "update" && row.totals ? (
          <div className="text-[12.5px] text-muted mt-1">
            Grand total: {fieldValue(row, "totals.grand_total") || "—"}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default async function BudgetChanges({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const sp = await searchParams;
  const changes = await listPendingChanges();
  const byLandscape = new Map<string, PendingChange[]>();
  for (const c of changes) byLandscape.set(c.landscape_slug, [...(byLandscape.get(c.landscape_slug) ?? []), c]);
  const [doneKind, doneN] = (sp.done ?? "").split(":");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Budget changes</h1>
        <p className="text-[14px] text-muted max-w-[720px] mt-1">
          The nightly Drive sync compares each landscape&apos;s live Google Sheet with the approved table. Differences wait
          here. Approving updates the site&apos;s budget tables and what Ask answers from; rejecting keeps the approved row.
        </p>
      </header>

      {doneKind && (
        <div className="rounded-[8px] border px-4 py-3 text-[13.5px] bg-teal/10 text-deep-teal border-teal/30">
          {doneKind === "approve" ? "Approved" : "Rejected"} {doneN} change{doneN === "1" ? "" : "s"}.
        </div>
      )}

      {changes.length === 0 ? (
        <p className="text-[14px] text-muted">
          Nothing waiting. All budget tables match the approved copy. See the{" "}
          <Link href="/admin/budget-tables" className="underline">full tables</Link>.
        </p>
      ) : (
        [...byLandscape.entries()].map(([slug, list]) => (
          <section key={slug} className="rounded-[10px] border border-line bg-cream/40 px-5 py-4">
            <form action="/api/admin/budget-changes" method="post">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="font-serif text-[20px] text-deep-teal">{LANDSCAPES[slug]?.name ?? slug}</h2>
                <span className="font-mono text-[11px] text-muted">{list.length} change{list.length === 1 ? "" : "s"}</span>
                <div className="ml-auto flex items-center gap-2">
                  <input name="note" placeholder="Note (optional)" maxLength={500}
                    className="rounded-[6px] border border-line bg-paper px-2 py-1 text-[12.5px] w-[200px]" />
                  <button name="decision" value="approve"
                    className="rounded-[6px] bg-teal text-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-deep-teal">
                    Approve selected
                  </button>
                  <button name="decision" value="reject"
                    className="rounded-[6px] border border-line px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft hover:text-red-alert">
                    Reject selected
                  </button>
                </div>
              </div>
              <ul>{list.map((c) => <ChangeRow key={c.id} c={c} />)}</ul>
            </form>
          </section>
        ))
      )}
    </div>
  );
}

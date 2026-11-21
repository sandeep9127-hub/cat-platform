import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getBudgetSummaries } from "@/lib/budget/table";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Budget tables · Admin" };

const crore = (n: number) => `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} cr`;

export default async function BudgetTables() {
  const [summaries, pending, links] = await Promise.all([
    getBudgetSummaries(),
    db.execute(sql`SELECT landscape_slug, count(*)::int AS n FROM "cat".intervention_changes WHERE status = 'pending' GROUP BY 1`),
    db.execute(sql`SELECT coalesce(landscape_slug, 'all') AS slug, count(*)::int AS n FROM "cat".share_links
                   WHERE revoked_at IS NULL AND expires_at > now() GROUP BY 1`),
  ]);
  const pendingBy = new Map((pending as unknown as { rows: { landscape_slug: string; n: number }[] }).rows.map((r) => [r.landscape_slug, r.n]));
  const linksBy = new Map((links as unknown as { rows: { slug: string; n: number }[] }).rows.map((r) => [r.slug, r.n]));
  const total = summaries.reduce((t, s) => t + s.grand_total, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Budget tables</h1>
        <p className="text-[14px] text-muted max-w-[720px] mt-1">
          The full approved investment table for each landscape: every column of the live sheet. The public Budget page shows the
          summary; the full table opens only for editors here, or through a private share link you create.
        </p>
      </header>
      <ul className="rounded-[10px] border border-line divide-y divide-line">
        {summaries.map((s) => (
          <li key={s.landscape_slug} className="flex flex-wrap items-center gap-4 px-4 py-3">
            <Link href={`/admin/budget-tables/${s.landscape_slug}`} className="font-serif text-[17px] text-deep-teal hover:text-teal min-w-[220px]">
              {LANDSCAPES[s.landscape_slug]?.name ?? s.landscape_slug}
            </Link>
            <span className="text-[13.5px] tabular-nums">{crore(s.grand_total)}</span>
            <span className="text-[12.5px] text-muted">{s.rows} rows</span>
            <span className="text-[12.5px] text-muted">approved {new Date(s.last_approved).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {pendingBy.get(s.landscape_slug) ? (
              <Link href="/admin/budget-changes" className="rounded-[5px] border border-amber/40 bg-amber/20 px-1.5 py-0.5 font-mono text-[11px] text-deep-teal">
                {pendingBy.get(s.landscape_slug)} pending
              </Link>
            ) : null}
            <span className="ml-auto font-mono text-[11px] text-muted">{linksBy.get(s.landscape_slug) ?? 0} live links</span>
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-4 px-4 py-3 bg-cream/50">
          <Link href="/admin/budget-tables/all" className="font-serif text-[17px] text-deep-teal hover:text-teal min-w-[220px]">All landscapes</Link>
          <span className="text-[13.5px] tabular-nums">{crore(total)}</span>
          <span className="ml-auto font-mono text-[11px] text-muted">{linksBy.get("all") ?? 0} live links</span>
        </li>
      </ul>
    </div>
  );
}

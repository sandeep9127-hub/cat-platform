import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function count(query: ReturnType<typeof sql>): Promise<number | null> {
  try {
    const r = await db.execute(query);
    const row = (r as unknown as { rows: { n: number | string }[] }).rows[0];
    return row ? Number(row.n) : 0;
  } catch {
    return null;
  }
}

export default async function AdminDashboard() {
  const [orgs, pendingSubs, landscapes, audits] = await Promise.all([
    count(sql`SELECT count(*)::int n FROM "cat".directory_orgs`),
    count(sql`SELECT count(*)::int n FROM "cat".org_submissions WHERE status = 'pending'`),
    count(sql`SELECT count(*)::int n FROM "cat".landscapes`),
    count(sql`SELECT count(*)::int n FROM "cat".audit_log`),
  ]);

  const cards = [
    { label: "Submissions to review", value: pendingSubs, href: "/admin/review", hint: "Pending org / contribute entries" },
    { label: "Organisations live", value: orgs, href: "/organizations", hint: "In the public directory" },
    { label: "Landscapes", value: landscapes, href: "/admin/landscapes", hint: "Editable records" },
    { label: "Audit entries", value: audits, href: "/admin/audit", hint: "Logged admin actions" },
  ];

  return (
    <div>
      <h1 className="font-[var(--font-fraunces)] text-[30px] font-semibold tracking-[-0.02em]">Dashboard</h1>
      <p className="text-[14.5px] text-[var(--ink-soft)] mt-1 mb-7 max-w-[60ch]">
        The team console for the Transformation Hub. Review what the public site collects, manage
        landscapes, and keep an audit trail of every change.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="block rounded-[10px] border border-[var(--line)] bg-[var(--cream)] p-5 no-underline hover:border-[var(--teal)] transition-colors"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--muted)]">{c.label}</div>
            <div className="font-[var(--font-fraunces)] text-[34px] font-semibold tabular-nums mt-2 text-[var(--ink)]">
              {c.value === null ? "—" : c.value.toLocaleString()}
            </div>
            <div className="text-[12px] text-[var(--ink-soft)] mt-1">{c.hint}</div>
          </Link>
        ))}
      </div>

      <div className="mt-9 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--teal)] mb-2">Getting started</div>
        <ul className="text-[14px] text-[var(--ink-soft)] leading-[1.7] list-disc pl-5 max-w-[70ch]">
          <li><strong className="text-[var(--ink)]">Review queue</strong> — approve, reject, or request changes on submissions from the public site.</li>
          <li><strong className="text-[var(--ink)]">Landscapes</strong> — add or edit landscape profiles without a code change.</li>
          <li><strong className="text-[var(--ink)]">Audit log</strong> — every approval and edit is recorded with who and when.</li>
        </ul>
      </div>
    </div>
  );
}

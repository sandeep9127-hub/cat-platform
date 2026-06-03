import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  created_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
};

export default async function AuditPage() {
  let rows: Row[] = [];
  try {
    const r = await db.execute(sql`
      SELECT created_at, actor_email, action, entity_type, entity_id
      FROM "cat".audit_log ORDER BY created_at DESC LIMIT 200
    `);
    rows = (r as unknown as { rows: Row[] }).rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <h1 className="font-[var(--font-fraunces)] text-[30px] font-semibold tracking-[-0.02em]">Audit log</h1>
      <p className="text-[14.5px] text-[var(--ink-soft)] mt-1 mb-6">Every consequential admin action, newest first.</p>

      {rows.length === 0 ? (
        <p className="text-[14px] text-[var(--muted)] py-10">No actions recorded yet.</p>
      ) : (
        <div className="rounded-[10px] border border-[var(--line)] overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--cream)] text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--line)]">
                  <td className="px-4 py-2.5 text-[var(--muted)] whitespace-nowrap tabular-nums">
                    {new Date(r.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-2.5">{r.actor_email ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--teal)]">{r.action}</td>
                  <td className="px-4 py-2.5 text-[var(--ink-soft)]">
                    {r.entity_type ? `${r.entity_type}${r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

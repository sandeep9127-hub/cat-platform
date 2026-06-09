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
    <div className="space-y-6">
      <header>
        <span className="mono-label">Accountability</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Audit log
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[60ch] font-light">
          Every consequential admin action, newest first.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-[14px] text-muted py-10">No actions recorded yet.</p>
      ) : (
        <div className="rounded-[10px] border border-line overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-cream text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-4 py-2.5 text-muted whitespace-nowrap tabular-nums">
                    {new Date(r.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-2.5 text-ink">{r.actor_email ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-teal">{r.action}</td>
                  <td className="px-4 py-2.5 text-ink-soft">
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

import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await db
    .select()
    .from(schema.ingestionRuns)
    .orderBy(desc(schema.ingestionRuns.startedAt))
    .limit(40);

  const totalCost = runs.reduce((s, r) => s + (r.costUsd ?? 0), 0);

  return (
    <div className="space-y-6">
      <header>
        <span className="mono-label">Ingestion runs</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Runs
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[60ch] font-light">
          Every crawler, discovery, drafter, and freshness run with its cost. Trigger manually
          with the buttons below; otherwise Vercel cron fires them on schedule.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line-soft border border-line-soft">
        <Stat label="Total runs" value={String(runs.length)} />
        <Stat label="Succeeded" value={String(runs.filter((r) => r.status === "succeeded").length)} />
        <Stat label="Failed" value={String(runs.filter((r) => r.status === "failed").length)} />
        <Stat label="Cost (recent)" value={`$${totalCost.toFixed(3)}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <TriggerForm path="/api/cron/registry-crawl" label="Run registry crawl" />
        <TriggerForm path="/api/cron/discovery" label="Run discovery" />
        <TriggerForm path="/api/cron/freshness-sweep" label="Run freshness sweep" />
      </div>

      <table className="w-full text-left">
        <thead className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted border-b border-line">
          <tr>
            <th className="py-3 pr-4 w-40">Type</th>
            <th className="py-3 pr-4 w-40">Started</th>
            <th className="py-3 pr-4 w-24">Status</th>
            <th className="py-3 pr-4 w-24 text-right">Processed</th>
            <th className="py-3 pr-4 w-24 text-right">Yielded</th>
            <th className="py-3 pr-4 w-24 text-right">Cost</th>
            <th className="py-3">Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {runs.map((r) => (
            <tr key={r.id} className="hover:bg-cream">
              <td className="py-3 pr-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep font-semibold">
                {r.runType.replace("_", " ")}
              </td>
              <td className="py-3 pr-4 font-mono text-[11px] text-muted">
                {r.startedAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td
                className={`py-3 pr-4 font-mono text-[10.5px] uppercase tracking-[0.14em] font-semibold ${
                  r.status === "succeeded"
                    ? "text-teal"
                    : r.status === "failed"
                      ? "text-red-alert"
                      : r.status === "partial"
                        ? "text-amber-deep"
                        : "text-muted"
                }`}
              >
                {r.status}
              </td>
              <td className="py-3 pr-4 font-mono text-[11px] text-ink-soft text-right">
                {r.itemsProcessed}
              </td>
              <td className="py-3 pr-4 font-mono text-[11px] text-ink text-right">
                {r.itemsYielded}
              </td>
              <td className="py-3 pr-4 font-mono text-[11px] text-ink-soft text-right">
                ${(r.costUsd ?? 0).toFixed(3)}
              </td>
              <td className="py-3 font-mono text-[11px] text-red-alert max-w-[300px] truncate">
                {r.errorLog ? r.errorLog.split("\n")[0] : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="font-serif text-[28px] text-deep-teal leading-none tracking-[-0.02em] mt-2">
        {value}
      </div>
    </div>
  );
}

function TriggerForm({ path, label }: { path: string; label: string }) {
  return (
    <form action={path} method="POST">
      <button
        type="submit"
        className="font-mono text-[10px] uppercase tracking-[0.14em] px-4 py-2.5 bg-deep-teal text-paper rounded-[2px] hover:bg-teal transition-colors"
      >
        {label} →
      </button>
    </form>
  );
}

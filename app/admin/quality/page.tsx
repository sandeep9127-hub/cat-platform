import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { poolSpentTodayUsd } from "@/lib/ai/claude";
import { poolDailyCapUsd } from "@/lib/ai/models";
import { LANDSCAPES } from "@/lib/data/landscapes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quality · Admin" };

const rows = async <T,>(q: ReturnType<typeof sql>): Promise<T[]> => {
  try {
    return (await db.execute(q) as unknown as { rows: T[] }).rows;
  } catch (e) {
    console.error("[quality] query failed", (e as Error).message);
    return [];
  }
};
const usd = (n: number | string | null) => `$${Number(n ?? 0).toFixed(2)}`;
const when = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "–";

function Card({ title, children, href }: { title: string; children: React.ReactNode; href?: string }) {
  return (
    <section className="rounded-[10px] border border-line bg-paper px-5 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-serif text-[19px] text-deep-teal">{title}</h2>
        {href && <Link href={href} className="ml-auto font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-teal">Open →</Link>}
      </div>
      {children}
    </section>
  );
}

function Meter({ label, spent, cap }: { label: string; spent: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex text-[13px]"><span>{label}</span><span className="ml-auto tabular-nums">{usd(spent)} of {usd(cap)}</span></div>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div className={`h-full ${pct > 80 ? "bg-red-alert" : pct > 50 ? "bg-amber" : "bg-teal"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Quality() {
  const [publicSpent, ingestSpent, byDay, byTask, health, syncs, docs, queues, ask, evals] = await Promise.all([
    poolSpentTodayUsd("public").catch(() => 0),
    poolSpentTodayUsd("ingestion").catch(() => 0),
    rows<{ day: string; usd: number; calls: number }>(sql`
      SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata'), 'DD Mon') AS day,
             sum(cost_usd)::float8 AS usd, count(*)::int AS calls
      FROM "cat".ai_usage WHERE created_at > now() - interval '14 days'
      GROUP BY date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata') ORDER BY date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata') DESC`),
    rows<{ task: string; model: string; usd: number; calls: number; errors: number }>(sql`
      SELECT task, model, sum(cost_usd)::float8 AS usd, count(*)::int AS calls, count(error)::int AS errors
      FROM "cat".ai_usage WHERE created_at > now() - interval '7 days' GROUP BY 1, 2 ORDER BY usd DESC`),
    rows<{ provider: string; model: string; ok: boolean; latency_ms: number; error: string | null; checked_at: string }>(sql`
      SELECT DISTINCT ON (provider, model) provider, model, ok, latency_ms, error, checked_at
      FROM "cat".model_health WHERE checked_at > now() - interval '7 days' ORDER BY provider, model, checked_at DESC`),
    rows<{ started_at: string; finished_at: string | null; triggered_by: string; files_seen: number; files_changed: number; error: string | null }>(sql`
      SELECT started_at, finished_at, triggered_by, files_seen, files_changed, error
      FROM "cat".drive_sync_runs ORDER BY started_at DESC LIMIT 7`),
    rows<{ landscape_slug: string; title: string; label: string | null; updated_at: string; chunks: number; pages: number | null }>(sql`
      SELECT d.landscape_slug, d.title, v.label, v.updated_at, v.page_count AS pages,
             (SELECT count(*)::int FROM "cat".chunks c WHERE c.version_id = v.id AND c.is_current) AS chunks
      FROM "cat".documents d LEFT JOIN "cat".document_versions v ON v.id = d.current_version_id
      ORDER BY d.landscape_slug, d.title`),
    rows<{ what: string; n: number; href: string }>(sql`
      SELECT 'Budget changes' AS what, count(*)::int AS n, '/admin/budget-changes' AS href FROM "cat".intervention_changes WHERE status = 'pending'
      UNION ALL SELECT 'Access requests', count(*)::int, '/admin/access-requests' FROM "cat".access_requests WHERE status = 'pending'
      UNION ALL SELECT 'Source changes to review', count(*)::int, '/admin/quality' FROM "cat".freshness_flags WHERE status = 'pending_review'
      UNION ALL SELECT 'Organisation submissions', count(*)::int, '/admin/submissions' FROM "cat".org_submissions WHERE status = 'pending'
      UNION ALL SELECT 'Discovery candidates', count(*)::int, '/admin/candidates' FROM "cat".discovery_candidates WHERE status = 'pending_triage'
      UNION ALL SELECT 'Flagged fact sheets', count(*)::int, '/admin/factsheets' FROM "cat".solution_factsheets WHERE status = 'flagged'
      UNION ALL SELECT 'Open triage items', count(*)::int, '/admin/budget-changes' FROM "cat".triage_items WHERE status IN ('new','in_review','needs_info')`),
    rows<{ answers: number; refused: number; interrupted: number; p50_ms: number | null; up: number; down: number; conversations: number }>(sql`
      SELECT count(*)::int AS answers, count(*) FILTER (WHERE refused)::int AS refused,
             count(*) FILTER (WHERE interrupted)::int AS interrupted,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)::int AS p50_ms,
             count(*) FILTER (WHERE feedback = 1)::int AS up, count(*) FILTER (WHERE feedback = -1)::int AS down,
             count(DISTINCT conversation_id)::int AS conversations
      FROM "cat".messages WHERE role = 'assistant' AND created_at > now() - interval '7 days'`),
    rows<{ label: string; finished_at: string; scores: Record<string, number | null> }>(sql`
      SELECT label, finished_at, scores FROM "cat".eval_runs
      WHERE finished_at IS NOT NULL AND scores IS NOT NULL ORDER BY finished_at DESC LIMIT 5`),
  ]);
  const a = ask[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-[28px] text-deep-teal">Quality</h1>
        <p className="text-[14px] text-muted max-w-[720px] mt-1">
          Spending, service health, answer quality and freshness of the Hub&apos;s sources in one place. Times are IST.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="AI spend today">
          <Meter label="Public (Ask, charts)" spent={publicSpent} cap={poolDailyCapUsd("public")} />
          <Meter label="Ingestion (sync, fact sheets, discovery)" spent={ingestSpent} cap={poolDailyCapUsd("ingestion")} />
          <table className="w-full text-[12.5px] mt-2">
            <tbody>
              {byDay.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1">{d.day}</td>
                  <td className="py-1 text-right tabular-nums">{usd(d.usd)}</td>
                  <td className="py-1 text-right text-muted tabular-nums">{d.calls} calls</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="AI services">
          {health.length === 0 ? (
            <p className="text-[13px] text-muted">No health check in the last 7 days. It runs nightly after the Drive sync.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {health.map((h) => (
                  <tr key={`${h.provider}:${h.model}`} className="border-t border-line">
                    <td className="py-1.5"><span className={`inline-block h-2 w-2 rounded-full mr-2 ${h.ok ? "bg-teal" : "bg-red-alert"}`} />{h.provider}</td>
                    <td className="py-1.5 font-mono text-[12px]">{h.model}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted">{h.latency_ms} ms</td>
                    <td className="py-1.5 text-right text-muted">{when(h.checked_at)}</td>
                  </tr>
                ))}
                {health.filter((h) => !h.ok).map((h) => (
                  <tr key={`e:${h.provider}:${h.model}`}><td colSpan={4} className="text-[12.5px] text-red-alert pb-1">{h.model}: {h.error}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Ask, last 7 days">
          {!a || a.answers === 0 ? (
            <p className="text-[13px] text-muted">No Ask v2 answers yet.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-3 text-[13px]">
              {[
                ["Answers", a.answers], ["Conversations", a.conversations],
                ["Not in the library", `${Math.round((a.refused / a.answers) * 100)}%`],
                ["Stopped by reader", a.interrupted], ["Median time", a.p50_ms ? `${(a.p50_ms / 1000).toFixed(1)} s` : "–"],
                ["Feedback", `+${a.up} / −${a.down}`],
              ].map(([k, v]) => (
                <div key={String(k)}><dt className="text-muted text-[12px]">{k}</dt><dd className="text-[18px] tabular-nums">{v}</dd></div>
              ))}
            </dl>
          )}
          {byTask.length > 0 && (
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-left text-muted"><th className="font-normal py-1">Task</th><th className="font-normal">Model</th><th className="font-normal text-right">Calls</th><th className="font-normal text-right">Errors</th><th className="font-normal text-right">Spend</th></tr></thead>
              <tbody>
                {byTask.map((t) => (
                  <tr key={`${t.task}:${t.model}`} className="border-t border-line">
                    <td className="py-1">{t.task}</td><td className="font-mono text-[11.5px]">{t.model}</td>
                    <td className="text-right tabular-nums">{t.calls}</td>
                    <td className={`text-right tabular-nums ${t.errors ? "text-red-alert" : ""}`}>{t.errors}</td>
                    <td className="text-right tabular-nums">{usd(t.usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Search quality (test set)">
          {evals.length === 0 ? (
            <p className="text-[13px] text-muted">No test-set run yet. Run <code>npx tsx scripts/run-eval.ts</code>.</p>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-3 text-[13px]">
                {[
                  ["Right page in top 1", `${evals[0].scores.hit1 ?? "–"}%`],
                  ["Right page in top 5", `${evals[0].scores.hit5 ?? "–"}%`],
                  ["Right page in top 10", `${evals[0].scores.hit10 ?? "–"}%`],
                  ["Off-topic declined", `${evals[0].scores.refusalCorrect ?? "–"}%`],
                  ["Answerable but would decline", evals[0].scores.falseRefusals ?? "–"],
                  ["Questions", evals[0].scores.questions ?? "–"],
                ].map(([k, v]) => (
                  <div key={String(k)}><dt className="text-muted text-[12px]">{k}</dt><dd className="text-[18px] tabular-nums">{v}</dd></div>
                ))}
              </dl>
              <table className="w-full text-[12.5px]">
                <tbody>
                  {evals.map((e) => (
                    <tr key={e.finished_at} className="border-t border-line">
                      <td className="py-1">{e.label}</td>
                      <td className="py-1 text-right tabular-nums">top 5: {e.scores.hit5 ?? "–"}%</td>
                      <td className="py-1 text-right text-muted">{when(e.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>

        <Card title="Waiting for an editor">
          <ul className="text-[13.5px]">
            {queues.map((q) => (
              <li key={q.what} className="flex border-t border-line py-1.5">
                <Link href={q.href} className="hover:text-teal">{q.what}</Link>
                <span className={`ml-auto tabular-nums ${q.n ? "text-deep-teal font-medium" : "text-muted"}`}>{q.n}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Drive sync">
          {syncs.length === 0 ? <p className="text-[13px] text-muted">No sync runs recorded yet.</p> : (
            <table className="w-full text-[12.5px]">
              <tbody>
                {syncs.map((s) => (
                  <tr key={s.started_at} className="border-t border-line">
                    <td className="py-1">{when(s.started_at)}</td>
                    <td className="py-1 text-muted">{s.triggered_by}</td>
                    <td className="py-1 text-right tabular-nums">{s.files_seen} files, {s.files_changed} changed</td>
                    <td className={`py-1 text-right ${s.error ? "text-red-alert" : !s.finished_at ? "text-amber" : "text-teal"}`}>
                      {s.error ? "failed" : !s.finished_at ? "running / stopped" : "ok"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Landscape reports in the library">
          <table className="w-full text-[12.5px]">
            <tbody>
              {docs.map((d) => (
                <tr key={`${d.landscape_slug}:${d.title}`} className="border-t border-line">
                  <td className="py-1">{LANDSCAPES[d.landscape_slug]?.name ?? d.landscape_slug}</td>
                  <td className="py-1 text-muted">{d.label ?? "–"}</td>
                  <td className="py-1 text-right tabular-nums">{d.chunks} chunks</td>
                  <td className={`py-1 text-right ${d.pages && d.pages > 1 ? "text-muted" : "text-amber"}`} title="Citations show page numbers only when the source has real pages">
                    {d.pages && d.pages > 1 ? `${d.pages} pp` : "no pages"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

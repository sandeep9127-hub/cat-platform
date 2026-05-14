import Link from "next/link";
import { eq, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminQueuesPage() {
  // Four queues: AI drafts, discovery candidates, freshness flags, submissions
  const [drafts, candidates, freshness, submissions, recentRuns] = await Promise.all([
    db
      .select({
        id: schema.draftEntries.id,
        title: schema.draftEntries.title,
        themeSlug: schema.draftEntries.primaryThemeSlug,
        state: schema.draftEntries.primaryStateCode,
        confidence: schema.draftEntries.draftConfidence,
        createdAt: schema.draftEntries.createdAt,
        approvedAt: schema.draftEntries.approvedForPublicationAt,
      })
      .from(schema.draftEntries)
      .orderBy(desc(schema.draftEntries.createdAt))
      .limit(20),
    db
      .select()
      .from(schema.discoveryCandidates)
      .where(eq(schema.discoveryCandidates.status, "pending_triage"))
      .orderBy(desc(schema.discoveryCandidates.createdAt))
      .limit(20),
    db
      .select({
        id: schema.freshnessFlags.id,
        entrySlug: schema.entries.slug,
        entryTitle: schema.entries.title,
        diffSummary: schema.freshnessFlags.diffSummary,
        detectedAt: schema.freshnessFlags.detectedAt,
        sourceUrl: schema.freshnessFlags.sourceUrl,
      })
      .from(schema.freshnessFlags)
      .innerJoin(schema.entries, eq(schema.entries.id, schema.freshnessFlags.entryId))
      .where(eq(schema.freshnessFlags.status, "pending_review"))
      .orderBy(desc(schema.freshnessFlags.detectedAt))
      .limit(20),
    db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.status, "pending_review"))
      .orderBy(desc(schema.submissions.submittedDate))
      .limit(20),
    db
      .select({
        id: schema.ingestionRuns.id,
        runType: schema.ingestionRuns.runType,
        startedAt: schema.ingestionRuns.startedAt,
        status: schema.ingestionRuns.status,
        itemsYielded: schema.ingestionRuns.itemsYielded,
        costUsd: schema.ingestionRuns.costUsd,
      })
      .from(schema.ingestionRuns)
      .orderBy(desc(schema.ingestionRuns.startedAt))
      .limit(6),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <span className="mono-label">Editorial desk</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Queues
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[60ch] font-light">
          What needs your attention today. Use j/k to navigate, Enter to open, a to approve,
          r to return, s to save.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-line-soft border border-line-soft">
        <QueueStat
          label="AI drafts awaiting review"
          count={drafts.filter((d) => !d.approvedAt).length}
          href="#drafts"
        />
        <QueueStat
          label="Discovery candidates"
          count={candidates.length}
          href="#candidates"
        />
        <QueueStat
          label="Freshness flags"
          count={freshness.length}
          href="#freshness"
        />
        <QueueStat
          label="Submissions"
          count={submissions.length}
          href="#submissions"
        />
      </section>

      {/* Drafts */}
      <section id="drafts">
        <SectionHead title="AI drafts" count={drafts.length} />
        {drafts.length === 0 ? (
          <Empty>No drafts yet. Promote a discovery candidate to generate one.</Empty>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/admin/review/${d.id}`}
                  className="flex items-center gap-4 py-3 px-1 hover:bg-cream transition-colors"
                >
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep font-semibold w-16 shrink-0">
                    {d.state ?? "—"}
                  </span>
                  <span className="font-serif text-[17px] text-ink flex-1 min-w-0 truncate">
                    {d.title}
                  </span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted shrink-0">
                    {d.themeSlug ?? "—"}
                  </span>
                  <span className="font-mono text-[10.5px] text-muted shrink-0 w-16 text-right">
                    {d.confidence != null ? `${Math.round(d.confidence * 100)}%` : "—"}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal shrink-0">
                    {d.approvedAt ? "Published" : "Review →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Discovery candidates */}
      <section id="candidates">
        <SectionHead title="Discovery candidates" count={candidates.length} />
        {candidates.length === 0 ? (
          <Empty>
            No candidates. Run the discovery agent from{" "}
            <Link href="/admin/runs" className="text-teal hover:underline">
              Runs
            </Link>{" "}
            to trigger one.
          </Empty>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {candidates.map((c) => (
              <li key={c.id} className="py-4 px-1 flex flex-col md:flex-row md:items-start gap-3">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep font-semibold w-16 shrink-0 md:pt-1">
                  {c.proposedStateCode ?? "—"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[17px] text-ink">{c.proposedTitle}</div>
                  <p className="font-serif italic text-[14px] text-ink-soft mt-1 max-w-[68ch] font-light">
                    {c.proposedSummary}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    <span>Confidence: {c.confidenceScore != null ? `${Math.round(c.confidenceScore * 100)}%` : "—"}</span>
                    <span>Lead: {c.proposedLeadOrganisationName ?? "—"}</span>
                    {(c.sourceUrls ?? []).slice(0, 2).map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="text-teal hover:underline">
                        {new URL(u).hostname} ↗
                      </a>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={`/api/admin/candidates/${c.id}/promote`} method="POST">
                    <button className="font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 bg-deep-teal text-paper rounded-[2px] hover:bg-teal transition-colors">
                      Draft →
                    </button>
                  </form>
                  <form action={`/api/admin/candidates/${c.id}/dismiss`} method="POST">
                    <button className="font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border border-line text-muted rounded-[2px] hover:border-red-alert hover:text-red-alert transition-colors">
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Freshness */}
      <section id="freshness">
        <SectionHead title="Freshness flags" count={freshness.length} />
        {freshness.length === 0 ? (
          <Empty>No published entries need updating.</Empty>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {freshness.map((f) => (
              <li key={f.id} className="py-3 px-1 flex items-center gap-4">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-red-alert font-semibold w-16 shrink-0">
                  Stale
                </span>
                <Link href={`/entry/${f.entrySlug}`} className="font-serif text-[17px] text-ink hover:text-teal flex-1 min-w-0 truncate">
                  {f.entryTitle}
                </Link>
                <span className="font-mono text-[10.5px] text-muted shrink-0">
                  {f.detectedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Submissions */}
      <section id="submissions">
        <SectionHead title="Contributor submissions" count={submissions.length} />
        {submissions.length === 0 ? (
          <Empty>No pending submissions.</Empty>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {submissions.map((s) => (
              <li key={s.id} className="py-3 px-1 flex items-center gap-4">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-teal font-semibold w-16 shrink-0">
                  {s.submissionType}
                </span>
                <span className="font-serif text-[17px] text-ink flex-1 truncate">
                  {s.submittedObjectId}
                </span>
                <span className="font-mono text-[10.5px] text-muted shrink-0">
                  {s.submittedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent runs */}
      <section>
        <SectionHead title="Recent ingestion runs" count={recentRuns.length} />
        <ul className="divide-y divide-line-soft border-y border-line-soft">
          {recentRuns.map((r) => (
            <li key={r.id} className="py-3 px-1 flex items-center gap-4 font-mono text-[11px]">
              <span className="uppercase tracking-[0.14em] text-amber-deep font-semibold w-32 shrink-0">
                {r.runType.replace("_", " ")}
              </span>
              <span className="text-muted w-32 shrink-0">
                {r.startedAt.toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={`uppercase tracking-[0.14em] font-semibold w-24 shrink-0 ${
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
              </span>
              <span className="text-ink flex-1">{r.itemsYielded} yielded</span>
              <span className="text-muted">${(r.costUsd ?? 0).toFixed(3)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SectionHead({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="font-serif text-[22px] font-medium tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {count}
      </span>
    </div>
  );
}

function QueueStat({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link href={href} className="bg-paper hover:bg-cream p-5 transition-colors group">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted mb-2">
        {label}
      </div>
      <div className="font-serif text-[40px] text-deep-teal leading-none tracking-[-0.02em] group-hover:text-teal transition-colors">
        {count}
      </div>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif italic text-ink-soft text-[15px] py-4 max-w-[60ch] font-light">
      {children}
    </p>
  );
}

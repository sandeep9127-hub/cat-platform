import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

function Banner({ gen, slug }: { gen?: string; slug?: string }) {
  if (!gen) return null;
  const map: Record<string, { tone: "ok" | "warn" | "err"; text: React.ReactNode }> = {
    published: {
      tone: "ok",
      text: (
        <>
          Fact sheet published and live on the Atlas.{" "}
          {slug ? (
            <Link href={`/factsheet/${slug}`} target="_blank" className="underline">
              View it
            </Link>
          ) : null}
        </>
      ),
    },
    flagged: {
      tone: "warn",
      text: (
        <>
          Fact sheet created but flagged (sources too weak to auto-publish). Review it under{" "}
          <Link href="/admin/factsheets" className="underline">
            Fact sheets
          </Link>
          .
        </>
      ),
    },
    norows: { tone: "warn", text: "Could not build a fact sheet: no usable cited sources were found for this programme." },
    error: { tone: "err", text: "Generation failed. Please try again." },
    notfound: { tone: "err", text: "That candidate no longer exists." },
  };
  const m = map[gen];
  if (!m) return null;
  const tone =
    m.tone === "ok"
      ? "bg-teal/10 text-deep-teal border-teal/30"
      : m.tone === "warn"
        ? "bg-amber/20 text-deep-teal border-amber/40"
        : "bg-red-alert/10 text-red-alert border-red-alert/30";
  return <div className={`rounded-[8px] border px-4 py-3 text-[13.5px] ${tone}`}>{m.text}</div>;
}

function DiscoveryBanner({ disc, found }: { disc?: string; found?: string }) {
  if (!disc) return null;
  const map: Record<string, { tone: "ok" | "warn" | "err"; text: React.ReactNode }> = {
    ok: { tone: "ok", text: <>Discovery run complete. <strong>{found ?? 0}</strong> new candidate{found === "1" ? "" : "s"} added below.</> },
    skipped: { tone: "warn", text: "Discovery skipped: the AI key isn't configured on the server." },
    error: { tone: "err", text: "Discovery run failed. Try again in a moment." },
    unauth: { tone: "err", text: "You don't have permission to run discovery." },
  };
  const m = map[disc];
  if (!m) return null;
  const tone =
    m.tone === "ok"
      ? "bg-teal/10 text-deep-teal border-teal/30"
      : m.tone === "warn"
        ? "bg-amber/20 text-deep-teal border-amber/40"
        : "bg-red-alert/10 text-red-alert border-red-alert/30";
  return <div className={`rounded-[8px] border px-4 py-3 text-[13.5px] ${tone}`}>{m.text}</div>;
}

export default async function AdminCandidates({
  searchParams,
}: {
  searchParams: Promise<{ gen?: string; slug?: string; disc?: string; found?: string }>;
}) {
  const sp = await searchParams;
  const cands = await db
    .select()
    .from(schema.discoveryCandidates)
    .where(and(eq(schema.discoveryCandidates.status, "pending_triage")))
    .orderBy(desc(schema.discoveryCandidates.confidenceScore), desc(schema.discoveryCandidates.createdAt));

  return (
    <div className="space-y-6 max-w-[1000px]">
      <header>
        <span className="mono-label">Discovery</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Triage queue
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[64ch] font-light">
          New programmes the weekly discovery agent surfaced from allow-listed sources. Generate a
          cited fact sheet straight onto the Atlas, or dismiss. Nothing here is public until you act.
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap mt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {cands.length} awaiting triage
          </p>
          <form action="/api/admin/discovery/run" method="post" className="flex items-center gap-2">
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-[0.12em] rounded-[8px] bg-deep-teal text-white px-4 py-2.5 hover:bg-teal"
            >
              Run discovery now
            </button>
            <span className="text-[11px] text-muted">Finds new candidates on demand (~1 min)</span>
          </form>
        </div>
      </header>

      <DiscoveryBanner disc={sp.disc} found={sp.found} />
      <Banner gen={sp.gen} slug={sp.slug} />

      {cands.length === 0 ? (
        <p className="text-[13.5px] text-muted py-6">
          Nothing in the queue. The discovery agent runs weekly and drops new candidates here.
        </p>
      ) : (
        <ul className="rounded-[10px] border border-line divide-y divide-line list-none p-0 m-0">
          {cands.map((c) => {
            const sources = Array.isArray(c.sourceUrls) ? c.sourceUrls : [];
            return (
              <li key={c.id} className="flex flex-col gap-3 px-4 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif text-[16px] text-ink">{c.proposedTitle}</span>
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                        conf {Math.round((c.confidenceScore ?? 0) * 100)}%
                      </span>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted mt-1">
                      {[c.proposedLeadOrganisationName, c.proposedGeographyName, c.proposedStateCode]
                        .filter(Boolean)
                        .join(" · ") || "location unspecified"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <form action={`/api/admin/candidates/${c.id}/factsheet`} method="post">
                      <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper bg-deep-teal hover:bg-teal px-3 py-2 rounded-[6px] transition-colors">
                        Generate → Atlas
                      </button>
                    </form>
                    <form action={`/api/admin/candidates/${c.id}/dismiss`} method="post">
                      <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-red-alert">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
                <p className="text-[13px] text-ink-soft leading-[1.55] max-w-[72ch]">{c.proposedSummary}</p>
                {sources.length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
                    {sources.slice(0, 4).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer" className="text-teal hover:underline truncate max-w-[280px]">
                        {u.replace(/^https?:\/\//, "")}
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
        Generate takes up to a minute (web search + grounded write). Well-sourced sheets auto-publish;
        weak ones are flagged for your review before going live.
      </p>
    </div>
  );
}

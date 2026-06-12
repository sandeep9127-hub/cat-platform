import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import {
  getPublishedSummaries,
  scoreAgainst,
  scanAtlasForDuplicates,
  type DuplicateMatch,
} from "@/lib/factsheet/dedup";

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

function DupeBadge({ matches }: { matches: DuplicateMatch[] }) {
  if (matches.length === 0) return null;
  const top = matches[0];
  return (
    <div className="flex items-center gap-2 flex-wrap mt-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-amber/15 border border-amber/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-deep-teal">
        <span>⚠</span>
        <span>
          Possible match:{" "}
          <Link
            href={`/factsheet/${top.slug}`}
            target="_blank"
            className="underline underline-offset-2"
          >
            {top.title}
          </Link>{" "}
          ({Math.round(top.score * 100)}%)
        </span>
      </span>
      {matches.length > 1 && (
        <span className="font-mono text-[10px] text-muted">
          +{matches.length - 1} more
        </span>
      )}
    </div>
  );
}

export default async function AdminCandidates({
  searchParams,
}: {
  searchParams: Promise<{ gen?: string; slug?: string; disc?: string; found?: string; scan?: string }>;
}) {
  const sp = await searchParams;
  const showScan = sp.scan === "1";

  const [cands, published] = await Promise.all([
    db
      .select()
      .from(schema.discoveryCandidates)
      .where(and(eq(schema.discoveryCandidates.status, "pending_triage")))
      .orderBy(desc(schema.discoveryCandidates.confidenceScore), desc(schema.discoveryCandidates.createdAt)),
    getPublishedSummaries(),
  ]);

  // Compute per-candidate duplicate matches (pure in-memory, one published fetch above)
  const candMatches = cands.map((c) =>
    scoreAgainst(
      c.proposedTitle,
      c.proposedStateCode,
      c.proposedLeadOrganisationName,
      published,
    ),
  );

  // Atlas all-pairs scan only when requested
  const atlasPairs = showScan ? scanAtlasForDuplicates(published) : [];

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
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={showScan ? "/admin/candidates" : "/admin/candidates?scan=1"}
              className="font-mono text-[10px] uppercase tracking-[0.12em] rounded-[8px] border border-line px-4 py-2.5 text-ink-soft hover:text-ink hover:border-ink/30 transition-colors"
            >
              {showScan ? "Hide Atlas scan" : "Scan Atlas for duplicates"}
            </Link>
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
        </div>
      </header>

      <DiscoveryBanner disc={sp.disc} found={sp.found} />
      <Banner gen={sp.gen} slug={sp.slug} />

      {/* ── Triage queue ─────────────────────────────── */}
      {cands.length === 0 ? (
        <p className="text-[13.5px] text-muted py-6">
          Nothing in the queue. The discovery agent runs weekly and drops new candidates here.
        </p>
      ) : (
        <ul className="rounded-[10px] border border-line divide-y divide-line list-none p-0 m-0">
          {cands.map((c, i) => {
            const sources = Array.isArray(c.sourceUrls) ? c.sourceUrls : [];
            const matches = candMatches[i];
            const hasDupe = matches.length > 0;
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
                    <DupeBadge matches={matches} />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {!hasDupe && (
                      <form action={`/api/admin/candidates/${c.id}/factsheet`} method="post">
                        <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-paper bg-deep-teal hover:bg-teal px-3 py-2 rounded-[6px] transition-colors">
                          Generate → Atlas
                        </button>
                      </form>
                    )}
                    {hasDupe && (
                      <form action={`/api/admin/candidates/${c.id}/factsheet`} method="post">
                        <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted border border-line hover:border-deep-teal hover:text-deep-teal px-3 py-2 rounded-[6px] transition-colors">
                          Generate anyway
                        </button>
                      </form>
                    )}
                    <form action={`/api/admin/candidates/${c.id}/dismiss`} method="post">
                      {hasDupe && (
                        <input type="hidden" name="reason" value={`duplicate:${matches[0].slug}`} />
                      )}
                      <button className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-red-alert">
                        {hasDupe ? "Dismiss as duplicate" : "Dismiss"}
                      </button>
                    </form>
                  </div>
                </div>
                <p className="text-[13px] text-ink-soft leading-[1.55] max-w-[72ch]">{c.proposedSummary}</p>
                {sources.length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
                    {sources.slice(0, 4).map((u, j) => (
                      <a key={j} href={u} target="_blank" rel="noreferrer" className="text-teal hover:underline truncate max-w-[280px]">
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

      {/* ── Atlas duplicate scan ──────────────────────── */}
      {showScan && (
        <section className="space-y-4 pt-4 border-t border-line">
          <header>
            <span className="mono-label">Atlas integrity</span>
            <h2 className="font-serif text-[24px] font-normal tracking-[-0.02em] text-ink mt-1">
              Possible duplicates within published fact sheets
            </h2>
            <p className="text-[13px] text-ink-soft mt-1 max-w-[64ch]">
              Pairs of published sheets with overlapping titles, state, or lead organisation.
              Review and unpublish one if they cover the same programme.
            </p>
          </header>

          {atlasPairs.length === 0 ? (
            <p className="text-[13.5px] text-muted py-4">
              No likely duplicates found among {published.length} published fact sheets.
            </p>
          ) : (
            <ul className="rounded-[10px] border border-line divide-y divide-line list-none p-0 m-0">
              {atlasPairs.map((pair, i) => (
                <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-amber-600 shrink-0 w-[40px]">
                    {Math.round(pair.score * 100)}%
                  </span>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                    <Link
                      href={`/factsheet/${pair.a.slug}`}
                      target="_blank"
                      className="font-serif text-[14px] text-ink hover:underline truncate"
                    >
                      {pair.a.title}
                    </Link>
                    <span className="font-mono text-[10px] text-muted shrink-0">vs</span>
                    <Link
                      href={`/factsheet/${pair.b.slug}`}
                      target="_blank"
                      className="font-serif text-[14px] text-ink hover:underline truncate"
                    >
                      {pair.b.title}
                    </Link>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <Link
                      href={`/admin/factsheets/${pair.a.slug}/edit`}
                      className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-ink"
                    >
                      Edit A
                    </Link>
                    <Link
                      href={`/admin/factsheets/${pair.b.slug}/edit`}
                      className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:text-ink"
                    >
                      Edit B
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

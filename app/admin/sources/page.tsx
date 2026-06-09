import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const SOURCE_TYPES = [
  "gov_site",
  "ngo_site",
  "research_inst",
  "foundation",
  "news_outlet",
  "partner_report",
  "other",
] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

const TRUST_TIERS = [
  "tier_1_authoritative",
  "tier_2_trusted",
  "tier_3_emerging",
] as const;
type TrustTier = (typeof TRUST_TIERS)[number];

const SOURCE_TYPE_SET = new Set<string>(SOURCE_TYPES);
const TRUST_TIER_SET = new Set<string>(TRUST_TIERS);

const DEFAULT_TYPE: SourceType = "other";
const DEFAULT_TIER: TrustTier = "tier_2_trusted";

const TYPE_LABEL: Record<SourceType, string> = {
  gov_site: "Gov site",
  ngo_site: "NGO site",
  research_inst: "Research inst",
  foundation: "Foundation",
  news_outlet: "News outlet",
  partner_report: "Partner report",
  other: "Other",
};

const TIER_LABEL: Record<TrustTier, string> = {
  tier_1_authoritative: "Tier 1 · Authoritative",
  tier_2_trusted: "Tier 2 · Trusted",
  tier_3_emerging: "Tier 3 · Emerging",
};

async function bulkAddSources(formData: FormData) {
  "use server";

  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin" && role !== "editor") {
    redirect("/admin/sources?error=unauthorized");
  }

  const raw = String(formData.get("urls") ?? "");
  const lines = raw.split(/\r?\n/);

  const seen = new Set<string>();
  const rows: {
    url: string;
    sourceType: SourceType;
    trustTier: TrustTier;
    crawlFrequencyDays: number;
  }[] = [];
  let invalid = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const parts = trimmed.split(",").map((p) => p.trim());
    const url = parts[0];
    if (!url) continue;

    try {
      new URL(url);
    } catch {
      invalid += 1;
      continue;
    }

    if (seen.has(url)) continue;
    seen.add(url);

    const typeCandidate = parts[1];
    const tierCandidate = parts[2];

    const sourceType: SourceType =
      typeCandidate && SOURCE_TYPE_SET.has(typeCandidate)
        ? (typeCandidate as SourceType)
        : DEFAULT_TYPE;
    const trustTier: TrustTier =
      tierCandidate && TRUST_TIER_SET.has(tierCandidate)
        ? (tierCandidate as TrustTier)
        : DEFAULT_TIER;

    rows.push({ url, sourceType, trustTier, crawlFrequencyDays: 7 });
  }

  let added = 0;
  if (rows.length > 0) {
    const inserted = await db
      .insert(schema.sourceRegistry)
      .values(rows)
      .onConflictDoNothing({ target: schema.sourceRegistry.url })
      .returning({ url: schema.sourceRegistry.url });
    added = inserted.length;
  }

  const skipped = rows.length - added;

  redirect(
    `/admin/sources?added=${added}&skipped=${skipped}&invalid=${invalid}`,
  );
}

function toInt(value: string | string[] | undefined): number | null {
  if (typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const added = toInt(sp.added);
  const skipped = toInt(sp.skipped);
  const invalid = toInt(sp.invalid);
  const showResult = added !== null || skipped !== null || invalid !== null;
  const error = typeof sp.error === "string" ? sp.error : null;

  const sources = await db
    .select()
    .from(schema.sourceRegistry)
    .orderBy(desc(schema.sourceRegistry.createdAt));

  return (
    <div className="space-y-6 max-w-[1000px]">
      <header>
        <span className="mono-label">Knowledge base</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Sources
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[64ch] font-light">
          The allow-listed registry the discovery agent crawls. Add a single URL,
          or paste many at once. Each source carries a type and a trust tier that
          shape how its findings are weighted.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-3">
          {sources.length} {sources.length === 1 ? "source" : "sources"}
        </p>
      </header>

      {error ? (
        <div className="rounded-[10px] border border-red-alert/40 bg-red-alert/5 px-4 py-3 text-[13px] text-ink">
          {error === "unauthorized"
            ? "You do not have permission to add sources."
            : error === "invalid-url"
            ? "That URL was not valid."
            : error === "missing-url"
            ? "A URL is required."
            : "Something went wrong."}
        </div>
      ) : null}

      {showResult ? (
        <div className="rounded-[10px] border border-teal/40 bg-teal/5 px-4 py-3 text-[13px] text-ink">
          Bulk import complete:{" "}
          <span className="font-medium">{added ?? 0} added</span>,{" "}
          <span className="font-medium">{skipped ?? 0} skipped</span> (duplicates
          or already present),{" "}
          <span className="font-medium">{invalid ?? 0} invalid</span>.
        </div>
      ) : null}

      {/* Single-URL add */}
      <section className="rounded-[10px] border border-line p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="font-serif text-[20px] text-ink">Add a source</h2>
          <p className="text-[12.5px] text-muted mt-1">
            One URL, with a type and trust tier.
          </p>
        </div>
        <form
          action="/api/admin/sources"
          method="post"
          className="flex flex-col gap-3"
        >
          <input
            type="url"
            name="url"
            required
            placeholder="https://example.org"
            className="rounded-[8px] border border-line bg-white px-3 py-2 text-[13.5px] text-ink focus:border-teal focus:outline-none"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Source type
              </span>
              <select
                name="source_type"
                defaultValue={DEFAULT_TYPE}
                className="rounded-[8px] border border-line bg-white px-3 py-2 text-[13.5px] text-ink focus:border-teal focus:outline-none"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Trust tier
              </span>
              <select
                name="trust_tier"
                defaultValue={DEFAULT_TIER}
                className="rounded-[8px] border border-line bg-white px-3 py-2 text-[13.5px] text-ink focus:border-teal focus:outline-none"
              >
                {TRUST_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-[0.12em] rounded-[8px] bg-deep-teal text-white px-4 py-2.5 hover:bg-teal"
            >
              Add source
            </button>
          </div>
        </form>
      </section>

      {/* Bulk importer */}
      <section className="rounded-[10px] border border-line p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="font-serif text-[20px] text-ink">Bulk import</h2>
          <p className="text-[12.5px] text-muted mt-1">
            One entry per line. Either a bare URL, or CSV{" "}
            <code className="font-mono text-[11px] text-ink-soft">
              url, source_type, trust_tier
            </code>
            . Blank lines and lines starting with{" "}
            <code className="font-mono text-[11px] text-ink-soft">#</code> are
            ignored. Defaults: type{" "}
            <span className="font-mono text-[11px]">other</span>, tier{" "}
            <span className="font-mono text-[11px]">tier_2_trusted</span>.
          </p>
        </div>
        <form action={bulkAddSources} className="flex flex-col gap-3">
          <textarea
            name="urls"
            rows={10}
            placeholder={
              "one URL per line, or url, type, trust\n" +
              "https://agency.gov.in\n" +
              "https://institute.org, research_inst, tier_1_authoritative\n" +
              "# this line is a comment"
            }
            className="rounded-[8px] border border-line bg-white px-3 py-2 text-[13px] font-mono text-ink leading-relaxed focus:border-teal focus:outline-none"
          />
          <div>
            <button
              type="submit"
              className="font-mono text-[10px] uppercase tracking-[0.12em] rounded-[8px] bg-deep-teal text-white px-4 py-2.5 hover:bg-teal"
            >
              Import sources
            </button>
          </div>
        </form>
      </section>

      {/* List */}
      {sources.length === 0 ? (
        <p className="text-[13.5px] text-muted py-6">
          No sources yet. Add one above, or paste a batch into the bulk importer.
        </p>
      ) : (
        <div className="rounded-[10px] border border-line overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[13.5px]">
            <thead>
              <tr className="bg-cream text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Trust tier</th>
                <th className="px-4 py-3 font-medium text-right">Crawl (days)</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 font-medium">Last fetched</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.url} className="border-t border-line hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-deep-teal hover:text-teal break-all"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {TYPE_LABEL[s.sourceType as SourceType] ?? s.sourceType}
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {TIER_LABEL[s.trustTier as TrustTier] ?? s.trustTier}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {s.crawlFrequencyDays}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono text-[8.5px] uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${
                        s.isActive
                          ? "bg-teal/15 text-deep-teal"
                          : "bg-amber/30 text-deep-teal"
                      }`}
                    >
                      {s.isActive ? "active" : "paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                    {s.lastFetchedAt
                      ? new Date(s.lastFetchedAt).toLocaleDateString()
                      : "—"}
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

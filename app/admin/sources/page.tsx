import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

const TIER_COLOUR: Record<string, string> = {
  tier_1_authoritative: "text-teal",
  tier_2_trusted: "text-deep-teal",
  tier_3_emerging: "text-muted",
};

export default async function SourcesPage() {
  const rows = await db
    .select()
    .from(schema.sourceRegistry)
    .orderBy(asc(schema.sourceRegistry.url));

  return (
    <div className="space-y-6">
      <header>
        <span className="mono-label">Source registry</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-normal tracking-[-0.02em] text-ink mt-2">
          Sources
        </h1>
        <p className="font-serif italic text-[16px] text-ink-soft mt-2 max-w-[60ch] font-light">
          The curated URLs the registry crawler revisits weekly. Add a source URL and the
          weekly job picks it up on next run.
        </p>
      </header>

      <form action="/api/admin/sources" method="POST" className="grid grid-cols-1 md:grid-cols-[1fr_180px_160px_auto] gap-2 items-stretch p-4 bg-cream border border-line">
        <input
          name="url"
          type="url"
          required
          placeholder="https://source.example.org/programme-page"
          className="px-4 py-3 bg-paper border border-line rounded-[2px] font-serif text-[15px] focus:outline-2 focus:outline-teal"
        />
        <select
          name="source_type"
          className="px-4 py-3 bg-paper border border-line rounded-[2px] font-mono text-[12px]"
        >
          <option value="gov_site">Government site</option>
          <option value="ngo_site">NGO site</option>
          <option value="research_inst">Research institution</option>
          <option value="foundation">Foundation</option>
          <option value="news_outlet">News outlet</option>
          <option value="partner_report">Partner report</option>
          <option value="other">Other</option>
        </select>
        <select
          name="trust_tier"
          className="px-4 py-3 bg-paper border border-line rounded-[2px] font-mono text-[12px]"
        >
          <option value="tier_1_authoritative">Tier 1 · authoritative</option>
          <option value="tier_2_trusted">Tier 2 · trusted</option>
          <option value="tier_3_emerging">Tier 3 · emerging</option>
        </select>
        <button
          type="submit"
          className="px-5 py-3 bg-deep-teal text-paper font-mono text-[11px] uppercase tracking-[0.16em] font-semibold rounded-[2px] hover:bg-teal transition-colors"
        >
          Add
        </button>
      </form>

      <table className="w-full text-left">
        <thead className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted border-b border-line">
          <tr>
            <th className="py-3 pr-4">URL</th>
            <th className="py-3 pr-4 w-32">Type</th>
            <th className="py-3 pr-4 w-32">Tier</th>
            <th className="py-3 pr-4 w-24">Freq</th>
            <th className="py-3 pr-4 w-32">Last fetched</th>
            <th className="py-3 w-20">Active</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-cream">
              <td className="py-3 pr-4">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-serif text-[15px] text-ink hover:text-teal"
                >
                  {r.url}
                </a>
                {r.notes && (
                  <div className="font-serif italic text-[13px] text-muted mt-0.5 font-light">
                    {r.notes}
                  </div>
                )}
              </td>
              <td className="py-3 pr-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                {r.sourceType.replace("_", " ")}
              </td>
              <td
                className={`py-3 pr-4 font-mono text-[10.5px] uppercase tracking-[0.14em] font-semibold ${TIER_COLOUR[r.trustTier]}`}
              >
                Tier {r.trustTier.split("_")[1]}
              </td>
              <td className="py-3 pr-4 font-mono text-[11px] text-ink-soft">
                {r.crawlFrequencyDays}d
              </td>
              <td className="py-3 pr-4 font-mono text-[11px] text-muted">
                {r.lastFetchedAt
                  ? r.lastFetchedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : "—"}
              </td>
              <td className="py-3 font-mono text-[10.5px]">
                {r.isActive ? (
                  <span className="text-teal">Active</span>
                ) : (
                  <span className="text-muted">Paused</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

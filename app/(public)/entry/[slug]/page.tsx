import { notFound } from "next/navigation";
import Link from "next/link";
import { getEntryBySlug } from "@/lib/db/queries";
import { EndorsementBadge } from "@/components/ui/EndorsementBadge";
import { ThemeChip } from "@/components/ui/ThemeChip";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getEntryBySlug(slug);
  if (!data) return { title: "Entry not found" };
  return { title: data.entry.title, description: data.entry.tagline };
}

const ROLE_LABELS: Record<string, string> = {
  lead_implementer: "Lead implementer",
  supporting_implementer: "Supporting implementer",
  funder: "Funder",
  knowledge_partner: "Knowledge partner",
  government_counterpart: "Government counterpart",
  research_collaborator: "Research collaborator",
};

export default async function EntryDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getEntryBySlug(slug);
  if (!data) notFound();

  const { entry, theme, geography, organisations, themes } = data;
  const yearRange = entry.endYear
    ? `${entry.startYear} → ${entry.endYear}`
    : `${entry.startYear} → ongoing`;
  const isStale =
    entry.lastReviewedAt &&
    Date.now() - entry.lastReviewedAt.getTime() > 1000 * 60 * 60 * 24 * 180;

  return (
    <article className="relative z-10">
      {/* Needs-update banner */}
      {entry.editorialStatus === "needs_update" && (
        <div className="bg-amber/40 border-y border-amber-deep/40">
          <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-3 font-mono text-[11px] uppercase tracking-mono-mid text-deep-teal">
            Source updated · under editorial review
          </div>
        </div>
      )}

      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-8 lg:pb-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 lg:gap-12 items-start">
        <div>
          <div className="flex gap-3 items-center font-mono text-[10.5px] uppercase tracking-mono-wide text-teal font-semibold mb-5">
            <Link href={`/theme/${theme?.slug}`} className="hover:text-teal-soft">
              {theme?.name}
            </Link>
            <span className="text-line">/</span>
            <span className="text-ink-soft normal-case font-normal tracking-mono-mid">
              {geography?.name}
            </span>
            <span className="text-line">·</span>
            <span className="font-normal tracking-mono-mid">{yearRange}</span>
            <span className="text-line">·</span>
            <span className="font-normal tracking-mono-mid">{humaniseScale(entry.scaleBand)}</span>
          </div>
          <h1 className="font-serif text-[clamp(38px,4.6vw,64px)] font-normal leading-[1.05] tracking-[-0.022em] text-ink">
            {entry.title}
          </h1>
          <p className="font-serif italic text-[20px] text-ink-soft leading-[1.45] mt-6 max-w-[58ch] font-light">
            {entry.tagline}
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-6 flex flex-col gap-4 border-t border-line pt-5 lg:pt-0 lg:border-t-0">
          <EndorsementBadge tier={entry.catEndorsement} />
          <div className="flex flex-col gap-1.5">
            <span className="mono-label">Last reviewed</span>
            <span
              className={`font-serif text-[16px] ${
                isStale ? "text-red-alert" : "text-deep-teal"
              }`}
            >
              {entry.lastReviewedAt?.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }) ?? "Pending"}
            </span>
          </div>
          {entry.investmentQuantumInrCr != null && entry.investmentVisibility === "public" && (
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Investment quantum</span>
              <span className="font-serif text-[18px] text-deep-teal">
                ₹ {entry.investmentQuantumInrCr.toLocaleString()} cr
              </span>
            </div>
          )}
        </aside>
      </header>

      {/* Narrative blocks */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <NarrativeBlock label="Context">{entry.context}</NarrativeBlock>
          <NarrativeBlock label="What was attempted">{entry.whatWasAttempted}</NarrativeBlock>
          <NarrativeBlock label="What was achieved">{entry.whatWasAchieved}</NarrativeBlock>
          <NarrativeBlock label="What worked">{entry.whatWorked}</NarrativeBlock>
          {entry.whatDidNotWork && (
            <div className="bg-[rgba(184,80,66,0.04)] border-l-2 border-red-alert pl-6 pr-6 py-6 my-10 -mx-2">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-red-alert font-semibold flex gap-2 items-center mb-3">
                <span className="w-3.5 h-px bg-red-alert" />
                What did not work
              </span>
              <p className="font-serif text-[16.5px] leading-[1.65] text-ink">
                {entry.whatDidNotWork}
              </p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          {entry.headlineMetrics && entry.headlineMetrics.length > 0 && (
            <div>
              <span className="mono-label">Headline metrics</span>
              <div className="mt-4 grid grid-cols-2 gap-5">
                {entry.headlineMetrics.map((m) => (
                  <div key={m.label}>
                    <div className="font-serif text-[28px] font-medium text-deep-teal leading-none tracking-[-0.02em]">
                      {m.value}
                      {m.unit && (
                        <sup className="font-mono text-[10px] text-amber-deep align-super font-medium tracking-[0.08em] ml-0.5">
                          {m.unit}
                        </sup>
                      )}
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-mono-mid text-muted mt-1.5">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="mono-label">Themes</span>
            <div className="mt-3 flex flex-wrap gap-2">
              {themes.map((t) => (
                <ThemeChip key={t.slug} slug={t.slug} name={t.name} colourHex={t.colourHex} />
              ))}
            </div>
          </div>

          {organisations.length > 0 && (
            <div>
              <span className="mono-label">Organisations</span>
              <ul className="mt-3 flex flex-col gap-3 list-none p-0">
                {organisations.map((o) => (
                  <li key={`${o.org.id}-${o.role}`}>
                    <Link
                      href={`/organisation/${o.org.slug}`}
                      className="block group"
                    >
                      <div className="font-serif text-[16px] text-ink group-hover:text-teal transition-colors">
                        {o.org.shortName ?? o.org.name}
                      </div>
                      <div className="font-mono text-[9.5px] uppercase tracking-mono-mid text-muted">
                        {ROLE_LABELS[o.role] ?? o.role}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {/* Bottom rail: provenance + status */}
      <footer className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-20 pt-6 border-t border-line">
        <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-mono-mid text-muted">
          <span>
            Provenance:{" "}
            <span className="text-ink-soft">
              {entry.provenance === "sourced" ? "CAT-sourced" : "Self-submitted"}
            </span>
          </span>
          <span>
            Endorsement:{" "}
            <span className="text-ink-soft">
              {entry.catEndorsement.replace("cat_", "CAT ")}
            </span>
          </span>
          <span>
            Status: <span className="text-ink-soft">{entry.status}</span>
          </span>
          {entry.publishedDate && (
            <span>
              Published:{" "}
              <span className="text-ink-soft">
                {entry.publishedDate.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}

function NarrativeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="my-8">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-teal font-semibold flex gap-2 items-center mb-3">
        <span className="w-3.5 h-px bg-teal" />
        {label}
      </span>
      <p className="font-serif text-[16.5px] leading-[1.65] text-ink-soft">{children}</p>
    </section>
  );
}

function humaniseScale(s: string): string {
  return s.replace(/_/g, "-");
}

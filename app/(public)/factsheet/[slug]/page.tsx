import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFactSheet } from "@/lib/factsheet/generate";
import { CATEGORY_BY_SLUG } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getFactSheet(slug);
  return s ? { title: `${s.title} · Fact sheet` } : { title: "Fact sheet not found" };
}

const SCALE: Record<string, string> = {
  pilot: "Pilot", block: "Block", district: "District", multi_district: "Multi-district",
  state: "State", multi_state: "Multi-state", national: "National",
};
const STATE_NAMES: Record<string, string> = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CG: "Chhattisgarh",
  GA: "Goa", GJ: "Gujarat", HR: "Haryana", HP: "Himachal Pradesh", JK: "Jammu & Kashmir",
  JH: "Jharkhand", KA: "Karnataka", KL: "Kerala", MP: "Madhya Pradesh", MH: "Maharashtra",
  MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OD: "Odisha", PB: "Punjab",
  RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura",
  UP: "Uttar Pradesh", UK: "Uttarakhand", WB: "West Bengal", DL: "Delhi",
};

/**
 * Field-guide illustrations (line-and-wash, CAT colours), one per Solutions
 * Atlas theme, in public/illustrations/solutions. Sources and how to re-render
 * them: docs/illustrations/solution-heroes/README.md.
 */
const HERO_THEMES = new Set([
  "agri-horti-agroforestry", "forestry-ntfp", "livestock", "fisheries", "nrm",
  "biodiversity", "nutrition", "market", "energy", "technical-assistance",
]);
const heroFor = (themes: string[]) =>
  `/illustrations/solutions/${themes.find((t) => HERO_THEMES.has(t)) ?? "agri-horti-agroforestry"}.webp`;

// Hand-drawn markers for the four-part "at a glance" frame (CAT pathway drawings).
const GLANCE_ICON: Record<string, string> = {
  "What's working": "research",
  "What's hard": "markets",
  "Why it matters": "nutrition",
  "What's next": "landscape",
};

// Existing CAT intervention illustrations, reused on the theme list.
const themeIcon = (slug: string) => `/icons/interventions/${slug}.png`;

export default async function FactSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getFactSheet(slug);
  if (!s) notFound();

  const stateName = s.state_code ? STATE_NAMES[s.state_code] ?? s.state_code : null;
  const primaryTheme = s.themes[0] ? CATEGORY_BY_SLUG[s.themes[0]]?.name ?? s.themes[0].replace(/-/g, " ") : null;
  const eyebrow = [
    primaryTheme,
    stateName,
    s.start_year ? `${s.start_year} to now` : null,
    s.scale_band ? SCALE[s.scale_band] ?? s.scale_band : null,
  ].filter(Boolean) as string[];

  const insightCards = [
    { k: "What's working", v: s.insight?.whats_working },
    { k: "What's hard", v: s.insight?.whats_hard },
    { k: "Why it matters", v: s.insight?.why_it_matters },
    { k: "What's next", v: s.insight?.whats_next },
  ].filter((c) => c.v);

  const lead = s.outcomes.find((o) => o.figure) ?? null;

  return (
    <article className="fs bg-paper text-ink">
      <style>{`
        @media print {
          header, footer, .skip-to-content, .no-print { display: none !important; }
          body { background: #fff; }
          a { color: #16130d !important; text-decoration: none; }
          .fs-grid { display: block !important; }
        }
      `}</style>

      <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-8 sm:pt-10 pb-20">
        <div className="no-print flex items-center justify-between gap-3 flex-wrap">
          <Link href="/map" className="inline-flex items-center min-h-11 text-[14px] text-ink-soft hover:text-teal">
            ← Solutions Atlas
          </Link>
          <a
            href={`/factsheet/${slug}/download`}
            className="inline-flex items-center min-h-11 px-5 rounded-full border border-line text-[14px] text-ink hover:border-teal hover:text-teal transition-colors"
          >
            Download fact sheet (PDF)
          </a>
        </div>

        {/* Opening: title and standfirst beside the theme's field drawing */}
        <header className="mt-6 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-12 items-end">
          <div>
            {eyebrow.length > 0 && (
              <p className="eyebrow flex flex-wrap gap-x-2 gap-y-1">
                {eyebrow.map((e, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-muted mr-2" aria-hidden>·</span>}
                    {e}
                  </span>
                ))}
              </p>
            )}
            <h1 className="font-sans font-semibold text-[clamp(34px,4.6vw,58px)] tracking-[-0.035em] leading-[1.03] text-ink mt-4 max-w-[20ch] [text-wrap:balance]">
              {s.title}
            </h1>
            {s.one_liner && (
              <p className="text-[18px] sm:text-[19px] text-ink-soft leading-[1.5] mt-5 max-w-[50ch]">{s.one_liner}</p>
            )}
          </div>
          <div className="relative w-full aspect-[16/8] lg:aspect-[16/9]">
            <Image
              src={heroFor(s.themes)}
              alt=""
              aria-hidden
              fill
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className="object-contain object-bottom"
            />
          </div>
        </header>

        {/* Headline numbers: plain report figures, each linked to its source */}
        {s.metrics.length > 0 && (
          <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 border-y border-line">
            {s.metrics.slice(0, 4).map((m, i) => (
              <div
                key={i}
                className={`py-5 pr-4 ${i % 2 === 1 ? "pl-4 border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} lg:pl-5 ${i > 0 ? "lg:border-l lg:border-line" : "lg:pl-0"}`}
              >
                <dt className="sr-only">{m.label}</dt>
                <dd className="m-0">
                  <a href={m.source_url} target="_blank" rel="noreferrer" className="group no-underline">
                    <span className="block font-sans font-medium text-[clamp(26px,3vw,34px)] leading-none tracking-[-0.02em] text-ink tabular-nums group-hover:text-teal transition-colors">
                      {m.value}
                    </span>
                    <span className="block text-[13px] text-muted mt-2 leading-snug">{m.label}</span>
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="fs-grid mt-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-12 lg:gap-16">
          <div className="min-w-0">
            {lead && (
              <p className="text-[clamp(22px,2.4vw,28px)] italic font-light leading-[1.35] text-deep-teal max-w-[34ch] [text-wrap:balance]">
                {lead.figure} {lead.claim.charAt(0).toLowerCase() + lead.claim.slice(1)}
                {lead.source_url && (
                  <a href={lead.source_url} target="_blank" rel="noreferrer" className="not-italic text-[13px] text-teal align-super ml-1.5">
                    source
                  </a>
                )}
              </p>
            )}

            {s.summary && (
              <Section title="What it is">
                <p className="text-[16.5px] leading-[1.7] text-ink max-w-[64ch]">{s.summary}</p>
              </Section>
            )}

            {insightCards.length > 0 && (
              <Section title="At a glance">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {insightCards.map((c) => (
                    <div key={c.k} className="rounded-card border border-line bg-paper p-5 flex gap-4 items-start">
                      <Image
                        src={`/illustrations/solutions/icons/${GLANCE_ICON[c.k]}.webp`}
                        alt=""
                        aria-hidden
                        width={72}
                        height={54}
                        className="shrink-0 w-[72px] h-[54px] object-contain"
                      />
                      <div>
                        <h3 className="text-[15px] font-semibold text-ink tracking-[-0.01em]">{c.k}</h3>
                        <p className="text-[14.5px] leading-[1.55] text-ink-soft mt-1.5">{c.v}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {s.outcomes.length > 0 && (
              <Section title="Outcomes and evidence">
                <ul className="list-none p-0 m-0 border-t border-line">
                  {s.outcomes.map((o, i) => (
                    <li key={i} className="py-3.5 border-b border-line text-[15.5px] leading-[1.55] text-ink flex gap-4 items-baseline">
                      <span className="min-w-0 flex-1">
                        {o.figure && <strong className="font-semibold">{o.figure} </strong>}
                        {o.claim}
                      </span>
                      {o.source_url && (
                        <a href={o.source_url} target="_blank" rel="noreferrer" className="shrink-0 text-[13px] text-teal hover:text-deep-teal">
                          Source ↗
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {s.citations.length > 0 && (
              <Section title="Sources">
                <ol className="space-y-2 text-[13.5px] text-ink-soft pl-5">
                  {s.citations.map((c, i) => (
                    <li key={i}>
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-teal break-words">
                        {c.url}
                      </a>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </div>

          <aside className="lg:border-l lg:border-line lg:pl-8 space-y-8">
            <div className="text-[13px] text-muted leading-[1.6]">
              <p className="m-0 text-ink-soft">Compiled from public sources and checked by the editors.</p>
              <p className="m-0 mt-1">
                Updated {new Date(s.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>

            {s.themes.length > 0 && (
              <div>
                <h2 className="eyebrow">Themes</h2>
                <ul className="list-none p-0 m-0 mt-3 space-y-2">
                  {s.themes.map((t) => (
                    <li key={t} className="flex items-center gap-2.5 text-[14px] text-ink">
                      {CATEGORY_BY_SLUG[t] && (
                        <Image src={themeIcon(t)} alt="" aria-hidden width={28} height={28} className="w-7 h-7 object-contain" />
                      )}
                      {CATEGORY_BY_SLUG[t]?.name ?? t.replace(/-/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(s.lead_organisation || s.implementers.length > 0 || s.funders.length > 0) && (
              <div>
                <h2 className="eyebrow">Organisations</h2>
                <div className="mt-3 space-y-3">
                  {s.lead_organisation && <Org name={s.lead_organisation} role="Lead implementer" />}
                  {s.implementers.filter((x) => x !== s.lead_organisation).map((x) => (
                    <Org key={x} name={x} role="Implementer" />
                  ))}
                  {s.funders.map((x) => (
                    <Org key={x} name={x} role="Funder" />
                  ))}
                </div>
              </div>
            )}

            {s.source_url && (
              <a
                href={s.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center min-h-11 text-[14px] font-medium text-teal hover:text-deep-teal"
              >
                Read more at the source ↗
              </a>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Org({ name, role }: { name: string; role: string }) {
  return (
    <div>
      <div className="text-[15px] text-ink leading-tight">{name}</div>
      <div className="text-[13px] text-muted mt-0.5">{role}</div>
    </div>
  );
}

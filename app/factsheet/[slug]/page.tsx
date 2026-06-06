import { notFound } from "next/navigation";
import { getFactSheet } from "@/lib/factsheet/generate";

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

export default async function FactSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getFactSheet(slug);
  if (!s) notFound();

  const stateName = s.state_code ? STATE_NAMES[s.state_code] ?? s.state_code : null;
  const eyebrow = [
    s.themes[0]?.replace(/-/g, " ").toUpperCase(),
    stateName,
    s.start_year ? `${s.start_year} → ongoing` : null,
    s.scale_band ? (SCALE[s.scale_band] ?? s.scale_band).toUpperCase() : null,
  ].filter(Boolean);

  const insightCards = [
    { k: "What's working", v: s.insight?.whats_working },
    { k: "What's hard", v: s.insight?.whats_hard },
    { k: "Why it matters", v: s.insight?.why_it_matters },
    { k: "What's next", v: s.insight?.whats_next },
  ].filter((c) => c.v);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <style>{`
        @media print {
          .no-print { display:none !important; }
          body { background:#fff; }
          a { color:#1a2625 !important; text-decoration:none; }
          .fs-grid { display:block !important; }
        }
      `}</style>

      <div className="max-w-[1080px] mx-auto px-6 py-8">
        <div className="no-print flex items-center justify-between gap-3 mb-8 flex-wrap">
          <a href="/map" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-teal no-underline">← Solutions Atlas</a>
          <a href={`/factsheet/${slug}/download`} className="font-mono text-[10px] uppercase tracking-[0.12em] px-4 py-2 rounded-[6px] bg-deep-teal text-paper hover:bg-teal transition-colors no-underline">
            ↓ Download fact sheet (PDF)
          </a>
        </div>

        {s.status !== "published" && (
          <div className="no-print mb-6 rounded-[8px] border border-amber-deep/40 bg-amber/20 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-deep-teal">
            Draft preview — flagged (sources too weak, confidence {Math.round((s.confidence ?? 0) * 100)}%)
          </div>
        )}

        <div className="fs-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-10 lg:gap-14">
          {/* MAIN */}
          <div className="min-w-0">
            {eyebrow.length > 0 && (
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal flex flex-wrap gap-x-2.5 gap-y-1">
                {eyebrow.map((e, i) => <span key={i}>{i > 0 && <span className="text-muted mr-2.5">/</span>}{e}</span>)}
              </div>
            )}
            <h1 className="font-sans font-semibold text-[clamp(34px,4.6vw,60px)] tracking-[-0.04em] leading-[1.0] text-ink mt-4 max-w-[18ch]">{s.title}</h1>
            {s.one_liner && <p className="text-[18px] text-ink-soft leading-[1.5] mt-5 max-w-[54ch] tracking-[-0.01em]">{s.one_liner}</p>}

            {s.summary && (
              <Section title="What it is">
                <p className="font-serif text-[16px] leading-[1.65] text-ink max-w-[64ch]">{s.summary}</p>
              </Section>
            )}

            {insightCards.length > 0 && (
              <Section title="At a glance">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {insightCards.map((c) => (
                    <div key={c.k} className="rounded-[10px] border border-line bg-cream p-4">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-teal mb-1.5">{c.k}</div>
                      <p className="text-[13.5px] leading-[1.5] text-ink">{c.v}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {s.outcomes.length > 0 && (
              <Section title="Outcomes & evidence">
                <ul className="space-y-2.5 list-none p-0 m-0">
                  {s.outcomes.map((o, i) => (
                    <li key={i} className="text-[15px] leading-[1.55] text-ink">
                      {o.figure && <strong className="text-deep-teal">{o.figure} </strong>}{o.claim}
                      {o.source_url && <a href={o.source_url} target="_blank" className="ml-1 text-[10px] text-teal align-super no-underline">[source]</a>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {s.citations.length > 0 && (
              <Section title="Sources">
                <ol className="space-y-1.5 text-[12px] text-ink-soft pl-5">
                  {s.citations.map((c, i) => (
                    <li key={i}><a href={c.url} target="_blank" className="text-teal break-words">{c.url}</a></li>
                  ))}
                </ol>
              </Section>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:border-l lg:border-line lg:pl-8 space-y-7">
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted leading-[1.6]">
              <div className="inline-block px-2.5 py-1 rounded-[4px] bg-teal/10 text-deep-teal mb-2">Auto-compiled · verified from public sources</div>
              <div>Updated {new Date(s.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
            </div>

            {s.metrics.length > 0 && (
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted mb-3">Headline metrics</div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                  {s.metrics.map((m, i) => (
                    <a key={i} href={m.source_url} target="_blank" className="no-underline group">
                      <div className="font-serif text-[28px] leading-[1] text-ink group-hover:text-teal transition-colors">{m.value}</div>
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted mt-1.5 leading-[1.3]">{m.label}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {s.themes.length > 0 && (
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted mb-2.5">Themes</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.themes.map((t) => (
                    <span key={t} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2 py-1 rounded-[4px] bg-teal/10 text-deep-teal">{t.replace(/-/g, " ")}</span>
                  ))}
                </div>
              </div>
            )}

            {(s.lead_organisation || s.implementers.length > 0 || s.funders.length > 0) && (
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted mb-2.5">Organisations</div>
                <div className="space-y-2.5">
                  {s.lead_organisation && <Org name={s.lead_organisation} role="Lead implementer" />}
                  {s.implementers.filter((x) => x !== s.lead_organisation).map((x) => <Org key={x} name={x} role="Implementer" />)}
                  {s.funders.map((x) => <Org key={x} name={x} role="Funder" />)}
                </div>
              </div>
            )}

            {s.source_url && (
              <a href={s.source_url} target="_blank" className="block font-mono text-[10px] uppercase tracking-[0.12em] text-deep-teal no-underline pt-1">
                Read more at the source ↗
              </a>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal mb-3 flex items-center gap-2">
        <span className="w-4 h-px bg-teal" />{title}
      </h2>
      {children}
    </section>
  );
}

function Org({ name, role }: { name: string; role: string }) {
  return (
    <div>
      <div className="font-serif text-[15px] text-ink leading-tight">{name}</div>
      <div className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-muted mt-0.5">{role}</div>
    </div>
  );
}

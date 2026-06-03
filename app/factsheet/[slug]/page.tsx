import { notFound } from "next/navigation";
import { getFactSheet } from "@/lib/factsheet/generate";
import { PrintButton } from "@/components/factsheet/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getFactSheet(slug);
  return s ? { title: `${s.title} · Fact sheet` } : { title: "Fact sheet not found" };
}

const SCALE_LABEL: Record<string, string> = {
  pilot: "Pilot", block: "Block", district: "District", multi_district: "Multi-district",
  state: "State", multi_state: "Multi-state", national: "National",
};

export default async function FactSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getFactSheet(slug);
  if (!s) notFound();

  const meta = [
    s.lead_organisation,
    [s.district, s.state_code].filter(Boolean).join(", "),
    s.scale_band ? SCALE_LABEL[s.scale_band] ?? s.scale_band : null,
  ].filter(Boolean);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .fs-wrap { box-shadow: none !important; border: 0 !important; margin: 0 !important; max-width: 100% !important; }
          a { color: #1a2625 !important; text-decoration: none; }
        }
      `}</style>

      <div className="max-w-[820px] mx-auto px-6 py-8">
        <div className="no-print flex items-center justify-between gap-3 mb-6 flex-wrap">
          <a href="/map" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted hover:text-teal no-underline">← Solutions Atlas</a>
          <div className="flex items-center gap-3">
            <a
              href={`/factsheet/${slug}/download`}
              className="font-mono text-[10px] uppercase tracking-[0.12em] px-4 py-2 rounded-[6px] bg-deep-teal text-paper hover:bg-teal transition-colors no-underline inline-flex items-center gap-1.5"
            >
              ↓ Download fact sheet (PDF)
            </a>
            <PrintButton />
          </div>
        </div>

        {s.status !== "published" && (
          <div className="no-print mb-5 rounded-[8px] border border-amber-deep/40 bg-amber/20 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-deep-teal">
            Draft preview — flagged for review (confidence {Math.round((s.confidence ?? 0) * 100)}%)
          </div>
        )}

        <article className="fs-wrap rounded-[12px] border border-line bg-cream p-7 sm:p-9">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal">Solution fact sheet</div>
          <h1 className="font-serif text-[30px] sm:text-[38px] font-normal tracking-[-0.02em] leading-[1.08] text-ink mt-2">{s.title}</h1>
          {s.one_liner && <p className="font-serif italic text-[17px] text-ink-soft mt-2 font-light">{s.one_liner}</p>}

          {meta.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {meta.map((m, i) => <span key={i}>{m}</span>)}
            </div>
          )}

          {s.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {s.themes.map((t) => (
                <span key={t} className="font-mono text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-teal/10 text-deep-teal">{t.replace(/-/g, " ")}</span>
              ))}
            </div>
          )}

          {s.summary && <Section title="What it is"><p className="text-[15px] leading-[1.6] text-ink">{s.summary}</p></Section>}

          {s.outcomes.length > 0 && (
            <Section title="Outcomes & evidence">
              <ul className="space-y-2.5 list-none p-0 m-0">
                {s.outcomes.map((o, i) => (
                  <li key={i} className="text-[14.5px] leading-[1.55] text-ink">
                    {o.figure && <strong className="text-deep-teal">{o.figure} </strong>}{o.claim}
                    {o.source_url && <a href={o.source_url} target="_blank" className="ml-1 text-[11px] text-teal align-super no-underline">[source]</a>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {s.principle_alignment.length > 0 && (
            <Section title="Principle alignment">
              <div className="flex flex-wrap gap-1.5">
                {s.principle_alignment.map((p, i) => (
                  <span key={i} className="font-mono text-[10px] px-2.5 py-1 rounded-[4px] bg-paper border border-line text-ink-soft">{p}</span>
                ))}
              </div>
            </Section>
          )}

          {(s.funders.length > 0 || s.implementers.length > 0) && (
            <Section title="Who's behind it">
              {s.implementers.length > 0 && <p className="text-[14px] text-ink"><span className="text-muted">Implementers: </span>{s.implementers.join(", ")}</p>}
              {s.funders.length > 0 && <p className="text-[14px] text-ink mt-1"><span className="text-muted">Funders: </span>{s.funders.join(", ")}</p>}
            </Section>
          )}

          {s.citations.length > 0 && (
            <Section title="Sources">
              <ol className="space-y-1.5 text-[12.5px] text-ink-soft pl-5">
                {s.citations.map((c, i) => (
                  <li key={i}><a href={c.url} target="_blank" className="text-teal break-words">{c.url}</a>{c.passage ? <span className="text-muted"> — “{c.passage.slice(0, 140)}”</span> : null}</li>
                ))}
              </ol>
            </Section>
          )}

          {s.source_url && (
            <div className="mt-7 pt-5 border-t border-line flex items-center justify-between gap-4 flex-wrap">
              <a href={s.source_url} target="_blank" className="font-mono text-[11px] uppercase tracking-[0.12em] text-deep-teal no-underline">
                Read more at the source ↗
              </a>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                Verified from public sources · {new Date(s.updated_at).toLocaleDateString("en-GB")}
              </span>
            </div>
          )}
        </article>

        <p className="no-print text-[10px] text-muted mt-4 text-center font-mono uppercase tracking-[0.12em]">
          Transformation Hub · by the Consortium for Agroecological Transformations
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal mb-2">{title}</h2>
      {children}
    </section>
  );
}

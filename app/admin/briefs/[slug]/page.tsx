import Link from "next/link";
import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { getBrief, type BriefCitation } from "@/lib/briefs/generate";
import { generateBriefAction } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const cr = (n: number) => `₹${(n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} cr`;

/** Render the stored markdown safely: headings, paragraphs, bullets, **bold**, and [n] citations as text nodes. */
function Body({ md, cites }: { md: string; cites: BriefCitation[] }) {
  const byN = new Map(cites.map((c) => [c.n, c]));
  const inline = (t: string, key: string) =>
    t.split(/(\*\*[^*]+\*\*|\[\d{1,2}\]|\[F\])/g).map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${key}-${i}`} className="font-medium text-ink">{p.slice(2, -2)}</strong>;
      const m = p.match(/^\[(\d{1,2})\]$/);
      if (m) {
        const c = byN.get(Number(m[1]));
        const tip = c ? `${c.document}${c.section ? ` · ${c.section}` : ""}${c.page ? ` · p. ${c.page}` : ""}` : "";
        return <sup key={`${key}-${i}`} title={tip} className="text-teal cursor-help">[{m[1]}]</sup>;
      }
      if (p === "[F]") return <sup key={`${key}-${i}`} title="Approved budget table" className="text-amber cursor-help">[budget]</sup>;
      return <span key={`${key}-${i}`}>{p}</span>;
    });
  const blocks = md.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft max-w-[760px]">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i} className="font-serif text-[20px] text-deep-teal pt-3">{b.slice(3)}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) {
          return <ul key={i} className="list-disc pl-5 space-y-1">{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `${i}-${j}`)}</li>)}</ul>;
        }
        return <p key={i}>{inline(b.replace(/\n/g, " "), String(i))}</p>;
      })}
    </div>
  );
}

export default async function BriefPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!Object.hasOwn(LANDSCAPES, slug)) notFound();
  const b = await getBrief(slug);
  if (!b) notFound();
  const f = b.figures;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/admin/briefs" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted hover:text-teal">← Landscape briefs</Link>
        <h1 className="font-serif text-[30px] text-deep-teal">{LANDSCAPES[slug].name}: landscape brief</h1>
        <p className="text-[13px] text-muted">
          Written {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} from the
          current investment plan and the approved budget. Hover a citation for its source.
          {!b.current && <span className="text-amber"> The sources have changed since; regenerate it.</span>}
        </p>
        {!b.current && (
          <form action={generateBriefAction}>
            <input type="hidden" name="slug" value={slug} />
            <button className="rounded-[6px] bg-teal text-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em]">Regenerate</button>
          </form>
        )}
      </header>
      {f && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-[760px]">
          {[["Total", cr(f.total)], ["Phase 1", cr(f.phase1)], ["Phase 2", cr(f.phase2)], ["Investment sought", cr(f.investment)],
            ["Government", cr(f.govt)], ["Community", cr(f.community)], ["Sub-interventions", String(f.rows)]].map(([k, v]) => (
            <div key={k} className="rounded-[8px] border border-line bg-paper px-3 py-2">
              <dt className="text-[11.5px] text-muted">{k}</dt><dd className="text-[17px] tabular-nums text-deep-teal">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <Body md={b.content_md} cites={b.citations} />
      <section className="max-w-[760px]">
        <h2 className="font-serif text-[17px] text-deep-teal mb-2">Sources</h2>
        <ol className="text-[12.5px] text-muted space-y-0.5">
          {b.citations.map((c) => (
            <li key={c.n}>[{c.n}] {c.document}{c.section ? ` · ${c.section}` : ""}{c.page ? ` · p. ${c.page}` : ""}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

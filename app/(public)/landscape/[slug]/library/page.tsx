import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { listLandscapeDocuments, landscapeHasLip } from "@/lib/db/landscape-kb";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  lip: "Landscape Investment Plan",
  fact_sheet: "Fact sheet",
  budget: "Budget workbook",
  evaluation: "Evaluation",
  photo_gallery: "Photo gallery",
  video: "Video",
  dataset: "Dataset",
  other: "Document",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  return { title: p ? `${p.name} · Library` : "Landscape library" };
}

export default async function LibraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = LANDSCAPES[slug];
  if (!p) notFound();

  const hasLip = await landscapeHasLip(slug);
  const docs = hasLip ? await listLandscapeDocuments(slug) : [];

  return (
    <>
      <header className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-10 sm:pt-14 lg:pt-16 pb-6">
        <div className="flex items-center gap-3 mb-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold flex-wrap">
          <a href="/landscapes" className="hover:text-teal-soft">CAT Landscapes</a>
          <span className="text-line">/</span>
          <span className="text-ink-soft font-normal tracking-[0.14em]">{p.name}</span>
        </div>
        <h1 className="font-serif font-normal text-[clamp(38px,4.4vw,64px)] leading-[1.05] tracking-[-0.022em] text-ink">
          {p.name} · <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>Library</em>
        </h1>
        <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.5] mt-5 max-w-[56ch] font-light">
          Every document attached to {p.name}: the Landscape Investment Plan, budget workbook,
          fact sheets, and supporting evaluations. The source material the platform draws
          from when you ask a question or build a budget view.
        </p>
      </header>

      <LandscapeTabs slug={slug} active="library" hasLip={hasLip} />

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-10">
        {docs.length === 0 ? (
          <p className="font-serif italic text-ink-soft text-[18px] max-w-[44ch] mt-6">
            No documents attached yet. The investment plan for {p.name} will appear here once CAT
            uploads it.
          </p>
        ) : (
          <ul className="flex flex-col list-none p-0 m-0">
            {docs.map((d, i) => (
              <li key={d.id} className="border-b border-line-soft py-6">
                <div className="grid grid-cols-[60px_1fr_auto] sm:grid-cols-[100px_1fr_auto] gap-4 items-baseline">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-amber-deep font-semibold">
                    {TYPE_LABELS[d.type] ?? d.type}
                  </span>
                  <div>
                    <h3 className="font-serif text-[20px] sm:text-[22px] font-medium leading-[1.18] tracking-[-0.01em] text-ink">
                      {d.title}
                    </h3>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {d.publicationYear && <span>{d.publicationYear}</span>}
                      {d.language && <span>{d.language}</span>}
                      {d.pageCount && <span>{d.pageCount} chunks indexed</span>}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal whitespace-nowrap">
                    No. {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <aside className="mt-12 border-l-2 border-teal pl-4 max-w-[58ch]">
          <span className="eyebrow block mb-2">How the library is used</span>
          <p className="font-serif text-[15.5px] leading-[1.6] text-ink-soft">
            Documents are parsed into searchable chunks and embedded for retrieval. When you
            use the{" "}
            <a href={`/landscape/${slug}/ask`} className="text-teal underline-offset-2 hover:underline">
              Ask
            </a>{" "}
            tab, the agent answers from these chunks and cites the source. Budget workbooks
            populate the{" "}
            <a href={`/landscape/${slug}/budget`} className="text-teal underline-offset-2 hover:underline">
              Budget
            </a>{" "}
            explorer with structured rows.
          </p>
        </aside>
      </section>
    </>
  );
}

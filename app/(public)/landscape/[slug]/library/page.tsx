import { notFound } from "next/navigation";
import { LANDSCAPES } from "@/lib/data/landscapes";
import { LandscapeTabs } from "@/components/landscape/LandscapeTabs";
import { listLandscapeDocuments, landscapeHasLip } from "@/lib/db/landscape-kb";
import { FileText, Sheet, BookOpen, FileVideo, Database, File } from "lucide-react";
import { SectionOpener } from "@/components/ui/SectionOpener";

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

const ICON_FOR_TYPE: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  lip: FileText,
  fact_sheet: FileText,
  budget: Sheet,
  evaluation: BookOpen,
  photo_gallery: BookOpen,
  video: FileVideo,
  dataset: Database,
  other: File,
};

function guessExtension(type: string): string | null {
  switch (type) {
    case "lip":
    case "fact_sheet":
    case "evaluation":
      return "PDF · DOCX";
    case "budget":
      return "XLSX";
    case "dataset":
      return "CSV";
    case "video":
      return "MP4";
    case "photo_gallery":
      return "JPG";
    default:
      return null;
  }
}

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
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] tracking-[-0.035em] leading-[1.02] text-ink">
          {p.name} · <span className="text-teal">Library</span>
        </h1>
        <p className="text-[17px] sm:text-[19px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[56ch]">
          Every document attached to {p.name}: the Landscape Investment Plan, budget workbook,
          fact sheets, and supporting evaluations. The source material the platform draws
          from when you ask a question or build a budget view.
        </p>
      </header>

      <LandscapeTabs slug={slug} active="library" hasLip={hasLip} />

      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-10">
        {docs.length === 0 ? (
          <p className="text-ink-soft text-[18px] max-w-[44ch] mt-6 leading-[1.6]">
            No documents attached yet. The investment plan for {p.name} will appear here once CAT
            uploads it.
          </p>
        ) : (
          <>
            <SectionOpener number="01" label="Indexed sources" />
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0 mt-5">
              {docs.map((d, i) => {
                const Icon = ICON_FOR_TYPE[d.type] ?? File;
                const isLip = d.type === "lip";
                const isBudget = d.type === "budget";
                const accent = isLip
                  ? { bar: "#C68C2E", soft: "rgba(248,202,124,0.16)", glow: "rgba(248,202,124,0.28)", chipBg: "rgba(248,202,124,0.22)", chipFg: "#C68C2E" }
                  : isBudget
                    ? { bar: "#2E7573", soft: "rgba(46,117,115,0.09)", glow: "rgba(46,117,115,0.20)", chipBg: "rgba(46,117,115,0.12)", chipFg: "#2E7573" }
                    : { bar: "#929CC5", soft: "rgba(146,156,197,0.10)", glow: "rgba(146,156,197,0.20)", chipBg: "rgba(146,156,197,0.14)", chipFg: "#5C6796" };
                const ext = guessExtension(d.type);
                return (
                  <li key={d.id} className="reveal-stagger" style={{ animationDelay: `${i * 60}ms` }}>
                    <article
                      className="group relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 sm:p-6 h-full transition-all duration-300 ease-out hover:-translate-y-0.5"
                      style={{
                        boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 10px 24px -14px ${accent.glow}`,
                        backgroundImage: `linear-gradient(180deg, rgba(251,248,242,1) 0%, ${accent.soft} 100%)`,
                      }}
                    >
                      {/* Page-corner motif — folded triangle at top-right */}
                      <span
                        aria-hidden
                        className="absolute top-0 right-0 w-9 h-9 pointer-events-none"
                        style={{
                          background: `linear-gradient(225deg, ${accent.chipBg} 50%, transparent 50%)`,
                          borderTopRightRadius: 8,
                        }}
                      />
                      <span
                        aria-hidden
                        className="absolute top-0 right-0 w-9 h-9 pointer-events-none"
                        style={{
                          background: `linear-gradient(225deg, transparent 49%, rgba(26,38,37,0.06) 50%, transparent 51%)`,
                        }}
                      />
                      {/* Top accent bar */}
                      <span
                        aria-hidden
                        className="absolute top-0 left-0 right-9 h-[2px]"
                        style={{
                          background: `linear-gradient(90deg, ${accent.bar} 0%, ${accent.bar}cc 60%, transparent 100%)`,
                        }}
                      />

                      <div className="relative flex items-start gap-3">
                        <span
                          className="shrink-0 w-10 h-10 rounded-[6px] inline-flex items-center justify-center"
                          style={{ background: accent.chipBg, color: accent.chipFg }}
                          aria-hidden
                        >
                          <Icon size={18} strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span
                            className="font-mono text-[9.5px] uppercase tracking-[0.16em] font-semibold"
                            style={{ color: accent.chipFg }}
                          >
                            {TYPE_LABELS[d.type] ?? d.type}
                          </span>
                          <h3 className="font-sans text-[17px] font-semibold leading-[1.25] tracking-[-0.02em] text-[color:var(--navy-teal)] mt-1.5 max-w-[28ch]">
                            {d.title}
                          </h3>
                        </div>
                      </div>

                      <div className="relative mt-5 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {d.publicationYear && <span>{d.publicationYear}</span>}
                          {d.language && <span>{d.language}</span>}
                          {d.pageCount && (
                            <span className="tabular-nums">
                              {d.pageCount} chunks
                            </span>
                          )}
                        </div>
                        {ext && (
                          <span
                            className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.16em] font-semibold px-2 py-1 rounded-[3px]"
                            style={{ background: accent.chipBg, color: accent.chipFg }}
                          >
                            {ext}
                          </span>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <aside
          className="mt-12 relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 max-w-[58ch]"
          style={{
            boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 20px -14px rgba(46,117,115,0.20)",
            backgroundImage: "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(46,117,115,0.08) 100%)",
          }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, #2E7573 0%, rgba(46,117,115,0.6) 60%, transparent 100%)" }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal font-semibold">
            How the library is used
          </span>
          <p className="font-sans text-[14.5px] leading-[1.6] text-ink-soft mt-3">
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

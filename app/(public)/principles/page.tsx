import Link from "next/link";
import { PRINCIPLES, PRINCIPLE_LEVELS, type PrincipleLevel } from "@/lib/data/principles";

export const metadata = {
  title: "The 13 Principles of Agroecology — Transformation Hub",
  description:
    "A working reference for the 13 principles of agroecology, organised by operational level, with practical levers and how each shows up in Indian landscapes.",
};

const LEVEL_ORDER: PrincipleLevel[] = ["efficiency", "resilience", "equity"];

const LEVEL_ACCENT: Record<PrincipleLevel, { dot: string; rule: string; chip: string }> = {
  efficiency: {
    dot: "bg-amber-deep",
    rule: "from-amber-deep/60",
    chip: "text-amber-deep border-amber-deep/30 bg-amber-deep/[0.06]",
  },
  resilience: {
    dot: "bg-teal",
    rule: "from-teal/60",
    chip: "text-teal border-teal/30 bg-teal/[0.06]",
  },
  equity: {
    dot: "bg-lavender",
    rule: "from-lavender/60",
    chip: "text-lavender border-lavender/30 bg-lavender/[0.06]",
  },
};

export default function PrinciplesPage() {
  return (
    <div className="bg-paper">
      {/* Editorial header */}
      <section className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Reference
          </span>
          <span className="h-px w-12 bg-line" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep">
            13 principles
          </span>
        </div>
        <h1 className="font-serif text-[40px] sm:text-[56px] lg:text-[68px] leading-[0.98] tracking-[-0.018em] text-ink max-w-[22ch]">
          The principles of <span className="text-teal italic font-normal">agroecology</span>.
        </h1>
        <p className="mt-7 font-serif text-[18px] sm:text-[20px] leading-[1.55] text-ink-soft max-w-[68ch]">
          Thirteen working principles, organised by operational level. They are not a checklist —
          they describe how an ecological, social, and economic transition holds together at the
          scale of a farm, a landscape, and a food system.
        </p>
        <p className="mt-4 font-mono text-[11.5px] uppercase tracking-[0.12em] text-muted">
          Source · HLPE Report 14 (2019), UN Committee on World Food Security ·{" "}
          <a
            href="https://www.fao.org/3/ca5602en/ca5602en.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:underline underline-offset-4"
          >
            Read the source
          </a>
        </p>
      </section>

      {/* Level summary strip */}
      <section className="border-t border-line-soft">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-8 sm:py-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {LEVEL_ORDER.map((level, i) => {
            const meta = PRINCIPLE_LEVELS[level];
            const count = PRINCIPLES.filter((p) => p.level === level).length;
            const accent = LEVEL_ACCENT[level];
            return (
              <div key={level} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Level {i + 1} · {count} principles
                  </span>
                </div>
                <h2 className="font-serif text-[22px] sm:text-[24px] leading-[1.2] tracking-[-0.01em] text-ink">
                  {meta.title}
                </h2>
                <p className="text-[14.5px] leading-[1.55] text-ink-soft">{meta.subtitle}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Principles grouped by level */}
      <section className="border-t border-line-soft">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-12 sm:py-16 lg:py-20 space-y-16 lg:space-y-20">
          {LEVEL_ORDER.map((level) => {
            const meta = PRINCIPLE_LEVELS[level];
            const principles = PRINCIPLES.filter((p) => p.level === level);
            const accent = LEVEL_ACCENT[level];
            return (
              <div key={level}>
                {/* Level heading */}
                <div className="mb-8 sm:mb-10 flex items-baseline gap-4">
                  <span className={`hidden sm:block h-px w-16 bg-gradient-to-r ${accent.rule} to-transparent`} />
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted block mb-2">
                      Operational level
                    </span>
                    <h2 className="font-serif text-[28px] sm:text-[34px] leading-[1.1] tracking-[-0.01em] text-ink">
                      {meta.title}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10 sm:gap-y-12">
                  {principles.map((p) => (
                    <article key={p.slug} className="group relative pl-10 sm:pl-12">
                      {/* Number gutter */}
                      <span className="absolute left-0 top-1 font-mono text-[12px] tracking-[0.04em] text-muted tabular-nums">
                        {String(p.number).padStart(2, "0")}
                      </span>

                      <h3 className="font-serif text-[22px] sm:text-[26px] leading-[1.15] tracking-[-0.01em] text-ink">
                        {p.name}
                      </h3>

                      <p className="mt-3 text-[15.5px] leading-[1.6] text-ink-soft">
                        {p.definition}
                      </p>

                      <div className="mt-5 pl-4 border-l border-line-soft">
                        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-amber-deep">
                          In India
                        </span>
                        <p className="mt-1.5 text-[14px] leading-[1.6] text-ink-soft">
                          {p.inIndia}
                        </p>
                      </div>

                      <ul className="mt-5 flex flex-wrap gap-2">
                        {p.levers.map((lever) => (
                          <li
                            key={lever}
                            className={`font-mono text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border ${accent.chip}`}
                          >
                            {lever}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing — where principles meet practice */}
      <section className="border-t border-line-soft bg-gradient-to-b from-paper to-paper-warm">
        <div className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
            <div className="max-w-[68ch]">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep">
                Where this meets practice
              </span>
              <h2 className="mt-4 font-serif text-[26px] sm:text-[32px] leading-[1.15] tracking-[-0.01em] text-ink">
                Principles describe a direction. Landscapes and programmes are where the work
                actually happens.
              </h2>
              <p className="mt-4 text-[15.5px] leading-[1.6] text-ink-soft">
                The Hub holds the editorial layer over India&apos;s agroecology work — landscape
                investment plans, programme summaries, and the people doing the rebuilding. Read
                them as case studies in the principles above.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/landscapes"
                className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-3 rounded-full bg-gradient-to-br from-deep-teal to-teal text-paper hover:from-teal hover:to-deep-teal transition-all whitespace-nowrap"
              >
                Browse landscapes →
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-5 py-3 rounded-full border border-line text-ink hover:border-teal hover:text-teal transition-colors whitespace-nowrap"
              >
                Solutions atlas →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

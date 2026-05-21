import { SUPPORTERS } from "@/lib/data/supporters";
import { Sprig } from "@/components/ui/Sprig";
import { SectionOpener } from "@/components/ui/SectionOpener";

export function Supporters() {
  return (
    <section
      className="relative overflow-hidden border-y border-line py-16 lg:py-24"
      style={{
        background:
          "linear-gradient(180deg, rgba(232,240,234,0.50) 0%, rgba(232,240,234,0.20) 100%)",
      }}
    >
      {/* Soft sage edge fades — top and bottom of section dissolve into paper */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(251,248,242,0.65) 0%, transparent 100%)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(0deg, rgba(251,248,242,0.65) 0%, transparent 100%)" }}
      />

      {/* Ambient sprigs at corners */}
      <Sprig
        variant="leafy"
        className="absolute -top-6 -left-4 opacity-50 select-none pointer-events-none hidden md:block"
      />
      <Sprig
        variant="wheat"
        flip
        className="absolute -bottom-10 -right-6 opacity-40 select-none pointer-events-none hidden md:block"
      />

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 text-center">
        <SectionOpener number="01" label="Our supporters" align="centre" />
        <h2 className="font-sans text-[clamp(28px,3.2vw,40px)] font-light text-[color:var(--navy-teal)] mt-5 tracking-[-0.022em] leading-[1.18] max-w-[34ch] mx-auto">
          A network of organisations and individuals with deep experience in food
          systems, policy, and systems change.
        </h2>
        <p className="font-sans italic text-[15px] text-ink-soft mt-4 max-w-[52ch] mx-auto leading-[1.6] font-light">
          The Consortium is convened with support from the partners below. None
          influence what gets published.
        </p>
      </div>

      <ul className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 list-none p-0">
        {SUPPORTERS.map((s) => {
          const tint = s.tint ?? "#373F5A";
          return (
            <li
              key={s.slug}
              className="group relative overflow-hidden rounded-[6px] bg-paper/85 backdrop-blur-[2px] border border-line/70 p-5 lg:p-6 min-h-[118px] flex flex-col items-center justify-center text-center gap-1 transition-all duration-300 ease-out hover:bg-paper hover:border-line"
              style={{
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
              }}
            >
              <span
                className="relative font-mono text-[20px] sm:text-[22px] font-semibold leading-none tracking-[-0.02em] opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                style={{ color: tint }}
              >
                {s.monogram}
              </span>
              <span className="relative font-sans text-[12.5px] text-[color:var(--navy-teal)] leading-tight text-balance max-w-[16ch] mt-2">
                {s.short ?? s.name}
              </span>
              {s.category && (
                <span className="relative font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted mt-1">
                  {s.category}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

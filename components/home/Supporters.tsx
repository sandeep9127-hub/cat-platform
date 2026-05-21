import { SUPPORTERS } from "@/lib/data/supporters";
import { Sprig } from "@/components/ui/Sprig";
import { Users } from "lucide-react";

export function Supporters() {
  return (
    <section
      className="relative overflow-hidden border-y border-line py-16 lg:py-24"
      style={{
        background:
          "linear-gradient(180deg, rgba(232,242,235,0.45) 0%, rgba(248,243,232,0.55) 100%)",
      }}
    >
      {/* Ambient sprigs at corners */}
      <Sprig
        variant="leafy"
        className="absolute -top-6 -left-4 opacity-70 select-none pointer-events-none hidden md:block"
      />
      <Sprig
        variant="wheat"
        flip
        className="absolute -bottom-10 -right-6 opacity-60 select-none pointer-events-none hidden md:block"
      />

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold">
          <Users size={12} strokeWidth={1.8} aria-hidden />
          Our supporters
        </div>
        <h2 className="font-serif text-[clamp(28px,3.4vw,42px)] font-normal text-deep-teal mt-5 tracking-[-0.018em] leading-[1.15] max-w-[34ch] mx-auto">
          A network of organisations and individuals with deep experience in food
          systems, policy, and systems change.
        </h2>
        <p className="font-serif italic text-[15px] text-ink-soft mt-4 max-w-[52ch] mx-auto leading-[1.55] font-light">
          The Consortium is convened with support from the partners below. None
          influence what gets published.
        </p>
      </div>

      <ul className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 list-none p-0">
        {SUPPORTERS.map((s) => {
          const tint = s.tint ?? "#334B4A";
          return (
            <li
              key={s.slug}
              className="group relative overflow-hidden rounded-[6px] border border-line bg-paper p-5 lg:p-6 min-h-[120px] flex flex-col items-center justify-center text-center gap-1.5 transition-all duration-300 ease-out hover:-translate-y-0.5"
              style={{
                boxShadow: `0 1px 2px rgba(26,38,37,0.04), 0 6px 16px -10px ${tint}33`,
              }}
            >
              <span
                aria-hidden
                className="absolute top-0 left-0 right-0 h-[2px] opacity-70"
                style={{
                  background: `linear-gradient(90deg, ${tint} 0%, ${tint}aa 60%, transparent 100%)`,
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 90% 70% at 100% 100%, ${tint}22, transparent 65%)`,
                }}
              />
              <span
                className="relative font-mono text-[20px] sm:text-[22px] font-semibold leading-none tracking-[-0.02em]"
                style={{ color: tint }}
              >
                {s.monogram}
              </span>
              <span className="relative font-serif text-[12.5px] text-ink leading-tight text-balance max-w-[16ch] mt-1">
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

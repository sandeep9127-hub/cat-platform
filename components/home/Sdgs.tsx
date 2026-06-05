import { SDGS } from "@/lib/data/sdgs";
import { Sprig } from "@/components/ui/Sprig";
import { SectionOpener } from "@/components/ui/SectionOpener";

export function Sdgs() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,240,234,0.55), transparent 70%)",
        }}
      />
      <Sprig
        variant="fern"
        className="absolute top-4 -left-4 opacity-55 select-none pointer-events-none hidden md:block"
      />
      <Sprig
        variant="grass"
        flip
        className="absolute -top-2 -right-6 opacity-50 select-none pointer-events-none hidden md:block"
      />

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 text-center">
        <SectionOpener number="02" label="Our commitment to SDGs" align="centre" />
        <h2 className="font-sans text-[clamp(26px,3.0vw,38px)] font-light text-[color:var(--navy-teal)] mt-5 tracking-[-0.022em] leading-[1.18] max-w-[36ch] mx-auto">
          Work on this Hub maps to twelve UN Sustainable Development Goals,
          across food security, climate, biodiversity, and livelihoods.
        </h2>
        <p className="font-sans italic text-[15px] text-ink-soft mt-4 max-w-[52ch] mx-auto leading-[1.6] font-light">
          Each landscape investment plan declares its contribution. We do not
          claim the goals themselves, only credible contribution to them.
        </p>
      </div>

      <ul className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-12 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 list-none p-0">
        {SDGS.map((g, i) => (
          <li
            key={g.number}
            className="group reveal-stagger"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span
              className="block aspect-square rounded-[10px] overflow-hidden border border-line bg-white shadow-[0_4px_14px_-9px_rgba(26,38,37,0.3)] transition-[transform,box-shadow] duration-200 ease-out-expo group-hover:-translate-y-1 group-hover:shadow-[0_12px_26px_-12px_rgba(26,38,37,0.35)]"
              style={{ ["--c" as string]: g.colour } as React.CSSProperties}
            >
              {/* Official UN inverted SDG icon (colour art on white). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/sdg/sdg-${String(g.number).padStart(2, "0")}.png`}
                alt={`Sustainable Development Goal ${g.number}: ${g.label}`}
                width={1500}
                height={1500}
                loading="lazy"
                className="w-full h-full object-contain"
              />
            </span>
          </li>
        ))}
      </ul>

      <p className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-10 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted text-center">
        Icons from the United Nations Sustainable Development Goals framework.
      </p>
    </section>
  );
}

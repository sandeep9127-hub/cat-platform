import { SDGS } from "@/lib/data/sdgs";
import { Sprig } from "@/components/ui/Sprig";
import { Target } from "lucide-react";

export function Sdgs() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      {/* Soft mint wash + corner sprigs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,242,235,0.6), transparent 70%)",
        }}
      />
      <Sprig
        variant="fern"
        className="absolute top-2 -left-4 opacity-60 select-none pointer-events-none hidden md:block"
      />
      <Sprig
        variant="grass"
        flip
        className="absolute bottom-0 -right-4 opacity-60 select-none pointer-events-none hidden md:block"
      />

      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal font-semibold">
          <Target size={12} strokeWidth={1.8} aria-hidden />
          Our commitment to SDGs
        </div>
        <h2 className="font-serif text-[clamp(28px,3.4vw,42px)] font-normal text-deep-teal mt-5 tracking-[-0.018em] leading-[1.15] max-w-[36ch] mx-auto">
          Work on this Hub maps to twelve UN Sustainable Development Goals,
          across food security, climate, biodiversity, and livelihoods.
        </h2>
        <p className="font-serif italic text-[15px] text-ink-soft mt-4 max-w-[52ch] mx-auto leading-[1.55] font-light">
          Each landscape investment plan declares its contribution. We do not
          claim the goals themselves, only credible contribution to them.
        </p>
      </div>

      <ul className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-12 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-7 list-none p-0">
        {SDGS.map((g) => (
          <li
            key={g.number}
            className="group flex flex-col items-center text-center gap-2"
          >
            <span
              className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{
                background: `radial-gradient(circle at 30% 25%, ${g.colour}, ${darken(g.colour, 0.12)} 80%)`,
                boxShadow: `0 6px 18px -8px ${g.colour}80, inset 0 1px 0 rgba(255,255,255,0.16)`,
              }}
              aria-hidden
            >
              <span className="font-mono text-paper font-bold tracking-[-0.02em] text-[26px] leading-none">
                {g.number}
              </span>
            </span>
            <span className="font-serif text-[12.5px] text-ink leading-tight max-w-[15ch] mt-0.5">
              {g.label}
            </span>
          </li>
        ))}
      </ul>

      <p className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-10 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted text-center">
        Goal numbers and palette from the United Nations Sustainable Development
        Goals framework.
      </p>
    </section>
  );
}

/** Quick hex darken for the gradient inner shadow, no extra dependency. */
function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - Math.round(255 * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

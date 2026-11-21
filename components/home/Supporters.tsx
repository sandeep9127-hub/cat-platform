import { Sprig } from "@/components/ui/Sprig";
import { SectionOpener } from "@/components/ui/SectionOpener";

// Sequence fixed to match the approved layout.
const LOGOS: { file: string; name: string }[] = [
  { file: "chanda-foundation.png", name: "Chandra Foundation" },
  { file: "baf.png", name: "Bharat Agroecology Fund" },
  { file: "ciff.png", name: "Children's Investment Fund Foundation" },
  { file: "sustainable-agriculture.png", name: "Centre for Sustainable Agriculture" },
  { file: "german-cooperation.png", name: "German Cooperation" },
  { file: "india-climate-collaborative.png", name: "India Climate Collaborative" },
  { file: "ikea.png", name: "IKEA Foundation" },
  { file: "earthon.png", name: "EarthON Foundation" },
  { file: "rainmatter.png", name: "Rainmatter Foundation" },
  { file: "rohini-nilekani.png", name: "Rohini Nilekani Philanthropies" },
  { file: "rockefeller.png", name: "The Rockefeller Foundation" },
  { file: "shakti.png", name: "Shakti Sustainable Energy Foundation" },
  { file: "gaff.png", name: "Global Alliance for the Future of Food" },
  { file: "climateworks.png", name: "ClimateWorks Foundation" },
];

export function Supporters() {
  return (
    // Same paper canvas as the rest of the page: no sage gradient band or edge
    // fades, just a hairline to open the section.
    <section className="relative overflow-hidden border-t border-line py-16 lg:py-24">

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
        <SectionOpener label="Our supporters" align="centre" />
        <h2 className="font-sans text-[clamp(28px,3.2vw,40px)] font-light text-[color:var(--navy-teal)] mt-5 tracking-[-0.022em] leading-[1.18] max-w-[34ch] mx-auto">
          A network of organisations and individuals with deep experience in food
          systems, policy, and systems change
        </h2>
        <p className="font-sans italic text-[15px] text-ink-soft mt-4 max-w-[52ch] mx-auto leading-[1.6] font-light">
          The Consortium has been convened through enduring support from the partners
          below.
        </p>
      </div>

      {/* Logos sit on one continuous white panel so their (white) backgrounds
          blend seamlessly — no mismatched boxes on the cream/sage section. */}
      <div className="relative max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-12">
        <ul
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-8 sm:gap-y-10 list-none p-0 rounded-panel bg-white border border-line/60 px-6 sm:px-8 py-10 sm:py-12"
          style={{ boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 18px 40px -28px rgba(26,38,37,0.18)" }}
        >
          {LOGOS.map((logo, i) => (
            <li
              key={logo.file}
              className="group flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/supporters/${logo.file}`}
                alt={logo.name}
                title={logo.name}
                loading="lazy"
                className="max-h-[46px] w-auto max-w-[82%] object-contain opacity-90 transition-opacity duration-300 group-hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

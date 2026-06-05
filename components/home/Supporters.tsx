import { Sprig } from "@/components/ui/Sprig";
import { SectionOpener } from "@/components/ui/SectionOpener";

const LOGOS: { file: string; name: string }[] = [
  { file: "rockefeller.png", name: "The Rockefeller Foundation" },
  { file: "ciff.png", name: "Children's Investment Fund Foundation" },
  { file: "ikea.png", name: "IKEA Foundation" },
  { file: "climateworks.png", name: "ClimateWorks Foundation" },
  { file: "gaff.png", name: "Global Alliance for the Future of Food" },
  { file: "shakti.png", name: "Shakti Sustainable Energy Foundation" },
  { file: "german-cooperation.png", name: "German Cooperation" },
  { file: "rohini-nilekani.png", name: "Rohini Nilekani Philanthropies" },
  { file: "india-climate-collaborative.png", name: "India Climate Collaborative" },
  { file: "rainmatter.png", name: "Rainmatter Foundation" },
  { file: "baf.png", name: "Bharat Agroecology Fund" },
  { file: "earthon.png", name: "EarthON Foundation" },
  { file: "chanda-foundation.png", name: "Chanda Foundation" },
  { file: "sustainable-agriculture.png", name: "Centre for Sustainable Agriculture" },
];

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
        {LOGOS.map((logo) => (
          <li
            key={logo.file}
            className="group relative rounded-[8px] bg-paper border border-line/70 p-5 lg:p-6 min-h-[104px] flex items-center justify-center transition-colors duration-200 hover:border-line"
            style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/supporters/${logo.file}`}
              alt={logo.name}
              title={logo.name}
              loading="lazy"
              className="max-h-[42px] w-auto max-w-[80%] object-contain opacity-85 transition-opacity duration-300 group-hover:opacity-100"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

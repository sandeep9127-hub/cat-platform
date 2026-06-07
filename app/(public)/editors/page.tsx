import { Reveal } from "@/components/ui/Reveal";
import { StaggerReveal } from "@/components/ui/StaggerReveal";

export const metadata = {
  title: "Editors",
  description:
    "The Transformation Hub's editorial team. The people who read, edit, and stand behind every entry.",
};

const EDITORS = [
  {
    name: "Sandeep Nayak",
    role: "Programme Lead, Food Systems",
    bio: "Leads the food-systems programme at CAT. Background in landscape investment design and rural finance. Holds editorial sign-off on landscape entries and budget summaries.",
  },
  {
    name: "Vibhusha Gupta",
    role: "Communications and Partnerships",
    bio: "Runs communications and partner engagement for CAT. Point of contact for media, funder briefings, and partner submissions to the Platform.",
  },
  {
    name: "Shirish Joshi",
    role: "Programme Coordinator",
    bio: "Coordinates programme rollout across CAT landscapes. Editor for entries that touch implementation detail, partner roles, and on-ground sequencing.",
  },
  {
    name: "Ananya Verma",
    role: "Research and Library",
    bio: "Curates the library, including landscape investment plans and budget records. Reviews factual claims and pushes back on overclaim in draft entries.",
  },
];

export default function EditorsPage() {
  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <Reveal as="header" delay={0}>
        <span className="eyebrow">Editors</span>
        <h1 className="font-sans font-semibold text-[clamp(38px,4.4vw,64px)] leading-[0.98] tracking-[-0.04em] text-ink mt-4">
          The people who <span className="text-teal">read everything</span>.
        </h1>
        <p className="text-[18px] text-ink-soft leading-[1.55] tracking-[-0.01em] mt-5 max-w-[58ch]">
          Every entry on the Platform is read by a person before it goes live. These are
          the editors who carry that work.
        </p>
      </Reveal>

      <StaggerReveal className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-px bg-line border border-line">
        {EDITORS.map((editor, i) => {
          const initials = editor.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("");
          // Rotate accent through the brand palette for variety
          const tones = [
            { bg: "rgba(46,117,115,0.12)", fg: "#2E7573", glow: "rgba(46,117,115,0.18)" },
            { bg: "rgba(248,202,124,0.22)", fg: "#C68C2E", glow: "rgba(248,202,124,0.26)" },
            { bg: "rgba(146,156,197,0.16)", fg: "#5C6796", glow: "rgba(146,156,197,0.22)" },
            { bg: "rgba(51,75,74,0.10)", fg: "#334B4A", glow: "rgba(51,75,74,0.18)" },
          ];
          const tone = tones[i % tones.length];
          return (
            <article
              key={editor.name}
              className="relative overflow-hidden bg-paper p-6 sm:p-8 flex gap-5"
            >
              <span
                aria-hidden
                className="shrink-0 w-16 h-16 rounded-full inline-flex items-center justify-center font-mono text-[18px] tracking-[-0.02em] font-semibold"
                style={{
                  background: tone.bg,
                  color: tone.fg,
                  boxShadow: `0 1px 0 rgba(255,255,255,0.6) inset, 0 4px 12px -6px ${tone.glow}`,
                }}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <h2 className="font-sans font-semibold text-[20px] sm:text-[22px] tracking-[-0.02em] text-[color:var(--navy-teal)] leading-[1.2]">
                  {editor.name}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal block mt-1.5">
                  {editor.role}
                </span>
                <p className="font-sans text-[14.5px] leading-[1.6] text-ink-soft mt-3 max-w-[44ch]">
                  {editor.bio}
                </p>
              </div>
            </article>
          );
        })}
      </StaggerReveal>

      <Reveal as="section" className="mt-20 border-t border-line pt-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12" delay={80}>
        <div className="max-w-reading">
          <h2 className="font-sans font-semibold text-[28px] tracking-[-0.02em] text-ink">
            How editorial decisions get made
          </h2>
          <p className="text-[16.5px] leading-[1.65] text-ink-soft mt-5">
            Draft entries come in from contributors or are written by CAT editors. A
            second editor reads each draft against the{" "}
            <a className="text-teal underline-offset-2 hover:underline" href="/style-guide">
              style guide
            </a>
            . Factual claims with budgets, dates, or population numbers are cross-checked
            against the source document in the library.
          </p>
          <p className="text-[16.5px] leading-[1.65] text-ink-soft mt-4">
            The endorsement tier (Authored, Endorsed, Listed) is set by the second editor,
            not the writer. We do not vote on entries. If two editors disagree, the entry
            sits with a third editor and waits.
          </p>
          <p className="text-[16.5px] leading-[1.65] text-ink-soft mt-4">
            Corrections are versioned. The history of an entry is visible on its page,
            including who edited it and when.
          </p>
        </div>
        <aside
          className="relative overflow-hidden rounded-[8px] border border-line bg-paper p-5 self-start"
          style={{
            boxShadow: "0 1px 2px rgba(26,38,37,0.04), 0 8px 20px -14px rgba(248,202,124,0.30)",
            backgroundImage: "linear-gradient(180deg, rgba(251,248,242,1) 0%, rgba(248,202,124,0.10) 100%)",
          }}
        >
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: "linear-gradient(90deg, #C68C2E 0%, rgba(198,140,46,0.6) 60%, transparent 100%)" }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-deep font-semibold">Editorial reach</span>
          <p className="text-[14px] text-ink-soft leading-[1.6] mt-3">
            Write to{" "}
            <a className="text-teal underline-offset-2 hover:underline" href="mailto:info@agroecologyindia.org">
              info@agroecologyindia.org
            </a>{" "}
            for corrections, takedowns, or to flag a published entry that reads
            off-tone.
          </p>
        </aside>
      </Reveal>
    </article>
  );
}

export const metadata = {
  title: "Editors",
  description:
    "The CAT Platform's editorial team. The people who read, edit, and stand behind every entry.",
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
      <header>
        <span className="eyebrow">Editors</span>
        <h1 className="font-serif font-normal text-[clamp(38px,4.4vw,64px)] leading-[1.05] tracking-[-0.022em] text-ink mt-4">
          The people who <em className="italic text-teal not-italic" style={{ fontStyle: "italic" }}>read everything</em>.
        </h1>
        <p className="font-serif italic text-[18px] text-ink-soft leading-[1.5] mt-5 max-w-[58ch] font-light">
          Every entry on the Platform is read by a person before it goes live. These are
          the editors who carry that work.
        </p>
      </header>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
        {EDITORS.map((editor) => (
          <article key={editor.name} className="border-t border-line pt-6">
            <h2 className="font-serif text-[24px] tracking-[-0.015em] text-ink leading-[1.15]">
              {editor.name}
            </h2>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-teal block mt-2">
              {editor.role}
            </span>
            <p className="font-serif text-[16px] leading-[1.6] text-ink-soft mt-4 max-w-[52ch]">
              {editor.bio}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-20 border-t border-line pt-12 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-12">
        <div className="max-w-reading">
          <h2 className="font-serif text-[28px] font-medium tracking-[-0.015em] text-ink">
            How editorial decisions get made
          </h2>
          <p className="font-serif text-[16.5px] leading-[1.65] text-ink-soft mt-5">
            Draft entries come in from contributors or are written by CAT editors. A
            second editor reads each draft against the{" "}
            <a className="text-teal underline-offset-2 hover:underline" href="/style-guide">
              style guide
            </a>
            . Factual claims with budgets, dates, or population numbers are cross-checked
            against the source document in the library.
          </p>
          <p className="font-serif text-[16.5px] leading-[1.65] text-ink-soft mt-4">
            The endorsement tier (Authored, Endorsed, Listed) is set by the second editor,
            not the writer. We do not vote on entries. If two editors disagree, the entry
            sits with a third editor and waits.
          </p>
          <p className="font-serif text-[16.5px] leading-[1.65] text-ink-soft mt-4">
            Corrections are versioned. The history of an entry is visible on its page,
            including who edited it and when.
          </p>
        </div>
        <aside className="border-l-2 border-amber-deep pl-4">
          <span className="eyebrow block mb-2">Editorial reach</span>
          <p className="text-[14px] text-ink-soft leading-[1.55]">
            Write to{" "}
            <a className="text-teal underline-offset-2 hover:underline" href="mailto:editors@cat.org.in">
              editors@cat.org.in
            </a>{" "}
            for corrections, takedowns, or to flag a published entry that reads
            off-tone.
          </p>
        </aside>
      </section>
    </article>
  );
}

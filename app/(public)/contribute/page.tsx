import { ContributeForm } from "@/components/contribute/ContributeForm";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const metadata = {
  title: "Contribute",
  description:
    "Submit a programme, resource, or news item for editorial review by CAT.",
};

export default async function ContributePage() {
  const [themes, states] = await Promise.all([
    db.select().from(schema.themes).orderBy(asc(schema.themes.displayOrder)),
    db
      .select({ code: schema.geographies.stateCode, name: schema.geographies.name })
      .from(schema.geographies)
      .where(eq(schema.geographies.type, "state"))
      .orderBy(asc(schema.geographies.name)),
  ]);

  return (
    <article className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-24">
      <header className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-16 items-end">
        <div className="reveal-stagger">
          <span className="eyebrow">Contribute</span>
          <h1 className="font-serif font-normal text-hero-xl text-ink mt-4">
            Submit a <em className="hero-italic italic text-teal not-italic" style={{ fontStyle: "italic" }}>programme</em>.
          </h1>
          <p className="font-serif italic text-[17px] sm:text-[19px] text-ink-soft leading-[1.45] max-w-[46ch] mt-5 font-light">
            Submissions enter the editorial queue. CAT editors will read your draft, may ask
            questions, and decide whether to publish it as a CAT-endorsed or CAT-listed entry.
            We aim to respond within two weeks.
          </p>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-7 lg:self-end lg:pb-2 border-t border-line pt-6 lg:border-t-0 lg:pt-0 reveal-stagger" style={{ animationDelay: "180ms" }}>
          <span className="eyebrow">Before you start</span>
          <ul className="list-none p-0 m-0 mt-3 flex flex-col gap-1.5 text-[14px] text-ink-soft leading-[1.55]">
            <li>· Programme-level work, not single activities</li>
            <li>· Plain language, no marketing words</li>
            <li>· Include what did not work</li>
            <li>· Autosaved as you type</li>
          </ul>
        </aside>
      </header>

      <section className="mt-12 border-t border-line pt-8">
        <ContributeForm themes={themes} states={states} />
      </section>
    </article>
  );
}

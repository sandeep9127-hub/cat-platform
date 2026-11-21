import { ArrowUp } from "lucide-react";

/**
 * "Ask about {Landscape}" bar under the landscape tabs (Ask UI spec E2).
 * An input plus up to three starter questions, all handing off to
 * /agent?scope={slug}&q=... Plain form and links: works without JavaScript.
 */
export function LandscapeAskBar({ slug, name, starters }: { slug: string; name: string; starters: string[] }) {
  const href = (q: string) => `/agent?${new URLSearchParams({ scope: slug, q }).toString()}`;
  return (
    <section aria-label={`Ask about ${name}`} className="max-w-page mx-auto px-5 sm:px-7 lg:px-10 mt-6">
      <div className="rounded-card border border-line bg-paper p-4 sm:p-5">
        <form action="/agent" method="get" className="flex items-center gap-2 rounded-full border border-line bg-paper pl-4 pr-1.5 py-1.5 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
          <input type="hidden" name="scope" value={slug} />
          <label htmlFor="landscape-ask" className="sr-only">
            Ask about {name}
          </label>
          <input
            id="landscape-ask"
            name="q"
            type="text"
            required
            autoComplete="off"
            placeholder={`Ask about ${name}`}
            className="flex-1 min-w-0 bg-transparent text-[16px] text-ink placeholder:text-muted outline-none py-1.5"
          />
          <button
            type="submit"
            aria-label={`Ask about ${name}`}
            className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-deep-teal text-paper hover:bg-teal transition-colors"
          >
            <ArrowUp size={18} strokeWidth={2} aria-hidden />
          </button>
        </form>
        {starters.length > 0 && (
          <ul className="list-none p-0 m-0 mt-3 flex flex-wrap gap-2" aria-label="Suggested questions">
            {starters.slice(0, 3).map((q) => (
              <li key={q}>
                <a
                  href={href(q)}
                  className="inline-flex items-center min-h-9 px-3.5 rounded-full border border-line bg-cream/60 text-[13.5px] text-ink-soft hover:border-teal hover:text-teal transition-colors"
                >
                  {q}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * TEMPORARY copy of the starter questions from the Ask UI spec (section 0),
 * until lib/ask/starters.ts (Ask session: ASK_STARTERS, startersFor(slug),
 * all checked against the refusal floor) is merged. Matches that list as of
 * 21 Nov (three spec starters were replaced after the check). At merge, delete
 * this and use startersFor(slug) in app/(public)/landscape/[slug]/page.tsx.
 */
export const SPEC_STARTERS: Record<string, string[]> = {
  patratu: ["What does Patratu's plan say about livestock?", "Who pays for Patratu's plan?", "What didn't work in past Patratu interventions?"],
  rajnagar: ["How does Rajnagar budget for water?", "Which villages get farm ponds first?", "What role do women's SHGs play in Rajnagar?"],
  vempalli: ["How does Vempalli use drip irrigation?", "How is groundwater tracked in Vempalli?", "What does Vempalli's plan cost in total?"],
  patharpratima: ["How does Patharpratima plan for saline flooding?", "What does the plan say about fisheries?", "Which crops suit Patharpratima's soils?"],
  chitrakonda: ["Which crops does Chitrakonda's plan promote?", "How does Chitrakonda's plan involve tribal communities?", "What is the plan size for Chitrakonda?"],
  dantewada: ["What role does forest produce play in Dantewada?", "Which organisations will implement Dantewada's plan?", "How does the plan support millets?"],
  ahwa: ["What is planned for millets in Ahwa?", "How does Ahwa's plan handle water in the dry season?", "Who funds Ahwa's plan?"],
  dharashiv: ["How does Dharashiv's plan tackle drought?", "What does the plan say about soil health?", "Which state schemes does it use?"],
  mau: ["What does Mau's plan say about soil health?", "How are FPOs involved in Mau?", "What is the biggest cost in Mau's plan?"],
  "khatarshnong-laitkroh": [
    "How are community institutions involved in Khatarshnong–Laitkroh?",
    "What does the plan say about shifting cultivation?",
    "How is Khatarshnong–Laitkroh's plan funded?",
  ],
};

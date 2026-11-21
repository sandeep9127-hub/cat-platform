/**
 * Starter questions per landscape (docs/ask-ui-spec.md §0), used by the Ask
 * landscape chips, the landscape-page ask bar and the scope menu.
 *
 * Every starter must clear Ask v2's refusal floor when scoped to its
 * landscape: re-check with `npx tsx scripts/check-ask-starters.ts` after edits.
 */
export const ASK_STARTERS: Record<string, [string, string, string]> = {
  patratu: [
    "What does Patratu's plan say about livestock?",
    "Who pays for Patratu's plan?",
    "What didn't work in past Patratu interventions?",
  ],
  rajnagar: [
    "How does Rajnagar budget for water?",
    "Which villages get farm ponds first?",
    "What role do women's SHGs play in Rajnagar?",
  ],
  vempalli: [
    "How does Vempalli use drip irrigation?",
    "How is groundwater tracked in Vempalli?",
    "What does Vempalli's plan cost in total?",
  ],
  patharpratima: [
    "How does Patharpratima plan for saline flooding?",
    "What does the plan say about fisheries?",
    "Which crops suit Patharpratima's soils?",
  ],
  chitrakonda: [
    "Which crops does Chitrakonda's plan promote?",
    "How does Chitrakonda's plan involve tribal communities?",
    "What is the plan size for Chitrakonda?",
  ],
  dantewada: [
    "What role does forest produce play in Dantewada?",
    "Which organisations will implement Dantewada's plan?",
    "How does the plan support millets?",
  ],
  ahwa: [
    "What is planned for millets in Ahwa?",
    "How does Ahwa's plan handle water in the dry season?",
    "Who funds Ahwa's plan?",
  ],
  dharashiv: [
    "How does Dharashiv's plan tackle drought?",
    "What does the plan say about soil health?",
    "Which state schemes does it use?",
  ],
  mau: [
    "What does Mau's plan say about soil health?",
    "How are FPOs involved in Mau?",
    "What is the biggest cost in Mau's plan?",
  ],
  "khatarshnong-laitkroh": [
    "How are community institutions involved in Khatarshnong–Laitkroh?",
    "What does the plan say about shifting cultivation?",
    "How is Khatarshnong–Laitkroh's plan funded?",
  ],
};

export function startersFor(slug: string | null | undefined): string[] {
  return (slug && ASK_STARTERS[slug]) || [];
}

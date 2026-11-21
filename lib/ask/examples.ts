import data from "./examples.json";

/**
 * Stored, real Ask v2 answers for the Ask first screen and the home-page band
 * (docs/ask-ui-spec.md §0, E3). Regenerate with
 * `npx tsx scripts/build-ask-examples.ts`; never generated on page load.
 * Shape matches components/home/AskHubBand.tsx (feat/ui-refresh).
 */
export type AskExample = {
  question: string;
  scope?: string | null;
  /** Prose with 1-based [n] markers into `citations`. */
  answer: string;
  citations: { label: string; score?: number; relevance?: string; url?: string }[];
};

export const ASK_EXAMPLES: AskExample[] = data.examples;

/** Rotates by day (IST), so the server and browser agree within a day. */
export function exampleForToday(now: Date = new Date()): AskExample | null {
  if (!ASK_EXAMPLES.length) return null;
  const istDay = Math.floor((now.getTime() + 5.5 * 3600_000) / 86_400_000);
  return ASK_EXAMPLES[istDay % ASK_EXAMPLES.length];
}

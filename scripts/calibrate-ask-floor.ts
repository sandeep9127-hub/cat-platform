import { config } from "dotenv";
/**
 * Calibrate Ask v2's refusal floor on rerank scores (CAT database only).
 *   npx tsx scripts/calibrate-ask-floor.ts
 * Runs hybridSearch (Voyage embed + rerank, no Claude) for real in-scope
 * questions and clearly out-of-scope ones, and prints the top rerank score of
 * each so the floor in lib/ask/v2.ts can sit between the two groups.
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

const IN_SCOPE: Array<[string, string | null]> = [
  ["What is the total investment proposed for Rajnagar?", null],
  ["How many households are in Vempalli mandal?", "vempalli"],
  ["What does the Patratu plan say about livestock?", null],
  ["Which water interventions are planned in Dharashiv?", null],
  ["How will the People's Biodiversity Register be maintained?", null],
  ["What is the funding mix for the Patratu investment plan?", "patratu"],
  ["What are the main soil health problems in Mau?", null],
  ["Which crops are grown in Khatarshnong-Laitkroh?", null],
  ["How does the Ahwa plan support millet cultivation?", null],
  ["What role do FPOs play in Chitrakonda?", null],
  ["What is the government convergence amount in Patratu?", null],
  ["How is climate vulnerability assessed in Patharpratima?", null],
  ["What are the forest rights titles in Mau?", "mau"],
  ["What training is planned for natural farming in Dantewada?", null],
  ["Compare the budgets for water in Rajnagar and Vempalli", null],
  ["What is the community contribution in the Rajnagar plan?", "rajnagar"],
  ["seed banks", null],
  ["How much does a farm pond cost?", null],
  ["What changed in the revised Chitrakonda report?", null],
  ["Which interventions are in Phase 1 for Dharashiv?", "dharashiv"],
];
const OUT_OF_SCOPE: Array<[string, string | null]> = [
  ["What is the capital of France?", null],
  ["Who won the 2023 Cricket World Cup?", null],
  ["How do I fix a null pointer exception in Java?", null],
  ["What is the price of Bitcoin today?", null],
  ["Recommend a good smartphone under 20000 rupees", null],
  ["What does the Wayanad landscape plan say about coffee?", null],
  ["Write me a poem about the sea", null],
  ["What is the GDP of Brazil?", null],
  ["Tell me a joke", null],
  ["What is the livestock plan for Rajnagar?", "vempalli"],
];

(async () => {
  const { hybridSearch } = await import("../lib/rag/search");
  async function run(label: string, qs: Array<[string, string | null]>) {
    const tops: number[] = [];
    console.log(`\n== ${label}`);
    for (const [q, scope] of qs) {
      const t = Date.now();
      const hits = await hybridSearch({ query: q, landscapeSlug: scope, k: 8, sourceKinds: ["document", "intervention"] });
      const top = hits[0]?.score ?? 0;
      tops.push(top);
      console.log(`${top.toFixed(3)}  ${(hits[1]?.score ?? 0).toFixed(3)}  ${String(Date.now() - t).padStart(5)}ms  ${scope ? `[${scope}] ` : ""}${q}`);
    }
    tops.sort((a, b) => a - b);
    console.log(`min ${tops[0].toFixed(3)}  median ${tops[Math.floor(tops.length / 2)].toFixed(3)}  max ${tops[tops.length - 1].toFixed(3)}`);
  }
  await run("in scope", IN_SCOPE);
  await run("out of scope", OUT_OF_SCOPE);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });

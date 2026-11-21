import { config } from "dotenv";
/**
 * Build the stored example answers for the Ask first screen and the home band
 * (docs/ask-ui-spec.md §0): real Ask v2 answers, shortened to two sentences,
 * with only the passages they cite. Writes lib/ask/examples.json.
 *   npx tsx scripts/build-ask-examples.ts
 * CAT database only. About $0.002 per example (Haiku).
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

const QUESTIONS: Array<[string, string]> = [
  ["patratu", "What does Patratu's plan say about livestock?"],
  ["rajnagar", "What role do women's SHGs play in Rajnagar?"],
  ["dantewada", "What role does forest produce play in Dantewada?"],
];

/** Why an example isn't good enough to show, or null when it is. */
function check(text: string, landscape: string): string | null {
  const plain = text.replace(/\[\d+\]/g, "").trim();
  const sentences = plain.split(/(?<=[.!?])\s+(?=[A-Z₹0-9])/).filter(Boolean);
  if (sentences.length !== 2) return `${sentences.length} sentences`;
  if (sentences.some((x) => x.split(/\s+/).length > 35)) return "a sentence over 35 words";
  if (/^(also|and|but|however|this|these|it)\b/i.test(plain)) return "opens mid-thought";
  if (!/\[\d+\]/.test(text)) return "no citation";
  const withMarks = text.trim().split(/(?<=[.!?](?:\[\d+\])*)\s+(?=[A-Z₹0-9])/);
  if (withMarks.some((x) => !/\[\d+\]/.test(x))) return "a sentence without a citation";
  if (!sentences[0].toLowerCase().includes(landscape.toLowerCase())) return "first sentence doesn't name the landscape";
  if (/concrete detail|useful specific|search results/i.test(plain)) return "echoes the instructions";
  return null;
}

(async () => {
  const { writeFileSync } = await import("node:fs");
  const { hybridSearch } = await import("../lib/rag/search");
  const { claudeStream } = await import("../lib/ai/claude");
  const { LANDSCAPES } = await import("../lib/data/landscapes");
  const { SYSTEM_PROMPT, REFUSAL_FLOOR, toCitation, searchResultBlock } = await import("../lib/ask/v2");
  const out = [];
  for (const [scope, question] of QUESTIONS) {
    const hits = (await hybridSearch({ query: question, landscapeSlug: scope, k: 6 })).filter((h) => h.score >= 0.4);
    if ((hits[0]?.score ?? 0) < REFUSAL_FLOOR) throw new Error(`below floor: ${question}`);
    const cites = hits.map((h, i) => toCitation(h, i + 1));
    let text = "";
    for (let attempt = 1; attempt <= 6; attempt++) {
      text = await generate();
      const problem = check(text, LANDSCAPES[scope]?.name ?? scope);
      if (!problem) break;
      console.log(`  attempt ${attempt} rejected (${problem})`);
      if (attempt === 6) throw new Error(`no acceptable example for: ${question}`);
    }
    async function generate(): Promise<string> {
    const stream = await claudeStream("ask_v2", {
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          ...hits.map((h, i) => searchResultBlock(h, cites[i])),
          { type: "text", text: `Answer in exactly two complete sentences of plain prose. The first sentence names the landscape and states the main point; the second gives one concrete detail such as a figure or an intervention. Each sentence must stand on its own and be grammatically complete. Cite the search results for each.\n\nReader question: ${question}` },
        ],
      }],
    });
    let text = "";
    let block = new Set<number>();
    for await (const e of stream) {
      if (e.type === "delta") text += e.text;
      else if (e.type === "citation") block.add(e.searchResultIndex + 1);
      else if (e.type === "block_end") {
        if (block.size) text += [...block].sort((a, b) => a - b).map((n) => `[${n}]`).join("");
        block = new Set();
      }
    }
    return text.trim();
    }
    // Keep only cited passages, renumbered 1..k in order of first use.
    const order: number[] = [];
    for (const m of text.matchAll(/\[(\d+)\]/g)) { const n = Number(m[1]); if (!order.includes(n)) order.push(n); }
    if (!order.length) throw new Error(`no citations: ${question}`);
    const answer = text.trim().replace(/\[(\d+)\]/g, (_, n) => `[${order.indexOf(Number(n)) + 1}]`);
    out.push({
      question, scope, answer,
      citations: order.map((n) => ({ label: cites[n - 1].label, score: cites[n - 1].score, url: cites[n - 1].url })),
    });
    console.log(`\n${question}\n${answer}\n${order.map((n, i) => `  [${i + 1}] ${cites[n - 1].label}`).join("\n")}`);
  }
  writeFileSync("lib/ask/examples.json", JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), examples: out }, null, 2) + "\n");
  console.log("\nwrote lib/ask/examples.json");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });

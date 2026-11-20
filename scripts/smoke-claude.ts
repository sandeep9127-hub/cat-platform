import { config } from "dotenv";

/**
 * Smoke test for the Claude routing layer. Runs against the RAG-upgrade Neon
 * branch (DATABASE_URL_RAG), never production.
 *
 *   npx tsx scripts/smoke-claude.ts            # cheap: Haiku calls only (~$0.01)
 *   npx tsx scripts/smoke-claude.ts --factsheet # also one Sonnet + web-search fact sheet (~$0.2)
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_RAG) throw new Error("DATABASE_URL_RAG is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_RAG;

async function main() {
  const { claudeMessage, claudeStream, poolSpentTodayUsd } = await import("../lib/ai/claude");
  const { taskConfig } = await import("../lib/ai/models");

  for (const t of ["ask_hub", "ask_landscape", "visualize", "factsheet", "discovery", "draft_writer"] as const) {
    const c = taskConfig(t);
    console.log(`${t.padEnd(14)} ${String(c.model).padEnd(18)} effort=${c.effort} pool=${c.pool}`);
  }

  console.log("\n1. ask_landscape (plain)");
  const a = await claudeMessage("ask_landscape", {
    system: "Answer in one short sentence from the passage only. Cite it as [1].",
    messages: [{ role: "user", content: "[1] The plan budgets ₹12 crore for farm ponds over 5 years.\n\nReader question: How much is budgeted for farm ponds?" }],
  });
  console.log(`   ${a.model} → "${a.text}"  $${a.costUsd.toFixed(5)} stop=${a.stopReason}`);

  console.log("\n2. visualize (structured JSON)");
  const v = await claudeMessage("visualize", {
    system: "Turn the figures in the text into at most one chart. Use only stated numbers.",
    messages: [{ role: "user", content: "Spend: soil ₹40 crore, water ₹35 crore, seeds ₹25 crore." }],
    jsonSchema: {
      type: "object",
      properties: {
        charts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: ["donut", "bar", "line"] },
              series: {
                type: "array",
                items: {
                  type: "object",
                  properties: { label: { type: "string" }, value: { type: "number" } },
                  required: ["label", "value"],
                  additionalProperties: false,
                },
              },
            },
            required: ["kind", "series"],
            additionalProperties: false,
          },
        },
      },
      required: ["charts"],
      additionalProperties: false,
    },
  });
  console.log(`   ${v.model} → ${JSON.stringify(JSON.parse(v.text))}  $${v.costUsd.toFixed(5)}`);

  console.log("\n3. ask_hub (stream)");
  const s = await claudeStream("ask_hub", {
    system: "Reply in one short sentence.",
    messages: [{ role: "user", content: "Say hello to the CAT team." }],
  });
  let streamed = "";
  for await (const e of s) {
    if (e.type === "delta") streamed += e.text;
    else console.log(`   → "${streamed.trim()}"  $${e.costUsd.toFixed(5)} stop=${e.stopReason}`);
  }

  if (process.argv.includes("--factsheet")) {
    console.log("\n4. factsheet (Sonnet + web search) — writes to the branch DB only");
    const { generateFactSheet } = await import("../lib/factsheet/generate");
    const f = await generateFactSheet("Odisha Millets Mission");
    console.log(
      f.ok
        ? `   ${f.status}: ${f.sheet.title} (confidence ${f.sheet.confidence}, ${f.sheet.citations.length} citations)  $${f.costUsd.toFixed(4)}`
        : `   not generated: ${f.reason}`,
    );
  }

  console.log(`\nToday's spend — public: $${(await poolSpentTodayUsd("public")).toFixed(5)}, ingestion: $${(await poolSpentTodayUsd("ingestion")).toFixed(5)}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

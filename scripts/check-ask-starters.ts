import { config } from "dotenv";
/**
 * Check every Ask starter question clears the refusal floor when scoped to
 * its landscape (CAT database; Voyage only, no Claude).
 *   npx tsx scripts/check-ask-starters.ts
 */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;

(async () => {
  const { hybridSearch } = await import("../lib/rag/search");
  const { ASK_STARTERS } = await import("../lib/ask/starters");
  const { REFUSAL_FLOOR } = await import("../lib/ask/v2");
  let fails = 0;
  for (const [slug, qs] of Object.entries(ASK_STARTERS)) {
    for (const q of qs) {
      const top = (await hybridSearch({ query: q, landscapeSlug: slug, k: 3 }))[0]?.score ?? 0;
      const ok = top >= REFUSAL_FLOOR + 0.1; // margin: a starter should be a confident hit
      if (!ok) fails++;
      console.log(`${ok ? "ok  " : "FAIL"} ${top.toFixed(3)}  [${slug}] ${q}`);
    }
  }
  console.log(fails ? `\n${fails} starter(s) below ${(REFUSAL_FLOOR + 0.1).toFixed(2)}` : "\nall starters clear");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });

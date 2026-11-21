import { config } from "dotenv";
/** Re-index published Solutions Atlas fact sheets as searchable chunks (CAT database). npx tsx scripts/index-factsheets.ts */
config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) throw new Error("DATABASE_URL_CAT is not set");
process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;
(async () => {
  const { indexFactsheets } = await import("../lib/ingest/factsheet-chunks");
  console.log(`${await indexFactsheets()} fact sheets indexed`);
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });

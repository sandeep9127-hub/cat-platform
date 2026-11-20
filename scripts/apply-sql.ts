import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Client } from "pg";

/**
 * Apply a hand-written SQL file (drizzle/sql/*.sql) to a database.
 * Targets the RAG-upgrade Neon branch by default; pass --prod to hit
 * DATABASE_URL instead.
 *
 *   npx tsx scripts/apply-sql.ts drizzle/sql/2026-10-17_ai_usage.sql
 *   npx tsx scripts/apply-sql.ts drizzle/sql/2026-10-17_ai_usage.sql --prod
 */
config({ path: ".env.local", quiet: true });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/apply-sql.ts <file.sql> [--prod]");
  const prod = process.argv.includes("--prod");
  const url = prod ? process.env.DATABASE_URL : process.env.DATABASE_URL_RAG;
  if (!url) throw new Error(prod ? "DATABASE_URL is not set" : "DATABASE_URL_RAG is not set");

  const c = new Client({ connectionString: url });
  await c.connect();
  const { rows } = await c.query("select current_setting('neon.branch_id', true) as branch");
  console.log(`Applying ${file} to branch ${rows[0]?.branch ?? "?"}${prod ? " (PRODUCTION)" : ""}`);
  await c.query(readFileSync(file, "utf8"));
  await c.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

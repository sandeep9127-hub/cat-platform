import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Client } from "pg";

/**
 * Apply a hand-written SQL file (drizzle/sql/*.sql) to a database.
 * Targets the RAG-upgrade Neon branch by default; --cat targets the new CAT
 * database (DATABASE_URL_CAT, the live site); --dev targets the CAT dev branch
 * (DATABASE_URL_DEV); --prod targets the old live DATABASE_URL.
 *
 *   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-20_v2_core.sql --cat
 *   npx tsx scripts/apply-sql.ts drizzle/sql/2026-10-17_ai_usage.sql --prod
 */
config({ path: ".env.local", quiet: true });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/apply-sql.ts <file.sql> [--prod]");
  const prod = process.argv.includes("--prod");
  const cat = process.argv.includes("--cat");
  const dev = process.argv.includes("--dev");
  if ([prod, cat, dev].filter(Boolean).length > 1) throw new Error("Pass only one of --prod / --cat / --dev");
  const envName = prod ? "DATABASE_URL" : cat ? "DATABASE_URL_CAT" : dev ? "DATABASE_URL_DEV" : "DATABASE_URL_RAG";
  const url = process.env[envName];
  if (!url) throw new Error(`${envName} is not set`);

  const c = new Client({ connectionString: url });
  await c.connect();
  const { rows } = await c.query("select current_setting('neon.branch_id', true) as branch");
  console.log(`Applying ${file} via ${envName} (branch ${rows[0]?.branch ?? "?"})${prod ? " (PRODUCTION)" : ""}`);
  await c.query(readFileSync(file, "utf8"));
  await c.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

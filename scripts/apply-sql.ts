import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Client } from "pg";

/**
 * Apply a hand-written SQL file (drizzle/sql/*.sql) to a database.
 *   --dev   the CAT dev branch (DATABASE_URL_DEV): where new SQL is tried first
 *   --cat   the CAT database (DATABASE_URL_CAT): the LIVE site's database since
 *           26 Nov 2026, so it also needs --confirm-live
 *   --prod  the old live DATABASE_URL (also needs --confirm-live)
 *   (none)  the RAG-upgrade Neon branch (DATABASE_URL_RAG)
 *
 *   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-26_voice_turns.sql --dev
 *   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-26_voice_turns.sql --cat --confirm-live
 */
config({ path: ".env.local", quiet: true });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: tsx scripts/apply-sql.ts <file.sql> [--prod]");
  const prod = process.argv.includes("--prod");
  const cat = process.argv.includes("--cat");
  const dev = process.argv.includes("--dev");
  if ([prod, cat, dev].filter(Boolean).length > 1) throw new Error("Pass only one of --dev / --cat / --prod");
  if ((prod || cat) && !process.argv.includes("--confirm-live"))
    throw new Error(`${cat ? "--cat" : "--prod"} is a live database. Try it on --dev first, then add --confirm-live once Sandeep has agreed.`);
  const envName = prod ? "DATABASE_URL" : cat ? "DATABASE_URL_CAT" : dev ? "DATABASE_URL_DEV" : "DATABASE_URL_RAG";
  const url = process.env[envName];
  if (!url) throw new Error(`${envName} is not set`);

  const c = new Client({ connectionString: url });
  await c.connect();
  const { rows } = await c.query("select current_setting('neon.branch_id', true) as branch");
  console.log(`Applying ${file} via ${envName} (branch ${rows[0]?.branch ?? "?"})${prod || cat ? " (LIVE)" : ""}`);
  await c.query(readFileSync(file, "utf8"));
  await c.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

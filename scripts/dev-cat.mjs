// Local dev against the new CAT database with Ask v2 on.
//   node scripts/dev-cat.mjs [port]
// Loads .env.local, then points DATABASE_URL at DATABASE_URL_CAT for this
// process only, so the live database is never read or written.
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL_CAT) {
  console.error("DATABASE_URL_CAT is not set in .env.local");
  process.exit(1);
}
const port = process.argv[2] ?? "3100";
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL_CAT, ASK_V2: "on" };
const child = spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));

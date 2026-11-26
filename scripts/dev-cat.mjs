// Local dev against the CAT dev database with Ask v2 and the voice agent on.
//   node scripts/dev-cat.mjs [port]
// Loads .env.local, then points DATABASE_URL at DATABASE_URL_DEV (Neon "CAT hub" >
// branch "dev") for this process only. DATABASE_URL_CAT is the live site's database
// now (26 Nov 2026), so local development never falls back to it.
import { spawn } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const dev = process.env.DATABASE_URL_DEV;
if (!dev) {
  console.error("DATABASE_URL_DEV is not set in .env.local (the Neon dev branch). Not falling back to the live database.");
  process.exit(1);
}
for (const live of [process.env.DATABASE_URL, process.env.DATABASE_URL_CAT]) {
  if (live && new URL(live).hostname === new URL(dev).hostname) {
    console.error("DATABASE_URL_DEV points at the same host as a live database. Refusing to start.");
    process.exit(1);
  }
}
const port = process.argv[2] ?? "3100";
// Voice uses the Soniox key from .env.local (paid, capped by VOICE_DAILY_USD_CEILING).
const env = { ...process.env, DATABASE_URL: dev, ASK_V2: "on", ASK_VOICE: "on", VOICE_AGENT: process.env.VOICE_AGENT ?? "on" };
const child = spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 0));

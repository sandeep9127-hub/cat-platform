import { config } from "dotenv";

/**
 * Check every AI service the Hub depends on (Claude models, Voyage, Soniox)
 * and record the result in cat.model_health. Exits 1 if any check fails, so
 * the scheduled GitHub Action fails and GitHub emails the repository owner.
 *
 *   npx tsx scripts/model-health.ts
 */
config({ path: ".env.local", quiet: true });
if (process.env.DATABASE_URL_CAT) process.env.DATABASE_URL = process.env.DATABASE_URL_CAT;
if (!process.env.DATABASE_URL) throw new Error("No database configured");

(async () => {
  const { runHealthChecks } = await import("../lib/ai/health");
  const results = await runHealthChecks();
  for (const r of results) {
    console.log(`${r.ok ? "ok  " : "FAIL"} ${r.provider.padEnd(9)} ${r.model.padEnd(22)} ${String(r.latency_ms).padStart(5)} ms${r.error ? `  ${r.error}` : ""}`);
  }
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => {
  console.error("HEALTH CHECK FAILED:", e.message);
  process.exit(1);
});

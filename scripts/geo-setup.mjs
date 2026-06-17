#!/usr/bin/env node
/**
 * One-time setup for the canonical geography picker:
 *  - adds lgd_code / source / verified columns to cat.geographies
 *  - enables pg_trgm and a trigram GIN index on name for fuzzy, typo-tolerant search
 *
 * Usage: node scripts/geo-setup.mjs
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });

const stmts = [
  `ALTER TABLE "cat".geographies ADD COLUMN IF NOT EXISTS lgd_code varchar(24)`,
  `ALTER TABLE "cat".geographies ADD COLUMN IF NOT EXISTS source varchar(32)`,
  `ALTER TABLE "cat".geographies ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT true`,
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  // Fuzzy search on name (typo-tolerant) + a fast prefix path.
  `CREATE INDEX IF NOT EXISTS geo_name_trgm_idx ON "cat".geographies USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS geo_lgd_idx ON "cat".geographies (lgd_code)`,
];

for (const s of stmts) {
  await pool.query(s);
  console.log("  ✓", s.replace(/\s+/g, " ").slice(0, 80));
}
console.log("✓ geography setup complete");
await pool.end();

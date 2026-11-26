-- Voice agent conversation state (docs/voice-agent-plan.md, step 5): the
-- landscape and topic being discussed, the last figures quoted, and the
-- language in use. Kept for one conversation only; never across visits.
-- Additive and idempotent. Applied to the CAT database on 26 Nov 2026 (now the live one).
-- Try changes on the dev branch first:
--   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-26_voice_state.sql --dev
ALTER TABLE "cat".conversations ADD COLUMN IF NOT EXISTS voice_state jsonb;

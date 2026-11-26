-- Voice agent conversation state (docs/voice-agent-plan.md, step 5): the
-- landscape and topic being discussed, the last figures quoted, and the
-- language in use. Kept for one conversation only; never across visits.
-- Additive and idempotent. Apply to the CAT database only:
--   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-26_voice_state.sql --cat
ALTER TABLE "cat".conversations ADD COLUMN IF NOT EXISTS voice_state jsonb;

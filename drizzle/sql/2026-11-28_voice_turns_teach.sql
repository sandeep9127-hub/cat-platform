-- Voice agent learns from editors (docs/voice-agent-plan.md, step 7): an editor
-- who marks a turn wrong can tick "Teach the agent". The turn's words and the
-- correct call then become a worked example for the turn judge, so it judges
-- similar turns better without a code change. Only turns that kept their words
-- can teach (side talk and second speakers never keep any).
-- Additive and idempotent. Dev first:
--   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-28_voice_turns_teach.sql --dev
-- The live (CAT) database needs it before this code is deployed there (ask Sandeep).
ALTER TABLE "cat".voice_turns
  ADD COLUMN IF NOT EXISTS should_have text,
  ADD COLUMN IF NOT EXISTS teach boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "cat".voice_turns ADD CONSTRAINT voice_turns_should_have_chk
    CHECK (should_have IS NULL OR should_have IN ('answered','stayed_quiet','asked_first','ended','searched_again','other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- A teaching example needs its words and a marked-wrong verdict with a known correct call.
  ALTER TABLE "cat".voice_turns ADD CONSTRAINT voice_turns_teach_chk
    CHECK (NOT teach OR (transcript IS NOT NULL AND marked_wrong = true AND should_have IS NOT NULL AND should_have <> 'other'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS voice_turns_teach_idx ON "cat".voice_turns (created_at DESC) WHERE teach;

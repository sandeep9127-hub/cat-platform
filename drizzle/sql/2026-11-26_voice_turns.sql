-- Voice agent decision log (docs/voice-agent-plan.md, step 7): one row per
-- spoken turn the server saw, so wrong calls (side talk answered, real
-- questions ignored, wrong tool) can be found, marked and turned into eval
-- cases. No audio is ever stored. Turns judged as side talk keep no text:
-- they may be people talking to each other, not to the Hub.
-- Additive and idempotent. Apply to the CAT database only:
--   npx tsx scripts/apply-sql.ts drizzle/sql/2026-11-26_voice_turns.sql --cat
CREATE TABLE IF NOT EXISTS "cat".voice_turns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid REFERENCES "cat".conversations(id) ON DELETE CASCADE,
  -- What was heard (NULL for side talk). At most 500 characters.
  transcript      text CHECK (transcript IS NULL OR length(transcript) <= 500),
  speaker         text NOT NULL DEFAULT 'main' CHECK (speaker IN ('main','other')),
  confidence      real,
  after_question  boolean NOT NULL DEFAULT false,
  lang            text NOT NULL DEFAULT 'en',
  decision        text NOT NULL CHECK (decision IN (
                    'answered','refused','ignored_side_talk','asked_was_that_for_me',
                    'command_repeat','command_end','command_shorter','command_show_sources',
                    'small_talk','identity','error')),
  reason          text,
  tools           text[] NOT NULL DEFAULT '{}',
  latency_ms      integer,
  cost_usd        numeric(12,6),
  -- Set by an editor when the decision was wrong (admin marking, later).
  marked_wrong    boolean,
  marked_note     text
);
CREATE INDEX IF NOT EXISTS voice_turns_created_idx ON "cat".voice_turns (created_at DESC);
CREATE INDEX IF NOT EXISTS voice_turns_decision_idx ON "cat".voice_turns (decision, created_at DESC);

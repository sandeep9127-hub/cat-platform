-- Per-call Claude usage + cost log. Written by lib/ai/claude.ts; read for
-- daily budget enforcement (pool + IST day) and cost reporting.
CREATE TABLE IF NOT EXISTS "cat".ai_usage (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  task               text NOT NULL,
  pool               text NOT NULL,
  model              text NOT NULL,
  input_tokens       integer NOT NULL DEFAULT 0,
  output_tokens      integer NOT NULL DEFAULT 0,
  cache_read_tokens  integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  web_searches       integer NOT NULL DEFAULT 0,
  cost_usd           numeric(12, 6) NOT NULL DEFAULT 0,
  stop_reason        text,
  error              text,
  run_id             uuid REFERENCES "cat".ingestion_runs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ai_usage_pool_created_idx ON "cat".ai_usage (pool, created_at);
CREATE INDEX IF NOT EXISTS ai_usage_task_created_idx ON "cat".ai_usage (task, created_at);

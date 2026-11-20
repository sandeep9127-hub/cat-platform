-- CAT Hub v2 core schema (see docs/hub-v2-design.md §3).
-- Target: the new CAT Neon project only. Idempotent: safe to re-run.
-- Always apply 2026-11-20_v2_hardening.sql after this file (triggers, token rules).
-- Status / kind columns use text + CHECK (easier to evolve than enums).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Documents and versions ───────────────────────────────────────────

-- One row per logical document, e.g. "Rajnagar LIP". Cross-landscape
-- documents (HLPE, national reports) have landscape_slug NULL.
CREATE TABLE IF NOT EXISTS "cat".documents (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landscape_slug     text,
  title              text NOT NULL,
  doc_type           text NOT NULL DEFAULT 'other'
                     CHECK (doc_type IN ('lip','profile','climate','alignment','budget','report','policy','other')),
  language           text NOT NULL DEFAULT 'en',
  current_version_id uuid,
  created_by         uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_landscape_idx ON "cat".documents (landscape_slug);

-- Every upload of a document. Exactly one version per document is current;
-- superseded versions stay stored (and citable) but are not searched.
CREATE TABLE IF NOT EXISTS "cat".document_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES "cat".documents(id) ON DELETE CASCADE,
  version_no      integer NOT NULL,
  label           text,                         -- "Draft Feb 2026", "Revised Jun 2026"
  status          text NOT NULL DEFAULT 'uploaded'
                  CHECK (status IN ('uploaded','parsing','chunking','enriching','embedding','ready','failed','superseded')),
  is_current      boolean NOT NULL DEFAULT false,
  r2_original_key text NOT NULL,                -- original file in R2
  r2_parsed_key   text,                         -- parsed markdown/json in R2
  sha256          text NOT NULL,                -- exact-duplicate guard
  mime            text NOT NULL,
  bytes           bigint NOT NULL,
  page_count      integer,
  published_on    date,
  parser          text,                         -- e.g. "unpdf+claude-haiku-5-5"
  parser_version  text,
  error           text,
  uploaded_by     uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_no),
  UNIQUE (sha256)
);
CREATE UNIQUE INDEX IF NOT EXISTS document_versions_one_current
  ON "cat".document_versions (document_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS document_versions_status_idx ON "cat".document_versions (status);

DO $$ BEGIN
  ALTER TABLE "cat".documents
    ADD CONSTRAINT documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES "cat".document_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Parsed text per page: powers "open page 12" and citation highlighting.
CREATE TABLE IF NOT EXISTS "cat".document_pages (
  version_id  uuid NOT NULL REFERENCES "cat".document_versions(id) ON DELETE CASCADE,
  page_no     integer NOT NULL,
  text        text NOT NULL,
  method      text NOT NULL CHECK (method IN ('text','vision','docx')),
  char_count  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (version_id, page_no)
);

-- Heading tree per version.
CREATE TABLE IF NOT EXISTS "cat".sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  uuid NOT NULL REFERENCES "cat".document_versions(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES "cat".sections(id) ON DELETE CASCADE,
  ord         integer NOT NULL,
  heading     text NOT NULL,
  level       smallint NOT NULL,
  page_start  integer,
  page_end    integer,
  path        text NOT NULL                    -- "5 Water > 5.2 Farm ponds"
);
CREATE INDEX IF NOT EXISTS sections_version_idx ON "cat".sections (version_id, ord);

-- ─── Search units ────────────────────────────────────────────────────

-- One table for everything Ask can retrieve: document chunks, fact sheets,
-- entries and organisations, so hybrid search is a single query.
CREATE TABLE IF NOT EXISTS "cat".chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_kind     text NOT NULL CHECK (source_kind IN ('document','factsheet','entry','organisation')),
  source_ref      text,                         -- factsheet/entry slug, org id
  document_id     uuid REFERENCES "cat".documents(id) ON DELETE CASCADE,
  version_id      uuid REFERENCES "cat".document_versions(id) ON DELETE CASCADE,
  section_id      uuid REFERENCES "cat".sections(id) ON DELETE SET NULL,
  landscape_slug  text,
  chunk_index     integer NOT NULL,
  kind            text NOT NULL DEFAULT 'narrative'
                  CHECK (kind IN ('narrative','table','budget','figure','summary')),
  text            text NOT NULL,
  context         text,                         -- Claude's "where this sits" line
  page_start      integer,
  page_end        integer,
  token_count     integer,
  is_current      boolean NOT NULL DEFAULT false,  -- searchable only once flipped (see trigger below)
  tsv             tsvector GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', coalesce(context, '')), 'A') ||
                    setweight(to_tsvector('english', text), 'B')
                  ) STORED,
  embedding       vector(1024),
  embedding_model text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (source_kind <> 'document' OR (document_id IS NOT NULL AND version_id IS NOT NULL)),
  CHECK (source_kind = 'document' OR source_ref IS NOT NULL),
  CONSTRAINT chunks_non_document_unlinked
    CHECK (source_kind = 'document' OR (document_id IS NULL AND version_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS chunks_version_order
  ON "cat".chunks (version_id, chunk_index) WHERE version_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS chunks_source_order
  ON "cat".chunks (source_kind, source_ref, chunk_index) WHERE source_kind <> 'document';
CREATE INDEX IF NOT EXISTS chunks_current_landscape_idx ON "cat".chunks (is_current, landscape_slug);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx ON "cat".chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON "cat".chunks USING hnsw (embedding vector_cosine_ops);

-- ─── Generated artefacts ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "cat".version_diffs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES "cat".documents(id) ON DELETE CASCADE,
  from_version_id uuid NOT NULL REFERENCES "cat".document_versions(id) ON DELETE CASCADE,
  to_version_id   uuid NOT NULL REFERENCES "cat".document_versions(id) ON DELETE CASCADE,
  summary_md      text NOT NULL,
  changes         jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{area, before, after, pages}]
  model           text,
  cost_usd        numeric(12,6),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_version_id, to_version_id)
);

-- Cached until any source version changes (source_hash).
CREATE TABLE IF NOT EXISTS "cat".landscape_briefs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landscape_slug text NOT NULL,
  source_hash    text NOT NULL,
  content_md     text NOT NULL,
  citations      jsonb NOT NULL DEFAULT '[]'::jsonb,
  r2_pdf_key     text,
  r2_docx_key    text,
  model          text,
  cost_usd       numeric(12,6),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (landscape_slug, source_hash)
);

-- ─── Background jobs (Postgres queue; workers use FOR UPDATE SKIP LOCKED) ─

CREATE TABLE IF NOT EXISTS "cat".jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL,                  -- parse_version, embed_chunks, diff_versions, ...
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status       text NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued','running','done','failed','cancelled')),
  priority     integer NOT NULL DEFAULT 0,
  attempts     integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  run_after    timestamptz NOT NULL DEFAULT now(),
  locked_at    timestamptz,
  locked_by    text,
  parent_id    uuid REFERENCES "cat".jobs(id) ON DELETE SET NULL,
  error        text,
  result       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);
CREATE INDEX IF NOT EXISTS jobs_ready_idx ON "cat".jobs (priority DESC, run_after) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS jobs_kind_status_idx ON "cat".jobs (kind, status);

-- ─── Conversations (text and voice) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS "cat".conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sha256 (hex) of a server-generated, httpOnly session cookie. Never store
  -- or accept the raw token; reads must match user_id or this hash.
  session_token_hash text NOT NULL CHECK (session_token_hash ~ '^[0-9a-f]{64}$'),
  user_id         uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  mode            text NOT NULL DEFAULT 'text' CHECK (mode IN ('text','voice')),
  language        text NOT NULL DEFAULT 'en',
  landscape_scope text,
  turn_count      integer NOT NULL DEFAULT 0,
  cost_usd        numeric(12,6) NOT NULL DEFAULT 0,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_session_idx ON "cat".conversations (session_token_hash, last_active_at DESC);

CREATE TABLE IF NOT EXISTS "cat".messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES "cat".conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant')),
  content         text NOT NULL,
  citations       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{chunk_id, document_id, page, quote}]
  artifacts       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- charts, diagrams, note cards
  interrupted     boolean NOT NULL DEFAULT false,
  refused         boolean NOT NULL DEFAULT false,
  model           text,
  input_tokens    integer,
  output_tokens   integer,
  cost_usd        numeric(12,6),
  latency_ms      integer,
  feedback        smallint CHECK (feedback IN (-1, 1)),
  feedback_note   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON "cat".messages (conversation_id, created_at);

-- ─── Cost, health, quality ───────────────────────────────────────────

-- Same definition as drizzle/sql/2026-10-17_ai_usage.sql.
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

CREATE TABLE IF NOT EXISTS "cat".model_health (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  provider    text NOT NULL,                   -- anthropic, voyage, soniox
  model       text NOT NULL,
  ok          boolean NOT NULL,
  latency_ms  integer,
  status_code integer,
  error       text
);
CREATE INDEX IF NOT EXISTS model_health_recent_idx ON "cat".model_health (provider, model, checked_at DESC);

CREATE TABLE IF NOT EXISTS "cat".eval_questions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question         text NOT NULL,
  landscape_slug   text,
  expected_answer  text,
  expected_sources jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{document_id, page}]
  should_refuse    boolean NOT NULL DEFAULT false,
  tags             text[] NOT NULL DEFAULT '{}',
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cat".eval_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,   -- models, advisor, k, rerank...
  scores      jsonb,                                -- aggregate metrics
  cost_usd    numeric(12,6),
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS "cat".eval_results (
  run_id      uuid NOT NULL REFERENCES "cat".eval_runs(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES "cat".eval_questions(id) ON DELETE CASCADE,
  answer      text,
  retrieved   jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores      jsonb NOT NULL DEFAULT '{}'::jsonb,   -- hit@10, citation_ok, refusal_ok
  PRIMARY KEY (run_id, question_id)
);

-- ─── Triage: one queue for every kind of incoming item ───────────────

CREATE TABLE IF NOT EXISTS "cat".triage_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                  text NOT NULL
                        CHECK (kind IN ('discovery_candidate','org_submission','contribution','factsheet_review')),
  ref_id                uuid NOT NULL,         -- row in the kind's own table
  title                 text NOT NULL,
  status                text NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','in_review','needs_info','snoozed','accepted','dismissed','duplicate')),
  assigned_to           uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  priority              text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  due_at                timestamptz,
  snoozed_until         timestamptz,
  ai_score              real,                  -- 0-1 pre-screen
  ai_rationale          text,
  duplicate_of_kind     text,
  duplicate_of_ref      text,
  dedup_fingerprint     text,                  -- normalised title + state + org
  created_at            timestamptz NOT NULL DEFAULT now(),
  last_status_change_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, ref_id)
);
CREATE INDEX IF NOT EXISTS triage_open_idx ON "cat".triage_items (status, priority, created_at)
  WHERE status IN ('new','in_review','needs_info','snoozed');
CREATE INDEX IF NOT EXISTS triage_assignee_idx ON "cat".triage_items (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS triage_fingerprint_idx ON "cat".triage_items USING gin (dedup_fingerprint gin_trgm_ops);

-- Every status change: who, when, why. Ageing and SLA come from here.
CREATE TABLE IF NOT EXISTS "cat".triage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES "cat".triage_items(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  from_status text,
  to_status   text NOT NULL,
  note        text,
  batch_id    uuid,                            -- set when part of a bulk action
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS triage_events_item_idx ON "cat".triage_events (item_id, created_at);

CREATE TABLE IF NOT EXISTS "cat".triage_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    uuid NOT NULL REFERENCES "cat".triage_items(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS triage_comments_item_idx ON "cat".triage_comments (item_id, created_at);

-- Landscape intervention tables (from the "5.2 data - final" live sheets) and
-- private share links for the full table. Decided 20 Nov 2026.
-- Apply after 2026-11-20_v2_drive_sync.sql. Idempotent; one transaction.
--
-- Flow: Drive sync reads each landscape's live sheet -> rows are compared with
-- the approved copy -> differences become intervention_changes (pending) and
-- triage items -> an editor approves -> interventions is updated.
-- The public Budget page keeps the summary; the full table opens only through
-- a share link (expiring, revocable, view-logged). A Monday.com board for the
-- team is fed one-way from the approved data, never the other way.

-- ─── Approved intervention rows (what the site shows) ────────────────

CREATE TABLE IF NOT EXISTS "cat".interventions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landscape_slug      text NOT NULL,
  row_key             text NOT NULL,          -- stable key: "<category_no>.<s_no>"
  sort_order          integer NOT NULL,
  category_no         integer,
  category            text NOT NULL,
  intervention        text NOT NULL,
  s_no                integer,
  sub_intervention    text NOT NULL,
  unit                text,                   -- parsed from "[unit: …]"
  thematic_investment text,
  capital_cost        numeric(16,2),
  capital_desc        text,                   -- includes the unit-cost build-up
  recurring_per_year  numeric(16,2),
  recurring_desc      text,
  recurring_years     integer,
  recurring_total     numeric(16,2),
  unit_cost_total     numeric(16,2),
  phase1              jsonb NOT NULL DEFAULT '{}'::jsonb,  -- units, cost, govt, govt_scheme, community, investment, households, hectares, animals, payee
  phase2              jsonb NOT NULL DEFAULT '{}'::jsonb,
  totals              jsonb NOT NULL DEFAULT '{}'::jsonb,  -- cost, govt, community, investment, grand_total, payee
  tags                jsonb NOT NULL DEFAULT '{}'::jsonb,  -- climate, equity, gender, economic_purpose, institution_type, capital
  source_drive_file_id text,
  approved_at         timestamptz NOT NULL DEFAULT now(),
  approved_by         uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  UNIQUE (landscape_slug, row_key)
);
CREATE INDEX IF NOT EXISTS interventions_landscape_idx ON "cat".interventions (landscape_slug, sort_order);

-- ─── Changes detected by the sync, waiting for approval ─────────────

CREATE TABLE IF NOT EXISTS "cat".intervention_changes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landscape_slug text NOT NULL,
  row_key        text NOT NULL,
  change_type    text NOT NULL CHECK (change_type IN ('add','update','remove')),
  before         jsonb,                       -- approved row (null for add)
  after          jsonb,                       -- sheet row (null for remove)
  changed_fields text[] NOT NULL DEFAULT '{}',
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','superseded')),
  sync_run_id    uuid REFERENCES "cat".drive_sync_runs(id) ON DELETE SET NULL,
  detected_at    timestamptz NOT NULL DEFAULT now(),
  decided_by     uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  decided_at     timestamptz,
  CHECK ((change_type = 'add' AND before IS NULL AND after IS NOT NULL)
      OR (change_type = 'remove' AND before IS NOT NULL AND after IS NULL)
      OR (change_type = 'update' AND before IS NOT NULL AND after IS NOT NULL)),
  CHECK (status = 'pending' OR decided_at IS NOT NULL OR status = 'superseded')
);
-- At most one pending change per row; a newer sync supersedes the old one.
CREATE UNIQUE INDEX IF NOT EXISTS intervention_changes_one_pending
  ON "cat".intervention_changes (landscape_slug, row_key) WHERE status = 'pending';

-- Approval goes through the unified triage queue.
ALTER TABLE "cat".triage_items DROP CONSTRAINT IF EXISTS triage_items_kind_check;
ALTER TABLE "cat".triage_items ADD CONSTRAINT triage_items_kind_check
  CHECK (kind IN ('discovery_candidate','org_submission','contribution','factsheet_review','intervention_change'));

-- ─── Private share links for the full table ─────────────────────────

CREATE TABLE IF NOT EXISTS "cat".share_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- sha256 (hex) of the random token in the URL; the raw token is shown to
  -- the editor once and never stored.
  token_hash     text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  scope          text NOT NULL CHECK (scope IN ('landscape_full_table','all_landscapes_full_table')),
  landscape_slug text,
  label          text NOT NULL,               -- who it's for, e.g. "Funder X, due diligence"
  view_config    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- default columns, filters
  allow_download boolean NOT NULL DEFAULT false,
  created_by     uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,        -- every link expires
  revoked_at     timestamptz,
  revoked_by     uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  CHECK (expires_at > created_at),
  CHECK (expires_at <= created_at + interval '366 days'),
  CHECK ((scope = 'landscape_full_table') = (landscape_slug IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS share_links_landscape_idx ON "cat".share_links (landscape_slug);

CREATE TABLE IF NOT EXISTS "cat".share_link_views (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id   uuid NOT NULL REFERENCES "cat".share_links(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash   text,                             -- sha256 of IP + daily salt; never the raw IP
  user_agent text,
  action    text NOT NULL DEFAULT 'view' CHECK (action IN ('view','download'))
);
CREATE INDEX IF NOT EXISTS share_link_views_link_idx ON "cat".share_link_views (link_id, viewed_at DESC);

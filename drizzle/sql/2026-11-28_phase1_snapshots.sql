-- Snapshots of the All-Landscape Phase 1 sheet (Data and Dashboard tabs, parsed).
-- The sheet is read only when an admin presses "Update from sheet" (or runs
-- scripts/sync-phase1.ts). The dashboard, the public Budget tabs, Insights, the
-- landscape overview and Ask all read the one snapshot with status 'published'.
-- Earlier snapshots are kept ('superseded') so any of them can be restored.
CREATE TABLE IF NOT EXISTS "cat".phase1_snapshots (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_sheet_id    text        NOT NULL,
  fetched_at         timestamptz NOT NULL DEFAULT now(),
  fetched_by         uuid        REFERENCES "cat".users(id) ON DELETE SET NULL,
  fetched_by_email   text,
  line_count         int         NOT NULL CHECK (line_count >= 0),
  landscapes         jsonb       NOT NULL,
  lines              jsonb       NOT NULL,
  status             text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'superseded')),
  published_at       timestamptz,
  published_by       uuid        REFERENCES "cat".users(id) ON DELETE SET NULL,
  published_by_email text
);
-- At most one published snapshot at a time.
CREATE UNIQUE INDEX IF NOT EXISTS phase1_snapshots_one_published ON "cat".phase1_snapshots ((true)) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS phase1_snapshots_fetched ON "cat".phase1_snapshots (fetched_at DESC);

-- Drive folder sync + version retention policy (decided 20 Nov 2026).
-- Apply after 2026-11-20_v2_core.sql and 2026-11-20_v2_hardening.sql. Idempotent.
-- apply-sql sends the file as one query, so it runs in a single transaction:
-- it applies fully or not at all.
--
-- Policy:
--   * The Drive "Final folder" is the source of truth for synced documents.
--   * When a new version arrives, a change summary is written, then the old
--     version is deleted completely (file, pages, sections, chunks). Only the
--     summary survives.
--   * Documents added by hand (e.g. Pangi, HLPE) are kept outside the sync.

-- Where a document comes from. Default is 'manual' (never touched by the
-- sync); only rows that actually carry a Drive file id are marked 'drive'.
-- The sync sets source='drive' explicitly when it creates a document.
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE "cat".documents ALTER COLUMN source SET DEFAULT 'manual';
DO $$ BEGIN
  ALTER TABLE "cat".documents ADD CONSTRAINT documents_source_check CHECK (source IN ('drive','manual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Stable across renames and moves inside Drive, so an edited/replaced file
-- maps to the same document.
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS drive_file_id text;
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS drive_path text;   -- "Final folder/Landscape report - final/…"
CREATE UNIQUE INDEX IF NOT EXISTS documents_drive_file_uniq
  ON "cat".documents (drive_file_id) WHERE drive_file_id IS NOT NULL;
-- Backfill from the data, then clean anything inconsistent, so the
-- constraint below can always be added.
UPDATE "cat".documents SET source = 'drive'  WHERE drive_file_id IS NOT NULL AND source <> 'drive';
UPDATE "cat".documents SET source = 'manual' WHERE drive_file_id IS NULL     AND source = 'drive';
DO $$ BEGIN
  ALTER TABLE "cat".documents ADD CONSTRAINT documents_drive_has_id
    CHECK (source <> 'drive' OR drive_file_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- What the sync compares to decide "changed".
ALTER TABLE "cat".document_versions ADD COLUMN IF NOT EXISTS drive_modified_time timestamptz;
ALTER TABLE "cat".document_versions ADD COLUMN IF NOT EXISTS drive_md5 text;    -- null for Google-native files

-- Change summaries outlive the old version they describe.
ALTER TABLE "cat".version_diffs ADD COLUMN IF NOT EXISTS from_label text;
ALTER TABLE "cat".version_diffs ADD COLUMN IF NOT EXISTS from_version_no integer;
ALTER TABLE "cat".version_diffs ALTER COLUMN from_version_id DROP NOT NULL;
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = '"cat".version_diffs'::regclass AND contype = 'f'
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                        WHERE attrelid = '"cat".version_diffs'::regclass AND attname = 'from_version_id')];
  IF c IS NOT NULL AND c <> 'version_diffs_from_version_fk' THEN
    EXECUTE format('ALTER TABLE "cat".version_diffs DROP CONSTRAINT %I', c);
  END IF;
  BEGIN
    ALTER TABLE "cat".version_diffs ADD CONSTRAINT version_diffs_from_version_fk
      FOREIGN KEY (from_version_id) REFERENCES "cat".document_versions(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- A summary must always say which version it came from, even after that
-- version is deleted; and there is one summary per (document, from, to).
UPDATE "cat".version_diffs d SET from_label = coalesce(d.from_label, v.label, 'v' || v.version_no),
                                 from_version_no = coalesce(d.from_version_no, v.version_no)
FROM "cat".document_versions v WHERE v.id = d.from_version_id;
DO $$ BEGIN
  ALTER TABLE "cat".version_diffs ADD CONSTRAINT version_diffs_from_recorded
    CHECK (from_version_no IS NOT NULL AND from_label IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE "cat".version_diffs DROP CONSTRAINT IF EXISTS version_diffs_from_version_id_to_version_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS version_diffs_doc_from_to_uniq
  ON "cat".version_diffs (document_id, from_version_no, to_version_id);

-- Sync bookkeeping: one row per run, for the admin and the health check.
CREATE TABLE IF NOT EXISTS "cat".drive_sync_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  triggered_by  text NOT NULL CHECK (triggered_by IN ('cron','manual')),
  files_seen    integer NOT NULL DEFAULT 0,
  files_new     integer NOT NULL DEFAULT 0,
  files_changed integer NOT NULL DEFAULT 0,
  files_removed integer NOT NULL DEFAULT 0,
  error         text
);

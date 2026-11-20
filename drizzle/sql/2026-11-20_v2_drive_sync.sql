-- Drive folder sync + version retention policy (decided 20 Nov 2026).
-- Apply after 2026-11-20_v2_core.sql and 2026-11-20_v2_hardening.sql. Idempotent.
--
-- Policy:
--   * The Drive "Final folder" is the source of truth for synced documents.
--   * When a new version arrives, a change summary is written, then the old
--     version is deleted completely (file, pages, sections, chunks). Only the
--     summary survives.
--   * Documents added by hand (e.g. Pangi, HLPE) are kept outside the sync.

-- Where a document comes from.
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'drive';
DO $$ BEGIN
  ALTER TABLE "cat".documents ADD CONSTRAINT documents_source_check CHECK (source IN ('drive','manual'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Stable across renames and moves inside Drive, so an edited/replaced file
-- maps to the same document.
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS drive_file_id text;
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS drive_path text;   -- "Final folder/Landscape report - final/…"
CREATE UNIQUE INDEX IF NOT EXISTS documents_drive_file_uniq
  ON "cat".documents (drive_file_id) WHERE drive_file_id IS NOT NULL;
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

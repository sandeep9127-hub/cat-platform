-- Duplicate fact sheets (CAT database only).
-- A duplicate is kept (never deleted) with status = 'merged' and merged_into
-- = the slug of the sheet that replaced it. Public queries only show
-- status = 'published', and /factsheet/<old-slug> redirects to merged_into.
-- Undo: UPDATE ... SET status = 'published', merged_into = NULL WHERE slug = ...

ALTER TABLE "cat".solution_factsheets
  ADD COLUMN IF NOT EXISTS merged_into text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solution_factsheets_merged_into_check') THEN
    ALTER TABLE "cat".solution_factsheets ADD CONSTRAINT solution_factsheets_merged_into_check
      CHECK ((status = 'merged') = (merged_into IS NOT NULL) AND merged_into IS DISTINCT FROM slug);
  END IF;
END $$;

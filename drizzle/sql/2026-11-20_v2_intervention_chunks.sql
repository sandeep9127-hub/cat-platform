-- Make approved intervention rows searchable alongside document text.
-- Idempotent. source_ref = '<landscape_slug>:<row_key>'.
ALTER TABLE "cat".chunks DROP CONSTRAINT IF EXISTS chunks_source_kind_check;
ALTER TABLE "cat".chunks ADD CONSTRAINT chunks_source_kind_check
  CHECK (source_kind IN ('document','factsheet','entry','organisation','intervention'));

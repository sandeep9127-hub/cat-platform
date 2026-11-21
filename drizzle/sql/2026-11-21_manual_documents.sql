-- Documents added by hand (not from the Drive Final folder), e.g. the HLPE report.
-- CAT database only. See scripts/ingest-manual-pdf.ts.
ALTER TABLE "cat".documents ADD COLUMN IF NOT EXISTS source_url text
  CHECK (source_url IS NULL OR source_url ~ '^https://');
-- A PDF that is itself the reader-facing file.
ALTER TABLE "cat".document_versions DROP CONSTRAINT IF EXISTS document_versions_pdf_method_check;
ALTER TABLE "cat".document_versions ADD CONSTRAINT document_versions_pdf_method_check
  CHECK (pdf_method IN ('drive-export', 'libreoffice', 'original'));

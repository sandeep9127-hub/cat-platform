-- Reader-facing PDF per document version (CAT database only).
-- Page numbers in citations refer to this PDF: Drive's export for Google Docs,
-- a LibreOffice rendering for Word files. See lib/ingest/pdf-pages.ts.
ALTER TABLE "cat".document_versions
  ADD COLUMN IF NOT EXISTS r2_pdf_key text,
  ADD COLUMN IF NOT EXISTS pdf_method text CHECK (pdf_method IN ('drive-export', 'libreoffice'));

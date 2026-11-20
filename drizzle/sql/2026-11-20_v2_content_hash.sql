-- Fingerprint of a version's parsed text, so Google-native files (whose
-- exports differ byte-wise every time) can be recognised as unchanged by
-- content, not by timestamp alone. Idempotent.
ALTER TABLE "cat".document_versions ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS document_versions_content_hash_idx ON "cat".document_versions (document_id, content_hash);

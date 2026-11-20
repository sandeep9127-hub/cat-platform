-- Hardening for the v2 core schema (security review, 20 Nov 2026).
-- Idempotent; brings databases created from the first version of
-- 2026-11-20_v2_core.sql in line with the corrected file.

-- 1. Conversations store only a hash of the session token.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'cat' AND table_name = 'conversations' AND column_name = 'session_token') THEN
    IF EXISTS (SELECT 1 FROM "cat".conversations) THEN
      RAISE EXCEPTION 'conversations has rows; migrate tokens to hashes explicitly';
    END IF;
    DROP INDEX IF EXISTS "cat".conversations_session_idx;
    ALTER TABLE "cat".conversations RENAME COLUMN session_token TO session_token_hash;
    ALTER TABLE "cat".conversations ADD CONSTRAINT conversations_token_hash_format
      CHECK (session_token_hash ~ '^[0-9a-f]{64}$');
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS conversations_session_idx
  ON "cat".conversations (session_token_hash, last_active_at DESC);

-- 2. Chunks are hidden until explicitly published.
ALTER TABLE "cat".chunks ALTER COLUMN is_current SET DEFAULT false;

-- A document chunk may only be searchable when its version is the current
-- one and fully processed. Non-document chunks (fact sheets, entries, orgs)
-- are published by their own workflows.
CREATE OR REPLACE FUNCTION "cat".chunks_guard_current() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_current AND NEW.source_kind = 'document' AND NOT EXISTS (
       SELECT 1 FROM "cat".document_versions v
       WHERE v.id = NEW.version_id AND v.is_current AND v.status = 'ready') THEN
    RAISE EXCEPTION 'chunk % cannot be current: version % is not current and ready', NEW.id, NEW.version_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS chunks_guard_current ON "cat".chunks;
CREATE TRIGGER chunks_guard_current
  BEFORE INSERT OR UPDATE OF is_current, version_id ON "cat".chunks
  FOR EACH ROW EXECUTE FUNCTION "cat".chunks_guard_current();

-- When a version stops being current (superseded) or fails, its chunks are
-- unpublished automatically.
CREATE OR REPLACE FUNCTION "cat".versions_unpublish_chunks() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.is_current AND NOT NEW.is_current) OR (NEW.status <> 'ready' AND OLD.status = 'ready') THEN
    UPDATE "cat".chunks SET is_current = false WHERE version_id = NEW.id AND is_current;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS versions_unpublish_chunks ON "cat".document_versions;
CREATE TRIGGER versions_unpublish_chunks
  AFTER UPDATE OF is_current, status ON "cat".document_versions
  FOR EACH ROW EXECUTE FUNCTION "cat".versions_unpublish_chunks();

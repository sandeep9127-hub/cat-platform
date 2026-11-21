-- One-click approval of access requests from email (CAT database only).
-- Each approver gets their own random link per request; only its sha256 is
-- stored. Links expire, and stop working once the request is decided.
ALTER TABLE "cat".access_requests
  ADD COLUMN IF NOT EXISTS decided_via text CHECK (decided_via IN ('admin', 'email')),
  ADD COLUMN IF NOT EXISTS decided_by_email text;

CREATE TABLE IF NOT EXISTS "cat".access_request_tokens (
  token_hash     text PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  request_id     uuid NOT NULL REFERENCES "cat".access_requests(id) ON DELETE CASCADE,
  approver_email text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '31 days')
);
CREATE INDEX IF NOT EXISTS access_request_tokens_request_idx ON "cat".access_request_tokens (request_id);

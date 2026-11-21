-- Requests to view the full investment tables (CAT database only).
-- A person fills the public form (or emails CAT and an editor records it);
-- an editor approves or declines. Approval creates a view-only share link
-- (cat.share_links) and emails it to the requester.

CREATE TABLE IF NOT EXISTS "cat".access_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  name           text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  email          text NOT NULL CHECK (length(email) <= 254 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organisation   text NOT NULL CHECK (length(organisation) BETWEEN 2 AND 200),
  role           text CHECK (role IS NULL OR length(role) <= 120),
  purpose        text NOT NULL CHECK (length(purpose) BETWEEN 10 AND 2000),
  landscape_slug text,                       -- null = all landscapes
  channel        text NOT NULL DEFAULT 'form' CHECK (channel IN ('form', 'email')),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  decided_by     uuid REFERENCES "cat".users(id) ON DELETE SET NULL,
  decided_at     timestamptz,
  decision_note  text CHECK (decision_note IS NULL OR length(decision_note) <= 1000),
  share_link_id  uuid REFERENCES "cat".share_links(id) ON DELETE SET NULL,
  emailed_at     timestamptz,
  ip_hash        text,                       -- daily-salted hash, never the raw IP
  CHECK ((status = 'pending') = (decided_at IS NULL))
);
CREATE INDEX IF NOT EXISTS access_requests_status_idx ON "cat".access_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS access_requests_email_idx ON "cat".access_requests (lower(email), created_at DESC);

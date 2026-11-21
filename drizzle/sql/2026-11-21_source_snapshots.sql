-- Last seen fingerprint of each entry's source page, for the weekly freshness
-- sweep (CAT database only). Replaces comparing against freshness flag text,
-- which never matched and flagged every entry every week.
CREATE TABLE IF NOT EXISTS "cat".source_snapshots (
  entry_id   uuid NOT NULL REFERENCES "cat".entries(id) ON DELETE CASCADE,
  url        text NOT NULL,
  hash       text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz,
  PRIMARY KEY (entry_id, url)
);

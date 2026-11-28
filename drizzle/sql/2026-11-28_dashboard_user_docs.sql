-- Per-user documents for Hub dashboards: private notes and saved views.
-- Each row belongs to one signed-in user and is never shown to anyone else.
-- Used by /dashboards/landscapes-phase-1 (kind 'note' keyed by landscape, kind 'view' keyed by a view id).
CREATE TABLE IF NOT EXISTS "cat".dashboard_user_docs (
  user_id    uuid        NOT NULL REFERENCES "cat".users(id) ON DELETE CASCADE,
  dashboard  text        NOT NULL CHECK (dashboard ~ '^[a-z0-9-]{1,64}$'),
  kind       text        NOT NULL CHECK (kind IN ('note', 'view')),
  doc_key    text        NOT NULL CHECK (length(doc_key) BETWEEN 1 AND 100),
  data       jsonb       NOT NULL CHECK (pg_column_size(data) <= 32768),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dashboard, kind, doc_key)
);

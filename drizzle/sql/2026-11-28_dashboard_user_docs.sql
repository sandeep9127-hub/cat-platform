-- Private per-owner documents for Hub dashboards: notes and saved views.
-- owner is 'user:<users.id>' for a signed-in editor, or 'link:<share_links.id>' for
-- an approved share-link holder. Every row is private to its owner.
-- Used by /dashboards/landscapes-phase-1 (kind 'note' keyed by landscape, kind 'view' keyed by a view id).
CREATE TABLE IF NOT EXISTS "cat".dashboard_user_docs (
  owner      text        NOT NULL CHECK (owner ~ '^(user|link):[0-9a-f-]{36}$'),
  dashboard  text        NOT NULL CHECK (dashboard ~ '^[a-z0-9-]{1,64}$'),
  kind       text        NOT NULL CHECK (kind IN ('note', 'view')),
  doc_key    text        NOT NULL CHECK (length(doc_key) BETWEEN 1 AND 100),
  data       jsonb       NOT NULL CHECK (pg_column_size(data) <= 32768),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner, dashboard, kind, doc_key)
);

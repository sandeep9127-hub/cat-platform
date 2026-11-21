-- Record which model produced each stored vector, so re-embedding is
-- resumable and mixed-model rows are detectable.
ALTER TABLE "cat".landscape_document_chunks ADD COLUMN IF NOT EXISTS embedding_model text;
ALTER TABLE "cat".factsheet_chunks ADD COLUMN IF NOT EXISTS embedding_model text;

-- factsheet_chunks had no ANN index.
CREATE INDEX IF NOT EXISTS fsc_embedding_idx ON "cat".factsheet_chunks USING hnsw (embedding vector_cosine_ops);

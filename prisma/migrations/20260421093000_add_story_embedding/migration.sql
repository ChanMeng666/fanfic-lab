-- pgvector is already enabled (KnowledgeChunk uses it). This migration
-- adds a per-story embedding so we can serve "related stories" via
-- cosine distance.

-- Nullable so existing stories can be backfilled gradually.
ALTER TABLE "Story" ADD COLUMN "embedding" vector(1536);

-- ivfflat index for cosine similarity. lists=100 is conservative for a
-- small dataset; can be re-tuned once we cross ~10k stories. Requires
-- ANALYZE before queries hit; PG runs that automatically on next vacuum.
CREATE INDEX IF NOT EXISTS "Story_embedding_cosine_idx"
  ON "Story" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

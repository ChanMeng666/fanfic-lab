-- Enable trigram extension for fast ILIKE / similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes accelerate ILIKE '%pattern%' on title and summary, which is
-- what Prisma's `contains` clause emits. Without these the planner falls
-- back to a sequential scan once the table grows past a few hundred rows.
CREATE INDEX IF NOT EXISTS "Story_title_trgm_idx"
  ON "Story" USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Story_summary_trgm_idx"
  ON "Story" USING GIN (summary gin_trgm_ops);

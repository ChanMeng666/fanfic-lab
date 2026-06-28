-- Performance composite indexes (Claude×Codex review, P2.4).
--
-- Written idempotently (CREATE INDEX IF NOT EXISTS) because this DB is managed
-- with `prisma db push` and holds raw-SQL objects (pgvector + pg_trgm indexes,
-- LangGraph checkpoint tables) that are NOT in the Prisma datamodel. A plain
-- `migrate dev`/`db push` would try to drop those, so apply this surgically:
--
--   prisma db execute --file prisma/migrations/20260628000000_add_perf_indexes/migration.sql --schema prisma/schema.prisma
--   prisma migrate resolve --applied 20260628000000_add_perf_indexes
--
-- Index names match Prisma's @@index defaults so the datamodel reconciles.

-- Generation: per-user/per-type/today windows (credits.freeShortsUsedToday) and
-- the branch route's hourly rate-limit count.
CREATE INDEX IF NOT EXISTS "Generation_userId_type_createdAt_idx"
  ON "Generation"("userId", "type", "createdAt");

-- StoryBranch: fork-point ACTIVE-branch counts (poll settle / branch routes,
-- getBranchTree).
CREATE INDEX IF NOT EXISTS "StoryBranch_parentChapterId_status_idx"
  ON "StoryBranch"("parentChapterId", "status");

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "isComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Story_status_publishedAt_idx" ON "Story"("status", "publishedAt");

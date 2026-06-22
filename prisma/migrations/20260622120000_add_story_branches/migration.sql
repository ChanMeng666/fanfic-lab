-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'CANONIZED', 'HIDDEN');

-- AlterTable
ALTER TABLE "Story" ADD COLUMN "allowBranching" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Generation" ADD COLUMN "branchId" TEXT;

-- CreateTable
CREATE TABLE "StoryBranch" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "parentChapterId" TEXT,
    "parentBranchId" TEXT,
    "proposerId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "canonizedChapterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryBranch_canonizedChapterId_key" ON "StoryBranch"("canonizedChapterId");

-- CreateIndex
CREATE INDEX "StoryBranch_storyId_idx" ON "StoryBranch"("storyId");

-- CreateIndex
CREATE INDEX "StoryBranch_parentChapterId_idx" ON "StoryBranch"("parentChapterId");

-- CreateIndex
CREATE INDEX "StoryBranch_proposerId_idx" ON "StoryBranch"("proposerId");

-- CreateIndex
CREATE INDEX "StoryBranch_storyId_status_idx" ON "StoryBranch"("storyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BranchLike_userId_branchId_key" ON "BranchLike"("userId", "branchId");

-- CreateIndex
CREATE INDEX "BranchLike_branchId_idx" ON "BranchLike"("branchId");

-- CreateIndex
CREATE INDEX "BranchLike_userId_idx" ON "BranchLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Generation_branchId_key" ON "Generation"("branchId");

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StoryBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryBranch" ADD CONSTRAINT "StoryBranch_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryBranch" ADD CONSTRAINT "StoryBranch_parentChapterId_fkey" FOREIGN KEY ("parentChapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryBranch" ADD CONSTRAINT "StoryBranch_parentBranchId_fkey" FOREIGN KEY ("parentBranchId") REFERENCES "StoryBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryBranch" ADD CONSTRAINT "StoryBranch_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchLike" ADD CONSTRAINT "BranchLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchLike" ADD CONSTRAINT "BranchLike_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StoryBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SourceResearchCache" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "researchData" JSONB NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 1,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceResearchCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceResearchCache_normalizedName_key" ON "SourceResearchCache"("normalizedName");

-- CreateIndex
CREATE INDEX "SourceResearchCache_normalizedName_idx" ON "SourceResearchCache"("normalizedName");

-- CreateIndex
CREATE INDEX "SourceResearchCache_sourceType_idx" ON "SourceResearchCache"("sourceType");

-- CreateIndex
CREATE INDEX "SourceResearchCache_lastAccessedAt_idx" ON "SourceResearchCache"("lastAccessedAt");

-- CreateIndex
CREATE INDEX "SourceResearchCache_searchCount_idx" ON "SourceResearchCache"("searchCount");

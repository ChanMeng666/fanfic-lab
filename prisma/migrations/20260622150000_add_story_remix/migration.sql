-- AlterTable
ALTER TABLE "Story" ADD COLUMN "remixedFromId" TEXT;

-- CreateIndex
CREATE INDEX "Story_remixedFromId_idx" ON "Story"("remixedFromId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_remixedFromId_fkey" FOREIGN KEY ("remixedFromId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

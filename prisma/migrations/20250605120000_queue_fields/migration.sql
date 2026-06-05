-- AlterTable
ALTER TABLE "ProcessingJob" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "ProcessingJob" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProcessingJob" ADD COLUMN "currentStage" TEXT;
ALTER TABLE "ProcessingJob" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "ProcessingJob" ADD COLUMN "lockToken" TEXT;
ALTER TABLE "ProcessingJob" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ProcessingJob_scheduledAt_idx" ON "ProcessingJob"("scheduledAt");
CREATE INDEX "ProcessingJob_priority_createdAt_idx" ON "ProcessingJob"("priority" DESC, "createdAt" ASC);

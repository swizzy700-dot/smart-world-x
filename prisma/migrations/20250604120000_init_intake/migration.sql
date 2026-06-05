-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('NEW', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "IntakeBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "totalLines" INTEGER NOT NULL,
    "validCount" INTEGER NOT NULL,
    "insertedCount" INTEGER NOT NULL,
    "duplicateCount" INTEGER NOT NULL,
    "invalidCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "rawUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'NEW',
    "batchId" TEXT NOT NULL,
    "validationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'pipeline',
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntakeBatch_batchCode_key" ON "IntakeBatch"("batchCode");

-- CreateIndex
CREATE INDEX "IntakeBatch_createdAt_idx" ON "IntakeBatch"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Website_normalizedUrl_key" ON "Website"("normalizedUrl");

-- CreateIndex
CREATE INDEX "Website_domain_idx" ON "Website"("domain");

-- CreateIndex
CREATE INDEX "Website_status_idx" ON "Website"("status");

-- CreateIndex
CREATE INDEX "Website_batchId_idx" ON "Website"("batchId");

-- CreateIndex
CREATE INDEX "Website_createdAt_idx" ON "Website"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProcessingJob_status_idx" ON "ProcessingJob"("status");

-- CreateIndex
CREATE INDEX "ProcessingJob_websiteId_idx" ON "ProcessingJob"("websiteId");

-- CreateIndex
CREATE INDEX "ProcessingJob_createdAt_idx" ON "ProcessingJob"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IntakeBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

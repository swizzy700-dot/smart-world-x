-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "WebsiteAnalysis" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "performanceScore" INTEGER,
    "accessibilityScore" INTEGER,
    "seoScore" INTEGER,
    "bestPracticesScore" INTEGER,
    "overallScore" INTEGER,
    "lighthouseVersion" TEXT,
    "formFactor" TEXT,
    "finalUrl" TEXT,
    "pageTitle" TEXT,
    "fetchTimeMs" INTEGER,
    "durationMs" INTEGER,
    "rawReport" JSONB,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "executiveSummary" TEXT,
    "errorMessage" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAnalysis_websiteId_key" ON "WebsiteAnalysis"("websiteId");

-- CreateIndex
CREATE INDEX "WebsiteAnalysis_status_idx" ON "WebsiteAnalysis"("status");

-- CreateIndex
CREATE INDEX "WebsiteAnalysis_analyzedAt_idx" ON "WebsiteAnalysis"("analyzedAt" DESC);

-- CreateIndex
CREATE INDEX "WebsiteAnalysis_overallScore_idx" ON "WebsiteAnalysis"("overallScore");

-- AddForeignKey
ALTER TABLE "WebsiteAnalysis" ADD CONSTRAINT "WebsiteAnalysis_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

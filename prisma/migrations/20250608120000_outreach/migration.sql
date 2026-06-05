-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('PENDING', 'GENERATING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutreachProviderType" AS ENUM ('TEMPLATE', 'OPENAI', 'ANTHROPIC', 'CUSTOM');

-- CreateTable
CREATE TABLE "OutreachDraft" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "OutreachStatus" NOT NULL DEFAULT 'PENDING',
    "subject" TEXT,
    "body" TEXT,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "provider" "OutreachProviderType" NOT NULL DEFAULT 'TEMPLATE',
    "providerModel" TEXT,
    "promptVersion" TEXT NOT NULL DEFAULT '1.0',
    "inputSnapshot" JSONB,
    "generationMeta" JSONB,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachDraft_websiteId_version_idx" ON "OutreachDraft"("websiteId", "version" DESC);

-- CreateIndex
CREATE INDEX "OutreachDraft_status_idx" ON "OutreachDraft"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OutreachDraft_websiteId_version_key" ON "OutreachDraft"("websiteId", "version");

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

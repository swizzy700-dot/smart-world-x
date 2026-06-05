-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('MAILTO', 'TEL', 'FOOTER', 'HEADER', 'CONTACT_PAGE', 'BODY');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'NO_CONTACTS_FOUND');

-- CreateTable
CREATE TABLE "ContactExtraction" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "contactPageUrl" TEXT,
    "pagesScanned" INTEGER NOT NULL DEFAULT 0,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "phoneCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "extractedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "displayValue" TEXT,
    "source" "ContactSource" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "contactPageUrl" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactExtraction_websiteId_key" ON "ContactExtraction"("websiteId");

-- CreateIndex
CREATE INDEX "ContactExtraction_status_idx" ON "ContactExtraction"("status");

-- CreateIndex
CREATE INDEX "ContactExtraction_extractedAt_idx" ON "ContactExtraction"("extractedAt" DESC);

-- CreateIndex
CREATE INDEX "Contact_websiteId_idx" ON "Contact"("websiteId");

-- CreateIndex
CREATE INDEX "Contact_type_idx" ON "Contact"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_websiteId_type_value_key" ON "Contact"("websiteId", "type", "value");

-- AddForeignKey
ALTER TABLE "ContactExtraction" ADD CONSTRAINT "ContactExtraction_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

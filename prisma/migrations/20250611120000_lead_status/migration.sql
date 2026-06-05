-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'REPLIED', 'ENGAGED', 'CONVERTED');

-- AlterTable
ALTER TABLE "Website" ADD COLUMN "leadStatus" "LeadStatus" NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "Website_leadStatus_idx" ON "Website"("leadStatus");

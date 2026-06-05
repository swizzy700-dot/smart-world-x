-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReplyStatus" AS ENUM ('PENDING', 'RECEIVED', 'FAILED');

-- CreateTable
CREATE TABLE "FollowUpSchedule" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "initialEmailId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "scheduledDays" INTEGER NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "stoppedDueToReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "originalEmailId" TEXT NOT NULL,
    "status" "ReplyStatus" NOT NULL DEFAULT 'PENDING',
    "replySubject" TEXT,
    "replyBody" TEXT,
    "replyFrom" TEXT,
    "replyDate" TIMESTAMP(3),
    "errorMessage" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpHistory" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "emailMessageId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "followUpType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowUpSchedule_websiteId_sequence_key" ON "FollowUpSchedule"("websiteId", "sequence");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_websiteId_idx" ON "FollowUpSchedule"("websiteId");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_initialEmailId_idx" ON "FollowUpSchedule"("initialEmailId");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_status_idx" ON "FollowUpSchedule"("status");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_scheduledFor_idx" ON "FollowUpSchedule"("scheduledFor");

-- CreateIndex
CREATE INDEX "FollowUpSchedule_sequence_idx" ON "FollowUpSchedule"("sequence");

-- CreateIndex
CREATE INDEX "Reply_websiteId_idx" ON "Reply"("websiteId");

-- CreateIndex
CREATE INDEX "Reply_originalEmailId_idx" ON "Reply"("originalEmailId");

-- CreateIndex
CREATE INDEX "Reply_status_idx" ON "Reply"("status");

-- CreateIndex
CREATE INDEX "Reply_detectedAt_idx" ON "Reply"("detectedAt" DESC);

-- CreateIndex
CREATE INDEX "FollowUpHistory_websiteId_idx" ON "FollowUpHistory"("websiteId");

-- CreateIndex
CREATE INDEX "FollowUpHistory_scheduleId_idx" ON "FollowUpHistory"("scheduleId");

-- CreateIndex
CREATE INDEX "FollowUpHistory_emailMessageId_idx" ON "FollowUpHistory"("emailMessageId");

-- CreateIndex
CREATE INDEX "FollowUpHistory_sentAt_idx" ON "FollowUpHistory"("sentAt" DESC);

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSchedule" ADD CONSTRAINT "FollowUpSchedule_initialEmailId_fkey" FOREIGN KEY ("initialEmailId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_originalEmailId_fkey" FOREIGN KEY ("originalEmailId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpHistory" ADD CONSTRAINT "FollowUpHistory_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpHistory" ADD CONSTRAINT "FollowUpHistory_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FollowUpSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpHistory" ADD CONSTRAINT "FollowUpHistory_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "messageId" TEXT,
    "inReplyTo" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "emailMessageId" TEXT,
    "replyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_websiteId_idx" ON "Conversation"("websiteId");

-- CreateIndex
CREATE INDEX "Conversation_direction_idx" ON "Conversation"("direction");

-- CreateIndex
CREATE INDEX "Conversation_timestamp_idx" ON "Conversation"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Conversation_emailMessageId_idx" ON "Conversation"("emailMessageId");

-- CreateIndex
CREATE INDEX "Conversation_replyId_idx" ON "Conversation"("replyId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_emailMessageId_fkey" FOREIGN KEY ("emailMessageId") REFERENCES "EmailMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "Reply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

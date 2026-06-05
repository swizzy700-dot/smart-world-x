import { MessageDirection } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ConversationHistory } from "./types";

export class ConversationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ConversationError";
  }
}

/**
 * Add an outbound email to conversation history
 */
export async function addOutboundConversation(
  websiteId: string,
  emailMessageId: string,
  subject: string,
  body: string,
  fromAddress: string,
  toAddress: string,
  messageId?: string,
): Promise<void> {
  await prisma.conversation.create({
    data: {
      websiteId,
      direction: MessageDirection.OUTBOUND,
      subject,
      body,
      fromAddress,
      toAddress,
      messageId,
      timestamp: new Date(),
      emailMessageId,
    },
  });
}

/**
 * Add an inbound reply to conversation history
 */
export async function addInboundConversation(
  websiteId: string,
  replyId: string,
  subject: string,
  body: string,
  fromAddress: string,
  toAddress: string,
  messageId?: string,
  inReplyTo?: string,
): Promise<void> {
  await prisma.conversation.create({
    data: {
      websiteId,
      direction: MessageDirection.INBOUND,
      subject,
      body,
      fromAddress,
      toAddress,
      messageId,
      inReplyTo,
      timestamp: new Date(),
      replyId,
    },
  });
}

/**
 * Get conversation history for a website
 */
export async function getConversationHistory(
  websiteId: string,
): Promise<ConversationHistory[]> {
  const conversations = await prisma.conversation.findMany({
    where: { websiteId },
    orderBy: { timestamp: "asc" },
  });

  return conversations.map((conv) => ({
    id: conv.id,
    websiteId: conv.websiteId,
    direction: conv.direction === MessageDirection.OUTBOUND ? "outbound" : "inbound",
    subject: conv.subject,
    body: conv.body,
    fromAddress: conv.fromAddress,
    toAddress: conv.toAddress,
    timestamp: conv.timestamp,
    messageId: conv.messageId ?? undefined,
  }));
}

/**
 * Get latest conversation for a website
 */
export async function getLatestConversation(
  websiteId: string,
): Promise<ConversationHistory | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { websiteId },
    orderBy: { timestamp: "desc" },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    websiteId: conversation.websiteId,
    direction: conversation.direction === MessageDirection.OUTBOUND ? "outbound" : "inbound",
    subject: conversation.subject,
    body: conversation.body,
    fromAddress: conversation.fromAddress,
    toAddress: conversation.toAddress,
    timestamp: conversation.timestamp,
    messageId: conversation.messageId ?? undefined,
  };
}

/**
 * Get conversation statistics
 */
export async function getConversationStats(): Promise<{
  total: number;
  outbound: number;
  inbound: number;
}> {
  const [total, outbound, inbound] = await Promise.all([
    prisma.conversation.count(),
    prisma.conversation.count({ where: { direction: MessageDirection.OUTBOUND } }),
    prisma.conversation.count({ where: { direction: MessageDirection.INBOUND } }),
  ]);

  return { total, outbound, inbound };
}

import { prisma } from "@/lib/db";
import { REPLY_CONFIDENCE_THRESHOLD } from "./constants";
import type { EmailMessage, ReplyDetectionResult } from "./types";

export class ReplyDetectionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ReplyDetectionError";
  }
}

/**
 * Detects if an incoming email is a reply to a previously sent email
 */
export async function detectReply(
  incomingEmail: EmailMessage,
): Promise<ReplyDetectionResult> {
  // Strategy 1: Check Message-ID headers (most reliable)
  const messageIdMatch = await detectByMessageId(incomingEmail);
  if (messageIdMatch && messageIdMatch.confidence >= REPLY_CONFIDENCE_THRESHOLD) {
    return messageIdMatch;
  }

  // Strategy 2: Check subject line (Re: prefix)
  const subjectMatch = await detectBySubject(incomingEmail);
  if (subjectMatch && subjectMatch.confidence >= REPLY_CONFIDENCE_THRESHOLD) {
    return subjectMatch;
  }

  // Strategy 3: Check email address matching
  const emailMatch = await detectByEmailAddress(incomingEmail);
  if (emailMatch && emailMatch.confidence >= REPLY_CONFIDENCE_THRESHOLD) {
    return emailMatch;
  }

  // No match found
  return {
    isReply: false,
    originalEmailId: null,
    websiteId: null,
    confidence: 0,
  };
}

/**
 * Detect reply by matching Message-ID headers
 */
async function detectByMessageId(
  incomingEmail: EmailMessage,
): Promise<ReplyDetectionResult | null> {
  if (!incomingEmail.inReplyTo && (!incomingEmail.references || incomingEmail.references.length === 0)) {
    return null;
  }

  // Check inReplyTo header
  if (incomingEmail.inReplyTo) {
    const originalEmail = await prisma.emailMessage.findFirst({
      where: {
        messageId: incomingEmail.inReplyTo,
      },
      include: {
        website: {
          select: {
            id: true,
            domain: true,
          },
        },
      },
    });

    if (originalEmail) {
      return {
        isReply: true,
        originalEmailId: originalEmail.id,
        websiteId: originalEmail.websiteId,
        confidence: 1.0,
      };
    }
  }

  // Check references header
  if (incomingEmail.references && incomingEmail.references.length > 0) {
    for (const ref of incomingEmail.references) {
      const originalEmail = await prisma.emailMessage.findFirst({
        where: {
          messageId: ref,
        },
        include: {
          website: {
            select: {
              id: true,
              domain: true,
            },
          },
        },
      });

      if (originalEmail) {
        return {
          isReply: true,
          originalEmailId: originalEmail.id,
          websiteId: originalEmail.websiteId,
          confidence: 0.95,
        };
      }
    }
  }

  return null;
}

/**
 * Detect reply by matching subject lines (Re: prefix)
 */
async function detectBySubject(
  incomingEmail: EmailMessage,
): Promise<ReplyDetectionResult | null> {
  // Remove common reply prefixes from incoming subject
  const normalizedIncomingSubject = incomingEmail.subject
    .replace(/^Re:\s*/i, "")
    .replace(/^RE:\s*/i, "")
    .replace(/^Fwd:\s*/i, "")
    .replace(/^FW:\s*/i, "")
    .trim();

  if (!normalizedIncomingSubject) {
    return null;
  }

  // Find recently sent emails with matching subject
  const sentEmails = await prisma.emailMessage.findMany({
    where: {
      status: "SENT",
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    include: {
      website: {
        select: {
          id: true,
          domain: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  for (const sentEmail of sentEmails) {
    const normalizedSentSubject = sentEmail.subject.trim();
    
    // Check for exact match
    if (normalizedIncomingSubject.toLowerCase() === normalizedSentSubject.toLowerCase()) {
      return {
        isReply: true,
        originalEmailId: sentEmail.id,
        websiteId: sentEmail.websiteId,
        confidence: 0.8,
      };
    }

    // Check for fuzzy match (Levenshtein distance would be better, but simple containment for now)
    if (
      normalizedIncomingSubject.toLowerCase().includes(normalizedSentSubject.toLowerCase()) ||
      normalizedSentSubject.toLowerCase().includes(normalizedIncomingSubject.toLowerCase())
    ) {
      return {
        isReply: true,
        originalEmailId: sentEmail.id,
        websiteId: sentEmail.websiteId,
        confidence: 0.6,
      };
    }
  }

  return null;
}

/**
 * Detect reply by matching email addresses
 */
async function detectByEmailAddress(
  incomingEmail: EmailMessage,
): Promise<ReplyDetectionResult | null> {
  const senderEmail = extractEmailAddress(incomingEmail.from);
  if (!senderEmail) {
    return null;
  }

  // Find emails we sent to this address recently
  const sentEmails = await prisma.emailMessage.findMany({
    where: {
      toAddress: senderEmail,
      status: "SENT",
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    include: {
      website: {
        select: {
          id: true,
          domain: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  if (sentEmails.length > 0) {
    // Return the most recent match with lower confidence
    return {
      isReply: true,
      originalEmailId: sentEmails[0].id,
      websiteId: sentEmails[0].websiteId,
      confidence: 0.5,
    };
  }

  return null;
}

/**
 * Extract email address from a string (handles "Name <email>" format)
 */
function extractEmailAddress(input: string): string | null {
  const emailMatch = input.match(/<([^>]+)>/);
  if (emailMatch) {
    return emailMatch[1];
  }

  const simpleMatch = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (simpleMatch) {
    return simpleMatch[1];
  }

  return null;
}

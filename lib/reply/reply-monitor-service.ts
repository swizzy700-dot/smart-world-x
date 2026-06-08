import { prisma } from "@/lib/db";
import { detectReply } from "./reply-detector";
import { updateLeadStatusOnReply, setLeadStatus } from "./lead-status-service";
import { addInboundConversation, addOutboundConversation } from "./conversation-service";
import { EmailMonitor, getReplyMonitoringConfig, isReplyMonitoringEnabled } from "./email-monitor";
import { recordReply } from "@/lib/followup";
import { isSystemPaused } from "@/lib/system/system-mode";
import type { EmailMessage } from "./types";

export class ReplyMonitorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ReplyMonitorError";
  }
}

/**
 * Process a single incoming email for reply detection
 */
export async function processIncomingEmail(email: EmailMessage): Promise<void> {
  try {
    // Detect if this is a reply
    const detection = await detectReply(email);

    if (!detection.isReply || !detection.originalEmailId || !detection.websiteId) {
      // Not a reply to our emails
      return;
    }

    console.log(`Reply detected for website ${detection.websiteId}`);

    // Record the reply in the follow-up system
    await recordReply(detection.websiteId, detection.originalEmailId, {
      replySubject: email.subject,
      replyBody: email.body,
      replyFrom: email.from,
      replyDate: email.date,
    });

    // Update lead status
    await updateLeadStatusOnReply(detection.websiteId);

    // Add to conversation history
    await addInboundConversation(
      detection.websiteId,
      "", // replyId will be set by the recordReply function
      email.subject,
      email.body,
      email.from,
      email.to[0] || "",
      email.messageId,
      email.inReplyTo,
    );

    console.log(`Successfully processed reply for website ${detection.websiteId}`);
  } catch (error) {
    console.error(`Error processing incoming email: ${error}`);
    throw new ReplyMonitorError(
      `Failed to process incoming email: ${error instanceof Error ? error.message : "Unknown error"}`,
      "PROCESSING_FAILED",
    );
  }
}

/**
 * Main inbox monitoring loop
 */
export async function monitorInbox(): Promise<void> {
  if (await isSystemPaused()) {
    return;
  }

  if (!isReplyMonitoringEnabled()) {
    console.log("Reply monitoring not enabled - IMAP credentials not configured");
    return;
  }

  try {
    const config = getReplyMonitoringConfig();
    const monitor = new EmailMonitor(config);

    await monitor.connect();

    const lastChecked = monitor.getLastCheckedTimestamp();
    console.log(`Checking for emails since ${lastChecked.toISOString()}`);

    // Fetch new emails since last check
    const newEmails = await monitor.fetchEmailsSince(lastChecked);

    console.log(`Found ${newEmails.length} new emails`);

    for (const email of newEmails) {
      await processIncomingEmail(email);
      // Mark as read after processing
      if (email.messageId) {
        await monitor.markAsRead(email.messageId);
      }
    }

    // Update last checked timestamp
    monitor.updateLastCheckedTimestamp(new Date());

    await monitor.disconnect();

    console.log("Inbox monitoring cycle completed");
  } catch (error) {
    console.error(`Error during inbox monitoring: ${error}`);
    throw new ReplyMonitorError(
      `Inbox monitoring failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "MONITORING_FAILED",
    );
  }
}

/**
 * Start the reply monitoring background job
 */
export async function startReplyMonitoring(): Promise<void> {
  if (!isReplyMonitoringEnabled()) {
    console.log("Reply monitoring disabled - IMAP credentials not configured");
    return;
  }

  const config = getReplyMonitoringConfig();
  const intervalMs = config.pollIntervalMinutes * 60 * 1000;

  console.log(`Starting reply monitoring (polling every ${config.pollIntervalMinutes} minutes)`);

  // Run immediately
  await monitorInbox();

  // Set up recurring monitoring
  setInterval(async () => {
    try {
      await monitorInbox();
    } catch (error) {
      console.error("Reply monitoring cycle failed:", error);
    }
  }, intervalMs);
}

/**
 * Backfill conversation history for existing emails
 */
export async function backfillConversationHistory(): Promise<void> {
  console.log("Starting conversation history backfill...");

  // Get all sent emails
  const sentEmails = await prisma.emailMessage.findMany({
    where: {
      status: "SENT",
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
      sentAt: "asc",
    },
  });

  console.log(`Found ${sentEmails.length} sent emails to backfill`);

  for (const email of sentEmails) {
    try {
      // Check if conversation already exists
      const existing = await prisma.conversation.findFirst({
        where: {
          emailMessageId: email.id,
        },
      });

      if (existing) {
        continue;
      }

      // Add to conversation history
      await addOutboundConversation(
        email.websiteId,
        email.id,
        email.subject,
        email.bodyText,
        email.fromAddress,
        email.toAddress,
        email.messageId ?? undefined,
      );

      // Update lead status for contacted leads
      await setLeadStatus(email.websiteId, "CONTACTED");

      console.log(`Backfilled conversation for email ${email.id}`);
    } catch (error) {
      console.error(`Error backfilling email ${email.id}:`, error);
    }
  }

  console.log("Conversation history backfill completed");
}

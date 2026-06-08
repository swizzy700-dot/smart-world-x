import { isQueueEnabled } from "@/lib/queue/connection";
import { prisma } from "@/lib/db";
import { queueOutboundEmail } from "@/lib/delivery/delivery-service";
import { generateFollowUpMessage } from "./generator";
import { getScheduledFollowUps, markFollowUpAsSent } from "./followup-service";
import { isSystemPaused } from "@/lib/system/system-mode";
import { enqueueFollowUpProcessing } from "./followup-queue";

const POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

let pollerInterval: NodeJS.Timeout | null = null;

export async function processScheduledFollowUps(): Promise<void> {
  if (await isSystemPaused()) return;

  try {
    const schedules = await getScheduledFollowUps();

    for (const schedule of schedules) {
      try {
        const { subject, body, recipientEmail } =
          await generateFollowUpMessage(schedule.id);

        if (!recipientEmail) {
          console.error(`No recipient email for schedule ${schedule.id}`);
          continue;
        }

        // Create a temporary outreach draft for the follow-up
        const draft = await prisma.outreachDraft.create({
          data: {
            websiteId: schedule.websiteId,
            version: 1,
            status: "GENERATED",
            subject,
            body,
            recipientEmail,
            provider: "TEMPLATE",
          },
        });

        if (isQueueEnabled()) {
          await enqueueFollowUpProcessing({ scheduleId: schedule.id });
        } else {
          const emailMessage = await queueOutboundEmail({
            websiteId: schedule.websiteId,
            outreachDraftId: draft.id,
          });

          await markFollowUpAsSent(schedule.id, emailMessage.id);
        }

        console.log(`Processed follow-up for schedule ${schedule.id}`);
      } catch (error) {
        console.error(`Failed to process follow-up ${schedule.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error processing scheduled follow-ups:", error);
  }
}

export function startFollowUpPoller(): void {
  if (pollerInterval) {
    console.log("Follow-up poller already running");
    return;
  }

  console.log("Starting follow-up poller");
  processScheduledFollowUps(); // Run immediately
  pollerInterval = setInterval(
    processScheduledFollowUps,
    POLL_INTERVAL_MS,
  );
}

export function stopFollowUpPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("Follow-up poller stopped");
  }
}

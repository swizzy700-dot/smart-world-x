import { Worker, Job } from "bullmq";
import { getConnectionOptions } from "@/lib/queue/connection";
import { prisma } from "@/lib/db";
import { queueOutboundEmail } from "@/lib/delivery/delivery-service";
import { generateFollowUpMessage } from "./generator";
import { markFollowUpAsSent, FollowUpError } from "./followup-service";
import {
  FOLLOW_UP_JOB_NAME,
  FOLLOW_UP_QUEUE_NAME,
} from "./constants";
import type { FollowUpQueuePayload } from "./types";

export function createFollowUpWorker() {
  const worker = new Worker<FollowUpQueuePayload>(
    FOLLOW_UP_QUEUE_NAME,
    async (job: Job<FollowUpQueuePayload>) => {
      const { scheduleId } = job.data;

      try {
        const { subject, body, recipientEmail } =
          await generateFollowUpMessage(scheduleId);

        if (!recipientEmail) {
          throw new FollowUpError("No recipient email found", "NO_RECIPIENT");
        }

        const schedule = await markFollowUpAsSent(scheduleId, "");
        const websiteId = schedule.websiteId;

        // Create a temporary outreach draft for the follow-up
        const draft = await prisma.outreachDraft.create({
          data: {
            websiteId,
            version: 1,
            status: "GENERATED",
            subject,
            body,
            recipientEmail,
            provider: "TEMPLATE",
          },
        });

        const emailMessage = await queueOutboundEmail({
          websiteId,
          outreachDraftId: draft.id,
        });

        await markFollowUpAsSent(scheduleId, emailMessage.id);

        return { success: true, emailMessageId: emailMessage.id };
      } catch (error) {
        if (error instanceof FollowUpError) {
          throw error;
        }
        throw new FollowUpError(
          `Failed to process follow-up: ${error instanceof Error ? error.message : "Unknown error"}`,
          "PROCESSING_FAILED",
        );
      }
    },
    {
      connection: getConnectionOptions(),
      concurrency: 5,
    },
  );

  worker.on("completed", (job) => {
    console.log(`Follow-up job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Follow-up job failed: ${job?.id}`, err);
  });

  return worker;
}

export async function runFollowUpWorker() {
  const worker = createFollowUpWorker();
  console.log("Follow-up worker started");

  process.on("SIGINT", async () => {
    await worker.close();
    console.log("Follow-up worker stopped");
    process.exit(0);
  });
}

export { FOLLOW_UP_QUEUE_NAME, FOLLOW_UP_JOB_NAME };
